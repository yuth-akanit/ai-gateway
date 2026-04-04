export type AiMode = "idea" | "answer" | "build";

export type AiRunRequest = {
  trace_id?: string;
  source?: string;
  mode: AiMode;
  task_type: string;
  input: Record<string, any>;
  context?: Record<string, any>;
  constraints?: Record<string, any>;
};

export type AiRunResponse = {
  ok: boolean;
  trace_id?: string;
  mode?: string;
  task_type?: string;
  provider?: string;
  model?: string;
  prompt_key?: string;
  prompt_version?: number;
  latency_ms?: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  result?: {
    format: string;
    text: string;
    parsed?: any;
  };
  code?: string;
  message?: string;
  failure_stage?: string | null;
  is_retriable?: boolean;
};
