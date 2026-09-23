-- ---------------------------------------------------------------------------
-- Referansetallet skal bare komme fra en full sync.
--
-- En incremental sync henter kun det som er endret siden sist. Antallet poster der
-- sier ingenting om hvor stort datasettet er, og må derfor verken overskrive
-- baseline_record_count eller sammenlignes med det (se lib/sync/guards.ts).
-- ---------------------------------------------------------------------------
drop function public.sync_run_finish(uuid, text, jsonb, text, jsonb, boolean, boolean);

create function public.sync_run_finish(
  p_run_id uuid,
  p_status text,
  p_counts jsonb,
  p_error text default null,
  p_warnings jsonb default '[]'::jsonb,
  p_suspicious boolean default false,
  p_reconciled boolean default false
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_provider text;
  v_mode text;
  v_trusted boolean := p_status in ('success', 'partial');
begin
  update sync_runs set
    status = p_status,
    completed_at = now(),
    fetched = coalesce((p_counts->>'fetched')::integer, 0),
    accepted = coalesce((p_counts->>'accepted')::integer, 0),
    rejected = coalesce((p_counts->>'rejected')::integer, 0),
    records = coalesce((p_counts->>'records')::integer, 0),
    documents = coalesce((p_counts->>'documents')::integer, 0),
    inserted = coalesce((p_counts->>'inserted')::integer, 0),
    updated = coalesce((p_counts->>'updated')::integer, 0),
    unchanged = coalesce((p_counts->>'unchanged')::integer, 0),
    removed = coalesce((p_counts->>'removed')::integer, 0),
    failed = coalesce((p_counts->>'failed')::integer, 0),
    suspicious = p_suspicious,
    reconciled = p_reconciled,
    warnings = coalesce(p_warnings, '[]'::jsonb),
    error = left(p_error, 1000)
  where id = p_run_id
  returning provider_id, mode into v_provider, v_mode;

  update providers set
    last_sync_at = now(),
    last_run_status = p_status,
    last_success_at = case when v_trusted then now() else last_success_at end,
    consecutive_failures = case when v_trusted then 0 else consecutive_failures + 1 end,
    -- Kun full sync er et komplett snapshot og kan sette referansetallet.
    baseline_record_count = case
      when v_trusted and v_mode = 'full' then coalesce((p_counts->>'records')::integer, baseline_record_count)
      else baseline_record_count end,
    last_error = case when p_status = 'success' then null else left(p_error, 1000) end,
    status = case
      when status not in ('active', 'error') then status
      when v_trusted then 'active'
      else 'error' end,
    updated_at = now()
  where id = v_provider;
end;
$$;

revoke execute on function public.sync_run_finish(uuid, text, jsonb, text, jsonb, boolean, boolean) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.sync_run_finish(uuid, text, jsonb, text, jsonb, boolean, boolean) from anon, authenticated';
  end if;
end;
$$;
