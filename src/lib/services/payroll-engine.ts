import {
  calculateWorkedMinutes,
  eachDateInclusive,
  normalizeMoney,
  resolveDailyRate
} from "@/lib/calculations";
import { approvedOvertimeForDate } from "@/lib/services/overtime-engine";
import { resolveExpectedJourney, type WorkScheduleRule } from "@/lib/services/schedule-engine";
import type { Employee, MinimalHoliday, PayrollPeriodType, SystemSettings, TimeEntry } from "@/types/domain";

export function calculatePayrollItemWithEngines(params: {
  employee: Employee;
  entries: TimeEntry[];
  justifications: any[];
  holidays: MinimalHoliday[];
  schedules: WorkScheduleRule[];
  overtimeReviews: any[];
  settings: SystemSettings;
  startDate: string;
  endDate: string;
  periodType: PayrollPeriodType;
}) {
  const { employee, entries, justifications, holidays, schedules, overtimeReviews, settings, startDate, endDate, periodType } = params;
  const dates = eachDateInclusive(startDate, endDate);
  const expectedDays = dates.filter((date) => resolveExpectedJourney({ employee, dateKey: date, schedules, holidays }).expected).length;
  const businessDays = dates.filter((date) => {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    const isHoliday = holidays.some((holiday) => holiday.active && holiday.holiday_date === date && (!holiday.branch_id || holiday.branch_id === employee.branch_id));
    return !isWeekend && !isHoliday;
  }).length;
  const dailyRateBaseDays = settings.daily_rate_calculation === "business_days" ? businessDays : expectedDays;
  const dailyRate = resolveDailyRate(employee, dailyRateBaseDays, settings.daily_rate_calculation);

  let workedDays = 0;
  let approvedAbsences = 0;
  let pendingAbsences = 0;
  let rejectedAbsences = 0;
  let discountedAbsences = 0;
  let identifiedAbsences = 0;
  let extraDays = 0;
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let calculatedOvertimeMinutes = 0;
  let approvedOvertimeMinutes = 0;

  for (const date of dates) {
    const journey = resolveExpectedJourney({ employee, dateKey: date, schedules, holidays });
    const dayEntries = entries.filter((entry) => entry.entry_date === date);
    const hasStart = dayEntries.some((entry) => entry.action === "start_shift" && ["valid", "pending_review", "adjusted"].includes(entry.status));

    lateMinutes += dayEntries
      .filter((entry) => entry.occurrence_review_status !== "approved")
      .reduce((sum, entry) => sum + Number(entry.late_minutes || 0), 0);
    earlyLeaveMinutes += dayEntries
      .filter((entry) => entry.occurrence_review_status !== "approved")
      .reduce((sum, entry) => sum + Number(entry.early_leave_minutes || 0), 0);

    if (hasStart) {
      workedDays += journey.expected ? 1 : 0;
      extraDays += journey.expected ? 0 : 1;
      const workedMinutes = calculateWorkedMinutes(dayEntries);
      const calculatedExtra = Math.max(0, workedMinutes - (journey.expected ? journey.expected_daily_minutes : 0));
      calculatedOvertimeMinutes += calculatedExtra;
      approvedOvertimeMinutes += approvedOvertimeForDate(overtimeReviews, employee.id, date);
      continue;
    }

    if (!journey.expected) continue;
    identifiedAbsences += 1;
    const justification = justifications.find((item) => item.employee_id === employee.id && item.absence_date === date);
    if (justification?.status === "approved") approvedAbsences += 1;
    else if (justification?.status === "pending") {
      pendingAbsences += 1;
      discountedAbsences += 1;
    } else {
      if (justification?.status === "rejected") rejectedAbsences += 1;
      discountedAbsences += 1;
    }
  }

  const baseSalary =
    employee.employment_type === "diarista"
      ? normalizeMoney(dailyRate * workedDays)
      : employee.employment_type === "mensalista" && periodType === "monthly"
        ? normalizeMoney(employee.monthly_salary)
        : normalizeMoney(dailyRate * expectedDays);

  const expectedDailyMinutes = Number(employee.expected_daily_minutes || 480);
  const hourValue = expectedDailyMinutes > 0 ? dailyRate / expectedDailyMinutes : 0;
  const absenceDiscount = employee.employment_type === "diarista" ? 0 : normalizeMoney(discountedAbsences * dailyRate);
  const overtimeAmount = normalizeMoney(approvedOvertimeMinutes * hourValue * Number(settings.overtime_multiplier || 1));
  const extraDayAmount = normalizeMoney(extraDays * dailyRate);
  const finalAmount = normalizeMoney(baseSalary - absenceDiscount + overtimeAmount + extraDayAmount);

  return {
    base_salary: baseSalary,
    daily_rate: dailyRate,
    daily_rate_base_days: dailyRateBaseDays,
    business_days: businessDays,
    expected_work_days: expectedDays,
    worked_days: workedDays,
    approved_absences: approvedAbsences,
    pending_absences: pendingAbsences,
    rejected_absences: rejectedAbsences,
    discounted_absences: discountedAbsences,
    identified_absences: identifiedAbsences,
    total_late_minutes: lateMinutes,
    total_early_leave_minutes: earlyLeaveMinutes,
    calculated_overtime_minutes: calculatedOvertimeMinutes,
    overtime_minutes: approvedOvertimeMinutes,
    approved_overtime_minutes: approvedOvertimeMinutes,
    extra_days: extraDays,
    absence_discount_amount: absenceDiscount,
    overtime_amount: overtimeAmount,
    extra_day_amount: extraDayAmount,
    final_amount: finalAmount
  };
}
