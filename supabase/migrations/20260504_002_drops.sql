create table if not exists drops (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references blueprints(id) on delete cascade,
  version text not null,
  drop_type text not null default 'minor'
    check (drop_type in ('major', 'minor', 'patch', 'hotfix')),
  status text not null default 'planning'
    check (status in ('planning', 'active', 'rc', 'released', 'archived')),
  target_date date,
  shipped_date date,
  release_notes text,
  notion_spec_url text,
  signal_count int not null default 0,
  deployed_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (blueprint_id, version)
);
