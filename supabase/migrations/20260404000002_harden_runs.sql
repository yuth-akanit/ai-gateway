-- Add V1.1 hardening columns
alter table public.ai_runs 
add column if not exists is_retriable boolean default false,
add column if not exists failure_stage text;
