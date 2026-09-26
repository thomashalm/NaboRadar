-- ---------------------------------------------------------------------------
-- research_near sorterte på feil kolonne.
--
-- `order by 11` pekte på verification_status, ikke distance_m (kolonne 10). Funksjonen
-- returnerte riktige funn, men i vilkårlig rekkefølge målt i avstand. Admin-visningen sorterte
-- selv i UI-et, så feilen var usynlig der — men funksjonens kontrakt sier «nærmest først», og
-- neste kaller ville trodd på den.
--
-- Sorteringen skrives nå med navn i stedet for posisjon, så den ikke kan skli igjen når
-- kolonnelisten endres.
-- ---------------------------------------------------------------------------

create or replace function public.research_near(
  lat double precision,
  lng double precision,
  radius_m double precision
)
returns table (
  id uuid, category text, subcategory text, title text, description text,
  address text, municipality text,
  latitude double precision, longitude double precision, distance_m double precision,
  verification_status text, operational_status text, sensitivity text,
  confidence text, interest_level text, source_count bigint
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with origin as (select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g),
  treff as (
    select i.id, i.category, i.subcategory, i.title, i.description, i.address, i.municipality,
           i.latitude, i.longitude,
           st_distance(st_setsrid(st_makepoint(i.longitude, i.latitude), 4326)::geography, o.g)
             as distance_m,
           i.verification_status, i.operational_status, i.sensitivity,
           i.confidence, i.interest_level,
           (select count(*) from admin_research_sources s where s.research_item_id = i.id)
             as source_count
    from admin_research_items i, origin o
    where public.is_admin()
      and i.latitude is not null
      and radius_m > 0 and radius_m <= 10000
      and i.verification_status not in ('rejected', 'archived')
      and st_dwithin(st_setsrid(st_makepoint(i.longitude, i.latitude), 4326)::geography, o.g, radius_m)
  )
  select * from treff order by treff.distance_m
$$;

-- create or replace nullstiller ikke grants, men vi gjentar dem for å være sikre: begge
-- halvdeler må revokes, se migrasjon 20261002000000.
revoke execute on function public.research_near(double precision, double precision, double precision) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.research_near(double precision, double precision, double precision) from anon';
    execute 'grant execute on function public.research_near(double precision, double precision, double precision) to authenticated';
  end if;
end;
$$;
