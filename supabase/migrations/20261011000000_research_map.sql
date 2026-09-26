-- ---------------------------------------------------------------------------
-- research_map: geografisk utforskning av hele researchbasen.
--
-- Egen funksjon, ikke en utvidelse av research_near. De to svarer på ulike spørsmål:
-- research_near er radius rundt ett søkepunkt og sorterer på avstand, mens denne er et
-- nasjonalt filtersøk uten senterpunkt. Å slå dem sammen ville gitt én funksjon med to
-- uforenlige sorteringer og et ubrukt lat/lng-par.
--
-- Returnerer bare feltene kartet og listen trenger. Beskrivelse, notater og kilder hentes
-- først når et funn åpnes — et nasjonalt uttrekk skal ikke dra med seg fritekst for hvert punkt.
--
-- Arrayparametrene er «alle» når de er null, og ellers en allowlist. Det gjør at kalleren kan
-- utelate et filter uten å måtte kjenne alle gyldige verdier.
-- ---------------------------------------------------------------------------

create function public.research_map(
  p_search          text default null,
  p_categories      text[] default null,
  p_subcategories   text[] default null,
  p_confidence      text[] default null,
  p_interest        text[] default null,
  p_verification    text[] default null,
  p_operational     text[] default null,
  p_municipality    text default null,
  p_public_candidate boolean default null,
  p_only_with_coords boolean default true,
  -- Avgrensning til kartutsnittet. Ikke i bruk i første versjon, men funksjonen tar imot det
  -- slik at klienten kan begynne å sende bbox uten en ny migrasjon.
  p_min_lat double precision default null,
  p_max_lat double precision default null,
  p_min_lng double precision default null,
  p_max_lng double precision default null,
  p_limit int default 2000
)
returns table (
  id uuid, title text, item_type text, category text, subcategory text,
  address text, municipality text, city text,
  latitude double precision, longitude double precision,
  confidence text, interest_level text, verification_status text, operational_status text,
  public_candidate boolean, source_count bigint, updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.title, i.item_type, i.category, i.subcategory,
         i.address, i.municipality, i.city, i.latitude, i.longitude,
         i.confidence, i.interest_level, i.verification_status, i.operational_status,
         i.public_candidate,
         (select count(*) from admin_research_sources s where s.research_item_id = i.id),
         i.updated_at
  from admin_research_items i
  where public.is_admin()
    and (p_categories    is null or i.category            = any(p_categories))
    and (p_subcategories is null or i.subcategory         = any(p_subcategories))
    and (p_confidence    is null or i.confidence          = any(p_confidence))
    and (p_interest      is null or i.interest_level      = any(p_interest))
    and (p_verification  is null or i.verification_status = any(p_verification))
    and (p_operational   is null or i.operational_status  = any(p_operational))
    and (p_municipality  is null or i.municipality ilike p_municipality)
    and (p_public_candidate is null or i.public_candidate = p_public_candidate)
    and (not p_only_with_coords or i.latitude is not null)
    -- Bbox gjelder bare punkter; funn uten koordinat faller uansett ut når bbox er satt.
    and (p_min_lat is null or (i.latitude between p_min_lat and p_max_lat
                               and i.longitude between p_min_lng and p_max_lng))
    and (p_search is null or trim(p_search) = '' or
         concat_ws(' ', i.title, i.address, i.municipality, i.city, i.category, i.subcategory,
                        i.description, i.notes)
         ilike '%' || trim(p_search) || '%')
  order by
    case i.interest_level when 'high' then 0 when 'medium' then 1 else 2 end,
    case i.confidence     when 'high' then 0 when 'medium' then 1 else 2 end,
    i.title
  limit greatest(1, least(p_limit, 5000))
$$;

-- Begge halvdeler må revokes, se migrasjon 20261002000000.
revoke execute on function public.research_map(
  text, text[], text[], text[], text[], text[], text[], text, boolean, boolean,
  double precision, double precision, double precision, double precision, int) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.research_map(
      text, text[], text[], text[], text[], text[], text[], text, boolean, boolean,
      double precision, double precision, double precision, double precision, int) from anon';
    execute 'grant execute on function public.research_map(
      text, text[], text[], text[], text[], text[], text[], text, boolean, boolean,
      double precision, double precision, double precision, double precision, int) to authenticated';
  end if;
end;
$$;
