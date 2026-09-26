-- ---------------------------------------------------------------------------
-- Kandidat for offentlig NaboRadar.
--
-- Research-basen fungerer som staging: et lead blir undersøkt, verifisert, og kan til slutt
-- være godt nok til å vurderes for den offentlige visningen. Flagget markerer at et funn har
-- nådd den kvaliteten — det publiserer ingenting, og gir ingen kodevei ut av admin.
--
-- Kravene for å sette det: bekreftet fysisk anlegg, bekreftet lokasjon, god kildeproveniens og
-- korrekt status. Sjekken nedenfor håndhever de to som kan håndheves i databasen.
-- ---------------------------------------------------------------------------

alter table public.admin_research_items
  add column public_candidate boolean not null default false,
  /** Hvorfor funnet er klart, eller hva som gjenstår. */
  add column public_candidate_note text;

-- Et funn uten koordinat eller uten verifisert kilde kan ikke være klart for offentlig bruk.
alter table public.admin_research_items
  add constraint kandidat_krever_grunnlag check (
    not public_candidate
    or (latitude is not null and verification_status = 'verified_public_source')
  );

-- research_items() lister kolonnene eksplisitt, så den må bygges på nytt med de to nye.
drop function if exists public.research_items(text);

create function public.research_items(p_search text default null)
returns table (
  id uuid, item_type text, category text, subcategory text, title text, description text,
  municipality text, address text, postal_code text, city text,
  latitude double precision, longitude double precision,
  origin_type text, origin_provider text,
  verification_status text, operational_status text, sensitivity text, reason_not_public text,
  confidence text, interest_level text, why_interesting text, notes text,
  first_seen_at timestamptz, last_checked_at timestamptz, created_at timestamptz,
  updated_at timestamptz, created_by text, source_count bigint,
  public_candidate boolean, public_candidate_note text
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.item_type, i.category, i.subcategory, i.title, i.description,
         i.municipality, i.address, i.postal_code, i.city, i.latitude, i.longitude,
         i.origin_type, i.origin_provider,
         i.verification_status, i.operational_status, i.sensitivity, i.reason_not_public,
         i.confidence, i.interest_level, i.why_interesting, i.notes,
         i.first_seen_at, i.last_checked_at, i.created_at, i.updated_at, i.created_by,
         (select count(*) from admin_research_sources s where s.research_item_id = i.id),
         i.public_candidate, i.public_candidate_note
  from admin_research_items i
  where public.is_admin()
    and (p_search is null or trim(p_search) = '' or exists (
      select 1 where concat_ws(' ', i.title, i.description, i.address, i.municipality, i.city,
                               i.category, i.subcategory, i.notes,
                               (select string_agg(s.source_name, ' ')
                                from admin_research_sources s where s.research_item_id = i.id))
             ilike '%' || trim(p_search) || '%'))
  order by i.updated_at desc
$$;

revoke execute on function public.research_items(text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.research_items(text) from anon';
    execute 'grant execute on function public.research_items(text) to authenticated';
  end if;
end;
$$;
