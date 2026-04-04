import { AiRunRequest } from "./types";

export function validateAiRunRequest(body: any): 
  | { ok: true; data: AiRunRequest }
  | { ok: false; code: string; message: string }
{
  if (!body) return { ok: false, code: "MISSING_BODY", message: "Request body is required." };

  const { mode, task_type, input } = body;

  if (!mode || !["idea", "answer", "build"].includes(mode)) {
    return { ok: false, code: "INVALID_MODE", message: "Mode must be 'idea', 'answer', or 'build'." };
  }

  if (!task_type || typeof task_type !== "string") {
    return { ok: false, code: "INVALID_TASK_TYPE", message: "Task type is required." };
  }

  if (!input || typeof input !== "object") {
    return { ok: false, code: "INVALID_INPUT", message: "Input object is required." };
  }

  return { ok: true, data: body as AiRunRequest };
}
