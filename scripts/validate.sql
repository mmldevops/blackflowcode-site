-- Confirm all three tables exist
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('blueprints', 'drops', 'signals');

-- Confirm seed data
select slug, name, current_version from blueprints order by name;

-- Confirm triggers are wired
select trigger_name, event_object_table
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table;
