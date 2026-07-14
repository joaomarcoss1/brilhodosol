import { getSupabaseAdmin } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/http";


export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("branches")
      .select("id,name,type,allowed_radius_meters")
      .eq("active", true)
      .order("name", { ascending: true });
    if (error) return fail("Erro ao listar filiais.", 500, error.message);
    return ok({ branches: data || [] });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro inesperado.", 500);
  }
}
