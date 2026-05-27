create table if not exists blueprints (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  current_version text default '0.1.0',
  status text not null default 'active'
    check (status in ('active', 'archived', 'paused')),
  notion_page_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into blueprints (slug, name, description, current_version) values
  ('bfc-sub', 'bfc-sub Compliance Automation', 'Subcontractor cert, lien waiver, W-9, and payment gate automation for mid-market GCs', '1.0.0'),
  ('ncino-blueprint', 'nCino Banking Reporting Blueprint', 'Banking reporting automation for nCino SBB and Commercial Banking', '0.1.0'),
  ('agency-internal', 'Agency Internal Tooling', 'CRM, release tracker, credential vault, and reporting infrastructure', '0.1.0');
