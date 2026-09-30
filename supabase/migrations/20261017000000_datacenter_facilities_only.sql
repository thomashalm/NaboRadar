-- ---------------------------------------------------------------------------
-- Datasenterlista og refresh-køen skal bare inneholde anlegg, ikke notater
--
-- Researchbasen har metanotater med underkategori Datasenter: «Dekningsstatus for den nasjonale
-- datasenterkartleggingen», «Nasjonalt bilde», oppsummeringer av regioner og negative søk i
-- plandata. De er research om datasentre, ikke datasentre. Likevel telte de i totalen, sto i
-- /admin/datasenter og havnet i refresh-køen, der de alltid «manglet» eier, MW og koordinat.
--
-- Regelen er `item_type <> 'note'`. Leads (`lead`) blir stående: de er mulige anlegg som
-- skal verifiseres, og hører hjemme i køen. Notatene finnes fortsatt i researchbasen og i
-- `/admin/research`; de slettes ikke.
--
-- Viewet står urørt, slik at eldre kø-rader og `datacenter_detail()` fortsatt kan slå opp et
-- notat som allerede har vært i en kjøring.
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
     and not exists (select 1 from admin_research_items n where n.id = o.id and n.item_type = 'note')
     and (p_search is null or trim(p_search) = '' or
          concat_ws(' ', o.title, o.municipality, o.address, o.owners, o.operators, o.customers)
            ilike '%' || trim(p_search) || '%')
   order by o.title
$$;

create or replace function public.datacenter_refresh_candidates(p_mode text default 'review_due')
returns table (
  id uuid, title text, municipality text, operational_status text,
  confidence text, interest_level text, next_review_at date, review_state text,
  missing_fields text[], queued_reasons text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.title, o.municipality, o.operational_status,
         o.confidence, o.interest_level, o.next_review_at, o.review_state,
         o.missing_fields,
         array_remove(array[
           case when o.review_state = 'overdue' then 'forfalt review' end,
           case when o.review_state = 'due' then 'review forfaller nå' end,
           case when o.operational_status = 'under_construction' then 'under bygging' end,
           case when o.operational_status = 'planned' then 'planlagt' end,
           case when o.interest_level = 'high' and o.confidence in ('low', 'medium')
                then 'høy interesse, usikker' end,
           case when cardinality(o.missing_fields) > 0
                then 'mangler ' || array_to_string(o.missing_fields, ', ') end
         ], null) as queued_reasons
    from admin_datacenter_overview o
   where public.is_admin()
     and o.verification_status not in ('rejected', 'archived')
     and not exists (select 1 from admin_research_items n where n.id = o.id and n.item_type = 'note')
     and case
           -- Full: alt som lever. Historiske og nedlagte anlegg endrer seg ikke.
           when p_mode = 'full' then o.operational_status in ('active', 'planned',
                                                              'under_construction', 'unknown')
           else (
             o.review_state in ('due', 'overdue')
             or o.operational_status in ('under_construction', 'planned')
             or (o.interest_level = 'high' and o.confidence in ('low', 'medium'))
             or cardinality(o.missing_fields) > 0
           )
         end
   -- Rekkefølgen er prioriteringen: mest mangelfullt og mest dynamisk først.
   order by
     case o.operational_status when 'under_construction' then 0 when 'planned' then 1 else 2 end,
     cardinality(o.missing_fields) desc,
     case o.interest_level when 'high' then 0 when 'medium' then 1 else 2 end,
     o.next_review_at nulls last,
     o.title
$$;
