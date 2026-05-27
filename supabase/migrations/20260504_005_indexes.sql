create index idx_signals_blueprint on signals(blueprint_id);
create index idx_signals_drop on signals(drop_id);
create index idx_signals_status on signals(status);
create index idx_signals_priority on signals(priority);
create index idx_drops_blueprint on drops(blueprint_id);
create index idx_drops_status on drops(status);
