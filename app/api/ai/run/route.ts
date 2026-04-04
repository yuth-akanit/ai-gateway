import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { authorizeRequest } from "@/lib/ai/auth";
import { validateAiRunRequest } from "@/lib/ai/validators";
import { loadRoutingRule, loadPrompt, chooseModel } from "@/lib/ai/router";
import { loadAiContext } from "@/lib/ai/context-loader";
import { composeUserPayload } from "@/lib/ai/prompt-composer";
import { executeProvider } from "@/lib/ai/providers";
import { normalizeOutput } from "@/lib/ai/normalize";

export async function POST(req: NextRequest) {
  let taskId: string | null = null;
  let traceId: string | null = null;
  let failureStage: string = "init";

  try {
    // 1) authorize internal caller
    if (!authorizeRequest(req)) {
      return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: "Invalid internal gateway key" }, { status: 401 });
    }

    // 2) validate request
    failureStage = "validation";
    const body = await req.json();
    const validation = validateAiRunRequest(body);

    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, code: validation.code, message: validation.message },
        { status: 400 }
      );
    }

    const payload: typeof validation.data = validation.data;
    traceId = payload.trace_id || `trace_${crypto.randomUUID()}`;

    // 3) create ai_task
    const { data: createdTask, error: taskError } = await supabaseAdmin
      .from("ai_tasks")
      .insert({
        trace_id: traceId,
        source: payload.source || "api.ai.run",
        mode: payload.mode,
        task_type: payload.task_type,
        input_payload: payload.input,
        context_payload: payload.context || {},
        constraints: payload.constraints || {},
        status: "running",
      })
      .select("id")
      .single();

    if (taskError) {
      throw new Error(`Failed to create ai_task: ${taskError.message}`);
    }
    taskId = createdTask.id;

    // 4) load routing rule & prompt
    failureStage = "setup";
    const rule = await loadRoutingRule(payload.mode, payload.task_type);
    const prompt = await loadPrompt(payload.mode, payload.task_type);

    // 5) load retrieved context (Answer/Build)
    failureStage = "retrieval";
    const loadedContext = await loadAiContext({
      mode: payload.mode,
      taskType: payload.task_type,
      input: payload.input,
      context: payload.context,
    });

    // 6) compose final payload (User Input)
    const userPayload = composeUserPayload({
      input: payload.input,
      context: payload.context,
      retrieved: loadedContext,
      constraints: payload.constraints,
    });

    // 6.1) Final Prompt Assembly with Grounding
    const groundedSystemPrompt = `
${prompt.system_prompt}

# GROUNDING INSTRUCTIONS
Use the retrieved context below as the primary source of truth.
If the answer is not supported by the context, explicitly say that information is insufficient.
DO NOT hallucinate or invent system behaviors not found in the context.

${loadedContext.contextBlock}
    `.trim();

    // 7) choose model
    const model = await chooseModel(rule, payload);

    // 8) execute provider
    failureStage = "execution";
    const execResult = await executeProvider({
      provider: model.provider,
      model: model.model_name,
      systemPrompt: groundedSystemPrompt,
      developerPrompt: prompt.developer_prompt || undefined,
      userInput: userPayload as any,
      requireJson: Boolean(rule.require_json || payload.constraints?.require_json),
    });

    // 9) normalize output
    failureStage = "normalization";
    const normalized = normalizeOutput(payload.task_type, execResult.rawText || "");

    // 10) log ai_run
    await supabaseAdmin.from("ai_runs").insert({
      task_id: taskId,
      provider: execResult.provider,
      model_name: execResult.model,
      prompt_key: prompt.prompt_key,
      prompt_version: prompt.version,
      request_payload: {
          payload: userPayload,
          retrieval_debug: loadedContext.debug
      },
      response_payload: execResult,
      raw_text: execResult.rawText || null,
      input_tokens: execResult.inputTokens || null,
      output_tokens: execResult.outputTokens || null,
      latency_ms: execResult.latencyMs || null,
      success: execResult.success,
      error_code: execResult.success ? null : (execResult.errorCode || null),
      error_message: execResult.success ? null : (execResult.errorMessage || null),
      failure_stage: execResult.success ? null : failureStage,
      is_retriable: !execResult.success && execResult.errorCode !== "USER_ERROR",
    });

    if (!execResult.success) {
      await supabaseAdmin.from("ai_tasks").update({ status: "failed" }).eq("id", taskId);
      return NextResponse.json({ 
          ok: false, 
          trace_id: traceId,
          code: execResult.errorCode || "EXECUTION_FAILED",
          message: execResult.errorMessage,
          failure_stage: failureStage,
          is_retriable: !execResult.success && execResult.errorCode !== "USER_ERROR",
        },
        { status: 502 }
      );
    }

    // 11) update ai_task
    await supabaseAdmin.from("ai_tasks").update({ status: "succeeded" }).eq("id", taskId);

    // 12) return normalized response
    return NextResponse.json({
      ok: true,
      trace_id: traceId,
      mode: payload.mode,
      task_type: payload.task_type,
      provider: execResult.provider,
      model: execResult.model,
      prompt_key: prompt.prompt_key,
      prompt_version: prompt.version,
      latency_ms: execResult.latencyMs,
      usage: {
        input_tokens: execResult.inputTokens,
        output_tokens: execResult.outputTokens,
      },
      retrieval_debug: loadedContext.debug,
      result: {
        format: normalized.format,
        text: normalized.text,
        parsed: normalized.parsed
      },
      failure_stage: null,
      is_retriable: false
    });
  } catch (error: any) {
    if (taskId) {
        await supabaseAdmin.from("ai_tasks").update({ status: "failed" }).eq("id", taskId);
        // Log Error in ai_runs if something failed before execution (e.g. prompt missing)
        await supabaseAdmin.from("ai_runs").insert({
            task_id: taskId,
            provider: "gateway",
            model_name: "none",
            success: false,
            error_code: "INTERNAL_ERROR",
            error_message: error?.message,
            failure_stage: failureStage,
            is_retriable: true // Internal errors are often worth retrying
        });
    }

    return NextResponse.json(
      { 
        ok: false, 
        trace_id: traceId,
        code: "INTERNAL_ERROR", 
        message: error?.message || "Unknown error",
        failure_stage: failureStage,
        is_retriable: true
      },
      { status: 500 }
    );
  }
}
