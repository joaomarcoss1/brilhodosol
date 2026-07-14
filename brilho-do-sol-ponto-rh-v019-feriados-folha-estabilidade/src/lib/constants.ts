import type { TimeAction, TimeEntryStatus } from "@/types/domain";

export const TIMEZONE = process.env.DEFAULT_TIMEZONE || "America/Fortaleza";

export const actionLabels: Record<TimeAction, string> = {
  start_shift: "Iniciar expediente",
  start_lunch: "Sair para almoço",
  end_lunch: "Voltar do almoço",
  end_shift: "Encerrar expediente"
};

export const statusLabels: Record<TimeEntryStatus, string> = {
  valid: "Válido",
  pending_review: "Pendente de revisão",
  adjusted: "Ajustado",
  blocked: "Bloqueado",
  canceled: "Cancelado"
};

export const orderedActions: TimeAction[] = ["start_shift", "start_lunch", "end_lunch", "end_shift"];

export const defaultSettings = {
  late_tolerance_minutes: 15,
  early_leave_tolerance_minutes: 15,
  default_radius_meters: 900,
  overtime_multiplier: 1.5,
  daily_rate_calculation: "expected_work_days",
  company_name: "Brilho do Sol Supermercado",
  company_document: "",
  company_address: "",
  report_footer: "Relatório gerado pelo sistema Brilho do Sol Ponto e RH",
  allow_outside_radius_review: false,
  auto_approve_overtime: false,
  primary_color: "#078d3a",
  secondary_color: "#ffc107",
  max_gps_accuracy_meters: 120,
  require_review_on_poor_gps_accuracy: true,
  block_poor_gps_accuracy: false,
  block_clock_without_confirmed_branch_gps: true,
  lunch_tolerance_minutes: 15,
  allow_different_branch_with_authorization: true,
  google_maps_enabled: true,
  payroll_block_critical_pending: true,
  payroll_pdf_max_detailed_rows: 300,
  payroll_pdf_block_rows: 1500,
  holiday_decision_notification_days: 7
} as const;
