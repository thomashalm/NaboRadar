-- ---------------------------------------------------------------------------
-- datacenter_items() skal ikke vise avviste og arkiverte funn
--
-- Et avvist eller arkivert funn er konkludert research: «Sognsveien 75 er ikke et datasenter», eller
-- et duplikat som er slått sammen med anlegget det beskriver. Refresh-kandidatene og research-kartet
-- skjuler dem allerede. Datasenterlista gjorde det ikke, så et duplikat ble telt som et eget
-- datasenter selv etter at det var arkivert.
--
-- Viewet står urørt. `datacenter_detail()` kan fortsatt åpne et arkivert funn direkte, slik at
-- historikken er tilgjengelig; det er bare lista og totalen som endres.
-- ---------------------------------------------------------------------------

create or replace function public.datacenter_items(p_search text default null)
returns setof public.admin_datacenter_overview
language sql
stable
security definer
set search_path = public
as $$
  select * from admin_datacenter_overview o
   where public.is_admin()
     and o.verification_status not in ('rejected', 'archived')
     and (p_search is null or trim(p_search) = '' or
          concat_ws(' ', o.title, o.municipality, o.address, o.owners, o.operators, o.customers)
            ilike '%' || trim(p_search) || '%')
   order by o.title
$$;
