create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger blueprints_updated_at before update on blueprints
  for each row execute function set_updated_at();

create trigger drops_updated_at before update on drops
  for each row execute function set_updated_at();

create trigger signals_updated_at before update on signals
  for each row execute function set_updated_at();

create or replace function sync_drop_counts()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'UPDATE' and new.drop_id is not null) then
    update drops set
      signal_count = (
        select count(*) from signals where drop_id = new.drop_id
      ),
      deployed_count = (
        select count(*) from signals
        where drop_id = new.drop_id and status in ('deployed', 'live')
      )
    where id = new.drop_id;
  end if;
  return new;
end;
$$;

create trigger signals_sync_drop_counts after insert or update on signals
  for each row execute function sync_drop_counts();

create or replace function check_drop_ready()
returns trigger language plpgsql as $$
begin
  if (new.deployed_count > 0 and new.deployed_count = new.signal_count) then
    update drops set status = 'rc' where id = new.id and status = 'active';
  end if;
  return new;
end;
$$;

create trigger drops_check_ready after update on drops
  for each row execute function check_drop_ready();
