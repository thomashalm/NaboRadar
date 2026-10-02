-- ---------------------------------------------------------------------------
-- Hytter: navnesøket tåler o for ø, a for å og e/ae for æ.
--
-- Kartverkets navn følger lokal skrivemåte: «Aursjobu» i Skjåk, «Aursjøhytta» i Sunndal. Den
-- som søker, vet ikke hvilken som gjelder, og skriver gjerne uten norske tegn på mobil. Søket
-- sammenlignet nøklene tegn for tegn, så «Aursjøbu» fant ikke «Aursjobu», og «Doralseter» fant
-- ikke «Dørålseter».
--
-- Nå sammenlignes også en foldet nøkkel: ø/ö → o, å/ä → a, æ → e, é/è → e, ü → u. «ae», «oe»
-- og «aa» foldes likt, så «Saeter» finner «Sæter». Et treff på den vanlige nøkkelen kommer
-- først; foldingen gir bare flere treff, aldri færre. `name_key` og koblingen mellom kilder
-- (`refresh_huts`) er ikke rørt.
-- ---------------------------------------------------------------------------

create function public.hut_search_fold(p_name text)
returns text
language sql
immutable
as $$
  select translate(
           replace(replace(replace(public.hut_name_key(p_name), 'ae', 'e'), 'oe', 'o'), 'aa', 'a'),
           'øöåäæéèü', 'ooaaeeeu')
$$;

create or replace function public.huts_search(q text, max_results integer default 20)
returns table (
  id uuid, name text, hut_type text, owner_kind text, manager_name text, access_status text,
  locked boolean, overnight text, beds integer, booking_url text, info_url text,
  municipality_number text, latitude double precision, longitude double precision,
  source_updated_at timestamptz, last_seen_at timestamptz, sources text[],
  access_kind text, public_note text, overridden text[]
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with nokkel as (select public.hut_name_key(q) as k, public.hut_search_fold(q) as f)
  select p.id, p.name, p.hut_type, p.owner_kind, p.manager_name, p.access_status, p.locked,
         p.overnight, p.beds, p.booking_url, p.info_url, p.municipality_number, p.latitude, p.longitude,
         p.source_updated_at, p.last_seen_at, p.sources, p.access_kind, p.public_note, p.overridden
  from huts_public p, nokkel n
  where public.huts_visible()
    and length(n.k) >= 2
    and (public.hut_search_fold(p.name) like '%' || n.f || '%'
         or exists (select 1 from unnest(p.alt_names) a where public.hut_search_fold(a) like '%' || n.f || '%'))
  order by (p.name_key like n.k || '%') desc,
           (p.name_key like '%' || n.k || '%') desc,
           (public.hut_search_fold(p.name) like n.f || '%') desc,
           p.name, p.id
  limit least(greatest(max_results, 1), 50)
$$;

do $$
begin
  execute 'revoke execute on function public.hut_search_fold(text) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.hut_search_fold(text) from anon, authenticated';
  end if;
end;
$$;
