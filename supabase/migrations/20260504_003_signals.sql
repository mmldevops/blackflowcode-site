create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references blueprints(id) on delete cascade,
  drop_id uuid references drops(id) on delete set null,
  title text not null,
  description text,
  signal_type text not null default 'build'
    check (signal_type in ('build', 'break', 'wire', 'probe')),
  priority text not null default 'P2'
    check (priority in ('P0', 'P1', 'P2', 'P3')),
  status text not null default 'queued'
    check (status in ('queued', 'building', 'staging', 'deployed', 'live')),
  source text default 'internal'
    check (source in ('internal', 'client-feedback', 'n8n-trigger', 'supabase-finding')),
  notion_spec_url text,
  estimated_hours numeric(5,1),
  actual_hours numeric(5,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
