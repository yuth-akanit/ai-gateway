-- Create tables
create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_name text not null,
  category text not null,
  tier text not null,
  supports_json boolean not null default false,
  supports_tools boolean not null default false,
  supports_vision boolean not null default false,
  supports_long_context boolean not null default false,
  max_context integer,
  max_output_tokens integer,
  latency_tier text,
  quality_score numeric(5,2),
  coding_score numeric(5,2),
  thai_score numeric(5,2),
  cost_input numeric(12,6),
  cost_output numeric(12,6),
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, model_name)
);

create table if not exists public.ai_routing_rules (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  task_type text not null,
  preferred_tier text not null,
  fallback_tier text,
  required_capabilities jsonb not null default '[]'::jsonb,
  preferred_providers jsonb not null default '[]'::jsonb,
  banned_providers jsonb not null default '[]'::jsonb,
  require_json boolean not null default false,
  require_code_fence boolean not null default false,
  risk_level text not null default 'medium',
  max_retries integer not null default 2,
  timeout_ms integer not null default 45000,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(mode, task_type)
);

create table if not exists public.ai_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null,
  version integer not null,
  mode text not null,
  task_type text not null,
  system_prompt text not null,
  developer_prompt text,
  output_format text not null default 'markdown',
  output_schema jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(prompt_key, version)
);

create table if not exists public.ai_tasks (
  id uuid primary key default gen_random_uuid(),
  trace_id text,
  source text,
  mode text not null,
  task_type text not null,
  priority text not null default 'medium',
  risk_level text not null default 'medium',
  requested_tier text,
  input_payload jsonb not null,
  context_payload jsonb,
  constraints jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.ai_tasks(id) on delete set null,
  provider text not null,
  model_name text not null,
  prompt_key text,
  prompt_version integer,
  request_payload jsonb,
  response_payload jsonb,
  normalized_output jsonb,
  raw_text text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  retry_count integer not null default 0,
  success boolean not null default false,
  error_code text,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_eval_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_runs(id) on delete cascade,
  format_score numeric(5,2),
  usefulness_score numeric(5,2),
  correctness_score numeric(5,2),
  cost_score numeric(5,2),
  latency_score numeric(5,2),
  reviewer text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.system_registry (
  id uuid primary key default gen_random_uuid(),
  system_key text not null unique,
  system_name text not null,
  description text,
  source_of_truth text,
  main_tables jsonb not null default '[]'::jsonb,
  main_rpcs jsonb not null default '[]'::jsonb,
  main_views jsonb not null default '[]'::jsonb,
  endpoints jsonb not null default '[]'::jsonb,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_registry (
  id uuid primary key default gen_random_uuid(),
  workflow_key text not null unique,
  workflow_name text not null,
  platform text not null default 'n8n',
  trigger_type text,
  purpose text,
  input_contract jsonb,
  output_contract jsonb,
  dependencies jsonb not null default '[]'::jsonb,
  failure_modes jsonb not null default '[]'::jsonb,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.build_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  asset_key text not null,
  title text not null,
  content_md text not null,
  related_project text,
  tags jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(asset_type, asset_key, version)
);

create table if not exists public.knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null,
  title text not null,
  source text,
  content_md text not null,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed Routing Rules
insert into public.ai_routing_rules
(mode, task_type, preferred_tier, fallback_tier, required_capabilities, preferred_providers, require_json, risk_level)
values
('idea', 'automation_brainstorm', 'premium', 'balanced', '["reasoning","thai","structured_thinking"]'::jsonb, '[]'::jsonb, false, 'medium'),
('idea', 'business_opportunity_scan', 'premium', 'balanced', '["reasoning","ranking","roi_analysis"]'::jsonb, '[]'::jsonb, false, 'medium'),
('answer', 'project_qa', 'balanced', 'premium', '["grounded_answer","thai","context_retrieval"]'::jsonb, '[]'::jsonb, false, 'medium'),
('answer', 'system_explainer', 'balanced', 'premium', '["precision","architecture_reasoning"]'::jsonb, '[]'::jsonb, false, 'medium'),
('build', 'sql_schema_design', 'premium', 'balanced', '["coding","sql","schema_design","json_output"]'::jsonb, '[]'::jsonb, true, 'high'),
('build', 'n8n_workflow_design', 'premium', 'balanced', '["automation","workflow_design","json_output"]'::jsonb, '[]'::jsonb, true, 'high'),
('build', 'app_spec_design', 'premium', 'balanced', '["architecture","coding","contract_design"]'::jsonb, '[]'::jsonb, false, 'high'),
('build', 'bug_fix_analysis', 'premium', 'balanced', '["debugging","root_cause_analysis","coding"]'::jsonb, '[]'::jsonb, false, 'high')
on conflict (mode, task_type) do nothing;

-- Seed Models
insert into public.ai_models
(provider, model_name, category, tier, supports_json, supports_tools, supports_long_context, max_context, latency_tier, quality_score, coding_score, thai_score, status)
values
('openai', 'gpt-premium', 'coding', 'premium', true, true, true, 200000, 'medium', 9.2, 9.4, 8.8, 'active'),
('anthropic', 'claude-premium', 'reasoning', 'premium', true, true, true, 200000, 'medium', 9.4, 8.9, 8.7, 'active'),
('openrouter', 'router-balanced', 'reasoning', 'balanced', true, false, true, 128000, 'low', 8.4, 8.0, 8.3, 'active'),
('together', 'fast-cheap-model', 'reasoning', 'cheap_fast', true, false, false, 32000, 'low', 7.4, 6.9, 7.8, 'active'),
('fal', 'image-gen', 'media', 'specialized', false, false, false, null, 'medium', 8.5, null, null, 'active')
on conflict (provider, model_name) do nothing;
