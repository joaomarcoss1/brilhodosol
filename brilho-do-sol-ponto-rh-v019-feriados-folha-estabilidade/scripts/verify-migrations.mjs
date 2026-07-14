import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifyPolicies(sql, filename) {
  const policies = [...sql.matchAll(/create\s+policy\s+"([^"]+)"/gi)].map((match) => match[1]);
  const hasVersionSweep = /from\s+pg_policies[\s\S]*policyname\s+like\s+'v017 %'[\s\S]*drop policy if exists/gi.test(sql);
  for (const policy of policies) {
    if (policy.startsWith("v017 ") && hasVersionSweep) continue;
    const escaped = policy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert(new RegExp(`drop\\s+policy\\s+if\\s+exists\\s+"${escaped}"`, "i").test(sql), `${filename}: policy ${policy} não possui DROP POLICY IF EXISTS.`);
  }
}

const v17Path = "supabase/migrations/016_v017_seguranca_final_homologacao_producao.sql";
const v19Path = "supabase/migrations/018_v019_holiday_operations_payroll_hardening.sql";
const v17 = read(v17Path);
const v19 = read(v19Path);

verifyPolicies(v17, v17Path);
verifyPolicies(v19, v19Path);
assert(/create\s+table\s+if\s+not\s+exists\s+public\.holiday_operation_decisions/i.test(v19), "v019 deve criar holiday_operation_decisions de forma idempotente.");
assert(/add\s+column\s+if\s+not\s+exists\s+termination_date/i.test(v19), "v019 deve adicionar termination_date com IF NOT EXISTS.");
assert(/create\s+unique\s+index\s+if\s+not\s+exists\s+uq_holiday_operation_decision_scope/i.test(v19), "v019 deve possuir índice único idempotente para decisões.");
assert(!/\bpin_hash\b|\bpin_code\b|add\s+column\s+if\s+not\s+exists\s+pin\b/i.test(v19), "A migration v019 não pode alterar PIN ou pin_hash.");

console.log("Migrations v017 e v019 verificadas: policies idempotentes e PIN preservado.");
