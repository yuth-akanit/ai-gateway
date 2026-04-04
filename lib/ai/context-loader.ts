import { supabaseAdmin } from "../supabase/admin";

export type AiContextParams = {
  mode: "idea" | "answer" | "build";
  taskType: string;
  input: Record<string, unknown>;
  context?: Record<string, any>;
};

export async function loadAiContext(params: AiContextParams) {
  const systemKey = typeof params.context?.system_key === "string"
    ? params.context.system_key
    : null;

  const result: {
    system: any | null;
    workflows: any[];
    buildAssets: any[];
    docs: any[];
  } = {
    system: null,
    workflows: [],
    buildAssets: [],
    docs: [],
  };

  if (!systemKey) return result;

  const { data: systemData } = await supabaseAdmin
    .from("system_registry")
    .select("*")
    .eq("system_key", systemKey)
    .single();

  if (systemData) {
    result.system = systemData;
  }

  return result;
}
