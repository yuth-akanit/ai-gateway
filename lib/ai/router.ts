import { supabaseAdmin } from "../supabase/admin";
import { AiRunRequest } from "./types";

export async function loadRoutingRule(mode: string, taskType: string) {
  const { data, error } = await supabaseAdmin
    .from("ai_routing_rules")
    .select("*")
    .eq("mode", mode)
    .eq("task_type", taskType)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(`Failed to load routing rule: ${error.message}`);
  if (!data) throw new Error(`No active routing rule for ${mode}/${taskType}`);

  return data;
}

export async function loadPrompt(mode: string, taskType: string) {
  const { data, error } = await supabaseAdmin
    .from("ai_prompts")
    .select("*")
    .eq("mode", mode)
    .eq("task_type", taskType)
    .eq("status", "active")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load prompt: ${error.message}`);
  if (!data) throw new Error(`No active prompt for ${mode}/${taskType}`);

  return data;
}

export async function chooseModel(rule: any, request: AiRunRequest) {
  // V1 Pilot Override: Always use OpenAI gpt-4o-mini
  return {
      provider: "openai",
      model_name: "gpt-4o-mini",
      prompt_key: "ai_gateway_v1",
      version: 1
  };
}
