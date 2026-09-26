-- ---------------------------------------------------------------------------
-- research_near returnerer nå item_type og public_candidate.
--
-- Adressevisningen skal vise faktiske steder og prosjekter, og holde datakvalitets- og
-- kildesaker utenfor. Uten item_type kan den ikke skille dem, og filtreringen måtte gjettes
-- ut fra kategori alene.
-- ---------------------------------------------------------------------------

drop function if exists public.research_near(double precision, double precision, double precision);

create function public.research_near(
  lat double precision,
  lng double precision,
  radius_m double precision
)
returns table (
  id uuid, item_type text, category text, subcategory text, title text, description text,
  address text, municipality text,
  latitude double precision, longitude double precision, distance_m double precision,
  verification_status text, operational_status text, sensitivity text,
  confidence text, interest_level text, why_interesting text, notes text,
  source_count bigint, public_candidate boolean
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with origin as (select st_setsrid(st_makepoint(lng, lat), 4326)::geography as g),
  treff as (
    select i.id, i.item_type, i.category, i.subcategory, i.title, i.description,
           i.address, i.municipality, i.latitude, i.longitude,
           st_distance(st_setsrid(st_makepoint(i.longitude, i.latitude), 4326)::geography, o.g)
             as distance_m,
           i.verification_status, i.operational_status, i.sensitivity,
           i.confidence, i.interest_level, i.why_interesting, i.notes,
           (select count(*) from admin_research_sources s where s.research_item_id = i.id)
             as source_count,
           i.public_candidate
    from admin_research_items i, origin o
    where public.is_admin()
      and i.latitude is not null
      and radius_m > 0 and radius_m <= 10000
      and i.verification_status not in ('rejected', 'archived')
      and st_dwithin(st_setsrid(st_makepoint(i.longitude, i.latitude), 4326)::geography, o.g, radius_m)
  )
  select * from treff order by treff.distance_m
$$;

revoke execute on function public.research_near(double precision, double precision, double precision) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.research_near(double precision, double precision, double precision) from anon';
    execute 'grant execute on function public.research_near(double precision, double precision, double precision) to authenticated';
  end if;
end;
$$;
