-- ---------------------------------------------------------------------------
-- Hytter: lett indeks for fylkessidene, oversikten på /hytter og sitemapen.
--
-- Fylkessidene lister hver offentlige hytte med navn, type og kommune. Til det trengs ikke
-- kildeliste, koordinater, lenker eller tilgang — bare nok til lenken og grupperingen. Én
-- spørring per fylke, med fylkets kommunenummer som liste. Databasen kjenner ikke fylkene;
-- kommuneregisteret i appen gjør (lib/geo/municipalities.ts).
--
-- Samme synlighet som de andre hyttefunksjonene (`huts_visible()`, `huts_public`), og i tillegg
-- uten hytter som ikke er for allmennheten: de har en side, men skal ikke promoteres, akkurat
-- som i sitemapen.
-- ---------------------------------------------------------------------------

create function public.hut_index(p_municipalities text[] default null)
returns table (id uuid, name text, hut_type text, municipality_number text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id, p.name, p.hut_type, p.municipality_number
  from huts_public p
  where public.huts_visible()
    and p.access_kind <> 'not_public'
    and (p_municipalities is null or p.municipality_number = any (p_municipalities))
  order by p.name, p.id
  limit 5000
$$;

/** Antall offentlige hytter per kommunenummer. Null er hytter uten kommune i kilden. */
create function public.hut_municipality_counts()
returns table (municipality_number text, huts integer)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.municipality_number, count(*)::integer
  from huts_public p
  where public.huts_visible()
    and p.access_kind <> 'not_public'
  group by p.municipality_number
  order by p.municipality_number nulls last
$$;

do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.hut_index(text[])',
    'public.hut_municipality_counts()'
  ] loop
    execute 'revoke execute on function ' || v_fn || ' from public';
    execute 'grant execute on function ' || v_fn || ' to anon, authenticated, service_role';
  end loop;
end;
$$;
