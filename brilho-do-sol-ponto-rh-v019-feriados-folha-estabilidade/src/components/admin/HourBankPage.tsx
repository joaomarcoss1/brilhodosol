"use client";
import { ResourceManager } from "@/components/admin/ResourceManager";
import { Badge } from "@/components/ui/badge";
import { minutesToHourText } from "@/lib/format";

const fields = [
  { name: "employee_id", label: "Funcionário", type: "select" as const, optionsEndpoint: "/api/admin/employees?status=active", optionsKey: "employees", optionLabel: "full_name" },
  { name: "branch_id", label: "Filial", type: "select" as const, optionsEndpoint: "/api/admin/branches?status=active", optionsKey: "branches", optionLabel: "name" },
  { name: "movement_date", label: "Data", type: "date" as const },
  { name: "minutes", label: "Minutos (+ crédito / - débito)", type: "number" as const },
  { name: "movement_type", label: "Tipo", type: "select" as const, options: [ { label: "Crédito de hora", value: "credit" }, { label: "Compensação", value: "compensation" }, { label: "Ajuste manual", value: "manual_adjustment" } ] },
  { name: "reason", label: "Motivo" }
];
const columns = [
  { key: "employees", label: "Funcionário", render: (item: any) => item.employees?.full_name || "-" },
  { key: "branches", label: "Filial", render: (item: any) => item.branches?.name || "-" },
  { key: "movement_date", label: "Data" },
  { key: "minutes", label: "Saldo", render: (item: any) => <Badge tone={Number(item.minutes) >= 0 ? "green" : "red"}>{minutesToHourText(item.minutes)}</Badge> },
  { key: "movement_type", label: "Tipo" },
  { key: "reason", label: "Motivo" }
];
export function HourBankPage() { return <ResourceManager title="Banco de horas" description="Controle de saldos positivos, compensações, ajustes manuais e histórico por funcionário/filial." endpoint="/api/admin/hour-bank" collectionKey="movements" fields={fields} columns={columns} defaultValues={{ movement_date: new Date().toISOString().slice(0,10), movement_type: "manual_adjustment" }} />; }
