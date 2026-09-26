-- ---------------------------------------------------------------------------
-- Logg over research-runder.
--
-- Ikke en parallell funnmodell: dette er metadata om *arbeidet* — hvilke kilder som ble
-- gjennomgått, hva som ble opprettet og oppdatert, og hva som var utilgjengelig. Poenget er at
-- neste runde skal kunne se hva forrige runde faktisk gjorde, i stedet for å gjette ut fra
-- funnene som ble liggende igjen.
--
-- Samme tilgangsmodell som resten av research: ingenting til anon, RLS på is_admin().
-- ---------------------------------------------------------------------------

create table public.admin_research_runs (
  id            uuid primary key default gen_random_uuid(),
  label         text not null check (length(trim(label)) > 0),
  started_at    timestamptz not null default now(),
  /** Fritekst: geografisk og tematisk avgrensning for runden. */
  scope         text,
  /** Kildene som faktisk ble gjennomgått, én per element. */
  sources       text[] not null default '{}',
  /** Kilder som var blokkert eller ikke svarte, med grunn. */
  blocked       text[] not null default '{}',
  candidates    integer not null default 0,
  created_items integer not null default 0,
  updated_items integer not null default 0,
  negative      integer not null default 0,
  duplicates    integer not null default 0,
  rejected      integer not null default 0,
  /** De viktigste hullene runden avdekket, til neste runde. */
  gaps          text,
  notes         text,
  created_by    text,
  created_at    timestamptz not null default now()
);

alter table public.admin_research_runs enable row level security;
create policy "kun admin leser" on public.admin_research_runs
  for select to authenticated using (public.is_admin());

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.admin_research_runs from anon, authenticated';
    execute 'grant select on public.admin_research_runs to authenticated';
  end if;
end;
$$;

/** Rundene, nyeste først. */
create function public.research_runs()
returns setof public.admin_research_runs
language sql
stable
security definer
set search_path = public
as $$
  select * from admin_research_runs where public.is_admin() order by started_at desc
$$;

-- Begge halvdeler må revokes, se migrasjon 20261002000000.
revoke execute on function public.research_runs() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.research_runs() from anon';
    execute 'grant execute on function public.research_runs() to authenticated';
  end if;
end;
$$;
