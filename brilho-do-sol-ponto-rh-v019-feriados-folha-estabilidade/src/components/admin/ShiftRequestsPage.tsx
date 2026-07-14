"use client";
import { ResourceManager } from "@/components/admin/ResourceManager";
import { Badge } from "@/components/ui/badge";
const fields = [
  { name: "employee_id", label: "Funcionário", type: "select" as const, optionsEndpoint: "/api/admin/employees?status=active", optionsKey: "employees", optionLabel: "full_name" },
  { name: "branch_id", label: "Filial", type: "select" as const, optionsEndpoint: "/api/admin/branches?status=active", optionsKey: "branches", optionLabel: "name" },
  { name: "request_date", label: "Data", type: "date" as const },
  { name: "request_type", label: "Tipo", type: "select" as const, options: [ { label: "Troca de turno", value: "troca_turno" }, { label: "Folga", value: "folga" }, { label: "Compensação", value: "compensacao" }, { label: "Outra filial", value: "outra_filial" } ] },
  { name: "reason", label: "Motivo", type: "textarea" as const },
  { name: "status", label: "Status", type: "select" as const, options: [ { label: "Pendente", value: "pending" }, { label: "Aprovado gerente", value: "approved_manager" }, { label: "Aprovado RH", value: "approved_hr" }, { label: "Rejeitado", value: "rejected" }, { label: "Cancelado", value: "canceled" } ] }
];
const columns = [
  { key: "employees", label: "Funcionário", render: (item: any) => item.employees?.full_name || "-" },
  { key: "branches", label: "Filial", render: (item: any) => item.branches?.name || "-" },
  { key: "request_date", label: "Data" },
  { key: "request_type", label: "Tipo" },
  { key: "status", label: "Status", render: (item: any) => <Badge tone={item.status?.includes("approved") ? "green" : item.status === "rejected" ? "red" : "yellow"}>{item.status}</Badge> },
  { key: "reason", label: "Motivo" }
];
export function ShiftRequestsPage() { return <ResourceManager title="Solicitações de turno e folga" description="Controle solicitações de folga, troca de turno, compensação e trabalho em outra filial com aprovação gerencial/RH." endpoint="/api/admin/shift-requests" collectionKey="requests" fields={fields} columns={columns} defaultValues={{ request_date: new Date().toISOString().slice(0,10), request_type: "troca_turno", status: "pending" }} />; }
