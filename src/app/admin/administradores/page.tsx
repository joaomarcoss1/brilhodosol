"use client";

import {
  ResourceManager,
  activeBadge,
} from "@/components/admin/ResourceManager";

const fields = [
  { name: "full_name", label: "Nome completo" },
  { name: "email", label: "E-mail", type: "text" as const },
  {
    name: "password",
    label: "Senha inicial opcional",
    type: "password" as const,
    hiddenOnEdit: true,
    placeholder:
      "Use para criar login novo; deixe vazio para promover usuário existente",
  },
  {
    name: "role",
    label: "Permissão",
    type: "select" as const,
    options: [
      { label: "Admin master", value: "master_admin" },
      { label: "Admin legado", value: "admin" },
      { label: "Admin geral", value: "admin_geral" },
      { label: "Gerente de filial", value: "gerente_filial" },
      { label: "RH/Financeiro", value: "rh_financeiro" },
    ],
  },
  {
    name: "branch_id",
    label: "Filial principal",
    type: "select" as const,
    optionsEndpoint: "/api/admin/branches?status=active",
    optionsKey: "branches",
    optionLabel: "name",
  },
  {
    name: "allowed_branch_ids",
    label: "Filiais permitidas",
    placeholder: "IDs separados por vírgula; vazio = todas, conforme perfil",
  },
  {
    name: "can_view_financial_data",
    label: "Pode ver dados financeiros",
    type: "checkbox" as const,
  },
  { name: "active", label: "Ativo", type: "checkbox" as const },
];

export default function Page() {
  return (
    <ResourceManager
      title="Gestão de administradores"
      description="Somente admin master pode criar novo login ou promover um usuário existente pelo e-mail. Use perfil e filiais para controlar acesso."
      endpoint="/api/admin/admins"
      collectionKey="admins"
      fields={fields}
      columns={[
        { key: "full_name", label: "Nome" },
        { key: "email", label: "E-mail" },
        { key: "role", label: "Permissão" },
        {
          key: "branches",
          label: "Filial",
          render: (item: any) => item.branches?.name || "Todas/geral",
        },
        {
          key: "can_view_financial_data",
          label: "Financeiro",
          render: (item: any) => (item.can_view_financial_data ? "Sim" : "Não"),
        },
        {
          key: "active",
          label: "Status",
          render: (item: any) => activeBadge(item.active),
        },
      ]}
      defaultValues={{
        role: "admin_geral",
        active: true,
        can_view_financial_data: false,
      }}
    />
  );
}
