import { NextRequest } from "next/server";
import { actionLabels } from "@/lib/constants";
import {

  calculateDistanceMeters,
  dateKeyInTimezone,
  getNextActions,
  isOutOfOrder,
  minutesSinceMidnight,
  nowIso,
  parseTimeToMinutes
} from "@/lib/calculations";
import { computeEarlyLeaveFromJourney, computeLateFromJourney, resolveExpectedJourney } from "@/lib/services/schedule-engine";
import { getSupabaseAdmin } from "@/lib/server/db";
import { fail, ok, readJson } from "@/lib/server/http";
import { assertPin, getGenericPinErrorMessage, getPinBlockMessage, isPinTemporarilyBlocked, recordPinAttempt, verifyPin } from "@/lib/server/pin";
import { getSystemSettings } from "@/lib/server/settings";
import type { TimeAction } from "@/types/domain";

const actions = ["start_shift", "start_lunch", "end_lunch", "end_shift"];

export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{
      employeeId?: string;
      branchId?: string;
      pin?: string;
      action?: TimeAction;
      latitude?: number;
      longitude?: number;
      justificationText?: string;
      deviceInfo?: string;
      gpsAccuracyMeters?: number;
      idempotencyKey?: string;
    }>(request);

    const employeeId = body.employeeId;
    const action = body.action;
    const pin = assertPin(body.pin);
    if (!employeeId) return fail("Selecione um funcionário.", 400);
    if (!action || !actions.includes(action)) return fail("Ação de ponto inválida.", 400);
    if (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude)) {
      return fail("Não foi possível capturar sua localização. Ative o GPS e tente novamente.", 400);
    }

    const supabase = getSupabaseAdmin();
    const settings = await getSystemSettings(supabase);
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("*, branches(*)")
      .eq("id", employeeId)
      .eq("active", true)
      .maybeSingle();

    if (employeeError) return fail("Erro ao validar funcionário.", 500, employeeError.message);
    if (!employee) return fail("Funcionário ativo não encontrado.", 404);
    if (await isPinTemporarilyBlocked({ supabase, employeeId: employee.id, maxFailures: 5 })) {
      return fail(getPinBlockMessage(), 429);
    }
    const validPin = await verifyPin(pin, employee.pin_hash);
    await recordPinAttempt({
      supabase,
      employeeId: employee.id,
      headers: request.headers,
      deviceInfo: request.headers.get("user-agent"),
      success: validPin,
      reason: validPin ? "clock_register" : "invalid_pin_register"
    });
    if (!validPin) return fail(getGenericPinErrorMessage(), 401);

    const today = dateKeyInTimezone();
    const selectedBranchId = body.branchId || employee.branch_id;
    let branch = (employee.branches as any) || null;

    if (selectedBranchId !== employee.branch_id) {
      if (settings.allow_different_branch_with_authorization === false) {
        return fail("Ponto em filial diferente está desativado nas configurações.", 403);
      }
      const { data: authorization, error: authError } = await supabase
        .from("employee_branch_authorizations")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("branch_id", selectedBranchId)
        .eq("active", true)
        .lte("starts_on", today)
        .gte("ends_on", today)
        .maybeSingle();

      if (authError) return fail("Erro ao validar autorização temporária de filial.", 500, authError.message);
      if (!authorization) return fail("Você não está autorizado a bater ponto nesta filial hoje.", 403);
      const { data: authorizedBranch, error: branchError } = await supabase
        .from("branches")
        .select("*")
        .eq("id", selectedBranchId)
        .eq("active", true)
        .maybeSingle();
      if (branchError) return fail("Erro ao buscar filial autorizada.", 500, branchError.message);
      branch = authorizedBranch;
    }

    if (!branch?.active) return fail("Filial inativa ou não encontrada.", 404);

    if (branch.geofence_enabled === false) return fail("Esta filial está sem geofence ativa. Peça ao RH para configurar a localização no mapa.", 409);
    if (!Number.isFinite(Number(branch.latitude)) || !Number.isFinite(Number(branch.longitude))) {
      return fail("Filial sem geolocalização configurada. Configure no mapa antes de permitir pontos.", 409);
    }
    if (settings.block_clock_without_confirmed_branch_gps !== false) {
      const branchGpsReady = Boolean((branch as any).gps_ready) || (branch as any).geolocation_status === "confirmed";
      if (!branchGpsReady) {
        return fail("A localização desta filial ainda não foi confirmada pelo RH. Valide a unidade no painel Filiais antes de liberar o ponto.", 409);
      }
    }
    const distance = calculateDistanceMeters(Number(body.latitude), Number(body.longitude), Number(branch.latitude), Number(branch.longitude));
    const allowedRadius = Number(branch.allowed_radius_meters || settings.default_radius_meters || 900);
    const inside = distance <= allowedRadius;
    const gpsAccuracy = Number.isFinite(Number(body.gpsAccuracyMeters)) ? Math.round(Number(body.gpsAccuracyMeters)) : null;
    const maxAccuracy = Number(settings.max_gps_accuracy_meters || 100);
    const poorAccuracy = Boolean(gpsAccuracy && gpsAccuracy > maxAccuracy);
    const timestamp = nowIso();
    const deviceInfo = body.deviceInfo || request.headers.get("user-agent") || "dispositivo não identificado";
    const [{ data: schedules }, { data: holidays }] = await Promise.all([
      supabase
        .from("work_schedules")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("active", true)
        .lte("effective_from", today)
        .or(`effective_until.is.null,effective_until.gte.${today}`),
      supabase.from("holidays").select("holiday_date,branch_id,type,active").eq("active", true).eq("holiday_date", today)
    ]);
    const journey = resolveExpectedJourney({
      employee,
      dateKey: today,
      schedules: (schedules || []) as any,
      holidays: (holidays || []) as any
    });

    const { data: todayEntries, error: todayError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("entry_date", today)
      .order("entry_timestamp", { ascending: true });

    if (todayError) return fail("Erro ao buscar registros do dia.", 500, todayError.message);

    const normalizedIdempotencyKey = body.idempotencyKey && /^[a-zA-Z0-9:_-]{12,120}$/.test(body.idempotencyKey) ? body.idempotencyKey : null;
    if (normalizedIdempotencyKey) {
      const { data: repeatedEntry, error: repeatedError } = await supabase
        .from("time_entries")
        .select("*")
        .eq("idempotency_key", normalizedIdempotencyKey)
        .maybeSingle();
      if (repeatedError) return fail("Erro ao verificar tentativa de ponto.", 500, repeatedError.message);
      if (repeatedEntry) {
        return ok({
          entry: repeatedEntry,
          confirmation: "Este ponto já havia sido recebido. Mantivemos o primeiro registro para evitar duplicidade.",
          distanceMeters: repeatedEntry.distance_meters,
          radiusMeters: repeatedEntry.validation_radius_meters,
          accuracyMeters: repeatedEntry.gps_accuracy_meters,
          insideAllowedRadius: repeatedEntry.inside_allowed_radius,
          status: repeatedEntry.status,
          next: getNextActions(todayEntries || [])
        });
      }
    }

    const duplicatedAction = (todayEntries || []).find((entry: any) => entry.action === action && ["valid", "pending_review", "adjusted"].includes(entry.status));
    if (duplicatedAction) {
      return fail("Este ponto já foi registrado hoje.", 409);
    }

    const baseEntry = {
      employee_id: employee.id,
      branch_id: branch.id,
      action,
      entry_timestamp: timestamp,
      entry_date: today,
      latitude: body.latitude,
      longitude: body.longitude,
      distance_meters: distance,
      inside_allowed_radius: inside,
      device_info: deviceInfo,
      idempotency_key: normalizedIdempotencyKey,
      gps_diagnostic_snapshot: {
        branch_id: branch.id,
        branch_name: branch.name,
        branch_latitude: Number(branch.latitude),
        branch_longitude: Number(branch.longitude),
        radius_meters: allowedRadius,
        distance_meters: distance,
        gps_accuracy_meters: gpsAccuracy,
        inside_allowed_radius: inside,
        max_accuracy_meters: maxAccuracy,
        gps_ready: Boolean((branch as any).gps_ready) || (branch as any).geolocation_status === "confirmed"
      },
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
      gps_accuracy_meters: gpsAccuracy,
      validation_branch_id: branch.id,
      validation_branch_latitude: Number(branch.latitude),
      validation_branch_longitude: Number(branch.longitude),
      validation_radius_meters: allowedRadius,
      validation_notes: poorAccuracy ? `Precisão GPS acima do limite configurado (${gpsAccuracy}m > ${maxAccuracy}m).` : null,
      expected_start_time: journey.expected_start_time,
      expected_end_time: journey.expected_end_time,
      expected_daily_minutes: journey.expected_daily_minutes,
      expected_lunch_minutes: journey.expected_lunch_minutes,
      expected_lunch_start_time: journey.expected_lunch_start_time || null,
      expected_lunch_end_time: journey.expected_lunch_end_time || null
    };

    if (poorAccuracy && settings.block_poor_gps_accuracy === true) {
      await supabase.from("time_entries").insert({
        ...baseEntry,
        status: "blocked",
        occurrence_review_status: "rejected",
        review_flags: ["gps_impreciso", "poor_gps_accuracy"],
        schedule_compliance_status: "blocked"
      });
      return fail(`A precisão do GPS está acima do limite permitido (${gpsAccuracy}m > ${maxAccuracy}m). Ative alta precisão e tente novamente.`, 403);
    }

    if (!inside && !settings.allow_outside_radius_review) {
      await supabase.from("time_entries").insert({
        ...baseEntry,
        status: "blocked",
        occurrence_review_status: "rejected",
        review_flags: ["ponto_fora_do_raio", "outside_radius"],
        schedule_compliance_status: "blocked"
      });
      return fail(`Você está a ${distance}m da filial. O raio permitido é ${allowedRadius}m.`, 403);
    }

    if (isOutOfOrder(action, todayEntries || [])) {
      await supabase.from("time_entries").insert({
        ...baseEntry,
        status: "blocked",
        occurrence_review_status: "rejected",
        review_flags: ["ponto_fora_de_ordem"],
        schedule_compliance_status: "blocked"
      });
      const next = getNextActions(todayEntries || []);
      return fail(
        next.recommended
          ? `Ação fora de ordem. Próximo ponto esperado: ${actionLabels[next.recommended]}.`
          : "O expediente de hoje já foi encerrado.",
        409
      );
    }

    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    const reviewFlags: string[] = inside ? [] : ["ponto_fora_do_raio", "outside_radius"];
    if (poorAccuracy) reviewFlags.push("gps_impreciso", "poor_gps_accuracy");
    const registeredMinutes = minutesSinceMidnight(new Date(timestamp));
    if (action === "start_shift") {
      lateMinutes = computeLateFromJourney(journey, registeredMinutes, Number(settings.late_tolerance_minutes || 15));
      if (lateMinutes > 0) reviewFlags.push("atraso_com_justificativa");
    }
    if (action === "end_shift") {
      earlyLeaveMinutes = computeEarlyLeaveFromJourney(journey, registeredMinutes, Number(settings.early_leave_tolerance_minutes || 15));
      if (earlyLeaveMinutes > 0) reviewFlags.push("saida_antecipada_com_justificativa");
    }

    let lunchVariationMinutes = 0;
    let scheduleComplianceStatus: "not_evaluated" | "ok" | "late" | "early_leave" | "lunch_early" | "lunch_late" | "lunch_long" | "journey_incomplete" = "not_evaluated";
    const lunchTolerance = Number(settings.lunch_tolerance_minutes || settings.late_tolerance_minutes || 15);
    if (action === "start_shift" && lateMinutes > 0) scheduleComplianceStatus = "late";
    if (action === "end_shift" && earlyLeaveMinutes > 0) scheduleComplianceStatus = "early_leave";
    if (action === "start_lunch" && journey.expected_lunch_start_time) {
      const expectedLunchStart = parseTimeToMinutes(journey.expected_lunch_start_time);
      const earlyLunch = expectedLunchStart - registeredMinutes;
      if (earlyLunch > lunchTolerance) {
        lunchVariationMinutes = earlyLunch;
        scheduleComplianceStatus = "lunch_early";
        reviewFlags.push("saida_almoco_antecipada");
      }
    }
    if (action === "end_lunch" && journey.expected_lunch_end_time) {
      const expectedLunchEnd = parseTimeToMinutes(journey.expected_lunch_end_time);
      const lateLunchReturn = registeredMinutes - expectedLunchEnd;
      if (lateLunchReturn > lunchTolerance) {
        lunchVariationMinutes = lateLunchReturn;
        scheduleComplianceStatus = "lunch_late";
        reviewFlags.push("retorno_almoco_atrasado");
      }
      const lunchStart = (todayEntries || []).find((entry: any) => entry.action === "start_lunch" && ["valid", "pending_review", "adjusted"].includes(entry.status));
      if (lunchStart?.entry_timestamp && journey.expected_lunch_minutes) {
        const lunchStartMinutes = minutesSinceMidnight(new Date(lunchStart.entry_timestamp));
        const lunchDuration = registeredMinutes - lunchStartMinutes;
        const lunchOver = lunchDuration - Number(journey.expected_lunch_minutes || 0);
        if (lunchOver > lunchTolerance) {
          lunchVariationMinutes = Math.max(lunchVariationMinutes, lunchOver);
          scheduleComplianceStatus = "lunch_long";
          reviewFlags.push("intervalo_maior_que_previsto");
        }
      }
    }
    if (scheduleComplianceStatus === "not_evaluated") scheduleComplianceStatus = reviewFlags.length ? "ok" : "ok";

    const needsJustification = lateMinutes > 0 || earlyLeaveMinutes > 0 || ["lunch_early", "lunch_late", "lunch_long"].includes(scheduleComplianceStatus);
    const needsReview = needsJustification || !inside || (poorAccuracy && Boolean(settings.require_review_on_poor_gps_accuracy));
    if (needsJustification && !body.justificationText?.trim()) {
      return ok(
        {
          requiresJustification: true,
          reason: lateMinutes > 0 ? "late" : earlyLeaveMinutes > 0 ? "early_leave" : scheduleComplianceStatus,
          lateMinutes,
          earlyLeaveMinutes,
          lunchVariationMinutes,
          message:
            lateMinutes > 0
              ? `Atraso de ${lateMinutes} minutos. Informe uma justificativa para registrar.`
              : earlyLeaveMinutes > 0
                ? `Saída antecipada de ${earlyLeaveMinutes} minutos. Informe uma justificativa para registrar.`
                : `Ocorrência no horário de almoço (${lunchVariationMinutes} minutos). Informe uma justificativa para registrar.`
        },
        { status: 202 }
      );
    }

    const { data: entry, error: insertError } = await supabase
      .from("time_entries")
      .insert({
        ...baseEntry,
        late_minutes: lateMinutes,
        early_leave_minutes: earlyLeaveMinutes,
        lunch_variation_minutes: lunchVariationMinutes,
        schedule_compliance_status: scheduleComplianceStatus,
        required_justification: needsJustification,
        justification_text: body.justificationText?.trim() || null,
        status: needsReview ? "pending_review" : "valid",
        occurrence_review_status: needsReview ? "pending_review" : "approved",
        review_flags: reviewFlags
      })
      .select("*")
      .single();

    if (insertError) {
      if ((insertError as any).code === "23505") {
        return fail("Este ponto já foi registrado hoje.", 409, insertError.message);
      }
      return fail("Não foi possível registrar o ponto.", 500, insertError.message);
    }

    const { data: refreshedEntries } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("entry_date", today)
      .order("entry_timestamp", { ascending: true });

    return ok({
      entry,
      confirmation: !inside ? `${actionLabels[action]} registrado e enviado para revisão.` : `${actionLabels[action]} registrado com sucesso.`,
      distanceMeters: distance,
      radiusMeters: allowedRadius,
      accuracyMeters: gpsAccuracy,
      insideAllowedRadius: inside,
      status: entry.status,
      next: getNextActions(refreshedEntries || [])
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro inesperado.", 500);
  }
}
