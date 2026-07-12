import { NextRequest } from "next/server";
import { actionLabels } from "@/lib/constants";
import { dateKeyInTimezone, getNextActions } from "@/lib/calculations";
import { getSupabaseAdmin } from "@/lib/server/db";
import { fail, ok, readJson } from "@/lib/server/http";
import { assertPin, getGenericPinErrorMessage, getPinBlockMessage, isPinTemporarilyBlocked, recordPinAttempt, verifyPin } from "@/lib/server/pin";


export async function POST(request: NextRequest) {
  try {
    const body = await readJson<{ employeeId?: string; pin?: string }>(request);
    const employeeId = body.employeeId;
    const pin = assertPin(body.pin);
    if (!employeeId) return fail("Selecione um funcionário.", 400);

    const supabase = getSupabaseAdmin();
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, full_name, role, pin_hash, branch_id, branches(id,name)")
      .eq("id", employeeId)
      .eq("active", true)
      .maybeSingle();

    if (employeeError) return fail("Erro ao validar funcionário.", 500, employeeError.message);
    if (!employee) return fail("Funcionário ativo não encontrado.", 404);
    if (await isPinTemporarilyBlocked({ supabase, employeeId: employee.id })) {
      return fail(getPinBlockMessage(), 429);
    }
    const validPin = await verifyPin(pin, employee.pin_hash);
    await recordPinAttempt({
      supabase,
      employeeId: employee.id,
      headers: request.headers,
      deviceInfo: request.headers.get("user-agent"),
      success: validPin,
      reason: validPin ? "clock_state" : "invalid_pin_state"
    });
    if (!validPin) return fail(getGenericPinErrorMessage(), 401);

    const today = dateKeyInTimezone();
    const { data: entries, error: entriesError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("entry_date", today)
      .order("entry_timestamp", { ascending: true });

    if (entriesError) return fail("Erro ao buscar pontos do dia.", 500, entriesError.message);

    const next = getNextActions(entries || []);
    return ok({
      employee: {
        id: employee.id,
        full_name: employee.full_name,
        role: employee.role,
        branch_id: employee.branch_id,
        branch_name: (employee.branches as any)?.name
      },
      today,
      entries: entries || [],
      next,
      nextLabel: next.recommended ? actionLabels[next.recommended] : "Dia finalizado"
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro inesperado.", 500);
  }
}
