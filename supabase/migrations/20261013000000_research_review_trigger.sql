-- ---------------------------------------------------------------------------
-- Rettelse: triggeren skal bare regne om når forutsetningene endrer seg.
--
-- Den første versjonen regnet ut `next_review_at` på nytt ved hver oppdatering der kallet ikke
-- satte datoen selv. Det så riktig ut, men ga en konkret feil: `npm run research:seed` skriver
-- innholdsfeltene til alle funn hver gang den kjører, og da ble datoen regnet om fra
-- last_verified_at — som vasket bort planen backfillen hadde satt. En kø med tolv aktuelle saker
-- ble 198 «ferske» etter én seed-kjøring.
--
-- Regelen er nå: regn om når noe som *påvirker* intervallet har endret seg, når datoen mangler,
-- eller når det lagrede intervallet ikke stemmer med policyen lenger (som når en primærkilde
-- legges til). Ren innholdsredigering — beskrivelse, notater, adresse — lar planen stå.
--
-- Det er også den riktige lesningen av skillet mellom innhold og reviewplan: at noen retter en
-- setning er ikke et signal om at funnet må kontrolleres på nytt.
-- ---------------------------------------------------------------------------

create or replace function public.research_review_schedule()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_interval integer;
  v_base     date;
  v_regn     boolean;
begin
  if new.review_mode <> 'policy' then
    return new;
  end if;

  v_interval := public.research_review_interval(
    new.item_type, new.operational_status, new.verification_status, new.interest_level,
    new.confidence, new.public_candidate, new.latitude is not null,
    exists (select 1 from admin_research_sources s
             where s.research_item_id = new.id and s.primary_source and s.supports_claim),
    new.review_unchanged_streak, new.last_review_changed_at is not null);

  if tg_op = 'INSERT' then
    v_regn := true;
  elsif new.next_review_at is distinct from old.next_review_at then
    -- Kallet satte datoen selv. Det er en bevisst overstyring, og den får stå.
    v_regn := false;
  else
    v_regn :=
      -- Noe som påvirker intervallet har endret seg …
      new.item_type           is distinct from old.item_type
      or new.operational_status  is distinct from old.operational_status
      or new.verification_status is distinct from old.verification_status
      or new.interest_level      is distinct from old.interest_level
      or new.confidence          is distinct from old.confidence
      or new.public_candidate    is distinct from old.public_candidate
      or (new.latitude is null)  is distinct from (old.latitude is null)
      or new.review_unchanged_streak is distinct from old.review_unchanged_streak
      or new.last_review_changed_at  is distinct from old.last_review_changed_at
      -- … eller ankeret for beregningen …
      or new.last_reviewed_at is distinct from old.last_reviewed_at
      or new.last_verified_at is distinct from old.last_verified_at
      -- … eller planen mangler, eller stemmer ikke med policyen lenger.
      or new.next_review_at is null
      or new.review_interval_days is distinct from v_interval;
  end if;

  if not v_regn then
    return new;
  end if;

  new.review_interval_days := v_interval;
  if v_interval is null then
    new.next_review_at := null;
  else
    v_base := coalesce(new.last_reviewed_at, new.last_verified_at, new.first_seen_at)::date;
    new.next_review_at := v_base + v_interval;
  end if;
  return new;
end;
$$;
