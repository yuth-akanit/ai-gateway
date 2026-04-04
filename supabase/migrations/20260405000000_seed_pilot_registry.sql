-- Seed System Registry for Pilot
insert into public.system_registry
(system_key, system_name, description, source_of_truth, main_tables, main_rpcs, notes)
values
(
  'booking-intake',
  'Admin Booking Intake System',
  'System for parsing and creating bookings from various sources like LINE, Phone, and Email.',
  'Supabase Postgres Database',
  '["bookings", "customers", "idempotency_keys"]'::jsonb,
  '["create_booking_v4", "check_duplicate_booking"]'::jsonb,
  'Ensures idempotency using external_id and source_type. Main entry point is the Next.js API Gateway.'
),
(
  'ops-closeout',
  'Operations Closeout & Reporting',
  'System for managing job completion status, technician reporting, and final invoicing.',
  'n8n Workflows + Supabase Status Logs',
  '["job_status_logs", "technician_reports", "final_invoices"]'::jsonb,
  '["close_job_transactional"]'::jsonb,
  'Uses "completed" and "verified" as canonical states for job closure. Flow includes admin review for discrepancies.'
)
on conflict (system_key) do update set
  system_name = excluded.system_name,
  description = excluded.description,
  source_of_truth = excluded.source_of_truth,
  main_tables = excluded.main_tables,
  main_rpcs = excluded.main_rpcs,
  notes = excluded.notes;
