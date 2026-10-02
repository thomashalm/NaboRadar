/**
 * De kuraterte research-funnene.
 *
 * Datagrunnlaget til `npm run research:seed`. Hvert funn står med kildene sine, slik at det
 * som ble undersøkt kan leses her i stedet for å måtte hentes ut av databasen.
 *
 * Reglene funnene er skrevet etter:
 * - et fysisk sted er ett funn med flere kilder, ikke ett funn per kilde
 * - en kilde som ble undersøkt uten å støtte påstanden lagres med `supports_claim: false`
 * - confidence gjelder påstanden, ikke kilden: en sikker kilde om noe uklart gir ikke `high`
 * - koordinat settes bare når *stedet* er kjent, aldri fra en selskaps- eller c/o-adresse
 */

export interface Kilde {
  source_name: string;
  source_url?: string;
  publisher?: string;
  source_type: string;
  source_date?: string;
  primary_source?: boolean;
  /** Falsk når kilden ble undersøkt og *ikke* støtter påstanden. Det er poenget med den. */
  supports_claim?: boolean;
  excerpt_or_summary?: string;
}

export interface Funn {
  /**
   * Tidligere titler, når et funn har byttet navn.
   *
   * Gjenkjenningen går på tittel; uten dette ville en omdøping opprettet en ny rad ved siden av
   * den gamle i stedet for å oppdatere den.
   */
  tidligere_titler?: string[];
  category: string;
  subcategory?: string;
  item_type: string;
  title: string;
  description: string;
  address?: string;
  postal_code?: string;
  city?: string;
  /** Null for funn som ikke gjelder én bestemt kommune, som kilde- og datakvalitetssaker. */
  municipality?: string | null;
  latitude?: number;
  longitude?: number;
  verification_status: string;
  operational_status: string;
  sensitivity: string;
  confidence: string;
  interest_level: string;
  /**
   * Påkrevd for fysiske funn med medium eller høy interesse. Utelatt for notater,
   * datakvalitetssaker og svake leads, der spørsmålet ikke gir mening.
   */
  why_interesting?: string;
  /** Satt når funnet er godt nok til å vurderes for den offentlige visningen. */
  public_candidate?: boolean;
  public_candidate_note?: string;
  notes?: string;
  kilder: Kilde[];
}

export const FUNN: Funn[] = [
  {
    category: "Omsorg / bofellesskap",
    subcategory: "Mulig bofellesskap",
    item_type: "lead",
    title: "Mulig omsorgsrelatert virksomhet",
    description:
      "Adressen ble meldt inn som et omsorgstilbud som mangler i NaboRadar. Undersøkelsen fant ingen " +
      "offentlig publisert, navngitt tjeneste på adressen. Adressen finnes i Kartverket (5A og 5B), men " +
      "verken Enhetsregisteret eller Bærum kommunes egne omsorgssider omtaler et tilbud der.",
    address: "Egne Hjems vei 5",
    postal_code: "1356",
    city: "Bekkestua",
    municipality: "Bærum",
    // Representasjonspunktet for 5A. Funnet gjelder adressen, ikke en bestemt bygning.
    latitude: 59.919488,
    longitude: 10.597865,
    verification_status: "investigated_not_confirmed",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Referansetilfellet for skillet mellom et datagap og riktig oppførsel. Gapet for Bærum er ekte " +
      "(kommunen publiserer 14 omsorgstilbud vi ikke har tatt inn), men denne adressen ville ikke dukket " +
      "opp uansett — ingen ansvarlig myndighet har publisert et navngitt tilbud der.",
    notes:
      "Adressen er undersøkt mot Bærum kommune, Helsenorge og Enhetsregisteret, men er ikke funnet som " +
      "offentlig publisert omsorgstilbud. Skal ikke publiseres uten at ansvarlig myndighet selv " +
      "publiserer et navngitt tilbud på adressen. Se håndboken, «Regresjonseksempel: Egne Hjems vei 5».",
    kilder: [
      {
        source_name:
          "Kartverket adresse-API: Egne Hjems vei 5A og 5B, 1356 Bekkestua",
        source_url:
          "https://ws.geonorge.no/adresser/v1/sok?sok=Egne%20Hjems%20vei%205&postnummer=1356",
        publisher: "Kartverket",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Adressen finnes som 5A (59.919488, 10.597865) og 5B. Sier ingenting om bruk eller virksomhet.",
      },
      {
        source_name: "Enhetsregisteret, søk på enheter i postnummer 1356",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        supports_claim: false,
        excerpt_or_summary:
          "Ingen enhet i hele postnummer 1356 har forretnings- eller beliggenhetsadresse på nr. 5. " +
          "En undersøkt kilde som ikke støtter påstanden — det er den som gjør statusen etterprøvbar.",
      },
      {
        source_name: "Helsenorge, Velg behandlingssted",
        source_url: "https://www.helsenorge.no/velg-behandlingssted/",
        publisher: "Norsk helsenett / Helsedirektoratet",
        source_type: "web",
        supports_claim: false,
        excerpt_or_summary:
          "Helsenorge har ingen søkbar oversikt over kommunale omsorgstilbud per adresse. Tjenesten " +
          "dekker planlagt behandling i spesialisthelsetjenesten, ikke bofellesskap eller sykehjem, og " +
          "kan derfor verken bekrefte eller avkrefte et tilbud på adressen.",
      },
      {
        source_name: "Bærum kommune, omsorgssidene",
        source_url: "https://www.baerum.kommune.no/",
        publisher: "Bærum kommune",
        source_type: "web",
        supports_claim: false,
        excerpt_or_summary:
          "Adressen omtales ingen steder på kommunens omsorgssider. Eneste treff på nettstedet er en side " +
          "om stedsutvikling.",
      },
    ],
  },

  {
    category: "Forsvar / militært",
    subcategory: "Eksplosivproduksjon",
    item_type: "finding",
    title: "Nytt anlegg for militære høyeksplosiver på Tofte",
    description:
      "Nytt produksjonsanlegg for militære høyeksplosiver på Tofte i Asker, planlagt som statlig " +
      "reguleringsplan med Kommunal- og distriktsdepartementet som planmyndighet. Forsvarsbygg er " +
      "forslagsstiller og Chemring Nobel er tiltakshaver. Planprogrammet lå ute på høring fra " +
      "27. april til 15. juni 2026. To områder på Hurum ble vurdert, Tofte og Sætre sør; " +
      "Forsvarsbygg vurderer Tofte som eneste realistiske alternativ.",
    municipality: "Asker",
    city: "Tofte",
    latitude: 59.56754,
    longitude: 10.51647,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "En statlig regulert sprengstoffabrikk for Forsvaret er den største enkeltsaken i Asker. Den gir " +
      "sikkerhetssoner, beredskapskrav og tungtrafikk, og er allerede omstridt lokalt og løftet til " +
      "Stortinget.",
    notes:
      "Løst i oppfølgingsrunden, og konklusjonen fra runde 2 var feil: det er en forsvarstilknytning. " +
      "Forsvarsbygg er forslagsstiller og Chemring Nobel tiltakshaver. Anlegget kommer i tillegg til " +
      "Chemrings eksisterende fabrikk på Engene, 12 km nord. Chemring Nobel AS er den eneste eksplosivprodusenten " +
      "registrert i Asker, men den registrerte adressen ligger 12 km nord for planområdet, så " +
      "selskapet kan ikke knyttes til stedet på grunnlag av adresse alene.",
    tidligere_titler: ["Planlagt produksjonsanlegg for eksplosiver"],
    kilder: [
      {
        source_name:
          "Forsvarsbygg: planprosess for nytt anlegg for militære eksplosiver",
        source_url:
          "https://www.forsvarsbygg.no/fag-og-temasider/planprosess-for-nytt-anlegg-for-militaere-eksplosiver",
        publisher: "Forsvarsbygg",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Forsvarsbygg er forslagsstiller og ansvarlig for planprosessen. Chemring Nobel er tiltakshaver. Planprogrammet ble lagt ut på høring 27. april 2026.",
      },
      {
        source_name:
          "Regjeringen: statlig planprosess for nytt produksjonsanlegg for militære høyeksplosiver",
        source_url:
          "https://www.regjeringen.no/no/aktuelt/statlig-planprosess-for-nytt-produksjonsanlegg-for-militare-hoyeksplosiver/id3146406/",
        publisher: "Kommunal- og distriktsdepartementet",
        source_type: "regulation",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Planarbeidet gjennomføres som statlig reguleringsplan med departementet som planmyndighet.",
      },
      {
        source_name: "Asker kommune: arbeid med sprengstoffabrikk i Hurummarka",
        source_url:
          "https://www.asker.kommune.no/asker-mot-2030/arbeid-med-sprengstoffabrikk-i-hurummarka/statlig-planprosess-for-ny-sprengstoffabrikk/",
        publisher: "Asker kommune",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommunens egen temaside. Kommunen anbefaler statlig regulering.",
      },
      {
        source_name:
          "Statsforvalteren: innspill til plan for nytt anlegg for eksplosiver i Asker",
        source_url:
          "https://www.statsforvalteren.no/nb/ostfold-buskerud-oslo-og-akershus/nyheter/2026/06/innspill-til-plan-for-nytt-anlegg-for-eksplosiver-i-asker",
        publisher: "Statsforvalteren i Østfold, Buskerud, Oslo og Akershus",
        source_type: "document",
        source_date: "2026-09-26",
        excerpt_or_summary: "Statsforvalterens innspill til planoppstart.",
      },
      {
        source_name: "DiBK planleggingigangsatt, arealplan 1600 (3203_202606)",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/1600?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2026-04-27",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2026-04-27: «Detaljregulering for produksjonsanlegg for eksplosiver». Forslagsstillertype: Foretak. " +
          "Kunngjøringen er offentlig og dokumenterer at planarbeidet er startet — ikke hva anlegget " +
          "til slutt blir.",
      },
      {
        source_name:
          "Enhetsregisteret: Chemring Nobel AS, Engeneveien 7, 3475 Sætre",
        source_url:
          "https://data.brreg.no/enhetsregisteret/api/enheter?navn=chemring",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        supports_claim: false,
        excerpt_or_summary:
          "Næringskode 20.590, produksjon av andre kjemiske produkter. Registrert adresse er " +
          "geokodet til 59.679, 10.542 — 12 km fra planområdet. Undersøkt og forkastet som " +
          "kobling: selskapsadresse er ikke bevis på fysisk anlegg.",
      },
      {
        source_name: "Egen gjennomgang av NaboRadars plandata",
        publisher: "NaboRadar",
        source_type: "correspondence",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Planområdets senterpunkt reverse-geokodet mot Kartverket: ingen adresse innen 600 m, nærmeste adressenavn Dustadveien 1,2 km unna.",
      },
    ],
  },
  {
    category: "Støy / nabobelastning",
    subcategory: "Idrettsanlegg",
    item_type: "finding",
    title: "Løvenskioldbanen skytebane",
    description:
      "Stor sivil skytebane ved Dælimosen i Bærum, under detaljregulering. Anlegget har i dag ingen " +
      "rettslig bindende støykrav gjennom reguleringsplan eller tillatelse — planarbeidet skal sette " +
      "rammene for støy, skytetider og bruk for mange år framover. Statsforvalteren har stilt krav " +
      "om opprydding av forurensning på banen.",
    municipality: "Bærum",
    address: "Dælimosen",
    postal_code: "1359",
    city: "Eiksmarka",
    latitude: 59.96122,
    longitude: 10.58635,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Skytestøy er en av de få nabobelastningene folk faktisk søker etter, og den fanges ikke av " +
      "de modellberegnede støysonene våre, som dekker veitrafikk og bane. Banen har i dag ingen " +
      "bindende støykrav, og reguleringen som nå pågår avgjør skytetider og bruk for mange år framover.",
    notes:
      "Løst i oppfølgingsrunden: skytefunksjonen er bekreftet av Statsforvalteren, Store norske " +
      "leksikon og Norges Skytterforbunds eget støysonearbeid. Forsvarsbyggs datasett viser at det " +
      "ikke er et militært felt — det er sivilt. Kartverket klassifiserer anlegget som «Idrettsanlegg», " +
      "ikke «Skytebane». Navnet Skytterkollen 155 m unna peker mot skyting, men et stedsnavn er " +
      "ikke en kilde på bruk. Må bekreftes mot Bærum kommune eller anleggseier før noe sies om støy.",
    tidligere_titler: ["Løvenskioldbanen under omregulering"],
    kilder: [
      {
        source_name:
          "Statsforvalteren: miljøtekniske undersøkelser, Løvenskiold skytebane 2023",
        source_url:
          "https://www.statsforvalteren.no/siteassets/fm-oslo-og-viken/miljo-og-klima/forurensning/lovenskiold-skytebane/miljotekniske-undersokelser---lovenskiold-skytebane-2023.pdf",
        publisher: "Statsforvalteren i Østfold, Buskerud, Oslo og Akershus",
        source_type: "document",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Miljøtekniske undersøkelser med krav om opprydding av forurensning. Bekrefter entydig at anlegget er en skytebane.",
      },
      {
        source_name: "Store norske leksikon: Løvenskioldbanen",
        source_url: "https://snl.no/L%C3%B8venskioldbanen",
        publisher: "Store norske leksikon",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppslagsverksomtale av Løvenskioldbanen som skytebane.",
      },
      {
        source_name: "Folkeaksjonen mot skytestøy fra Løvenskioldbanen",
        source_url: "https://www.motskytestoy.no/",
        publisher: "Folkeaksjonen mot skytestøy",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Naboaksjon med egen dokumentasjon av skytestøy. Partsinnlegg, men dokumenterer at støyen er en reell og omstridt nabobelastning.",
      },
      {
        source_name: "DiBK planleggingigangsatt, arealplan 1680 (3201_2025010)",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/1680?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2026-05-28",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2026-05-28: «Detaljregulering for Løvenskioldbanen». Forslagsstillertype: Foretak. " +
          "Kunngjøringen er offentlig og dokumenterer at planarbeidet er startet — ikke hva anlegget " +
          "til slutt blir.",
      },
      {
        source_name: "Kartverket stedsnavn, punktsøk 59.96122 / 10.58635",
        source_url:
          "https://api.kartverket.no/stedsnavn/v1/punkt?nord=59.96122&ost=10.58635&koordsys=4258&radius=1200",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "«Løvenskioldbanen», navneobjekttype Idrettsanlegg, 332 m. «Skytterkollen», Idrettshall, 155 m. " +
          "Ingen forekomst med navneobjekttype Skytebane innen 1200 m.",
      },
    ],
  },
  {
    category: "Infrastruktur / større prosjekter",
    item_type: "finding",
    title: "E18 Ramstadsletta–Nesbru",
    description:
      "Områderegulering for E18-strekningen Ramstadsletta–Nesbru. Planen har planid i to kommuner (3203_2021005 og 3201_2026007), altså et prosjekt som krysser kommunegrensen Bærum/Asker.",
    municipality: "Bærum",
    address: "Bjerkoddveien 15",
    postal_code: "1341",
    city: "Slependen",
    latitude: 59.88171,
    longitude: 10.51346,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "En E18-utvidelse endrer støy, luft og adkomst for tusenvis av adresser, og går over mange år.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke tiltakets egen adresse.",
    kilder: [
      {
        source_name:
          "DiBK planleggingigangsatt, arealplan 1385 (3203_2021005 / 3201_2026007)",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/1385?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2026-02-10",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2026-02-10: «E18 Ramstadsletta-Nesbru». Forslagsstillertype: Foretak. " +
          "Kunngjøringen er offentlig og dokumenterer at planarbeidet er startet — ikke hva anlegget " +
          "til slutt blir.",
      },
    ],
  },
  {
    category: "Infrastruktur / større prosjekter",
    item_type: "finding",
    title:
      "E18-korridoren Lysaker–Ramstadsletta med tverrforbindelsen Gjønnes–Fornebu",
    description:
      "Områderegulering i E18-korridoren, varslet som en reduksjon av bredden på hensynssonen for tunnel. Omfatter tverrforbindelsen Gjønnes–Fornebu.",
    municipality: "Bærum",
    address: "Krokvolden 1",
    postal_code: "1369",
    city: "Stabekk",
    latitude: 59.90648,
    longitude: 10.5896,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Hensynssone for tunnel begrenser hva en nabo kan gjøre på egen eiendom. Selve varselet gjelder " +
      "likevel bare en innsnevring av sonen — en teknisk justering i et prosjekt som er vedtatt fra før.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke tiltakets egen adresse.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 752 (E32014012)",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/752?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2025-04-04",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2025-04-04: «E18-korridoren Lysaker – Ramstadsletta med tverrforbindelsen Gjønnes-Fornebu – reduksjon bredde hensynssone tunnel». Forslagsstillertype: Foretak. " +
          "Kunngjøringen er offentlig og dokumenterer at planarbeidet er startet — ikke hva anlegget " +
          "til slutt blir.",
      },
    ],
  },
  {
    category: "Infrastruktur / større prosjekter",
    item_type: "finding",
    title: "Planarbeid i sykehusområdet Helgerud/Dønski/Hamang/Evje",
    description:
      "Forenklet endring i reguleringsplan 1973180, varslet under navnet «HELGERUD/DØNSKI/HAMANG/EVJE (sykhussaken)». Hva endringen består i står ikke i kunngjøringen.",
    municipality: "Bærum",
    address: "Dønskiveien 7",
    postal_code: "1346",
    city: "Gjettum",
    latitude: 59.89891,
    longitude: 10.50904,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Området rundt Bærum sykehus er under utvikling, og navnet på kunngjøringen peker på sykehussaken. Innholdet må bekreftes mot kommunen — «sykhussaken» er kommunens egen skrivefeil, ikke en beskrivelse.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke tiltakets egen adresse.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 1452 (1973180)",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/1452?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2026-03-10",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2026-03-10: «HELGERUD/DØNSKI/HAMANG/EVJE (sykhussaken)». Forslagsstillertype: Foretak. " +
          "Kunngjøringen er offentlig og dokumenterer at planarbeidet er startet — ikke hva anlegget " +
          "til slutt blir.",
      },
    ],
  },
  {
    category: "Infrastruktur / større prosjekter",
    item_type: "finding",
    title: "Grorud ventespor",
    description:
      "Varsel om utvidet planområde for ventespor ved Grorud. Ventespor er jernbaneinfrastruktur for hensetting av tog.",
    municipality: "Oslo",
    address: "Østre Aker vei 255",
    postal_code: "0976",
    city: "Oslo",
    latitude: 59.95361,
    longitude: 10.90201,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Jernbanetiltak gir støy og anleggsperiode, og hensetting er blant de tiltakene naboer merker om natten.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke tiltakets egen adresse.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 875 (?)",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/875?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2025-08-11",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2025-08-11: «Grorud ventespor - Varsel om utvidet planområde». Forslagsstillertype: Foretak. " +
          "Kunngjøringen er offentlig og dokumenterer at planarbeidet er startet — ikke hva anlegget " +
          "til slutt blir.",
      },
    ],
  },
  {
    category: "Infrastruktur / større prosjekter",
    item_type: "finding",
    title: "Retningsdrift Brynsbakken",
    description:
      "Detaljreguleringsplan for retningsdrift i Brynsbakken — omlegging av togtrafikkens kjøremønster inn mot Oslo S.",
    municipality: "Oslo",
    address: "Schweigaards gate 98J",
    postal_code: "0656",
    city: "Oslo",
    latitude: 59.90636,
    longitude: 10.78092,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Brynsbakken er flaskehalsen inn til Oslo S. Tiltaket har vært omstridt nettopp på grunn av naboene.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke tiltakets egen adresse.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 1443 (?)",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/1443?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2026-03-05",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2026-03-05: «Detaljreguleringsplan for Retningsdrift Brynsbakken». Forslagsstillertype: Foretak. " +
          "Kunngjøringen er offentlig og dokumenterer at planarbeidet er startet — ikke hva anlegget " +
          "til slutt blir.",
      },
    ],
  },
  {
    category: "Infrastruktur / større prosjekter",
    item_type: "finding",
    title: "Driftsbase for Sporveien, Enebakkveien 310",
    description:
      "Detaljregulering for driftsbase for Sporveien i Enebakkveien 310 m.fl.",
    municipality: "Oslo",
    address: "Enebakkveien 302",
    postal_code: "1188",
    city: "Oslo",
    latitude: 59.8691,
    longitude: 10.83019,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "En driftsbase er tungtrafikk og nattarbeid i et boligområde.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke tiltakets egen adresse.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 454 (?)",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/454?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2025-12-02",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2025-12-02: «Enebakkveien 310 m.fl.- Driftsbase for Sporveien». Forslagsstillertype: Foretak. " +
          "Kunngjøringen er offentlig og dokumenterer at planarbeidet er startet — ikke hva anlegget " +
          "til slutt blir.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    item_type: "finding",
    title: "VEAS anlegg Bjerkås",
    description:
      "Mindre reguleringsendring for VEAS-anlegget på Bjerkås. VEAS er renseanlegget for avløp fra Oslo, Bærum og Asker." +
      " Anlegget er landets største renseanlegg: rundt 110 millioner kubikkmeter avløpsvann i året, tilsvarende 867 000 personekvivalenter, i et prosessanlegg på 42 000 kvadratmeter inne i fjellet.",
    municipality: "Asker",
    address: "Bjerkåsholmen 21",
    postal_code: "3470",
    city: "Slemmestad",
    latitude: 59.78919,
    longitude: 10.4975,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et regionalt renseanlegg er både lukt og tungtrafikk, og endringer der treffer et stort nærområde.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke anleggets egen adresse." +
      " VEAS utreder nitrogenfjerning og utvidelse for å møte skjerpede krav og forventet vekst i tilførsel. Det betyr flere år med anleggsarbeid på Bjerkås.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 1628 (2012009)",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/1628?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2026-05-08",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2026-05-08: «VEAS anlegg Bjerkås». Forslagsstillertype: Foretak. " +
          "Kunngjøringen er offentlig og dokumenterer at planarbeidet er startet — ikke hva anlegget " +
          "til slutt blir.",
      },
      {
        source_name: "Norges største renseanlegg",
        source_url:
          "https://www.veas.nu/en-ren-og-frisk-fjord/norges-storste-renseanlegg",
        publisher: "VEAS",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget renser avløpsvannet til rundt 800 000 mennesker rundt Oslofjorden. Prosessanlegget er 42 000 kvadratmeter og ligger inne i fjellet ved Slemmestad i Asker. Rundt 110 millioner kubikkmeter avløpsvann i året.",
      },
      {
        source_name: "Nitrogenfjerning for en region — konseptutredning",
        source_url:
          "https://veas.nu/uploads/2025/06/Nitrogenfjerning-for-en-region-rapport-konseptutredning-12.6.2025.pdf",
        publisher: "VEAS",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Utredning av nitrogenfjerning og kapasitetsutvidelse. Tilførselen er estimert å øke med 37 prosent til 2030 og 58 prosent til 2050.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    item_type: "finding",
    title: "Oredalen avfallsanlegg",
    description:
      "Forenklet endring i reguleringsplan for Oredalen avfallsanlegg i sørlige Asker." +
      " Anlegget har kapasitet til å behandle mer enn 75 tonn ordinært avfall per døgn, og til mottak og lagring av mer enn 50 tonn farlig avfall.",
    municipality: "Asker",
    address: "Tofteveien 35",
    postal_code: "3483",
    city: "Kana",
    latitude: 59.55422,
    longitude: 10.51914,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Deponi og avfallsanlegg er blant de mest støy- og luktutsatte nabolagene vi kan vise.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke anleggets egen adresse." +
      " Status oppdatert: søknad om deponering av 8 000 tonn PFAS-holdige masser er avslått av Statsforvalteren, og en søknad om endret tillatelse har vært på høring. Lindum arbeider samtidig med utslippsledning og vannrensing for å øke kapasiteten. Dette er en aktiv sak, ikke et statisk anlegg.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 1069 (06285078)",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/1069?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2025-08-14",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2025-08-14: «Oredalen avfallsanlegg». Forslagsstillertype: Foretak. " +
          "Kunngjøringen er offentlig og dokumenterer at planarbeidet er startet — ikke hva anlegget " +
          "til slutt blir.",
      },
      {
        source_name:
          "Avslag på søknad om midlertidig tillatelse til å deponere PFAS-holdige masser",
        source_url:
          "https://www.statsforvalteren.no/siteassets/fm-oslo-og-viken/horinger-og-kunngjoringer/lindum-oredalen/vedtak-om-avslag-pa-soknad-om-midlertidig-tillatelse-til-a-deponere-pfas-holdige-masser-som-er-farlig-avfall---lindum-oredalen-as.pdf",
        publisher: "Statsforvalteren i Østfold, Buskerud, Oslo og Akershus",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Søknad om midlertidig tillatelse til å deponere opptil 8 000 tonn PFAS-holdige masser klassifisert som farlig avfall ble avslått.",
      },
      {
        source_name:
          "Høring av søknad om endring av tillatelse — Lindum Oredalen AS",
        source_url:
          "https://www.statsforvalteren.no/nn/ostfold-buskerud-oslo-og-akershus/horinger/2024/11/horing-av-soknad-om-endring-av-tillatelse-etter-forurensningsloven--lindum-oredalen-as--oredalen-avfallsanlegg-og-deponi-asker-kommune/",
        publisher: "Statsforvalteren i Østfold, Buskerud, Oslo og Akershus",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Søknad om endret tillatelse for Oredalen avfallsanlegg og deponi i Asker kommune, lagt ut på høring.",
      },
      {
        source_name: "Lindum Oredalen i gang med prosjekt for økt kapasitet",
        source_url:
          "https://lindum.no/nyheter/oredalen-prosjekt-utslippsledning-vannrensing-2",
        publisher: "Lindum",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Prosjekt for ny utslippsledning og vannrensing, med formål å øke kapasiteten på anlegget.",
      },
    ],
  },
  {
    category: "Omsorg / bofellesskap",
    subcategory: "Tidligere institusjon",
    item_type: "finding",
    title: "Blakstad, tidligere sykehusområde",
    description:
      "Områderegulering for Blakstad, oppgitt i kunngjøringen som tidligere sykehusområde.",
    municipality: "Asker",
    address: "Strandveien 43",
    postal_code: "1392",
    city: "Vettre",
    latitude: 59.81986,
    longitude: 10.47188,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et institusjonsområde som omreguleres er både historikk og et varsel om stor utbygging. Statusen er «tidligere» ifølge kilden — dagens bruk er ikke undersøkt.",
    notes:
      "Kunngjøringen sier «tidligere sykehusområde». Om noen del av området fortsatt er i bruk til helse- eller omsorgsformål er ikke undersøkt.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 384 (202506)",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/384?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2025-03-20",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2025-03-20: «Blakstad (tidligere sykehusområde)». Forslagsstillertype: Foretak. " +
          "Kunngjøringen er offentlig og dokumenterer at planarbeidet er startet — ikke hva anlegget " +
          "til slutt blir.",
      },
    ],
  },
  {
    category: "Datakvalitetsavvik",
    item_type: "data_issue",
    title: "municipality_name er tom for alle plansaker",
    description:
      "Ingen av de 1552 plansakene i basen har municipality_name satt. Feltet vises på /sak/[id] " +
      "i raden «Kommunenummer», som derfor bare viser tallet. DiBK-kilden gir kommunenummer, ikke " +
      "kommunenavn, og vi slår det ikke opp noe sted.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    why_interesting:
      "Et synlig, billig hull: kommunenummer→navn er et oppslag vi allerede har data til gjennom Kartverket.",
    kilder: [
      {
        source_name: "Egen gjennomgang av NaboRadars plandata",
        publisher: "NaboRadar",
        source_type: "correspondence",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "select count(*), count(municipality_name) from events → 1552 / 0. Bekreftet mot app/sak/[id]/page.tsx, som viser feltet i raden «Kommunenummer».",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "note",
    title: "Ingen datasenter-funn i plandataene for Oslo, Bærum og Asker",
    description:
      "Søk i alle 124 plansaker i Oslo (49), Bærum (38) og Asker (37) på datasenter, datalagring og " +
      "serverpark ga null treff. Negativt resultat, ikke en konklusjon om at det ikke finnes " +
      "datasentre: DiBK-kilden dekker bare *nylig varslet* planoppstart, ikke eksisterende anlegg.",
    municipality: null,
    verification_status: "investigated_not_confirmed",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    why_interesting:
      "Avløst i runde 2: Nkoms datasenterregister er nå gjennomgått i nettleser, og ga både et bekreftet " +
      "fysisk anlegg og flere leads. Notatet står igjen som dokumentasjon på at plandata ikke er veien inn.",
    notes:
      "Enhetsregisteret ble vurdert og forkastet som inngang: næringskode viser selskapsadresser, ikke fysiske anlegg, og ville gitt masseimport av kontoradresser.",
    kilder: [
      {
        source_name: "Egen gjennomgang av NaboRadars plandata",
        publisher: "NaboRadar",
        source_type: "correspondence",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Regexsøk i events.title på /datasenter|datalagring|serverpark/ for kommunenummer 0301, 3201 og 3203: 0 treff av 124 saker.",
      },
      {
        source_name: "Nkom, forsøkt søk etter datasenterregister",
        source_url: "https://www.nkom.no/",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "web",
        source_date: "2026-09-26",
        supports_claim: false,
        excerpt_or_summary:
          "nkom.no/sok gir HTTP 403 (Azure WAF) fra script, og de antatte URL-ene for et " +
          "datasenterregister gir 404. Kilden er ikke avklart — den må åpnes i nettleser.",
      },
    ],
  },
  {
    category: "Datakvalitetsavvik",
    item_type: "data_issue",
    title: "Bærums 14 publiserte omsorgstilbud er ikke tatt inn",
    description:
      "Bærum kommune publiserer selv 14 omsorgstilbud med navn og adresse: 6 sykehjem og " +
      "bo- og behandlingssentre, 3 helsehus og 5 omsorgsboliger. De er innenfor visningsregelen " +
      "vår, men er ikke integrert.",
    municipality: "Bærum",
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Det konkrete, kjente gapet bak meldinger om at omsorgstilbud «mangler» utenfor Oslo.",
    notes:
      "Satt på vent: kilden er kommunens egne nettsider uten API, og lisensen er ikke avklart. Hører sammen med skolekrets for Bærum og Asker i én henvendelse til kommunen.",
    kilder: [
      {
        source_name:
          "Bærum kommune, oversikt over sykehjem, helsehus og omsorgsboliger",
        source_url: "https://www.baerum.kommune.no/",
        publisher: "Bærum kommune",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "14 tilbud publisert med navn og adresse. Ingen API, og ingen lisensangivelse på sidene.",
      },
    ],
  },
  {
    category: "Kilder",
    item_type: "data_issue",
    title: "Skolekretsdata for Bærum og Asker: lisens ikke avklart",
    description:
      "Begge kommunene har teknisk gode karttjenester med inntaksområder, men ingen av dem oppgir lisens for videre bruk.",
    municipality: null,
    verification_status: "investigated_not_confirmed",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    why_interesting:
      "Skolekrets er den mest etterspurte utvidelsen utenfor Oslo, og den stopper på lisens — ikke på teknikk.",
    notes:
      "Stoppet før produksjonsbruk, etter regelen om at uklar lisens ikke skal gjettes. Samme henvendelse som Bærums omsorgstilbud.",
    kilder: [
      {
        source_name: "Egen gjennomgang av NaboRadars plandata",
        publisher: "NaboRadar",
        source_type: "correspondence",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Discovery for skolekrets i Bærum og Asker: tjenestene svarer og har inntaksområder, men ingen lisensangivelse er funnet på tjenestene eller i kommunenes åpne data-sider.",
      },
    ],
  },
  {
    category: "Kilder",
    item_type: "data_issue",
    title:
      "Poenggrenser for videregående skole finnes ikke som åpen kilde per skole",
    description:
      "Discovery fant ingen offentlig, maskinlesbar kilde med inntaksgrenser per skole og programområde for Oslo eller Akershus.",
    municipality: null,
    verification_status: "investigated_not_confirmed",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    why_interesting:
      "Poenggrenser er blant de mest etterspurte tallene rundt en adresse, og fraværet av kilde er svaret — ikke noe å gjette på.",
    kilder: [
      {
        source_name: "Egen gjennomgang av NaboRadars plandata",
        publisher: "NaboRadar",
        source_type: "correspondence",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Discovery for poenggrenser VGS: ingen åpen kilde per skole og programområde funnet hos fylkene eller Utdanningsdirektoratet.",
      },
    ],
  },

  {
    category: "Forsvar / militært",
    subcategory: "Festning",
    item_type: "finding",
    title: "Akershus slott og festning",
    description:
      "Nasjonalt festningsverk midt i Oslo sentrum, forvaltet av Forsvarsbygg og i aktiv bruk. " +
      "Kartverket fører anlegget som «Militært bygg/anlegg» med aktiv stedstatus. Akershus " +
      "kommandantskap er i dag lokalisert på Kolsås base.",
    municipality: "Oslo",
    city: "Oslo",
    latitude: 59.9075,
    longitude: 10.73703,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et stort militært og statlig område midt i sentrum, med egne ferdselsregler og " +
      "arrangementer, som påvirker et helt bykvartal uten å dukke opp i vanlige eiendoms- " +
      "eller plandata.",
    kilder: [
      {
        source_name:
          "Riksantikvaren, kulturminneregisteret: Akershus festning, fire registreringer",
        source_url: "https://kulturminnesok.no/ra/lokalitet/86131",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Indre festning, ytre festning/forterreng, Kontraskjæret og Skansen, samt bryggeanlegget — alle fredet. Bekrefter utstrekningen anlegget har som kulturminne.",
      },
      {
        source_name:
          "Kartverket sentralt stedsnavnregister: Akershus slott og festning",
        source_url:
          "https://api.kartverket.no/stedsnavn/v1/navn?sok=Akershus%20festning",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Navneobjekttype «Militært bygg/anlegg», stedstatus aktiv, representasjonspunkt " +
          "59.90750, 10.73703.",
      },
      {
        source_name: "Forsvarsbygg, Festningene",
        source_url:
          "https://www.forsvarsbygg.no/eiendomsforvaltning/festningene",
        publisher: "Forsvarsbygg",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Forsvarsbygg forvalter 14 nasjonale festningsverk og holder dem åpne for publikum " +
          "hele året.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Leir",
    item_type: "finding",
    title: "Gardeleiren (Huseby leir)",
    description:
      "Militærleir på Huseby i Oslo vest, base for Hans Majestet Kongens Garde. Registrert i " +
      "Kartverkets stedsnavnregister som militært bygg/anlegg med aktiv status, og omtalt av " +
      "Forsvarsbygg som et av stedene de bygger på.",
    municipality: "Oslo",
    city: "Oslo",
    latitude: 59.94435,
    longitude: 10.65465,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "En aktiv militærleir i et ellers rolig boligområde, med vakthold, øvelser og " +
      "byggevirksomhet. Det er nabolagsinformasjon som ikke finnes i noen av de offentlige " +
      "kildene NaboRadar bruker i dag.",
    kilder: [
      {
        source_name: "Riksantikvaren, kulturminneregisteret: Huseby gardeleir",
        source_url: "https://kulturminnesok.no/ra/lokalitet/267058",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Gardeleiren i sin nåværende utforming ble påbegynt i 1979. Kommunalt listeført. Koordinat 59.9452, 10.65404 — sammenfaller med punktet fra stedsnavnregisteret.",
      },
      {
        source_name: "Kartverket sentralt stedsnavnregister: Gardeleiren",
        source_url:
          "https://api.kartverket.no/stedsnavn/v1/navn?sok=Gardeleiren",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Navneobjekttype «Militært bygg/anlegg», stedstatus aktiv, representasjonspunkt " +
          "59.94435, 10.65465. Ett av bare to militære navn registrert i Oslo.",
      },
      {
        source_name: "Forsvarsbygg, prosjekter på Østlandet",
        source_url:
          "https://www.forsvarsbygg.no/prosjekter/vi-bygger-forsvarsevne-hver-dag/ostlandet",
        publisher: "Forsvarsbygg",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Forsvarsbygg oppgir byggevirksomhet ved blant annet Akershus festning, Linderud leir, " +
          "Lutvann leir, Huseby leir og Kolsås base.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Base",
    item_type: "finding",
    title: "Kolsås base",
    description:
      "Militær base i Bærum med flere sentrale forsvars- og sikkerhetsvirksomheter, blant dem " +
      "Cyberforsvaret, Nasjonal sikkerhetsmyndighet, Forsvarsmateriell og Akershus " +
      "kommandantskap. Anlegget er det tidligere NATO-hovedkvarteret for Nord-Europa.",
    municipality: "Bærum",
    address: "Rødskiferveien 20",
    postal_code: "1352",
    city: "Kolsås",
    latitude: 59.91745,
    longitude: 10.50518,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Den klart største forsvarsrelaterte lokasjonen i Bærum, med virksomheter som gir " +
      "adkomstkontroll, trafikk og byggeaktivitet i et boligområde — og som ikke finnes i " +
      "noen av de offentlige datasettene vi bruker.",
    notes:
      "Basen står ikke i Kartverkets stedsnavnregister som militært anlegg. Den er dokumentert av " +
      "Forsvaret selv, med adresse.",
    kilder: [
      {
        source_name: "Forsvaret, tjenestesteder: Kolsås",
        source_url:
          "https://www.forsvaret.no/om-forsvaret/tjenestesteder/kolsas",
        publisher: "Forsvaret",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppgir adressen Rødskiferveien 20, 1352 Kolsås. På basen ligger blant annet " +
          "Cyberforsvaret, Forsvarsmateriell, Nasjonal sikkerhetsmyndighet, Forsvarets " +
          "logistikkorganisasjon, Forsvarsbygg, Akershus kommandantskap og NATO NEC CCIS.",
      },
      {
        source_name: "Kartverket adresse-API: Rødskiferveien 20, 1352 Kolsås",
        source_url:
          "https://ws.geonorge.no/adresser/v1/sok?sok=R%C3%B8dskiferveien%2020&postnummer=1352",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adressen finnes i Bærum kommune, representasjonspunkt 59.91745, 10.50518.",
      },
      {
        source_name:
          "Kartverket sentralt stedsnavnregister, søk på militære navn i Bærum",
        source_url:
          "https://api.kartverket.no/stedsnavn/v1/navn?sok=k*&knr=3201",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        supports_claim: false,
        excerpt_or_summary:
          "Ingen navn med navneobjekttype «Militært bygg/anlegg» er registrert i Bærum. " +
          "Stedsnavnregisteret bekrefter altså ikke basen — den er dokumentert av Forsvaret selv.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Leir",
    item_type: "finding",
    title: "Linderud leir",
    description:
      "Militærleir i Oslo, oppgitt av Forsvarsbygg som et av stedene de bygger på. " +
      "Nøyaktig utstrekning og dagens bruk er ikke undersøkt.",
    municipality: "Oslo",
    city: "Oslo",
    latitude: 59.94205,
    longitude: 10.83347,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "En aktiv militærleir i et boligområde betyr vakthold, øvelsesaktivitet og " +
      "byggeperioder som naboer merker.",
    notes:
      "Koordinaten er omtrentlig — leiren har ikke eget oppslag i stedsnavnregisteret, så punktet " +
      "er satt fra «Linderud gård» i nærheten. Runde 3: kulturminneregisteret har en «Linderud " +
      "arbeidsleir (revet)» fra okkupasjonstiden på et annet punkt — det er ikke samme anlegg.",
    kilder: [
      {
        source_name: "Forsvarsbygg, prosjekter på Østlandet",
        source_url:
          "https://www.forsvarsbygg.no/prosjekter/vi-bygger-forsvarsevne-hver-dag/ostlandet",
        publisher: "Forsvarsbygg",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Forsvarsbygg oppgir Linderud leir blant stedene de har byggevirksomhet på i Oslo-området.",
      },
      {
        source_name: "Kartverket sentralt stedsnavnregister: Linderud gård",
        source_url: "https://api.kartverket.no/stedsnavn/v1/navn",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Leiren har ikke eget navn i stedsnavnregisteret. Koordinaten er hentet fra " +
          "«Linderud gård» like ved, og er derfor omtrentlig.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Leir",
    item_type: "finding",
    title: "Lutvann leir",
    description:
      "Militærleir i Oslo, oppgitt av Forsvarsbygg som et av stedene de bygger på. " +
      "Nøyaktig utstrekning og dagens bruk er ikke undersøkt.",
    municipality: "Oslo",
    city: "Oslo",
    address: "Lutvannsveien 60",
    latitude: 59.92087,
    longitude: 10.87667,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "En aktiv militærleir i et boligområde betyr vakthold, øvelsesaktivitet og " +
      "byggeperioder som naboer merker.",
    notes:
      "Runde 3: kulturminneregisteret ga eksakt adresse og koordinat, og historikken som tysk " +
      "Luftwaffe-hovedkvarter. Den omtrentlige koordinaten fra runde 2 er erstattet.",
    kilder: [
      {
        source_name:
          "Riksantikvaren, kulturminneregisteret: Lutvann leir – Lutvannsveien 60",
        source_url: "https://kulturminnesok.no/ra/lokalitet/215106",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Lokaliteten omfatter det militære anlegget Lutvann leir og husmannstua Bråten. Leiren ble anlagt av tyskerne under andre verdenskrig som hovedkvarter for Luftwaffe, med polske krigsfanger som arbeidskraft, og ble kalt Lager Braaten.",
      },
      {
        source_name: "Forsvarsbygg, prosjekter på Østlandet",
        source_url:
          "https://www.forsvarsbygg.no/prosjekter/vi-bygger-forsvarsevne-hver-dag/ostlandet",
        publisher: "Forsvarsbygg",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Forsvarsbygg oppgir Lutvann leir blant stedene de har byggevirksomhet på i Oslo-området.",
      },
      {
        source_name: "Kartverket sentralt stedsnavnregister: Lutvannet",
        source_url: "https://api.kartverket.no/stedsnavn/v1/navn",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Leiren har ikke eget navn i stedsnavnregisteret. Koordinaten er hentet fra " +
          "«Lutvannet» like ved, og er derfor omtrentlig.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    item_type: "note",
    title:
      "Ingen av Forsvarets skyte- og øvingsfelt ligger i Oslo, Bærum eller Asker",
    description:
      "Hypotesen var at minst ett av Forsvarets skyte- og øvingsfelt kunne berøre de tre " +
      "kommunene. Hele det nasjonale datasettet fra Forsvarsbygg ble hentet og gjennomgått: " +
      "68 felt, ingen i Oslo, Bærum eller Asker. Nærmeste er Rygge i Moss.",
    municipality: null,
    verification_status: "investigated_not_confirmed",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    notes:
      "Undersøkt 2026-09-26 mot Forsvarsbyggs egne data. Skytestøy i disse kommunene kommer fra " +
      "sivile baner, ikke fra Forsvarets felt — se Franskleiv og Løvenskioldbanen. Trenger ikke " +
      "undersøkes på nytt.",
    kilder: [
      {
        source_name: "Forsvarsbygg, Forsvarets skyte- og øvingsfelt land (WFS)",
        source_url:
          "https://wfs.geonorge.no/skwms1/wfs.forsvarets_skyteogovingsfelt?service=WFS&request=GetCapabilities",
        publisher: "Forsvarsbygg via Geonorge",
        source_type: "map_service",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Nasjonalt datasett over Forsvarets skyte- og øvingsfelt på land, 68 felt. Hentet i sin " +
          "helhet og gjennomgått: ingen av feltene ligger i Oslo, Bærum eller Asker. Nærmeste er " +
          "Rygge skyte- og øvingsfelt i Moss. «Ulven skyte- og øvingsfelt» i datasettet ligger på " +
          "60.196, 5.426 i Vestland — ikke Ulven i Oslo.",
      },
    ],
  },
  {
    category: "Datakvalitetsavvik",
    item_type: "data_issue",
    title: "Stedsnavnregisteret er ikke uttømmende for militære anlegg",
    description:
      "Kartverkets stedsnavnregister har bare to militære navn i Oslo og ingen i Bærum eller " +
      "Asker, selv om Kolsås base er en dokumentert, aktiv militær base i Bærum. Registeret " +
      "kan brukes til å bekrefte et anlegg, men ikke til å utelukke at det finnes.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    notes:
      "Metodemerknad for senere runder: for forsvarsanlegg må Forsvaret og Forsvarsbygg brukes som " +
      "primærkilde, med stedsnavnregisteret som supplement.",
    kilder: [
      {
        source_name:
          "Kartverket sentralt stedsnavnregister, gjennomgang av navneobjekttype «Militært bygg/anlegg»",
        source_url: "https://api.kartverket.no/stedsnavn/v1/navn",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Alfabetisk uttømmende søk per kommune: Oslo har to navn av typen «Militært " +
          "bygg/anlegg» (Akershus slott og festning, Gardeleiren). Bærum og Asker har null — " +
          "til tross for at Kolsås base er dokumentert av Forsvaret.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Vaultica OSL01, Ulven",
    description:
      "Eksisterende fysisk datasenter på Ulven i Oslo, tidligere DigiPlex Oslo. Operatøren er " +
      "registrert hos Nkom som kommersiell datasenteroperatør, og har beliggenhetsadresse og " +
      "ansatte på stedet. Kategori E i datasenter-inndelingen: eksisterende fysisk anlegg.",
    municipality: "Oslo",
    address: "Selma Ellefsens vei 1",
    postal_code: "0581",
    city: "Oslo",
    latitude: 59.92498,
    longitude: 10.80889,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et stort datasenter midt i et område under boligtransformasjon. Slike anlegg gir " +
      "kjøleanlegg, nødstrømsaggregat, høy effektbruk og lite arbeidsplasser per kvadratmeter " +
      "— relevant både for naboer og for å forstå hva et næringsbygg i området faktisk er.",
    notes:
      "Aliaser og operatørhistorikk: DigiPlex Oslo Ulven → STACK OSL01 → Vaultica OSL01. PeeringDB " +
      "fører anlegget på Ulvenveien 89B, DataCenterMap på Selma Ellefsens vei 1 — samme kvartal på " +
      "Ulven. Koordinaten er Kartverkets punkt for Selma Ellefsens vei 1. De øvrige SI OSL-selskapene i " +
      "Nkom-registeret (02, 03.1, 03.2, 04) har adresser i Nordre Follo, Lillestrøm og Indre Østfold " +
      "og faller utenfor dette området.",
    tidligere_titler: [
      "STACK OSL01 datasenter, Ulven",
      "OSL01 datasenter, Selma Ellefsens vei 1 på Ulven",
    ],
    public_candidate: true,
    public_candidate_note:
      "Bekreftet fysisk anlegg med Nkom-registrert operatør, beliggenhetsadresse i Enhetsregisteret og flere bransjekilder.",
    kilder: [
      {
        source_name: "PeeringDB: nettverk til stede i fasiliteten",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "fac_id 345, registrert siden 2010. 52 nettverk til stede — den klart best tilknyttede fasiliteten i Norge etter OS-IX. Bekrefter at dette er et bærende knutepunkt, ikke et serverrom.",
      },
      {
        source_name: "Nkom, registrerte kommersielle datasenteroperatører",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Offentlig register over kommersielle datasenteroperatører med registreringsplikt etter " +
          "ekomloven. 60 operatører og 112 registrerte datasentre. Registeret oppgir firmanavn og " +
          "organisasjonsnummer, ikke fysisk lokasjon.",
      },
      {
        source_name: "Enhetsregisteret: SI OSL 01 AS",
        source_url:
          "https://data.brreg.no/enhetsregisteret/api/enheter/981663322",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Beliggenhetsadresse Selma Ellefsens vei 1, 0581 Oslo. " +
          "Næringskode 63.100 databehandling og datalagring, 23 ansatte. Selskapsnavnet «OSL 01» og " +
          "ansatte på adressen peker mot at dette er selve anlegget, ikke et kontor.",
      },
      {
        source_name: "Bransjeomtaler av STACK OSL01 / DigiPlex Oslo Ulven",
        source_url: "https://www.stackinfra.com/locations/emea/oslo/",
        publisher: "STACK Infrastructure m.fl.",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Flere uavhengige bransjeoversikter plasserer datasenteret på Selma Ellefsens vei 1 med " +
          "over 5 100 m² teknisk areal over fire etasjer, EMP-beskyttelse og 25+ operatører. " +
          "Bygget skal opprinnelig være oppført i 1981 som datasenter og kommunikasjonsknutepunkt " +
          "for staten. Kommersielle kilder, ikke myndighetskilder — derfor støtte, ikke bevis.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Blix BDC, Lindeberg næringsvei 26",
    description:
      "Bekreftet datasenter på Lindeberg: karriernøytralt anlegg bygget i 2021, med colocation-bur " +
      "og varmegjenvinning. Kategori E: eksisterende fysisk anlegg. Operatøren står også i Nkoms " +
      "register, og adressen er beliggenhetsadressen i Enhetsregisteret.",
    municipality: "Oslo",
    address: "Lindeberg næringsvei 26",
    postal_code: "1067",
    city: "Oslo",
    latitude: 59.93549,
    longitude: 10.88559,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Et datasenter i et næringsområde tett på bolig ville vært relevant for naboer. " +
      "Registreringsplikten viser at selskapet driver minst ett datasenter — spørsmålet er " +
      "bare hvor.",
    notes:
      "Oppgradert i runde 4: bransjeoversikter bekrefter anlegget på adressen, og Blix har tre " +
      "Oslo-sites — BDC på Lindeberg, CJH i sentrum og NR5 på Rommen. Datakvalitet 2026-09-30: Blix " +
      "Data Center AS (913675630) har sin eneste underenhet her. Blix Data Center AS står med 10 MW " +
      "i Statnetts kø ved Furuset TRA; det er uavklart om køplassen gjelder BDC eller AI-delen på " +
      "Nedre Rommen 5, og den er ikke sikret kraft.",
    tidligere_titler: [
      "Blix Solutions — registrert datasenteroperatør på Lindeberg",
    ],
    public_candidate: true,
    public_candidate_note:
      "Bekreftet fysisk anlegg, Nkom-registrert operatør og verifisert beliggenhetsadresse.",
    kilder: [
      {
        source_name: "Nkom, registrerte kommersielle datasenteroperatører",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Offentlig register over kommersielle datasenteroperatører med registreringsplikt etter " +
          "ekomloven. 60 operatører og 112 registrerte datasentre. Registeret oppgir firmanavn og " +
          "organisasjonsnummer, ikke fysisk lokasjon.",
      },
      {
        source_name: "Enhetsregisteret: BLIX SOLUTIONS AS",
        source_url:
          "https://data.brreg.no/enhetsregisteret/api/enheter/993128708",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Beliggenhetsadresse Lindeberg næringsvei 26, 1067 Oslo. " +
          "Næringskode 62.200, 10 ansatte. Registrert hos Nkom som kommersiell datasenteroperatør. " +
          "Adressen er et næringsområde, men at anlegget ligger nettopp her er ikke bekreftet.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "lead",
    title:
      "Akvatechnic — eneste registrerte datasenteroperatør med Bærum-adresse",
    description:
      "Selskapet står i Nkoms datasenterregister og er det eneste med adresse i Bærum. " +
      "Adressen er i et boligstrøk på Haslum, og ingen ansatte er registrert. Kategori B: " +
      "lead, ikke bekreftet fysisk anlegg.",
    municipality: "Bærum",
    address: "Nesveien 19",
    postal_code: "1344",
    city: "Haslum",
    verification_status: "archived",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Hvis det faktisk finnes et registrert datasenter i Bærum, er det verdt å vite hvor. " +
      "Registreringsplikten gjelder anlegg over 0,5 MW, så det er ikke en serverskap i en kjeller.",
    notes:
      "Bevisst uten koordinat: adressen ligger i et boligstrøk, og et anlegg på over 0,5 MW er " +
      "lite sannsynlig der. Selskapsadresse skal ikke settes som anleggslokasjon. Runde 8 " +
      "(2026-10-01): arkivert. AKVATECHNIC AS (936306225) er stiftet i 2025 for design og " +
      "prototyping av oppdrettsteknologi, har ingen ansatte, og eneste underenhet er en " +
      "boligadresse. Nkom-oppføringen er en selskapsregistrering; registreringsplikten for " +
      "kommersielle operatører har ingen MW-terskel, så den sier ingenting om anlegg eller " +
      "størrelse. Ingen kilde bekrefter et datasenter.",
    kilder: [
      {
        source_name: "PeeringDB og DataCenterMap, søk på Bærum",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB og DataCenterMap",
        source_type: "register",
        source_date: "2026-09-26",
        supports_claim: false,
        excerpt_or_summary:
          "Ingen av de to katalogene fører en fasilitet i Bærum. Undersøkte kilder som ikke støtter at det finnes et anlegg på adressen.",
      },
      {
        source_name: "Nkom, registrerte kommersielle datasenteroperatører",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Offentlig register over kommersielle datasenteroperatører med registreringsplikt etter " +
          "ekomloven. 60 operatører og 112 registrerte datasentre. Registeret oppgir firmanavn og " +
          "organisasjonsnummer, ikke fysisk lokasjon.",
      },
      {
        source_name: "Enhetsregisteret: AKVATECHNIC AS",
        source_url:
          "https://data.brreg.no/enhetsregisteret/api/enheter/936306225",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Beliggenhetsadresse Nesveien 19, 1344 Haslum, Bærum. " +
          "Registrert hos Nkom som kommersiell datasenteroperatør. Adressen er den eneste i Bærum i " +
          "hele registeret. Ingen ansatte oppgitt.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "note",
    title: "Registrerte datasenteroperatører med kontoradresse i Oslo og Bærum",
    description:
      "Ni av de 60 operatørene i Nkoms register har hovedkontor- eller c/o-adresse i Oslo eller " +
      "Bærum. Ingen av adressene er dokumentert som anleggslokasjon. Kategori A: selskap " +
      "registrert på en adresse — samlet i ett funn framfor ni svake registertreff.",
    municipality: null,
    verification_status: "investigated_not_confirmed",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    notes:
      "Korrigert i runde 4: konklusjonen om kontoradressene står, men den ga feil inntrykk av at " +
      "anleggene lå utenfor byen. Bulk driver OS-IX i Hans Møller Gasmanns vei 9, GlobalConnect har " +
      "minst tre Oslo-sites, og Skygard, Telia og Atea har alle anlegg i byen. Kontoradressen sa " +
      "ingenting — men det gjorde heller ikke fraværet av en anleggsadresse.",
    kilder: [
      {
        source_name: "Nkom, registrerte kommersielle datasenteroperatører",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Offentlig register over kommersielle datasenteroperatører med registreringsplikt etter " +
          "ekomloven. 60 operatører og 112 registrerte datasentre. Registeret oppgir firmanavn og " +
          "organisasjonsnummer, ikke fysisk lokasjon.",
      },
      {
        source_name:
          "Enhetsregisteret, oppslag på alle 60 registrerte operatører",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Samtlige 60 organisasjonsnumre fra Nkoms register ble slått opp. Med adresse i Oslo: " +
          "Bulk Data Centers (fire selskaper, Karenslyst allé 53), Telia Norge (Lørenfaret 1A), " +
          "Atea (Karvesvingen 5), Skygard (Karenslyst allé 10), Iteam (Innspurten 1A), " +
          "Hovedkvarteret IT (Maridalsveien 91), PolarDC DRA (c/o, Grundingen 6) og " +
          "GlobalConnect (Snarøyveien 36, Fornebu i Bærum). Alle er hovedkontor- eller " +
          "c/o-adresser; ingen av dem er dokumentert som anleggslokasjon.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Avfall",
    item_type: "finding",
    title: "Hafslund Celsio Klemetsrud energigjenvinningsanlegg",
    description:
      "Norges største anlegg for energigjenvinning av avfall, med utslippstillatelse fra " +
      "Miljødirektoratet og utslipp til både luft og vann." +
      " Hafslund håndterte over 366 000 tonn avfall på sine to forbrenningsanlegg i 2023, hvorav Klemetsrud er det største. Anlegget har kapasitet til over 3 000 tonn farlig avfall i året, og produserte 1,9 TWh fjernvarme i 2021 — rundt 20 prosent av Oslos varmebehov. Karbonfangstanlegget skal fange opptil 350 000 tonn CO2 i året.",
    municipality: "Oslo",
    address: "Klemetsrudveien 1",
    postal_code: "1278",
    city: "Oslo",
    latitude: 59.84062,
    longitude: 10.83576,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et forbrenningsanlegg av denne størrelsen er den tyngste enkeltvirksomheten i søndre Oslo, " +
      "med tungtrafikk, lukt og luftutslipp, og er samtidig det mest omtalte karbonfangstprosjektet " +
      "i kommunen.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Registeret dokumenterer " +
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag." +
      " Kapasitetstallet på 366 000 tonn gjelder Klemetsrud og Haraldrud til sammen, ikke Klemetsrud alene.",
    kilder: [
      {
        source_name:
          "Norske utslipp: Hafslund Celsio Klemetsrud energigjenvinningsanlegg",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 38.220 energigjenvinning. Forurensningsmyndighet: Miljødirektoratet. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name:
          "Nøkkeltall for avfallsforbrenning og fjernvarmeproduksjon",
        source_url:
          "https://www.hafslund.no/no/produkter-og-tjenester/fjernvarme/nokkeltall-for-avfallsforbrenning-og-fjernvarmeproduksjon",
        publisher: "Hafslund",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Over 366 000 tonn avfall håndtert på de to forbrenningsanleggene i 2023. Klemetsrud har kapasitet til over 3 000 tonn farlig avfall per år. 1,9 TWh fjernvarme i 2021, rundt 20 prosent av Oslos varmebehov.",
      },
      {
        source_name: "Karbonfangst — det neste steget",
        source_url:
          "https://www.hafslund.no/no/produkter-og-tjenester/oslo-ccs/karbonfangst-det-neste-steget",
        publisher: "Hafslund",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Karbonfangstanlegget på Klemetsrud skal kunne fange opptil 350 000 tonn CO2 per år.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Avfall",
    item_type: "finding",
    title: "Haraldrud energigjenvinnings- og varmesentralanlegg",
    description:
      "Samlet anleggsområde på Haraldrud med både materialgjenvinning og varmesentral. Begge har " +
      "egen utslippstillatelse og utslipp til luft og vann. Ett fysisk sted, to tillatelser." +
      " Anlegget behandler rundt 120 000 tonn avfall i året på to forbrenningslinjer og produserer rundt 250 GWh energi som varmt vann til fjernvarmenettet i Groruddalen og Oslo sentrum. Sorteringsanlegget på samme område har kapasitet til 100 000 tonn husholdningsavfall i året.",
    municipality: "Oslo",
    address: "Brobekkveien 87",
    postal_code: "0582",
    city: "Oslo",
    latitude: 59.92954,
    longitude: 10.82713,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et stort avfalls- og energianlegg omgitt av næring og bolig på Løren og Økern, i et område " +
      "som bygges tett ut. Tungtrafikk og lukt er de merkbare sidene for naboer.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Registeret dokumenterer " +
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag.",
    kilder: [
      {
        source_name:
          "Norske utslipp: Haraldrud energigjenvinnings- og varmesentralanlegg",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 38.210 materialgjenvinning og 35.300 fjernvarme. Forurensningsmyndighet: Miljødirektoratet. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Haraldrud energigjenvinningsanlegg",
        source_url:
          "https://www.oslo.kommune.no/avfall-og-gjenvinning/behandlingsanlegg-for-avfall/haraldrud-energigjenvinningsanlegg/",
        publisher: "Oslo kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget har kapasitet til å gjenvinne 120 000 tonn avfall per år fordelt på to forbrenningslinjer, og produserer årlig rundt 250 GWh energi til fjernvarmenettet.",
      },
      {
        source_name: "Haraldrud utsorteringsanlegg",
        source_url:
          "https://www.oslo.kommune.no/avfall-og-gjenvinning/behandlingsanlegg-for-avfall/haraldrud-sorteringsanlegg/",
        publisher: "Oslo kommune",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Sorteringsanlegget har kapasitet til å håndtere 100 000 tonn husholdningsavfall per år.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Drivstofflager",
    item_type: "finding",
    title: "Ekeberg Oljelager og Ekeberg Tank, Sjursøya",
    description:
      "To tillatelser på samme sted: Ekeberg Oljelager med utslipp til både luft og vann, og " +
      "Ekeberg Tank med utslipp til vann. Drivstoffhavna på Sjursøya.",
    municipality: "Oslo",
    address: "Kongshavnveien 23",
    postal_code: "0193",
    city: "Oslo",
    latitude: 59.88986,
    longitude: 10.76094,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et stort drivstofflager i havneområdet rett under boligområdene på Ekeberg. Anlegget er " +
      "blant de få i Oslo der et uhell ville hatt konsekvenser langt utenfor tomtegrensen.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Registeret dokumenterer " +
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag.",
    kilder: [
      {
        source_name: "Norske utslipp: Ekeberg Oljelager og Ekeberg Tank",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 52.100 lagring. Forurensningsmyndighet: Miljødirektoratet. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Kjemisk industri",
    item_type: "finding",
    title: "Nordox kjemisk fabrikk",
    description:
      "Produksjon av kobberforbindelser, med utslippstillatelse fra Miljødirektoratet og utslipp " +
      "til luft.",
    municipality: "Oslo",
    address: "Østensjøveien 13",
    postal_code: "0661",
    city: "Oslo",
    latitude: 59.91177,
    longitude: 10.80713,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Kjemisk produksjon midt i et byområde under transformasjon på Bryn og Helsfyr. Det er få " +
      "slike igjen innenfor Ring 3, og virksomhetstypen er relevant for naboer.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Registeret dokumenterer " +
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag.",
    kilder: [
      {
        source_name: "Norske utslipp: Nordox kjemisk fabrikk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 20.120 produksjon av fargestoffer og pigmenter. Forurensningsmyndighet: Miljødirektoratet. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Farmasøytisk industri",
    item_type: "finding",
    title: "GE Healthcare, farmasøytisk produksjon på Storo",
    description:
      "Produksjonsanlegg med utslippstillatelse, midt i et tett bebygd område på Storo/Nydalen.",
    municipality: "Oslo",
    address: "Nycoveien 1",
    postal_code: "0485",
    city: "Oslo",
    latitude: 59.94587,
    longitude: 10.77315,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Et av de største industrielle produksjonsanleggene som er igjen innenfor bybebyggelsen i " +
      "Oslo, i et område folk i dag oppfatter som bolig og kontor.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Registeret dokumenterer " +
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag.",
    kilder: [
      {
        source_name: "Norske utslipp: GE Healthcare",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 21.200 produksjon av farmasøytiske preparater. Forurensningsmyndighet: Statsforvalteren. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Pukkverk",
    item_type: "finding",
    title: "Franzefoss Pukk, Bondkall pukkverk",
    description: "Pukkverk med utslippstillatelse i nordøstre Oslo.",
    municipality: "Oslo",
    address: "Trondheimsveien 658",
    postal_code: "0964",
    city: "Oslo",
    latitude: 59.97992,
    longitude: 10.92407,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Pukkverk gir sprengning, støv og tungtrafikk, og er blant de mest merkbare naboene et " +
      "boligområde kan ha. Driften er langvarig og endrer seg lite over tid.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Registeret dokumenterer " +
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag.",
    kilder: [
      {
        source_name: "Norske utslipp: Franzefoss Pukk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 08.120 uttak av masse. Forurensningsmyndighet: Statsforvalteren. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Pukkverk",
    item_type: "finding",
    title: "Franzefoss Pukk, Steinskogen pukkverk",
    description:
      "Pukkverk med utslippstillatelse ved Bærums Verk, i et område med boligbebyggelse og " +
      "friluftsområder rundt.",
    municipality: "Bærum",
    address: "Gamle Ringeriksvei 219",
    postal_code: "1353",
    city: "Bærums Verk",
    latitude: 59.93853,
    longitude: 10.52619,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Det største tunge industrianlegget i Bærum, med sprengning, støv og tungtrafikk tett på " +
      "boligområder. Dette er den typen nabo folk faktisk spør om.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Registeret dokumenterer " +
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag.",
    kilder: [
      {
        source_name: "Norske utslipp: Franzefoss Pukk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 08.120 uttak av masse. Forurensningsmyndighet: Statsforvalteren. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Eksplosivproduksjon",
    item_type: "finding",
    title: "Chemring Nobel, produksjon av høyenergimaterialer på Engene",
    description:
      "Anlegg for produksjon av høyenergimaterialer med utslippstillatelse fra Miljødirektoratet, " +
      "på Engene ved Sætre i Asker. Miljødirektoratets register plasserer anlegget på samme adresse " +
      "som selskapet er registrert på, noe verken plandata eller Enhetsregisteret alene kunne vise.",
    municipality: "Asker",
    address: "Engeneveien 7",
    postal_code: "3475",
    city: "Sætre",
    latitude: 59.67896,
    longitude: 10.54233,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Eksplosivproduksjon er blant de få virksomhetstypene som gir sikkerhetssoner og " +
      "beredskapsplaner utenfor egen tomt. Anlegget er det tyngste i Asker og har lang historie på stedet.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Registeret dokumenterer " +
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag.",
    kilder: [
      {
        source_name: "Norske utslipp: Chemring Nobel",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 20.590 produksjon av andre kjemiske produkter. Forurensningsmyndighet: Miljødirektoratet. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Prosessindustri",
    item_type: "finding",
    title: "Tofte industriområde: Statkraft flisproduksjon og Silva Green Fuel",
    description:
      "Det gamle celluloseindustriområdet på Tofte, i dag med flisproduksjon og Silva Green Fuels " +
      "demonstrasjonsanlegg for biodrivstoff. To tillatelser på samme industriområde.",
    municipality: "Asker",
    address: "Østre Strandvei 52",
    postal_code: "3482",
    city: "Tofte",
    latitude: 59.54676,
    longitude: 10.56656,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Det største industriområdet i søndre Asker, og stedet hvor et helt lokalsamfunn ble bygget " +
      "rundt én bedrift. Ny virksomhet på tomta endrer forutsetningene for hele Tofte.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Registeret dokumenterer " +
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag.",
    kilder: [
      {
        source_name:
          "Norske utslipp: Tofte industriområde: Statkraft flisproduksjon og Silva Green Fuel",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 16.100 saging og impregnering samt demonstrasjonsanlegg for biodrivstoff. Forurensningsmyndighet: Miljødirektoratet og Statsforvalteren. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Næringsmiddelindustri",
    item_type: "finding",
    title: "Fatland Oslo slakteri",
    description: "Slakteri med utslippstillatelse på Furuset i Oslo.",
    municipality: "Oslo",
    address: "Professor Birkelands vei 3",
    postal_code: "1081",
    city: "Oslo",
    latitude: 59.94152,
    longitude: 10.88087,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Slakteri gir lukt og tungtrafikk, og ligger her i utkanten av et boligområde.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Registeret dokumenterer " +
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag.",
    kilder: [
      {
        source_name: "Norske utslipp: Fatland Oslo slakteri",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 10.110 bearbeiding og konservering av kjøtt. Forurensningsmyndighet: Statsforvalteren. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Kommunalteknisk anlegg",
    item_type: "finding",
    title: "NCC snøsmelteanlegg ved Grønlia",
    description:
      "Anlegg for smelting av brøytesnø i havneområdet, med egen utslippstillatelse fordi " +
      "smeltevannet inneholder veistøv og salt.",
    municipality: "Oslo",
    address: "Akershusstranda",
    postal_code: "0150",
    city: "Oslo",
    latitude: 59.90642,
    longitude: 10.73494,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    why_interesting:
      "Et anlegg de fleste ikke vet finnes, midt i havnebassenget, med sesongdrift og tungtrafikk " +
      "gjennom sentrum om vinteren.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Registeret dokumenterer " +
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag.",
    kilder: [
      {
        source_name: "Norske utslipp: NCC snøsmelteanlegg ved Grønlia",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 42.110 bygging av veier. Forurensningsmyndighet: Statsforvalteren. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
    ],
  },
  {
    category: "Støy / nabobelastning",
    subcategory: "Skytebane",
    item_type: "finding",
    title: "Franskleiv skiskytteranlegg",
    description:
      "Skiskytteranlegg i Vestmarka i Bærum, registrert hos Miljødirektoratet som anlegg med " +
      "tillatelse. Skiskyting innebærer skytebane, og anlegget er dermed en dokumentert " +
      "sivil skytestøykilde — ikke et av Forsvarets felt.",
    municipality: "Bærum",
    address: "Vestmarkveien 241",
    postal_code: "1341",
    city: "Slependen",
    latitude: 59.88628,
    longitude: 10.42047,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Skytestøy bærer langt i skogsterreng og fanges ikke av de strategiske støykartene " +
      "våre, som dekker vei og bane. For hytter og boliger i Vestmarka er dette en reell " +
      "nabobelastning som ikke vises noe sted i dag.",
    notes:
      "Støynivå ved bolig er ikke undersøkt, og skal ikke antas. Funnet beskriver kilden, ikke " +
      "belastningen.",
    kilder: [
      {
        source_name: "Norske utslipp: Franskleiv skiskytteranlegg",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 93.120 aktiviteter i idrettslag. Forurensningsmyndighet: Statsforvalteren. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Forsvarsbygg, Forsvarets skyte- og øvingsfelt land (WFS)",
        source_url:
          "https://wfs.geonorge.no/skwms1/wfs.forsvarets_skyteogovingsfelt?service=WFS&request=GetCapabilities",
        publisher: "Forsvarsbygg via Geonorge",
        source_type: "map_service",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Nasjonalt datasett over Forsvarets skyte- og øvingsfelt på land, 68 felt. Hentet i sin " +
          "helhet og gjennomgått: ingen av feltene ligger i Oslo, Bærum eller Asker. Nærmeste er " +
          "Rygge skyte- og øvingsfelt i Moss. «Ulven skyte- og øvingsfelt» i datasettet ligger på " +
          "60.196, 5.426 i Vestland — ikke Ulven i Oslo.",
      },
    ],
  },
  {
    category: "Støy / nabobelastning",
    subcategory: "Idrettsanlegg",
    item_type: "finding",
    title: "Lillomarka arena",
    description:
      "Idretts- og aktivitetsanlegg ved Huken i nordøstre Oslo, registrert med tillatelse hos " +
      "Statsforvalteren. Ligger på det gamle Huken pukkverk-området.",
    municipality: "Oslo",
    address: "Hukenveien 29C",
    postal_code: "0963",
    city: "Oslo",
    latitude: 59.97279,
    longitude: 10.87689,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et stort anlegg på et tidligere pukkverk, i overgangen mellom boligområdet på " +
      "Grorud og marka. Aktivitetstype og åpningstider avgjør hvor merkbart det er for naboene.",
    notes:
      "Hva anlegget faktisk brukes til, og hvorfor det har utslippstillatelse, er ikke undersøkt.",
    kilder: [
      {
        source_name: "Norske utslipp: Lillomarka arena",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse. Bransje 81.109 tjenester tilknyttet eiendomsdrift. Forurensningsmyndighet: Statsforvalteren. " +
          "Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
    ],
  },
  {
    category: "Infrastruktur / større prosjekter",
    subcategory: "Kraftnett",
    item_type: "finding",
    title: "Statnett Hamang–Bærum–Smestad, ny 420 kV kabelforbindelse",
    description:
      "Utskifting av hovedstrømnettet gjennom Bærum og Oslo vest: luftledningen fra 1952 " +
      "erstattes av 7,7 km kabelgrøft og 3,3 km tunnel. Tunnelarbeidene pågår. Statnett har " +
      "varslet at de vil søke om endringer i kabelløsningen og om utvidelse av Bærum " +
      "transformatorstasjon.",
    municipality: "Bærum",
    city: "Sandvika",
    latitude: 59.92675,
    longitude: 10.55788,
    verification_status: "verified_public_source",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Anleggsarbeid i mange år langs en 11 km lang trasé gjennom tett bebygde deler av " +
      "Bærum og Oslo vest, og samtidig en sanering av en luftledning som i dag legger " +
      "båndlegging på eiendommer. Begge deler endrer forutsetningene for boliger langs traseen.",
    notes:
      "Koordinaten er Bærum transformatorstasjon, omtrent midt på traseen, ikke hele anlegget. " +
      "Traseen berører både Bærum og Oslo.",
    kilder: [
      {
        source_name: "Statnett, prosjektside Hamang–Bærum–Smestad",
        source_url:
          "https://www.statnett.no/vare-prosjekter/region-ost/hamang-barum-smestad/",
        publisher: "Statnett",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Ny 420 kV forbindelse som erstatter luftledningen fra 1952. Løsningen er 7,7 km " +
          "kabelgrøft fra Hamang via Bærum transformatorstasjon til Hagabråten, og videre 3,3 km " +
          "i tunnel til Smestad. Tunnelarbeidene var halvveis i 2025.",
      },
      {
        source_name: "Anleggskonsesjon fra NVE, Hamang–Bærum–Smestad",
        source_url:
          "https://www.statnett.no/globalassets/her-er-vare-prosjekter/region-ost/nettplan-stor-oslo/hbs/anleggskonsesjon-nve.pdf",
        publisher: "NVE",
        source_type: "document",
        primary_source: true,
        excerpt_or_summary:
          "Meddelt anleggskonsesjon til Statnett SF. Energidepartementet vedtok i 2024 at " +
          "luftledningen skal erstattes av kabel i grøft og tunnel.",
      },
      {
        source_name:
          "NVE nettanlegg: transformatorstasjonene Hamang, Bærum og Smestad",
        source_url: "https://www.nve.no/",
        publisher: "NVE",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle tre stasjonene er registrert som Statnett-anlegg: Hamang 59.89685/10.49851, " +
          "Bærum 59.92675/10.55788, Smestad 59.93494/10.66767. Traseen går mellom disse.",
      },
    ],
  },

  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "finding",
    title: "Asker NIKE-batteri, Rustan leir",
    description:
      "Fredet luftvernanlegg fra den kalde krigen i Asker, en av NIKE-rakettstillingene som " +
      "ble bygget for å forsvare Oslo-området. Fredningen gjelder anlegget som kulturminne — " +
      "det er ikke i militær bruk i dag.",
    municipality: "Asker",
    latitude: 59.87367,
    longitude: 10.3859,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et fredet rakettanlegg fra den kalde krigen er det mest uventede forsvarsanlegget i " +
      "Asker, og fredningen legger reelle begrensninger på hva som kan gjøres med området.",
    kilder: [
      {
        source_name:
          "Riksantikvaren, kulturminneregisteret: Asker NIKE-batteri – Rustan leir",
        source_url: "https://kulturminnesok.no/ra/lokalitet/94417",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Vernetype FOR (fredet). " +
          "Luftvernanlegg fra den kalde krigen. Beskrivelsen i registeret knytter anlegget til " +
          "utviklingen i luftvernartilleri mot raskere bombefly i stor høyde.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "finding",
    title: "Skar leir, Maridalen",
    description:
      "Fredet militært etablissement innerst i Maridalen, med røtter i et kruttverk drevet av vannkraft " +
      "fra Skarselven, senere tysk verkstedutbygging og norsk øvingsvirksomhet. Dagens bruk er ikke undersøkt.",
    municipality: "Oslo",
    latitude: 60.0273,
    longitude: 10.7789,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et fredet militæranlegg i Marka, med en industrihistorie de færreste kjenner. Fredningen styrer hva " +
      "som kan skje med bygningene.",
    kilder: [
      {
        source_name:
          "Riksantikvaren, kulturminneregisteret: Skar leir, Maridalen",
        source_url: "https://kulturminnesok.no/ra/lokalitet/94435",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Vernetype FOR (fredet). " +
          "Kruttverket ble lagt til Skar på grunn av Skarselven som kraftkilde. Senere var naturomgivelsene " +
          "og nærheten til marka avgjørende for Forsvarets øvingsvirksomhet. Tyskerne bygde ut verksteder her.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "finding",
    title: "Løren leir",
    description:
      "Fredet militærleir midt i boligtransformasjonen på Løren, med opprinnelse i ammunisjonsfabrikken " +
      "Norma fra 1912.",
    municipality: "Oslo",
    latitude: 59.93068,
    longitude: 10.79261,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et fredet anlegg midt i et av Oslos største boligutbyggingsområder. Fredningen er en reell " +
      "planbegrensning, og historikken som ammunisjonsfabrikk forklarer hvorfor området ser ut som det gjør.",
    kilder: [
      {
        source_name: "Riksantikvaren, kulturminneregisteret: Løren leir",
        source_url: "https://kulturminnesok.no/ra/lokalitet/87642",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Vernetype FOR (fredet). " +
          "Leiren ligger mellom Ringveien og Lørenveien i et tidligere industriområde som nå transformeres til " +
          "bolig. Ammunisjonsfabrikken Norma ble anlagt på Løren i 1912, hadde kontrakt med Forsvaret fra 1916 " +
          "og ble rekvirert i 1941.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "finding",
    title: "Holmenkollen leir",
    description:
      "Fredet militært etablissement i Holmenkollen, tysk luftforsvarshovedkvarter under okkupasjonen og " +
      "senere alliert kontrollsenter.",
    municipality: "Oslo",
    latitude: 59.96422,
    longitude: 10.66365,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av de viktigste militære kommandoanleggene i landet, midt i et villaområde, og fortsatt fredet.",
    kilder: [
      {
        source_name: "Riksantikvaren, kulturminneregisteret: Holmenkollen leir",
        source_url: "https://kulturminnesok.no/ra/lokalitet/112576",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Vernetype FOR (fredet). " +
          "Holmenkollen etablissement inngikk i kjeden av tyske kommandoanlegg under okkupasjonen og var " +
          "hovedkvarter for det tyske luftforsvaret. Fra 1945 kontrollsenter for Luftforsvaret i Sør-Norge, " +
          "deretter for allierte luftstridskrefter.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "finding",
    title: "Ormsund leir",
    description:
      "Fredet leiranlegg fra okkupasjonstiden ved Ormsund på Bekkelaget, bygget for den tyske marinen og " +
      "fortsatt bevart i sitt opprinnelige villamiljø.",
    municipality: "Oslo",
    latitude: 59.88041,
    longitude: 10.76797,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Et intakt krigsminne midt i et boligområde, med fredning som binder både anlegget og omgivelsene.",
    kilder: [
      {
        source_name: "Riksantikvaren, kulturminneregisteret: Ormsund leir",
        source_url: "https://kulturminnesok.no/ra/lokalitet/168054",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Vernetype VED (vedtaksfredet). " +
          "Ormsund leir ligger på Agnesjordet ved Nedre Bekkelaget skole og ble bygget av okkupasjonsmakten " +
          "under andre verdenskrig til bruk for den tyske marinen. Den ligger fortsatt i sitt opprinnelige " +
          "miljø omgitt av store trevillaer og hager.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "finding",
    title: "Bakås skanser",
    description:
      "Fire fredede skanser — eldre feltbefestninger — i Alna bydel, bevart som et grøntdrag mellom skole " +
      "og blokkbebyggelse.",
    municipality: "Oslo",
    latitude: 59.93657,
    longitude: 10.91862,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Fredede forsvarsverk forklarer hvorfor et grøntdrag midt i blokkbebyggelsen aldri er bygget ut.",
    kilder: [
      {
        source_name: "Riksantikvaren, kulturminneregisteret: Bakås skanser",
        source_url: "https://kulturminnesok.no/ra/lokalitet/118039",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Vernetype VED (vedtaksfredet). " +
          "De fire skansene på Bakås ligger i Alna bydel ved endestasjonen for T-banelinjen til Ellingsrudåsen, " +
          "nær Bakås skole og blokkbebyggelse. Nærområdet er fortsatt i stor grad uberørt landskap.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "finding",
    title: "Grossbatterie Stabekk «Bertha»",
    description:
      "Tysk storluftvernbatteri fra okkupasjonstiden ved Store Stabekk gård i Bærum. Registrert i " +
      "kulturminneregisteret, men uten vernestatus.",
    municipality: "Bærum",
    latitude: 59.90695,
    longitude: 10.58763,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Et av de største tyske luftvernanleggene i Bærum, i et område som i dag er tett boligbebyggelse og " +
      "under planarbeid for E18-korridoren.",
    kilder: [
      {
        source_name:
          "Riksantikvaren, kulturminneregisteret: Grossbatterie Stabekk «Bertha»",
        source_url: "https://kulturminnesok.no/ra/lokalitet/290214",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Vernetype IKKEV (ikke vernet). " +
          "Beliggenhet Krokvolden, nordover fra Gamle Drammensvei ved Store Stabekk gård, krysser Skogveien. " +
          "En av flere store luftvernkanonstillinger anlagt av tyskerne.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "finding",
    title: "Fangeleir ved Oksenøya bruk",
    description:
      "Revet fangeleir ved Oksenøya bruk på Fornebu, brukt for russiske krigsfanger og siste krigsår drevet " +
      "som utekommando under Grini.",
    municipality: "Bærum",
    latitude: 59.89847,
    longitude: 10.60756,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Fornebu bygges nå tett ut, og dette er en del av stedets historie som ikke er synlig i terrenget lenger.",
    kilder: [
      {
        source_name:
          "Riksantikvaren, kulturminneregisteret: Fangeleir ved Oksenøya bruk",
        source_url: "https://kulturminnesok.no/ra/lokalitet/290258",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Vernetype IKKEV (ikke vernet). " +
          "Fangeleir for russiske krigsfanger. Siste krigsår utekommando under Grini fangeleir, med opptil " +
          "400 fanger. Tilstand: revet.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "finding",
    title: "Arkivbunker Løkkeåsen",
    description:
      "Bunkeranlegg på Løkkeåsen i Sandvika, registrert i kulturminneregisteret som arkivbunker.",
    municipality: "Bærum",
    latitude: 59.89921,
    longitude: 10.53535,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Underjordiske anlegg midt i Sandvika sentrum er relevant å kjenne til ved utbygging og graving.",
    kilder: [
      {
        source_name:
          "Riksantikvaren, kulturminneregisteret: Arkivbunker Løkkeåsen",
        source_url: "https://kulturminnesok.no/ra/lokalitet/290207",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Vernetype IKKEV (ikke vernet). " +
          "Registrert som arkivbunker på Løkkeåsen i Sandvika.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "finding",
    title: "Tyske festningsanlegg på Snarøya, Fornebu og Høvik",
    description:
      "Et sammenhengende landskap av tyske anlegg fra okkupasjonstiden rundt Fornebu flyplass: " +
      "44 registrerte bunkere, fjellhuler, skytterstillinger, ringvern og løpegraver fra " +
      "Snarøya i sør til Høvik og Stabekk i nord. Samlet i ett funn framfor 44 enkeltrader.",
    municipality: "Bærum",
    city: "Snarøya",
    latitude: 59.89767,
    longitude: 10.6058,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Fornebu og Snarøya bygges tett ut, og under bakken ligger det et betydelig antall " +
      "bunkere og fjellanlegg som ingen av dem har vernestatus. Det er relevant både for " +
      "graving og for å forstå terrenget.",
    notes:
      "Koordinaten er tyngdepunktet for de 44 registreringene, ikke ett bestemt anlegg. Enkeltanlegg " +
      "kan slås opp i kulturminneregisteret.",
    kilder: [
      {
        source_name:
          "Riksantikvaren, kulturminneregisteret: 44 registreringer av bunkere og skytterstillinger i Bærum",
        source_url: "https://kulturminnesok.no/ra/lokalitet/290239",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "44 enkeltregistreringer med bunker, skytterstilling, skyttergrav, kanonstilling, " +
          "ringvern eller løpegrav i navn eller beskrivelse. Tyngdepunkt 59.898, 10.606, " +
          "utstrekning fra Snarøya i sør til Grini i nord. Blant dem fjellbunkere på Snarøya, " +
          "«Hovedbunker Birkeli», «Bunker Lys blå», tysk radiostasjon ved Snarøya og Den tyske " +
          "jagerflyger-kommandoens bunker ved Fornebu. Ingen av dem har vernestatus.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "finding",
    title: "Luftvernbatterier rundt Oslo",
    description:
      "Fire registrerte luftvernbatterier fra okkupasjonstiden rundt Oslo. To av dem, Bjerke " +
      "og Ekeberg, er oppgitt som revet. Gressholmen og Holmen står uten slik merknad.",
    municipality: "Oslo",
    latitude: 59.88421,
    longitude: 10.71894,
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Luftvernstillinger ligger på høydedrag som ofte er grøntområder i dag, og forklarer " +
      "hvorfor enkelte kolletopper aldri er bebygget.",
    notes:
      "Koordinaten er Gressholmen-batteriet. De fire ligger spredt; dette er en samleoppføring.",
    kilder: [
      {
        source_name:
          "Riksantikvaren, kulturminneregisteret: luftvernbatterier i Oslo",
        source_url: "https://kulturminnesok.no/ra/lokalitet/215083",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Fire registrerte luftvernbatterier: Bjerke (59.94336, 10.8049, revet), Ekeberg " +
          "(59.8959, 10.77899, revet), Gressholmen (59.88421, 10.71894) og Holmen " +
          "(59.94849, 10.6845). Ingen har vernestatus.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "note",
    title: "Tyske leirer i Oslo under okkupasjonen",
    description:
      "19 registrerte leir- og lageranlegg fra okkupasjonstiden, spredt over hele byen og " +
      "nesten alle revet. Samlet i ett funn fordi enkeltanleggene sjelden er synlige i dag, " +
      "men samlet sier de noe om hvor tett okkupasjonen lå over byen.",
    municipality: "Oslo",
    verification_status: "verified_public_source",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    notes:
      "Uten koordinat: anleggene ligger spredt og de fleste er revet. «Linderud arbeidsleir» i denne " +
      "listen er et annet anlegg enn dagens Linderud leir.",
    kilder: [
      {
        source_name:
          "Riksantikvaren, kulturminneregisteret: tyske leirer i Oslo",
        source_url: "https://kulturminnesok.no/ra/lokalitet/215106",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "19 registrerte leir- og lageranlegg fra okkupasjonstiden i Oslo, de fleste merket " +
          "«revet»: blant andre Etterstadleiren, Frognerleiren, Furuset leir, Gulleråsen leir, " +
          "Hasleveien leir, Kampen leir, Klosterenga leir, Kongsvingergata leir, Sannergata leir, " +
          "Sjursøya leir, Skøyen leir, Stavangergata leir, Ljanskollen fangeleir og Linderud " +
          "arbeidsleir.",
      },
      {
        source_name: "Riksantikvaren, OGC API Features: lokaliteter",
        source_url:
          "https://api.ra.no/LokaliteterEnkeltminnerOgSikringssoner/collections/lokaliteter/items",
        publisher: "Riksantikvaren",
        source_type: "map_service",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Alle 11 834 kulturminnelokaliteter i Oslo (9 656), Bærum (610) og Asker (1 568) ble hentet " +
          "og gjennomgått systematisk for forsvarsrelaterte navn og beskrivelser.",
      },
    ],
  },
  {
    category: "Forsvar / militært",
    subcategory: "Kulturminne",
    item_type: "note",
    title: "«Festningen» i Hurum er en antatt bygdeborg, ikke et militæranlegg",
    description:
      "To kulturminneregistreringer i søndre Asker heter «Festningen». Navnet peker mot et " +
      "forsvarsanlegg, men registeret beskriver en bratt bergknatt som antatt bygdeborg fra " +
      "forhistorisk tid. Lagret for å unngå at navnet feiltolkes i en senere runde.",
    municipality: "Asker",
    latitude: 59.67832,
    longitude: 10.44802,
    verification_status: "investigated_not_confirmed",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    kilder: [
      {
        source_name: "Riksantikvaren, kulturminneregisteret: Festningen, Hurum",
        source_url: "https://kulturminnesok.no/ra/lokalitet/10008",
        publisher: "Riksantikvaren",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Vernetype IKKEV (ikke vernet). " +
          "Åsen faller bratt av mot alle kanter. Registrert som antatt bygdeborg, ikke som militæranlegg " +
          "fra nyere tid. Ingen spor av mur er funnet.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "note",
    title: "Plan- og byggesak er ikke en farbar vei til datasentre",
    description:
      "Konklusjonen fra runde 3 var feil og er erstattet. Plandata og kommunale planinnsyn ga ingen " +
      "datasentre, men runde 4 fant femten fysiske anlegg gjennom bransjekilder. Det plan- og " +
      "byggesak *ikke* ga, er altså ikke det samme som at anleggene ikke finnes — de er bygget i " +
      "eksisterende næringsbygg, som sjelden utløser en egen plansak.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    notes:
      "Veien videre er det nye arealformålet: planer varslet etter juli 2025 kan angi datasenter " +
      "eksplisitt, og da blir de søkbare i plandata. Nettselskapenes tilknytningssaker er den andre " +
      "inngangen — de er ikke undersøkt ennå.",
    tidligere_titler: [
      "Ingen planlagte datasentre dokumentert i Oslo, Bærum eller Asker",
    ],
    kilder: [
      {
        source_name:
          "Kart- og planforskriften, nytt arealformål for datasenter fra juli 2025",
        source_url: "https://www.regjeringen.no/",
        publisher: "Kommunal- og distriktsdepartementet",
        source_type: "regulation",
        source_date: "2025-07-01",
        primary_source: true,
        excerpt_or_summary:
          "Datasenter er fra juli 2025 et eget arealformål som kan angis i kommuneplan, på linje " +
          "med næringsbebyggelse og industri. Kommunene skal vurdere kapasitet i kraftnettet, " +
          "arealkonflikter og klimavirkning.",
      },
      {
        source_name: "Søk i kommunale planressurser for Oslo, Bærum og Asker",
        source_url: "https://od2.pbe.oslo.kommune.no/kart/",
        publisher: "Oslo, Bærum og Asker kommune",
        source_type: "web",
        source_date: "2026-09-26",
        supports_claim: false,
        excerpt_or_summary:
          "Ingen dokumentert plan- eller byggesak for datasenter funnet i de tre kommunene. " +
          "Kommunenes planinnsyn er kartklienter uten søkbart tekstgrensesnitt utenfra.",
      },
    ],
  },
  {
    category: "Infrastruktur / større prosjekter",
    subcategory: "Områdeutvikling",
    item_type: "finding",
    title: "Røyken næringspark",
    description:
      "Næringsområde under utbygging i Røyken, med to varslede planer for ulike felt: felt C i 2025 og " +
      "felt E samme år. Ett område, to plansaker.",
    municipality: "Asker",
    address: "Vekstveien 31",
    postal_code: "3474",
    city: "Åros",
    latitude: 59.69138,
    longitude: 10.47644,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Et av de største sammenhengende næringsområdene i nye Asker, i et område som ellers er bolig og " +
      "landbruk. Hva slags virksomhet som kommer inn avgjør belastningen for nabolaget.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke prosjektets egen adresse.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 865",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/865?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2025-04-03",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2025-04-03: «Røyken næringspark, felt E». Kunngjøringen dokumenterer at planarbeidet " +
          "er startet, ikke hva området til slutt blir.",
      },
      {
        source_name: "DiBK planleggingigangsatt, arealplan 595",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/595?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2025-06-30",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2025-06-30: «Bestemmelser til detaljregulering for Røyken næringsområde, Felt C». Kunngjøringen dokumenterer at planarbeidet " +
          "er startet, ikke hva området til slutt blir.",
      },
    ],
  },
  {
    category: "Infrastruktur / større prosjekter",
    subcategory: "Områdeutvikling",
    item_type: "finding",
    title: "Yggeset avfallsområde",
    description:
      "Områderegulering for Yggeset i Heggedal, Askers avfallsanlegg med gjenvinningsstasjon.",
    municipality: "Asker",
    address: "Yggesetveien 14",
    postal_code: "1389",
    city: "Heggedal",
    latitude: 59.79161,
    longitude: 10.46458,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Avfallsanlegg gir lukt og tungtrafikk, og en områderegulering kan endre både omfang og drift. " +
      "Ligger tett på boligområdet i Heggedal.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke prosjektets egen adresse.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 774",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/774?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2024-06-03",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2024-06-03: «Områderegulering for Yggeset». Kunngjøringen dokumenterer at planarbeidet " +
          "er startet, ikke hva området til slutt blir.",
      },
    ],
  },
  {
    category: "Infrastruktur / større prosjekter",
    subcategory: "Områdeutvikling",
    item_type: "finding",
    title: "Rortunet og Slemmestadveien",
    description:
      "Detaljregulering for senterområdet Rortunet i Slemmestad, varslet september 2026.",
    municipality: "Asker",
    address: "Rortunet 4",
    postal_code: "3470",
    city: "Slemmestad",
    latitude: 59.77792,
    longitude: 10.48624,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Slemmestad er i full transformasjon fra sementindustristed til boligsted, og senterområdet er " +
      "kjernen i den omleggingen.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke prosjektets egen adresse.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 2076",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/2076?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2026-09-10",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2026-09-10: «Detaljregulering for Rortunet/Slemmestadveien». Kunngjøringen dokumenterer at planarbeidet " +
          "er startet, ikke hva området til slutt blir.",
      },
    ],
  },
  {
    category: "Infrastruktur / større prosjekter",
    subcategory: "Områdeutvikling",
    item_type: "finding",
    title: "Storsand bolig- og golfområde",
    description:
      "Stort bolig- og golfområde ved Storsand i søndre Asker, varslet november 2025.",
    municipality: "Asker",
    address: "Storsandveien 9",
    postal_code: "3475",
    city: "Sætre",
    latitude: 59.65603,
    longitude: 10.5883,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "En stor utbygging i et område som i dag er lite bebygd, og som vil endre karakteren på hele " +
      "strekningen langs Oslofjorden sør for Sætre.",
    notes:
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke prosjektets egen adresse.",
    kilder: [
      {
        source_name: "DiBK planleggingigangsatt, arealplan 1094",
        source_url:
          "https://plandata.ft.dibk.no/services/rest/planleggingigangsatt/collections/arealplan/items/1094?f=html",
        publisher: "Direktoratet for byggkvalitet",
        source_type: "map_service",
        source_date: "2025-11-23",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om planoppstart 2025-11-23: «Storsand bolig- og golfområde Grønsand og Havnemyra OG Slottet - Storsand». Kunngjøringen dokumenterer at planarbeidet " +
          "er startet, ikke hva området til slutt blir.",
      },
    ],
  },

  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: ["Alfabygget, Hans Møller Gasmanns vei 9 — OS-IX"],
    title: "Bulk OS-IX, Hans Møller Gasmanns vei 9",
    description:
      "Et av Norges største datasenterbygg, på Økern/Alnabru. Tre operatører er oppført på samme " +
      "adresse: Bulk Infrastructure driver Oslo Internet Exchange (OS-IX) her, Verizon har anlegget " +
      "«Alfabygget», og GlobalConnect har site HMG9. Ett fysisk bygg, tre oppføringer.",
    municipality: "Oslo",
    address: "Hans Møller Gasmanns vei 9",
    postal_code: "0598",
    city: "Oslo",
    latitude: 59.93843,
    longitude: 10.83497,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av landets best tilknyttede bygg, med den strømbruken og de kjøleanleggene et stort " +
      "datasenter innebærer, midt i et næringsområde som grenser til bolig. Bulks kontoradresse på " +
      "Skøyen sa ingenting om dette.",
    notes:
      "Aliaser: Alfabygget, OS-IX, Oslo Internet Exchange, HMG9. Bulk Infrastructure har " +
      "forretningsadresse Karenslyst allé 53 på Skøyen — det er kontoret, ikke anlegget.",
    public_candidate: true,
    public_candidate_note:
      "Bekreftet fysisk anlegg med tre uavhengige oppføringer på samme adresse, verifisert adresse og korrekt status.",
    kilder: [
      {
        source_name: "PeeringDB: nettverk til stede i fasiliteten",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "fac_id 5518. 43 nettverk til stede. Sammen med OSL01 utgjør de to Oslos to bærende samtrafikkpunkter.",
      },
      {
        source_name: "DataCenterMap: Oslo Internet Exchange - OS-IX",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Oslo Internet Exchange - OS-IX, operatør Bulk Infrastructure, adresse Hans Møller Gasmanns vei 9. " +
          "Beskrevet som et av Norges best tilknyttede bygg med colocation og datasentertjenester.",
      },
      {
        source_name: "DataCenterMap: Alfabygget",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Alfabygget, operatør Verizon Communications, adresse Hans Møller Gasmansvei 9. " +
          "Beskrevet som «one of Norways largest data centers».",
      },
      {
        source_name:
          "PeeringDB: Bulk Oslo Internet Exchange OS-IX, GlobalConnect HMG9 og Verizon HMG9",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Registrert fasilitet med adresse Hans Møller Gasmanns vei 9, organisasjon tre ulike organisasjoner på samme adresse. PeeringDB er " +
          "bransjens eget register over samtrafikkpunkter, og oppgir faktisk gateadresse.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "GlobalConnect HMG1, Hans Møller Gasmanns vei 1",
    description:
      "GlobalConnects datasenter i Hans Møller Gasmanns vei 1 på Ulven, på samme eiendom som " +
      "Østre Aker vei 68. Oslo kommune godkjente bruksendring av lager til datasenter (647,5 m²) " +
      "med ferdigattest i mars 2024, og en fase 2 med datahall og generator- og kjølebygg har " +
      "igangsettingstillatelse fra august 2024.",
    municipality: "Oslo",
    address: "Hans Møller Gasmanns vei 1",
    postal_code: "0598",
    city: "Oslo",
    latitude: 59.93658,
    longitude: 10.83247,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Området rundt Hans Møller Gasmanns vei framstår som en datasenterklynge med flere bygg og " +
      "operatører — det er nyttig å vite når man ser på næringsbygg i Hovinbyen.",
    notes:
      "Primærkilde-runde 2026-09-30: primærkilde for anlegget søkt, ikke funnet. Adressen " +
      "(gnr/bnr 88/273) og GlobalConnect AS er bekreftet i Kartverket og Brønnøysund, men " +
      "selskapet har ingen underenhet på adressen. Blix' PoP-liste nevner «GC HMG1» (sekundær). " +
      "Runde 11 (2026-10-02): anlegget er nå primærbekreftet av Plan- og bygningsetatens sak " +
      "202217340 («Bruksendring av lager til datasenter», tiltakshaver GlobalConnect AS). " +
      "Aliaser: GlobalConnect OAV68, Østre Aker vei 68, Broadnet Østre Aker vei. Broadnet AS er " +
      "samme juridiske enhet (navneskifte 06.06.2019). Ikke samme anlegg som Bulk OS-IX i nr. 9. " +
      "Bygningseier er ikke avklart.",
    kilder: [
      {
        source_name: "PeeringDB: GlobalConnect Oslo (HMG1)",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Registrert fasilitet med adresse Hans Møller Gasmanns vei 1, organisasjon GlobalConnect Group. PeeringDB er " +
          "bransjens eget register over samtrafikkpunkter, og oppgir faktisk gateadresse.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Nedre Rommen 5 — Blix NR5 og Magnora AI-datasenter",
    description:
      "Næringsbygg på Rommen med to datasenteroppføringer: Blix Solutions' site NR5, og Magnora " +
      "Oslo — et AI-datasenter utviklet av Magnora Data Center og Blix Group i et tidligere " +
      "finansanlegg, med 1 MW innledende effekt skalerbart til 9 MW.",
    municipality: "Oslo",
    address: "Nedre Rommen 5",
    postal_code: "0988",
    city: "Oslo",
    latitude: 59.96245,
    longitude: 10.90631,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et AI-datasenter som skal skaleres til 9 MW i et bolignært næringsbygg er en vesentlig " +
      "endring i effektbruk og kjølebehov, og den typen anlegg som nå får eget arealformål i plan.",
    notes:
      "Aliaser: Blix NR5, Magnora Oslo. Bygget er 6 050 m² fra 1988, eid av Bruun Eiendom. " +
      "Effekttallene kommer fra bransjeomtale, ikke fra en myndighetskilde. Runde 4: Magnora " +
      "skriver at søknaden om mer effekt står i kø hos netteier; Blix Data Center AS har 10 MW i " +
      "Statnetts kø ved Furuset TRA, men det er uavklart om den gjelder dette bygget eller Blix " +
      "BDC.",
    public_candidate: true,
    public_candidate_note:
      "Bekreftet fysisk anlegg med to operatøroppføringer. Effekttallene er fra bransjekilde og skal ikke gjengis som fakta.",
    kilder: [
      {
        source_name: "DataCenterMap: Magnora Oslo",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Magnora Oslo, operatør Magnora ASA, adresse Nedre Rommen 5. " +
          "AI-datasenter utviklet av Magnora Data Center og Blix Group i et tidligere finansanlegg, " +
          "1 MW innledende kapasitet skalerbart til 9 MW.",
      },
      {
        source_name: "DataCenterMap: Blix NR5 Oslo",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Blix NR5 Oslo, operatør Blix Solutions AS, adresse Nedre Rommen 5. " +
          "Urbant datasenter.",
      },
      {
        source_name: "PeeringDB: Blix NR5 Oslo",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Registrert fasilitet med adresse Nedre Rommen 5, organisasjon Blix Solutions AS. PeeringDB er " +
          "bransjens eget register over samtrafikkpunkter, og oppgir faktisk gateadresse.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Skygard OSL1, Østre Aker vei 24C",
    description:
      "Datasenter i Hovinbyen på 20 MW over 25 000 m², bygget for 2,4 milliarder kroner. Byggetrinn 1 " +
      "ble overlevert i april 2026, og trinn 2 (12 MW) skal stå ferdig i 2027. Eid av Telenor, " +
      "Hafslund og HitecVision med 31,7 % hver, og Analysys Mason med 5 %. Overskuddsvarmen leveres til fjernvarmenettet. Det klart største " +
      "dokumenterte datasenteret i Oslo kommune.",
    municipality: "Oslo",
    address: "Østre Aker vei 24C",
    postal_code: "0581",
    city: "Oslo",
    latitude: 59.92941,
    longitude: 10.8181,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et nytt datasenter midt i Hovinbyen, Oslos største transformasjonsområde, der det ellers " +
      "planlegges tett bolig. Effektbehov og kjøling er relevant for hele nabolaget.",
    notes:
      "Løst i oppfølgingsrunden: 20 MW. Rettet i datasenter-enrichment runde 1 (2026-09-30): " +
      "første halvår 2025 var opprinnelig plan; Sentias børsmelding 16.06.2026 sier at trinn 1 " +
      "ble overlevert i april 2026. Registrert hos Nkom, med kontoradresse Karenslyst allé 10. " +
      "Runde 11 (2026-10-02): rettet en notatfeil – «Orange OSL5» er ikke et alias på OSL3, men " +
      "et eget anlegg på Lørenskog (Skygard OSL5). Skygard har tre separate anlegg: OSL1, OSL3 og " +
      "OSL5. Ingen primærkilde sier ennå at trinn 1 er i kundedrift.",
    public_candidate: true,
    public_candidate_note:
      "Bekreftet fysisk anlegg i drift, operatørens egen kilde pluss uavhengig fagpresse, verifisert adresse og korrekt status.",
    kilder: [
      {
        source_name: "Skygard, egen anleggsside for OSL1",
        source_url: "https://www.skygard.no/osl1-eng",
        publisher: "Skygard",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary: "Operatørens egen side for anlegget.",
      },
      {
        source_name:
          "Byggeindustrien: starter byggingen av datasenter sentralt i Oslo",
        source_url:
          "https://www.bygg.no/oslo/starter-byggingen-av-datasenter-sentralt-i-oslo/367624",
        publisher: "Byggeindustrien",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Byggestart i Hovinbyen med investeringsramme på 2,4 milliarder kroner.",
      },
      {
        source_name: "Norsk Datasenterindustri: Skygard",
        source_url: "https://www.datasenterindustrien.no/skygard",
        publisher: "Norsk Datasenterindustri",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary: "Bransjeorganisasjonens oppføring av operatøren.",
      },
      {
        source_name: "DataCenterMap: Skygard OSL1",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Skygard OSL1, operatør Skygard, adresse Østre Aker vei 24C. " +
          "«Visionary project located in Hovinbyen, Oslo.»",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Skygard OSL3, Stanseveien 30",
    description:
      "Skygards datasenter på Grorud, overtatt fra Orange Business i januar 2026 og tidligere " +
      "drevet som Basefarm OSL3. Skygard oppgir 3,6 MW. Adressen Stanseveien 30 er bekreftet av " +
      "en støysak i Bydel Grorud om kjøleaggregatene på anlegget.",
    municipality: "Oslo",
    address: "Stanseveien 30",
    postal_code: "0976",
    city: "Oslo",
    latitude: 59.94951,
    longitude: 10.88071,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Et etablert datasenter i et næringsområde på Grorud, tett på bolig.",
    notes:
      "Primærkilde-runde 2026-09-30: rettet. Skygard kjøpte OSL3 fra Orange, ikke fra Basefarm, " +
      "og «Orange OSL5» er et eget anlegg på Lørenskog – aliaset er fjernet. PeeringDB fører " +
      "anlegget som Basefarm OSL3 (Grorud), som er det tidligere navnet på operatøren hos Orange. " +
      "Runde 10 (2026-10-02): Skygard fører OSL3 som eget datasenter med 3,6 MW ved siden av OSL1 " +
      "og OSL5. Operatør og eier er Skygard AS. Gateadressen Stanseveien 30 kommer fortsatt bare " +
      "fra katalogkilder; Skygard oppgir Grorud. Skygard OSL5 på Lørenskog mangler i basen og er " +
      "lead til neste runde. Runde 11 (2026-10-02): Stanseveien 30 er nå primærbekreftet (Bydel " +
      "Grorud, sak 2025/31558 om støy fra kjøleaggregater; pålegg 01.07.2026). Parten i saken " +
      "skiftet fra Orange Business Digital Norway AS til Skygard 2 AS i januar 2026, og Skygard 2 " +
      "AS er ført som eier. Tidligere operatører av samme anlegg: Basefarm og Orange Business.",
    kilder: [
      {
        source_name: "PeeringDB: nettverk til stede i fasiliteten",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "fac_id 6629, oppført som «Basefarm OSL3» med stedsangivelse Grorud. 4 nettverk til stede. Styrker at Skygard OSL3 og Basefarm OSL3 er samme anlegg.",
      },
      {
        source_name: "DataCenterMap: Skygard OSL3",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Skygard OSL3, operatør Skygard, adresse Stanseveien 30. " +
          "Oppført med referanse til «Orange OSL5».",
      },
      {
        source_name: "PeeringDB: Basefarm OSL3",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Registrert fasilitet med adresse Grorud, 0976 Oslo, organisasjon Basefarm AS. PeeringDB er " +
          "bransjens eget register over samtrafikkpunkter, og oppgir faktisk gateadresse.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Skygard OSL5, Hornerudveien 25 (Lørenskog)",
    description:
      "Skygards datasenter på Rasta i Lørenskog, med 7,2 MW kapasitet og 10 000 m² ifølge " +
      "operatøren. Anlegget ble åpnet av Basefarm i november 2017 i en ombygd telefonfabrikk, ble " +
      "en del av Orange Business i 2018 og ble kjøpt av Skygard med overtakelse i januar 2026. " +
      "Statnett fører 12 MW som tilknyttet for «Basefarm» ved Røykås transformatorstasjon, som " +
      "ligger rundt 700 meter unna. Bygget rommer også andre leietakere.",
    municipality: "Lørenskog",
    address: "Hornerudveien 25",
    postal_code: "1461",
    city: "Lørenskog",
    latitude: 59.92596,
    longitude: 10.94207,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Det største datasenteret Skygard har i drift, plassert i et kombinert næringsbygg med " +
      "boligfelt på flere sider og innenfor 150 meter. Nettilknytningen er vesentlig større enn " +
      "det operatøren oppgir som kapasitet.",
    notes:
      "Opprettet i runde 11 (2026-10-02). Tidligere navn: Basefarm OSL5 / Datasenter Oslo 5 " +
      "(2017–), Orange Business OSL5 (til jan. 2026). Eldre adresse på samme bygg: Nordliveien " +
      "21, 1476 Rasta (veinavnet finnes ikke lenger i Kartverkets adresseregister for Lørenskog). " +
      "Hornerudveien 21 og 25 deler gnr/bnr 102/2; hvilken del av komplekset datasenteret opptar " +
      "er ikke dokumentert, så punktet er adressepunktet for nr. 25. Juridisk eier av anlegget er " +
      "ikke offentliggjort – Skygard 2 AS er dokumentert som ansvarlig enhet for OSL3, ikke for " +
      "OSL5. NAV og Bane NOR har driftsavtaler med Basefarm/Orange som er videreført til Skygard, " +
      "men ingen kilde sier hvilket anlegg de bruker. Statnetts 12 MW tilknyttet ved Røykås står " +
      "på merkenavnet «Basefarm», som hadde to anlegg, og er ikke ført som sikret kraft. " +
      "Grunneier er ikke ført; grunnboka er ikke sjekket.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Skygard: OSL5",
        source_url: "https://www.skygard.no/osl5-eng",
        publisher: "Skygard AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Operatørens anleggsside: OSL5 på Lørenskog, 10 000 m², 7,2 MW, PUE <1,25, EN50600, egnet " +
          "for dual-site med OSL3 på Grorud. Bekrefter selve anlegget og drift – ikke gateadresse.",
      },
      {
        source_name: "Skygard utvider kapasiteten etter strategisk oppkjøp",
        source_url: "https://www.skygard.no/nb/articles/skygard-utvider-kapasiteten-etter-strategisk-oppkjops",
        publisher: "Skygard AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Skygard kjøper datasentrene OSL3 og OSL5 fra Orange Business Services Norway. Eiere: " +
          "Telenor, Hafslund, HitecVision og Analysys Mason. Bekrefter operatørskiftet, ikke adresse " +
          "eller MW.",
      },
      {
        source_name: "Arbeidstilsynet sak 2024/54781: Lørenskog kommune – gnr/bnr 102/2 – Hornerudveien 25 – Søknad om samtykke",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01jabp0qpyf6kbzpz6r8m00nch",
        publisher: "Arbeidstilsynet (eInnsyn)",
        source_type: "register",
        source_date: "2024-10-11",
        primary_source: true,
        excerpt_or_summary:
          "Samtykke innvilget til Orange Business Digital Norway AS for tiltak på Hornerudveien 25, " +
          "gnr/bnr 102/2. Bekrefter at datasenteroperatøren har virksomhet på adressen; sakstittelen " +
          "nevner ikke datasenter.",
      },
      {
        source_name: "Arbeidstilsynet sak 2024/36323: Lørenskog kommune – gnr/bnr 102/2 – Hornerudveien 25 – Søknad om samtykke",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01j76wah39fd5bhqc571kb5tba",
        publisher: "Arbeidstilsynet (eInnsyn)",
        source_type: "register",
        source_date: "2024-06-25",
        primary_source: true,
        excerpt_or_summary:
          "Første samtykkesak i 2024 for samme eiendom, mottaker Orange Business Digital Norway AS, " +
          "kopi til Lørenskog kommune.",
      },
      {
        source_name: "Arbeidstilsynet: Forhåndsmelding – Hornerudveien 25, 1476 Rasta, 01.03.2021–29.06.2022",
        source_url: "https://api.einnsyn.no/journalpost/jp_01j74cfc2cewdrzmncf067fnw0",
        publisher: "Arbeidstilsynet (eInnsyn)",
        source_type: "register",
        source_date: "2022-01-05",
        primary_source: true,
        excerpt_or_summary:
          "Forhåndsmelding om bygge-/anleggsarbeid på adressen i 16 måneder fra mars 2021. Byggherre " +
          "og innhold framgår ikke av journalen; tidsrommet sammenfaller med Statnett-tilknytningen i " +
          "2021.",
      },
      {
        source_name: "Miljødirektoratet sak 2021/4666: Byggesak på eiendommen Hornerudveien 25, gnr. 102 bnr. 2, Lørenskog",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01j75c65haekatbjbspte915pm",
        publisher: "Miljødirektoratet (eInnsyn)",
        source_type: "register",
        source_date: "2021-04-16",
        primary_source: true,
        excerpt_or_summary:
          "Arkitektfirma ba om avklaring mot Miljødirektoratet i en byggesak på eiendommen i april " +
          "2021. Dokumentet er ikke lest; journalen sier ikke at saken gjelder datasenteret.",
      },
      {
        source_name: "Akershus fylkeskommune sak 2024/38253: Gbnr 102/2 Hornerudveien 25 – Bygningstekniske installasjoner – Nytt anlegg",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01j76w096sfbvvtwx8v2a4t25w",
        publisher: "Akershus fylkeskommune (eInnsyn)",
        source_type: "register",
        source_date: "2024-06-12",
        primary_source: true,
        excerpt_or_summary:
          "Nabovarsel sendt av eiendomsselskapet med adresse Hornerudveien 25 for nytt teknisk anlegg " +
          "på eiendommen. Bekrefter hvem som opptrer som eier/tiltakshaver for bygget, ikke " +
          "datasenteret.",
      },
      {
        source_name: "Statnett: statistikk om tilknytningssaker (lister lastet ned 30.09.2026)",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Tilknyttet: sak 21/00160, Røykås TRA, kunde Elvia AS, sluttkunde Basefarm, Datasenter, " +
          "01.10.2021, 12 MW (ordinære vilkår). Ingen Skygard- eller Orange-rad ved Røykås i kø eller " +
          "reservasjoner.",
      },
      {
        source_name: "Kartverket stedsnavn: Røykås trafostasjon",
        source_url: "https://ws.geonorge.no/stedsnavn/v1/navn?sok=R%C3%B8yk%C3%A5s*&knr=3222",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Røykås trafostasjon ligger i Lørenskog kommune (59.93015, 10.93281), ca. 700 m fra " +
          "Hornerudveien 25. Bekrefter stasjonens plassering, ikke hvem som er tilknyttet.",
      },
      {
        source_name: "Kartverket adresse-API: Hornerudveien 25",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?sok=Hornerudveien%2025&kommunenummer=3222",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Hornerudveien 25, 1461 Lørenskog, kommune 3222, gnr/bnr 102/2, punkt 59.92596/10.94207. " +
          "Hornerudveien 21 har samme gnr/bnr. Bekrefter adressen – ikke at anlegget finnes.",
      },
      {
        source_name: "Basefarm: Datasenter bedre i Oslo enn på avsidesliggende steder (pressemelding 17.11.2017, arkivert)",
        source_url: "https://web.archive.org/web/20210224204026/https://basefarm.no/presse/datasenter-bedre-i-oslo-enn-pa-avsidesliggende-steder/",
        publisher: "Basefarm AS",
        source_type: "web",
        source_date: "2017-11-17",
        primary_source: true,
        excerpt_or_summary:
          "Basefarm åpnet 16. november 2017 nytt datasenter til over 300 millioner kroner på Rasta i " +
          "Lørenskog. Bekrefter åpningsdato, sted og investering.",
      },
      {
        source_name: "Basefarm is building Oslo's biggest and greenest data center (pressemelding mars 2015, arkivert)",
        source_url: "https://web.archive.org/web/20161231132700/https://www.basefarm.com/en/press-room/new-data-center-Oslo-Norway",
        publisher: "Basefarm AS",
        source_type: "web",
        source_date: "2015-03-09",
        primary_source: true,
        excerpt_or_summary:
          "Nytt datasenter i Lørenskog, ca. 300 mill. kr over fem år; ferdig utbygd mer enn 10 MW og " +
          "6 000 m² datagulv, med plass til vesentlig mer på eiendommen. Historisk planinformasjon.",
      },
      {
        source_name: "Basefarm: Datasenter Oslo 5 – fakta (arkivert jan. 2017)",
        source_url: "https://web.archive.org/web/20170102062725/https://www.basefarm.com/no/tjenester/basefarm-datasenter-oslo5",
        publisher: "Basefarm AS",
        source_type: "web",
        source_date: "2017-01-02",
        primary_source: true,
        excerpt_or_summary:
          "Faktaside: inntil 6 000 m² serverplass i flere faser, mer enn 10 MW kritisk kapasitet, 2,5 " +
          "MVA-generatorer, indirekte luft-til-luft-kjøling, linjenøytralt. Historiske designtall.",
      },
      {
        source_name: "Enhetsregisteret: ORANGE BUSINESS DIGITAL NORWAY AS (982211743)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/982211743",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Tidligere Basefarm AS; stiftet 2000, 327 ansatte, Lørenfaret 1E i Oslo. Ingen underenhet i " +
          "Lørenskog. Bekrefter selskapet, ikke anlegget.",
      },
      {
        source_name: "Enhetsregisteret: TOM HAGEN EIENDOM AS (916975538)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/916975538",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Eiendomsselskap med forretningsadresse Hornerudveien 25, formål utvikling og forvaltning " +
          "av fast eiendom. Bekrefter selskapet og adressen, ikke hjemmel til eiendommen.",
      },
      {
        source_name: "Enhetsregisteret: SKYGARD 2 AS (935496624)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/935496624",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Stiftet 02.05.2025, formål datasentre, 6 ansatte, Karenslyst allé 10; underenhet med " +
          "oppstart 16.09.2025. Bekrefter selskapet – ingen kilde knytter det direkte til OSL5.",
      },
      {
        source_name: "NAV: Sikkerhetsavtale mellom NAV og Skygard 2 AS",
        source_url: "https://api.einnsyn.no/journalpost/jp_01kget8r5xen4r8ah7ayrq9n70",
        publisher: "Arbeids- og velferdsdirektoratet (eInnsyn)",
        source_type: "register",
        source_date: "2026-01-05",
        primary_source: true,
        excerpt_or_summary:
          "Avskjermet journalpost i saken «Sikkerhetsavtaler med leverandører». Viser at Skygard 2 AS " +
          "er NAVs avtalepart fra januar 2026; anlegg er ikke oppgitt.",
      },
      {
        source_name: "Skygard: Future Sites",
        source_url: "https://www.skygard.no/future-sites",
        publisher: "Skygard AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Skygard vurderer nye datasentre i Norge, særlig på Vestlandet, i samarbeid med Eviny. " +
          "Ingen navngitte anlegg, steder eller MW. Menyen fører bare OSL1, OSL3 og OSL5.",
      },
      {
        source_name: "Skygard: About us",
        source_url: "https://www.skygard.no/en/about-us",
        publisher: "Skygard AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "«With three data centres in the Oslo region»; eid av Telenor, Hafslund og HitecVision. " +
          "Bekrefter at OSL5 er ett av tre anlegg i porteføljen (lest i runde 10).",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: ["Østre Aker vei 18 — Telia og Arelion samtrafikkpunkt"],
    title: "Telenor Økern telesentral, Østre Aker vei 18 — Arelion-PoP (OKR/C)",
    description:
      "Telenors telesentral på Økern, der Arelion (tidligere Telia Carrier) har en nettnode med " +
      "koden OKR/C. Bygget har vært telesentral siden 1970-årene. Arelion-noden er bare bekreftet " +
      "av PeeringDB og katalogkilder, ikke av Arelion eller Telenor selv.",
    municipality: "Oslo",
    address: "Østre Aker vei 18",
    postal_code: "0581",
    city: "Oslo",
    latitude: 59.92822,
    longitude: 10.81206,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et knutepunkt i Ulven/Økern-klyngen. Sammen med Alfabygget og OSL01 viser det at Hovinbyen " +
      "er Oslos tyngste område for digital infrastruktur.",
    notes:
      "Aliaser: OKR/C, TeliaSonera OKR/C. Primærkilde-runde 2026-09-30: primærkilde for anlegget " +
      "søkt, ikke funnet. Adressen er bekreftet i Kartverket (gnr/bnr 122/354). Arelion Norway AS " +
      "og Telia Norge AS har ingen underenhet på adressen, og Telenor er også oppført der i " +
      "katalogene. Runde 11 (2026-10-02): ny tittel (tidligere «Østre Aker vei 18 — Telia og " +
      "Arelion samtrafikkpunkt») og type nettnode. «Telia» og «Arelion» i katalogene er samme " +
      "node: TeliaSonera International Carrier ble Telia Carrier og deretter Arelion. Telia Norge " +
      "AS er ikke dokumentert på adressen. Eiendommen ble solgt i 2021 med leiekontrakt til " +
      "Telenor. Ikke samme anlegg som Skygard OSL1 i nr. 24C.",
    kilder: [
      {
        source_name: "DataCenterMap: TeliaSonera OKR/C",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som TeliaSonera OKR/C, operatør Telia Company, adresse Östre Akers vej 18A. " +
          "Colocation for kunder.",
      },
      {
        source_name: "PeeringDB: Arelion Oslo OKR/C",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Registrert fasilitet med adresse Østre Aker Vei 18, organisasjon Arelion. PeeringDB er " +
          "bransjens eget register over samtrafikkpunkter, og oppgir faktisk gateadresse.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "GlobalConnect Nydalen, Sandakerveien 121",
    description:
      "Datahall bygget av Availo i Schibsteds trykkeri i Sandakerveien 121 og åpnet i oktober 2012, " +
      "planlagt til ca. 2000 m², med Schibsted IT som ankerkunde på en tiårsavtale. Anlegget ble " +
      "senere en del av GlobalConnect. Schibsted har forlatt bygget, og tomta er omregulert til " +
      "boliger. Om datasenteret fortsatt er i drift, er ukjent.",
    municipality: "Oslo",
    address: "Sandakerveien 121",
    postal_code: "0484",
    city: "Oslo",
    latitude: 59.94931,
    longitude: 10.7701,
    verification_status: "verified_public_source",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Et datasenter midt i Nydalen, et område som ellers er kontor, bolig og høyskole.",
    notes:
      "Aliaser: V-Hosting Data Center, Availo. Cleanup 2026-09-30: status satt til ukjent. " +
      "Trykkeriet er demontert, og tomta ble omregulert til ca. 700 boliger 27.08.2025 (PBE " +
      "2025/06863); hallene skal bygges om, med mulig byggestart i 2026. Ingen primærkilde " +
      "bekrefter drift eller nedleggelse av datasenteret, og GlobalConnect navngir ikke Nydalen på " +
      "egne sider. Tidligere beskrivelse («i drift fra 2014, 500 m²») var feil. Neste steg: " +
      "byggesaksinnsyn for sak 2025/06863 eller spørsmål til GlobalConnect.",
    public_candidate: true,
    public_candidate_note:
      "Bekreftet fysisk anlegg i drift siden 2014, verifisert adresse.",
    kilder: [
      {
        source_name: "DataCenterMap: GlobalConnect Nydalen",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som GlobalConnect Nydalen, operatør GlobalConnect, adresse Sandakerveien 121. " +
          "Nybygg klart for drift i 2014, 500 m² gulvflate.",
      },
      {
        source_name: "PeeringDB: GlobalConnect Nydalen og V-Hosting",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Registrert fasilitet med adresse Sandakerveien 121, organisasjon GlobalConnect Group og V-Hosting AS. PeeringDB er " +
          "bransjens eget register over samtrafikkpunkter, og oppgir faktisk gateadresse.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Blix CJH, C. J. Hambros plass 2",
    description:
      "Nettverksanlegg midt i Oslo sentrum, oppført av Blix Solutions som DR- og backupsite og " +
      "som nettverks-PoP. Serverhotell henvises til Blix' anlegg på Lindeberg.",
    municipality: "Oslo",
    address: "C. J. Hambros plass 2",
    postal_code: "0164",
    city: "Oslo",
    latitude: 59.916,
    longitude: 10.74109,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et nettverksknutepunkt i et sentrumskvartal, i et bygg folk flest oppfatter som kontor.",
    notes:
      "Beskrevet som nettverksanlegg, ikke et fullt datasenter. Runde 11 (2026-10-02): Blix' egne " +
      "sider bekrefter et lite colocation-rom og PoP her (3 kW per rack); gateadressen kommer " +
      "bare fra PeeringDB og DataCenterMap. Operatør er Blix Solutions AS som leietaker; bygget " +
      "(Ibsenkvartalet) eies av KLP Eiendom. I drift senest fra desember 2015.",
    kilder: [
      {
        source_name: "DataCenterMap: Blix CJH Oslo",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Blix CJH Oslo, operatør Blix Solutions AS, adresse C. J. Hambros Plass 2. " +
          "Nettverksanlegg i Oslo sentrum, DR- og backupsite.",
      },
      {
        source_name: "PeeringDB: Blix CJH Oslo",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Registrert fasilitet med adresse C.J. Hambros plass 2, organisasjon Blix Solutions AS. PeeringDB er " +
          "bransjens eget register over samtrafikkpunkter, og oppgir faktisk gateadresse.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: ["Forskningsparken, Gaustadalléen 21"],
    title: "Forskningsparken Oslo (tidl. SSC Networks), Gaustadalléen 21",
    description:
      "Lite hosting- og colocation-rom i Forskningsparken på Gaustad, opprinnelig drevet av SSC " +
      "Networks. Etterfølgeren Nordlo nevner ikke datasenteret i dag, og ingen primærkilde " +
      "bekrefter et anlegg på adressen. Samtrafikkpunktet NIX1 står i nabobygget Gaustadalléen " +
      "23B hos UiO, ikke her. AVUR har bare egne rutere på adressen.",
    municipality: "Oslo",
    address: "Gaustadalléen 21",
    postal_code: "0349",
    city: "Oslo",
    latitude: 59.94229,
    longitude: 10.71674,
    verification_status: "partially_verified",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Et eldre serverrom i et forsknings- og kontorbygg, med uklar status i dag.",
    notes:
      "Aliaser: Nordlo Forskningsparken, SSC Networks, AVUR Oslo. Primærkilde-runde 2026-09-30: " +
      "AVUR er rettet fra operatør til tilstedeværelse med rutere (AVURs egen side). Nordlos kjøp " +
      "av SSC Networks er bekreftet i Nordlos pressemelding, men den nevner ikke adressen. " +
      "Primærkilde for selve anlegget er søkt, ikke funnet. Runde 10 (2026-10-02): status aktiv → " +
      "ukjent, sikkerhet lav og ny tittel (tidligere «Forskningsparken, Gaustadalléen 21»). Den " +
      "tidligere beskrivelsen («direkte tilknyttet NIX», «et av de eldste samtrafikkpunktene») " +
      "bygget på katalogtekst og er nedtonet. Bygningseier er Oslotech AS.",
    kilder: [
      {
        source_name: "PeeringDB: nettverk til stede i fasiliteten",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "fac_id 346, registrert siden 2010. 8 nettverk til stede — et reelt, men lite samtrafikkpunkt.",
      },
      {
        source_name:
          "DataCenterMap: Forskningsparken / AVUR OSLO / Forskningsparken Oslo",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Forskningsparken / AVUR OSLO / Forskningsparken Oslo, operatør Nordlo, AVUR, uspesifisert, adresse Gaustadalléen 21. " +
          "«Small datacenter with wide interconnection possibilites, directly connected to NIX.»",
      },
      {
        source_name: "PeeringDB: Forskningsparken Oslo",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Registrert fasilitet med adresse Gaustadalléen 21, organisasjon SSC Networks. PeeringDB er " +
          "bransjens eget register over samtrafikkpunkter, og oppgir faktisk gateadresse.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "lead",
    title: "Fujitsu Oslo, Østensjøveien 32",
    description: "Datasenteranlegg oppført av Fujitsu Norway på Bryn.",
    municipality: "Oslo",
    address: "Østensjøveien 32",
    postal_code: "0667",
    city: "Oslo",
    latitude: 59.91135,
    longitude: 10.81132,
    verification_status: "rejected",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "low",
    why_interesting:
      "Et datasenter i et kontorområde på Bryn som er under transformasjon til bolig.",
    notes:
      "Avvist i runde 5 (2026-09-30): Østensjøveien 32 er et kontorbygg der Fujitsu leide ca. 2 500 " +
      "m² som hovedkontor fra 2010. PeeringDB viser bare Fujitsus eget nett, altså et internt " +
      "serverrom. Fujitsu Norway AS ble omdøpt i 2022 og slettet i 2023, og Fujitsu står ikke i " +
      "Nkoms register.",
    kilder: [
      {
        source_name: "PeeringDB: nettverk til stede i fasiliteten",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "fac_id 1962. Ett nettverk til stede, Fujitsus eget (AS60717). Trolig selskapets eget tekniske rom, ikke et kommersielt datasenter.",
      },
      {
        source_name: "PeeringDB: Fujitsu Oslo",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Registrert fasilitet med adresse Østensjøveien 32, organisasjon Fujitsu Norway AS. PeeringDB er " +
          "bransjens eget register over samtrafikkpunkter, og oppgir faktisk gateadresse.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Rent a Rack, Ulvenveien 87",
    description:
      "Tidligere datasenter på Ulvenveien 87, drevet av Rent a Rack AS, som Webhuset kjøpte i 2012. " +
      "Selskapet er senere omdøpt og flyttet, og det er andre leietakere i bygget i dag. Om " +
      "datasenteret fortsatt er i drift, er ukjent.",
    municipality: "Oslo",
    address: "Ulvenveien 87",
    postal_code: "0581",
    city: "Oslo",
    latitude: 59.92474,
    longitude: 10.81292,
    verification_status: "partially_verified",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "low",
    why_interesting:
      "Enda et anlegg i Ulven-klyngen; samlet gjør de området til Oslos tetteste ansamling av " +
      "datasentre.",
    notes:
      "Runde 5 (2026-09-30): status satt til ukjent. Rent a Rack AS (993903558) ble omdøpt til " +
      "Serverbite AS i 2022 og har nå adresse på Stord. rentarack.no viser i dag Nexthop AS, som " +
      "selger plass i DigiPlex Ulven (Vaultica OSL01) – et annet anlegg ca. 230 m unna. Webhuset " +
      "oppgir fortsatt å eie datasentre i Oslo, uten adresse. Nedleggelse er ikke dokumentert. " +
      "Runde 8 (2026-10-01): uavklart. Anlegget er bare bekreftet historisk (Webhusets " +
      "pressemelding 2012). PeeringDB-oppføringen er fortsatt aktiv og ble oppdatert i 2025, men " +
      "ingen underenhet er registrert på Ulvenveien 87, og ingen av selskapene står i Nkoms " +
      "register. Serverbite AS er tidligere Rent a Rack AS.",
    kilder: [
      {
        source_name: "PeeringDB: nettverk til stede i fasiliteten",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "fac_id 817. 2 nettverk til stede, begge Rent a Rack sine egne. Lite anlegg.",
      },
      {
        source_name: "PeeringDB: Rent a Rack",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Registrert fasilitet med adresse Ulvenveien 87, organisasjon Webhuset AS. PeeringDB er " +
          "bransjens eget register over samtrafikkpunkter, og oppgir faktisk gateadresse.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Vault OSL1, Økernveien 121",
    description:
      "Datasenter oppført av Vault AS i Økernveien 121. Kun én bransjekilde; ikke bekreftet " +
      "mot operatør eller myndighet.",
    municipality: "Oslo",
    address: "Økernveien 121",
    postal_code: "0579",
    city: "Oslo",
    latitude: 59.92657,
    longitude: 10.80009,
    verification_status: "partially_verified",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Nok et anlegg i Økern-klyngen, i et område med tung boligutbygging.",
    notes:
      "Cleanup 2026-09-30: status satt til ukjent. Vault AS (998547369) er formelt aktivt i " +
      "Brønnøysund og har fortsatt en underenhet på Økernveien 121, men står ikke i Nkoms register " +
      "over kommersielle datasenteroperatører, og regnskapet for 2025 viser 15 000 kr i " +
      "driftsinntekter. Det tyder på at det ikke drives colocation, men ingen primærkilde " +
      "dokumenterer nedleggelse eller bruksendring. Ikke samme anlegg som Vaultica OSL01.",
    kilder: [
      {
        source_name: "DataCenterMap: OSL1",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som OSL1, operatør Vault AS, adresse Økernveien 121. " +
          "Oppført i oversikten over datasentre i Oslo.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "note",
    title: "Sognsveien 75 er ikke et datasenter",
    description:
      "Undersøkt og avkreftet. PeeringDB har en fasilitet på Sognsveien 75 siden 2014, men det " +
      "eneste nettverket til stede er AS200163 «Ullevål Stadion» — byggets eget, registrert av " +
      "eiendomsselskapet DNB Næringseiendom. Ingen samtrafikkpunkter, ingen tredjepartsnettverk, " +
      "ingen operatør. Dette er et teknisk rom i et næringsbygg, ikke et kommersielt datasenter.",
    municipality: "Oslo",
    address: "Sognsveien 75",
    postal_code: "0855",
    city: "Oslo",
    latitude: 59.94856,
    longitude: 10.73282,
    verification_status: "rejected",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    why_interesting:
      "Ingenting — hypotesen er avkreftet. Står igjen som dokumentasjon på at spørsmålet er undersøkt.",
    notes:
      "Avvist 2026-09-26. Hypotese: kommersielt datasenter på Sognsveien 75. Sjekket: PeeringDB " +
      "fasilitet og nettverksliste, DataCenterMap, websøk på adressen og NIX-historikk. Det som " +
      "støttet: en reell fasilitetsoppføring siden 2014. Det som manglet: enhver operatør eller " +
      "tredjepart. Trenger ikke undersøkes på nytt.",
    tidligere_titler: ["Ullevål Stadion datasenter, Sognsveien 75"],
    kilder: [
      {
        source_name: "NIX, Norwegian Internet Exchange",
        source_url: "https://www.nix.no/about/",
        publisher: "Universitetet i Oslo",
        source_type: "web",
        source_date: "2026-09-26",
        supports_claim: false,
        excerpt_or_summary:
          "NIX oppgir sine lokasjoner, og Sognsveien 75 er ikke blant dem. Undersøkt kilde som ikke støtter hypotesen.",
      },
      {
        source_name: "PeeringDB: nettverk til stede i fasiliteten",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "fac_id 1830, opprettet 2014. net_count 1, ix_count 0. Det ene nettverket er AS200163 «Ullevål Stadion», altså byggets eget.",
      },
      {
        source_name: "PeeringDB: Ullevål Stadion",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Registrert fasilitet med adresse Sognsveien 75, organisasjon DNB Næringseiendom AS. PeeringDB er " +
          "bransjens eget register over samtrafikkpunkter, og oppgir faktisk gateadresse.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: ["Astrofarm Oslo, Nye Vakås vei 8 i Hvalstad"],
    title: "Astrofarm serverrom, Nye Vakås vei 8 (Hvalstad)",
    description:
      "Serverrom i Astrofarm AS sitt kontor på Hvalstad i Asker. Operatøren beskrev det i 2016 " +
      "som sitt sekundære datasenter; hoveddatasenteret lå da i et Telenor-eid bygg i Asker uten " +
      "oppgitt adresse. Ingen kilde bekrefter drift i 2025–2026, og selskapet står ikke i Nkoms " +
      "register.",
    municipality: "Asker",
    address: "Nye Vakås vei 8",
    postal_code: "1395",
    city: "Hvalstad",
    latitude: 59.85647,
    longitude: 10.47605,
    verification_status: "partially_verified",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Et lite serverrom i et kontorbygg, ikke et kommersielt datasenter av størrelse. Kandidat " +
      "for arkivering hvis det ikke lar seg bekrefte.",
    notes:
      "Oppfølgingsrunde: selskapet og adressen er bekreftet i flere kilder, men Astrofarm står " +
      "ikke i Nkoms register — anlegget er trolig under 0,5 MW. Interessenivå nedjustert til " +
      "middels: et lite anlegg, ikke en stor installasjon. Primærkilde-runde 2026-09-30: " +
      "Brønnøysund bekrefter selskapet på adressen, og Astrofarm nevner «our Norwegian " +
      "datacenters» uten adresse. Primærkilde for selve anlegget søkt, ikke funnet. Runde 10 " +
      "(2026-10-02): status aktiv → ukjent, sikkerhet lav og ny tittel (tidligere «Astrofarm " +
      "Oslo, Nye Vakås vei 8 i Hvalstad»). Operatørens arkiverte side fra 2016 beskriver rommet " +
      "som «et rom i Astrofarm sitt kontor». Astrofarm eies av BRP Systems AB siden 2022.",
    kilder: [
      {
        source_name: "Bedriftsoppslag: Astrofarm AS, orgnr 979 905 173",
        source_url:
          "https://www.proff.no/selskap/astrofarm-as/hvalstad/it-drift-og-support/IG7ERO50ZDG",
        publisher: "Brønnøysundregistrene via Proff",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "IT-driftsselskap etablert 1998, 11 ansatte, Nye Vakås vei 8 i Hvalstad. Bekrefter virksomhet på adressen.",
      },
      {
        source_name: "Nkom, registrerte kommersielle datasenteroperatører",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Astrofarm står ikke i registeret over de 60 kommersielle operatørene. Registreringsplikten gjelder anlegg over 0,5 MW.",
      },
      {
        source_name: "DataCenterMap: Astrofarm Oslo",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Astrofarm Oslo, operatør Astrofarm AS, adresse Nye Vakas v. 8, 1395 Hvalstad. " +
          "Oppført i oversikten over datasentre i Oslo-regionen.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "note",
    title: "Datasentre i Oslo-regionen utenfor Oslo, Bærum og Asker",
    description:
      "Seks anlegg og campuser i Oslo-regionen som bruker OSL-koder, men ligger utenfor våre " +
      "tre kommuner. Lagret for å forstå navnekonvensjonen: «OSL» i et facility-navn betyr " +
      "Oslo-markedet, ikke Oslo kommune. Det var en av grunnene til at registerbasert søk " +
      "bommet i runde 2.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "low",
    kilder: [
      {
        source_name: "DataCenterMap: Oversikt over datasentre i Oslo-regionen",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Oversikt over datasentre i Oslo-regionen, operatør flere, adresse ulike. " +
          "OSL02 Vaultica, Rosenholmveien 25 i Trollåsen (Nordre Follo). STACK OSL03-campus, Heiaveien 9 " +
          "i Fetsund (Lillestrøm), 22 MW over fire bygg. STACK OSL04-campus, Holtskogen i Tomter (Indre " +
          "Østfold), 18 MW over tre bygg. Skygard OSL5, Rasta i Lørenskog. Green Mountain OSL1-Enebakk, " +
          "Granittveien 100, med oppgitt kapasitet opp mot 93 MW. Polarise AI Hub ONE i Oslo Airport " +
          "City på Jessheim.",
      },
    ],
  },
  {
    category: "Kilder",
    item_type: "data_issue",
    title: "Registerbasert metode fant 1 av 15 datasentre",
    description:
      "Metodefunn. To runder med utgangspunkt i offentlige registre fant ett datasenter i " +
      "Oslo, Bærum og Asker. Én runde med bred bransjediscovery fant femten. Registrene " +
      "dokumenterer hvem som driver datasenter, aldri hvor — og da blir fravær i registeret " +
      "tolket som fravær i virkeligheten.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    notes:
      "Regel for senere runder: discovery først, verifisering etterpå. Bransjekilder som " +
      "PeeringDB og DataCenterMap er gode nok til å gi kandidater og adresser, men ikke alene til " +
      "høy confidence — de skal følges opp mot operatør, Nkom, byggesak eller nettselskap.",
    kilder: [
      {
        source_name: "Egen metodegjennomgang etter runde 4",
        publisher: "NaboRadar",
        source_type: "correspondence",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Runde 2 og 3 startet i autoritative registre — Nkom og Enhetsregisteret — og " +
          "konkluderte med ett bekreftet datasenter i de tre kommunene. Bred web-discovery via " +
          "PeeringDB og DataCenterMap ga umiddelbart 34 oppføringer i Oslo alene, og 14 " +
          "deduplikerte fysiske anlegg i Oslo pluss ett i Asker. Feilen var å behandle fravær i " +
          "et register som fravær i virkeligheten: Nkom oppgir aldri lokasjon, og ingen " +
          "myndighetskilde gjør det.",
      },
    ],
  },

  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "note",
    title: "Ingen datasenteranlegg dokumentert i Bærum",
    description:
      "Hypotesen var at Bærum måtte ha minst ett fysisk datasenter, gitt Fornebu og Lysaker " +
      "som næringsområder. Bredt søk mot PeeringDB, DataCenterMap, Nkom-registeret og " +
      "websøk gir ingen fasilitet i kommunen. To Nkom-registrerte operatører har " +
      "Bærum-adresse — GlobalConnect på Snarøyveien 36 og Akvatechnic på Haslum — men ingen av dem er dokumentert med anlegg der. GlobalConnect oppgir et driftssenter " +
      "på Fornebu, som er noe annet enn et datasenterbygg.",
    municipality: "Bærum",
    verification_status: "investigated_not_confirmed",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    notes:
      "Undersøkt 2026-09-26. Dette er et negativt funn om katalogdekning, ikke et bevis på at " +
      "ingen serverrom finnes i Bærum. Neste innganger er byggesak og nettselskapenes " +
      "tilknytningssaker, som fortsatt ikke er åpnet.",
    kilder: [
      {
        source_name: "PeeringDB: fasiliteter i Norge og nettverk per fasilitet",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "49 registrerte fasiliteter i Norge. Ingen i Bærum, ingen i Asker. 16 i Oslo kommune.",
      },
      {
        source_name: "DataCenterMap, Oslo-oversikten",
        source_url: "https://www.datacentermap.com/norway/oslo/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "34 oppføringer i Oslo-markedet. Ingen med adresse i Bærum.",
      },
      {
        source_name: "GlobalConnect: driftssenter på Fornebu",
        source_url:
          "https://bedrift.globalconnect.no/tjenester/colocation-i-datasenter",
        publisher: "GlobalConnect",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "GlobalConnect oppgir et Network Operations Center på Fornebu med døgnovervåking. " +
          "Selskapets beliggenhetsadresse er Snarøyveien 36 i Bærum. Et driftssenter er ikke " +
          "det samme som et datasenterbygg, og ingen katalog fører en fasilitet der.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "note",
    tidligere_titler: [
      "Markedsbildet: hvem har flest fysiske anlegg i Norge",
      "Nordavind DC Sites: tolv anlegg i Innlandet",
    ],
    title: "Nordavind Energy Sites: tomteportefølje for datasentre i Innlandet",
    description:
      "Nordavind Energy Sites AS (tidl. Nordavind DC Sites AS) er et kommunalt eid " +
      "tilretteleggingsselskap som markedsfører en portefølje av byggeklare datasentertomter i " +
      "Innlandet og Trøndelag-randen, blant annet i Alvdal, Elverum, Hamar (Heggvin), Grue, Vågå " +
      "(Lalm), Østre Toten, Ringsaker (Rudshøgda), Sør-Odal, Tynset og Rendalen. Selskapet driver " +
      "ingen anlegg; PeeringDB-oppføringene er tomter, ikke datasentre.",
    verification_status: "verified_public_source",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    notes:
      "Ett funn for hele nettverket, ikke tolv: adressene i PeeringDB er stedsnavn uten " +
      "husnummer, så ingen av dem lar seg geokode presist. Kommunene er sikre (fra postnummer), " +
      "koordinatene er det ikke. Effekt og areal er ikke oppgitt for noen av anleggene. Dekker " +
      "samtidig DataCenterMap-markedene Elverum, Harpefoss og Bismo, som ikke lot seg åpne. Runde " +
      "8 (2026-10-01): gjort om fra funn til notat og tatt ut av anleggslisten – tomteportefølje, " +
      "ikke tolv datasentre. Heggvin er Green Mountain OSL2-Hamar. Tomter med datasenteraktør " +
      "(Grundsetmoen i Elverum – Green Mountain 2022; Lalm i Vågå – Krefter/Ugna; Rudshøgda – " +
      "opsjon til Eidsiva) er leads til runde 9.",
    kilder: [
      {
        source_name:
          "Kartverket adresse-API: postnummer til kommune for de tolv anleggene",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Hvert postnummer fra PeeringDB slått opp mot Kartverket for å fastslå kommune. Adressene er stedsnavn uten husnummer og gir ikke presis koordinat.",
      },
      {
        source_name:
          "PeeringDB: 10 fasiliteter registrert på Nordavind DC Sites",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Nordavind DC Sites har ti fasiliteter i Norge: Alvdal, Elverum (Grundsetmoen og " +
          "Hagen), Hamar (Heggvin), Kirkenær, Lalm, Lena, Rudshøgda, Skarnes (Slomarka og " +
          "Tronbøl), Tynset og Åkrestrømmen. Ingen i Oslo-regionen.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "note",
    title: "Ingen kryptoutvinning blant datasenteroperatørene i Oslo-området",
    description:
      "Ni av de 60 Nkom-registrerte operatørene oppgir at deler av forbruket går til " +
      "kryptovalutautvinning, fem av dem med 95–100 %. Alle ni har adresse langt fra " +
      "Oslo-området — typisk i kommuner med rimelig kraft. Ingen av operatørene med " +
      "anlegg i Oslo oppgir kryptoutvinning.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    notes:
      "Kryptostatus gjelder operatøren, ikke det enkelte anlegget. En operatør med flere " +
      "anlegg kan bruke dem ulikt, og registeret skiller ikke.",
    kilder: [
      {
        source_name:
          "Nkom, registrerte kommersielle datasenteroperatører, kryptostatus",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Ni av de 60 operatørene oppgir kryptovalutautvinning: Tydal Data Center (33 %), " +
          "Troll Housing (97 %), Thermaltech (100 %), Nordic Blocks (1 %), Exanorth (100 %), " +
          "Currency Edge (100 %), Bluefjords (14 %), Bluebite (55 %) og Arctic Flux (95 %).",
      },
      {
        source_name: "Enhetsregisteret: oppslag på alle 60 operatørene",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Samtlige 60 organisasjonsnumre slått opp. De ni med kryptoutvinning har adresse i " +
          "Tydal, Hustadvika, Tromsø, Søndre Land, Namsskogan, Kvænangen, Luster, Fauske og " +
          "Horten. Ingen i Oslo, Bærum eller Asker.",
      },
    ],
  },
  {
    category: "Kilder",
    item_type: "data_issue",
    title: "PeeringDB-oppføring er ikke det samme som datasenter",
    description:
      "Metodefunn. En fasilitet i PeeringDB kan være alt fra et bærende knutepunkt til et " +
      "serverrom i et kontorbygg. Antall nettverk til stede skiller dem, og hvem som eier " +
      "det ene nettverket avgjør: er det byggets eget AS, er det ikke et datasenter.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    notes:
      "Regel for senere runder: sjekk net_count og hvem nettverkene tilhører før en " +
      "katalogoppføring behandles som et anlegg. Det avslørte Ullevål Stadion som en " +
      "byggoppføring og ikke et datasenter.",
    kilder: [
      {
        source_name:
          "Egen metodegjennomgang: PeeringDB net_count som størrelsessignal",
        publisher: "NaboRadar",
        source_type: "correspondence",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Antall nettverk til stede i en PeeringDB-fasilitet skiller tydelig mellom " +
          "knutepunkt og teknisk rom: OSL01 Ulven har 52, OS-IX 43, Forskningsparken 8, " +
          "Basefarm OSL3 4, Rent a Rack 2, og Fujitsu, UiO og Ullevål Stadion ett hver. " +
          "Der det ene nettverket er byggets eget, er oppføringen et serverrom, ikke et " +
          "kommersielt datasenter.",
      },
    ],
  },

  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "NTC Billingstad datasenter",
    description:
      "Colocation-anlegg på Billingstadsletta i Asker, drevet av NTC Services. Anlegget har " +
      "redundant fiber, 2N UPS og aggregat — teknisk utrustning som skiller et datasenter " +
      "fra et serverrom. Operatøren står i Nkoms register, så anlegget er over 0,5 MW.",
    municipality: "Asker",
    address: "Billingstadsletta 17",
    postal_code: "1396",
    city: "Billingstad",
    latitude: 59.87584,
    longitude: 10.49587,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Det best dokumenterte datasenteret i Asker, i et næringsområde tett på bolig og " +
      "E18. Aggregat og 2N-strøm betyr reservekraft på stedet.",
    notes:
      "Funnet fordi Billingstad er et eget marked i DataCenterMap og derfor ikke kom med i " +
      "Oslo-sveipet. Et eksempel på at markedsinndelingen i katalogene skjuler anlegg.",
    public_candidate: true,
    public_candidate_note:
      "Bekreftet fysisk anlegg, verifisert adresse, Nkom-registrert operatør og korrekt status.",
    kilder: [
      {
        source_name: "DataCenterMap: NTC Billingstad",
        source_url: "https://www.datacentermap.com/norway/billingstad/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som NTC Billingstad, operatør NTC Services AS, adresse Billingstadsletta 17, 1396 Billingstad. " +
          "Colocation-rackplass med smarthands, redundant fiberforbindelse og 2N UPS med aggregatstøtte.",
      },
      {
        source_name: "Nkom: NTC Services AS er registrert datasenteroperatør",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Organisasjonsnummer 988534005. Kryptovalutautvinning oppgitt som «Nei». " +
          "Registreringsplikten gjelder anlegg over 0,5 MW.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Tydal Data Center, Kirkvollen",
    description:
      "Datasenteranlegg på Kirkvollen i Tydal, eid og driftet av Tydal Data Center AS i " +
      "Bitdeer-konsernet. Etablert 2021 for bitcoinutvinning og nå under ombygging til " +
      "AI-kolokasjon med 180 MW brutto kapasitet. Volta Tydal AS har inngått 16-årig leie. Statnett " +
      "oppgir 180 MW tilknyttet ved Nea.",
    municipality: "Tydal",
    address: "Stugudalsvegen 196",
    postal_code: "7590",
    city: "Tydal",
    latitude: 63.0332,
    longitude: 11.68684,
    verification_status: "verified_public_source",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "180 MW i en liten fjellkommune, og et av de tydeligste eksemplene på et kryptoanlegg " +
      "som bygges om til AI. Kraftuttaket er allerede tilknyttet.",
    notes:
      "Kvalitetsrunde 2026-09-30: koordinaten er flyttet fra et gårdspunkt ca. 500 m vest til " +
      "Stugudalsvegen 196, blant anleggets bygg. Kapasitetstallene kommer fra Bitdeers " +
      "børsmeldinger og Statnett.",
    kilder: [
      {
        source_name: "Bitdeer og Data Center Installations: utbygging i Tydal",
        source_url: "https://tydaldatacenter.no/",
        publisher: "Tydal Data Center / Bitdeer",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget ligger i Kirkvollen industriområde i Tydal, etablert 2021. Bitdeer " +
          "Technologies Group kjøpte 100 % av aksjene i 2024, og har kontrahert Data Center " +
          "Installations AS for å bygge ut anlegget til 180 MW — en konvertering fra " +
          "bitcoinutvinning til AI-kolokasjon.",
      },
      {
        source_name:
          "Nkom: Tydal Data Center AS er registrert datasenteroperatør",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Organisasjonsnummer 927050188. Kryptovalutautvinning oppgitt som «Ja, 33 % av forbruk». " +
          "Registreringsplikten gjelder anlegg over 0,5 MW.",
      },
      {
        source_name:
          "E24: kinesisk milliardær utvinner krypto på norske datasentre",
        source_url:
          "https://e24.no/energi-og-klima/i/4BMPKq/kinesisk-milliardaer-utvinner-krypto-paa-norske-datasentre",
        publisher: "E24",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Tydal og Troll Housing er kjøpt av kryptomilliardæren Jihan Wu, og har til sammen " +
          "tilgang på rundt 247 MW.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Exanorth / Bitzero, Tunnsjødalen i Namsskogan",
    description:
      "Containeranlegg for kryptoutvinning i Tunnsjødalen, eid og driftet av Exanorth AS i " +
      "Bitzero-konsernet. 40 MW er i drift, og Statnett har ytterligere 70 MW reservert til " +
      "anlegget. Bitzero har et bindende intensjonsbrev om å leie hele kapasiteten til " +
      "AI-leverandøren OneQode fra 2027. Nkom oppgir 100 % kryptoutvinning.",
    municipality: "Namsskogan",
    address: "Tunnsjødalsveien 178",
    postal_code: "7892",
    latitude: 64.71377,
    longitude: 12.83181,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et anlegg som bærer en kommunes økonomi og samtidig er økonomisk utsatt. Det " +
      "viser hvor sårbart et lokalsamfunn blir når ett kraftkrevende anlegg står for en " +
      "stor del av inntektene.",
    notes:
      "Runde 3 (2026-09-30): omtalen av at «driften er truet» stammer fra en artikkel fra 2024 og " +
      "er fjernet. Aliaser: Bitzero Namsskogan, Exanorth Tunnsjødalen. OneQode er ikke ført som " +
      "kunde, fordi avtalen er et intensjonsbrev.",
    kilder: [
      {
        source_name: "Namdalsavisa og Trønder-Avisa om Exanorth i Namsskogan",
        source_url:
          "https://www.nt24.no/tapte-55-millioner-pa-bitcoin-eventyr-na-er-drifta-i-namsskogan-truet/s/5-120-118957",
        publisher: "Namdalsavisa / Trønder-Avisa",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Anlegget i Tunnsjødalen driver 8 500 maskiner og 300 servere i containere, noen " +
          "kilometer fra E6 ved Kjelmoen. Virksomheten ble først presentert som «lagring i " +
          "skya», men regnskapet viser utvinning av digital valuta for søsterselskapet Bitzero " +
          "Inc på Barbados. Kommunen tjener rundt 12 millioner i året på kraftsalg til anlegget.",
      },
      {
        source_name: "Nkom: Exanorth AS er registrert datasenteroperatør",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Organisasjonsnummer 921677421. Kryptovalutautvinning oppgitt som «Ja, 100 % av forbruk». " +
          "Registreringsplikten gjelder anlegg over 0,5 MW.",
      },
      {
        source_name: "DataCenterMap: Bitzero Namsskogan Data Center",
        source_url: "https://www.datacentermap.com/norway/namsskogan/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Bitzero Namsskogan Data Center, operatør Bitzero, adresse Tunnsjødalsveien 178. " +
          "Oppført i katalogen under Namsskogan.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Troll Housing, Hustadvika",
    description:
      "Kryptodatasenter i Hustadvika utenfor Molde, eid og drevet av Troll Housing AS i " +
      "Bitdeer-konsernet. Bitdeer oppgir 84 MW i drift for kryptoutvinning; ombygging til AI er på " +
      "et tidlig vurderingsstadium. Samme eierskap som Tydal Data Center.",
    municipality: "Hustadvika",
    address: "Klempertåsvegen 104",
    postal_code: "6440",
    city: "Elnesvågen",
    latitude: 62.86224,
    longitude: 7.10885,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Et av landets største kryptoanlegg, og halvparten av et eierskap som samlet " +
      "disponerer rundt 247 MW norsk kraft.",
    notes:
      "Runde 4 (2026-09-30): koordinaten er driftsenhetens adresse i Brønnøysund (Klempertåsvegen " +
      "104, 20 ansatte), ikke et byggpunkt fra plan eller byggesak. Statnett oppgir 63,6 MW " +
      "tilknyttet og 15 MW reservert ved Fræna TRA (78,6 MW), mot Bitdeers 84 MW i drift. NODC 100 " +
      "AS har 50 MW i kø ved samme TRA og er ikke knyttet til Troll Housing.",
    kilder: [
      {
        source_name: "Nkom: Troll Housing AS er registrert datasenteroperatør",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Organisasjonsnummer 911678608. Kryptovalutautvinning oppgitt som «Ja, 97 % av forbruk». " +
          "Registreringsplikten gjelder anlegg over 0,5 MW.",
      },
      {
        source_name: "E24 og Møre Trafo om Troll Housing",
        source_url:
          "https://moretrafo.no/en/reference/troll-housing-data-center-expansion-in-tydal",
        publisher: "E24 / Møre Trafo",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Datasenterselskap i Hustadvika kommune utenfor Molde, kjøpt av samme eier som " +
          "Tydal. De to anleggene har til sammen tilgang på rundt 247 MW.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "lead",
    title: "Thermaltech, Tromsdalen",
    description:
      "Datasenteroperatør i Tromsdalen i Tromsø med 100 % av forbruket til kryptoutvinning. " +
      "Anleggets nøyaktige adresse og størrelse er ikke dokumentert.",
    municipality: "Tromsø",
    city: "Tromsdalen",
    verification_status: "partially_verified",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    notes:
      "Runde 4 (2026-09-30): status satt til ukjent. Grunnlaget er bare en Nkom-registrering og " +
      "et lite selskap. Adressene spriker (Nkom: Tromsdalen, Brønnøysund: Kvaløyvegen 168), " +
      "thermaltech.no er parkert, og det finnes ingen Statnett-relasjon. Uten koordinat med " +
      "vilje. Runde 7 (2026-10-01): Nkom-listen fra 28.04.2026 og Miljødirektoratets innhenting " +
      "av opplysninger bekrefter en aktiv operatør, men ikke hvor anlegget ligger. Omsetningen " +
      "falt fra 20,3 til 4,4 mill. kr fra 2024 til 2025.",
    kilder: [
      {
        source_name: "Nkom: Thermaltech AS er registrert datasenteroperatør",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Organisasjonsnummer 933436012. Kryptovalutautvinning oppgitt som «Ja, 100 % av forbruk». " +
          "Registreringsplikten gjelder anlegg over 0,5 MW.",
      },
      {
        source_name:
          "Digi.no om norske datasenteroperatører med kryptoutvinning",
        source_url:
          "https://www.digi.no/nyhetsstudio/lagring-i-skya-viste-seg-aa-vaere-bitcoin-mining/42594",
        publisher: "Digi.no",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Thermaltech i Tromsdalen i Troms er blant operatørene som oppgir kryptoutvinning.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "lead",
    title: "Fire kryptooperatører uten stedfestet anlegg",
    description:
      "Fire av de ni Nkom-operatørene med kryptoutvinning er fortsatt ikke stedfestet: Bluebite " +
      "(Fauske), Currency Edge (Kvænangen), Arctic Flux (Horten) og Nordic Blocks (Søndre Land). " +
      "Bluefjords er løst — anlegget ligger i Jostedalsvegen 530 i Gaupne.",
    verification_status: "investigated_not_confirmed",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    notes:
      "Websøk og katalogsøk ga ingen treff. Merk at Nscale bygger et AI-datasenter i Fauske, men " +
      "det er et annet selskap enn Bluebite — de skal ikke blandes. Neste innganger er lokalpresse " +
      "i de fire kommunene og nettselskapenes tilknytningssaker. Undersøkt 2026-09-26.",
    tidligere_titler: ["Fem kryptooperatører uten stedfestet anlegg"],
    kilder: [
      {
        source_name:
          "Nkom: fem operatører med kryptoutvinning er registrert datasenteroperatør",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Organisasjonsnummer flere. Kryptovalutautvinning oppgitt som «Ja, 1–100 % av forbruk». " +
          "Registreringsplikten gjelder anlegg over 0,5 MW.",
      },
      {
        source_name: "Enhetsregisteret: kontoradresser for de fem",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-26",
        supports_claim: false,
        excerpt_or_summary:
          "Bluefjords (14 %) i Luster, Bluebite GmbH (55 %) i Fauske, Currency Edge (100 %) i " +
          "Kvænangen, Arctic Flux (95 %) i Horten og Nordic Blocks (1 %) i Søndre Land. Dette " +
          "er kontoradresser, ikke anleggsadresser — ingen av anleggene er stedfestet.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Green Mountain OSL1-Enebakk",
    description:
      "Datasenterområde i Ytre Enebakk. Green Mountain oppgir 75 000 m² tomt med tilgang på inntil 93 MW.",
    municipality: "Enebakk",
    address: "Granittveien 110",
    postal_code: "1914",
    city: "Ytre Enebakk",
    latitude: 59.75739,
    longitude: 10.99372,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Det største datasenterområdet i Oslos umiddelbare nærhet, på et areal som gjør det til et campus, ikke et bygg.",
    notes:
      "Kapasitetstall kommer fra operatør- og bransjekilder, ikke fra myndighet.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Mountain OSL1-Enebakk",
        source_url: "https://www.datacentermap.com/norway/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Green Mountain OSL1-Enebakk, operatør Green Mountain, adresse Granittveien 100, 1914 Ytre Enebakk. " +
          "Datasenterområde i Ytre Enebakk. Green Mountain oppgir 75 000 m² tomt med tilgang på inntil 93 MW.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Green Mountain OSL2-Hamar, Heggvin",
    description:
      "Datasentercampus på Heggvin Næringspark, bygget og driftet av Green Mountain Innlandet AS. " +
      "Planlagt for fem bygg à 30 MW. Tre bygg (90 MW) er i drift siden april 2025 og brukes i sin " +
      "helhet av TikTok som del av Project Clover. TikTok har opsjon på de to siste byggene. " +
      "Green Mountain oppgir ca. 9,7 milliarder kroner investert i de tre første byggene. " +
      "Anlegget er underlagt sikkerhetsloven.",
    municipality: "Hamar",
    address: "Stabekkvegen 130",
    postal_code: "2324",
    city: "Vang på Hedmarken",
    latitude: 60.8424,
    longitude: 11.2667,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Norges største datasenteranlegg i drift, med én navngitt kunde. 60 MW i opsjon har vært " +
      "omtalt som begrenset av strømtilgang, og nettilknytningen krevde ny 132 kV-trafostasjon.",
    notes:
      "Lagt inn i datasenter-enrichment runde 1 (2026-09-30). Omtales i presse som «TikToks datasenter», " +
      "men TikTok er leietaker, ikke eier. Eier og operatør er Green Mountain Innlandet AS (829283352), " +
      "58,8 % eid av Green Mountain AS, som eies av Azrieli Group Ltd. (Israel) gjennom Green Data AS og " +
      "Green Mountain Global Limited. Resterende 41,2 % (B-aksjer) står på «Azirell Data Centers Llc» i " +
      "aksjonærregisteret — trolig Azrieli-selskap, ikke verifisert. Anlegget ligger i Hamar kommune " +
      "(Kartverket), selv om næringsparken strekker seg inn i Løten. Nordavinds «Heggvin» er en egen, " +
      "ledig nabotomt. «OSL-TIK» brukes ikke i noen kilde; Green Mountain kaller anlegget OSL2-Hamar.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Green Mountain signs data center deal with TikTok for new site in Norway",
        source_url: "https://greenmountain.no/data-center-tiktok/",
        publisher: "Green Mountain AS",
        source_type: "web",
        source_date: "2023-03-08",
        primary_source: true,
        excerpt_or_summary: "Green Mountain signerer avtale med TikTok om OSL2-Hamar: 5 bygg à 30 MW = 150 MW. TikTok første kontrakt 3 bygg/90 MW, mulighet for utvidelse til 150 MW innen 2025. Første bygg ferdig nov. 2023.",
      },
      {
        source_name: "OSL-Hamar – Green Mountain Data Center (anleggsside)",
        source_url: "https://greenmountain.no/data-center/osl-hamar/",
        publisher: "Green Mountain AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary: "150 MW total IT-kapasitet, 5 bygg à 30 MW, potensiell campus 280 000 m². Tre bygg ferdige og i drift, én leietaker (TikTok) som bruker 90 MW med opsjon på full 150 MW. 200+ ansatte.",
      },
      {
        source_name: "Project Clover update: Enhanced data security with Norwegian data centre fully online",
        source_url: "https://newsroom.tiktok.com/en-eu/project-clover-update-enhanced-data-security-with-norwegian-data-centre-fully-online",
        publisher: "TikTok Newsroom",
        source_type: "web",
        source_date: "2025-04-03",
        primary_source: true,
        excerpt_or_summary: "TikTok: alle tre bygg i det norske datasenteret i Hamar (levert av Green Mountain) er nå online; ca. 200 arbeidsplasser.",
      },
      {
        source_name: "Nettilknytning av Heggvin datasenter (konsesjonssak)",
        source_url: "https://www.nve.no/konsesjon/konsesjonssaker/konsesjonssak?id=16200&type=A",
        publisher: "NVE",
        source_type: "regulation",
        source_date: "2025-05-23",
        primary_source: true,
        excerpt_or_summary: "Søker/konsesjonær Green Mountain Innlandet AS. Heggvin transformatorstasjon i Hamar kommune forsynt med to 132 kV jordkabler fra Vang transformatorstasjon (oppgraderes av Elvia/Statnett). Konsesjon gitt.",
      },
      {
        source_name: "Green Mountain vert underlagt sikkerheitslova og får etablere datasenter i Innlandet",
        source_url: "https://www.regjeringen.no/no/aktuelt/green-mountain-vert-underlagt-sikkerheitslova-og-far-etablere-datasenter-i-innlandet/id2989926/",
        publisher: "Justis- og beredskapsdepartementet",
        source_type: "regulation",
        source_date: "2023-07-17",
        primary_source: true,
        excerpt_or_summary: "Etter helhetsvurdering får Green Mountain Innlandet AS etablere datasenteret i Innlandet som planlagt med TikTok som eneste kunde; selskapet underlegges sikkerhetsloven. (Siden ga 403 ved henting; innhold via søkeresultat/NRK/digi.)",
      },
      {
        source_name: "GREEN MOUNTAIN INNLANDET AS – aksjonærer",
        source_url: "https://www.proff.no/aksjon%C3%A6rer/bedrift/green-mountain-innlandet-as/829283352",
        publisher: "Proff (basert på aksjonærregisteret)",
        source_type: "register",
        excerpt_or_summary: "Org.nr 829 283 352, stiftet 01.06.2022. Aksjonærer: Green Mountain AS 58,806 % (A-aksjer), 'Azirell Data Centers Llc' 41,194 % (B-aksjer).",
      },
      {
        source_name: "Kartverket adresse-API (punktsøk) og kommuneinfo",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok?lat=60.8420&lon=11.2670&radius=400",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary: "Offisielle adresser på selve anlegget: Stabekkvegen 120, 130 og 140, 2324 Vang på Hedmarken, gnr/bnr 161/4, Hamar kommune (3403). Kommuneinfo bekrefter at byggene ligger i Hamar, ikke Løten.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Eidsiva Digital Rudshøgda",
    description:
      "Planlagt datasenter på en tomt på 50 mål sør i Rudshøgda næringsområde i Ringsaker. " +
      "Eidsiva Digital (tidligere Eidsiva Bredbånd) fikk opsjon på tomta i 2023 og inngikk " +
      "kjøpsavtale med Ringsaker kommune i oktober 2025. Anlegget skal bli selskapets andre " +
      "datasenter etter Gjøvik. Byggestart er ikke fastsatt.",
    municipality: "Ringsaker",
    postal_code: "2360",
    city: "Rudshøgda",
    latitude: 60.90498,
    longitude: 10.82409,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "En offentlig eid datasenteraktør med uttalt mål om nasjonalt, offentlig eierskap for " +
      "samfunnskritiske data.",
    notes:
      "Opprettet i runde 9 (2026-10-02) fra Nordavind-notatet. Anlegget er bekreftet av Eidsivas " +
      "egen kunngjøring 13.10.2025. Koordinaten er Nordavinds kartpunkt for «Rudshøgda sør» og er " +
      "omtrentlig; gnr/bnr er ikke kjent. Statnett-reservasjonen på 10 MW ved Vang TRA (24/01619) " +
      "står på Eidsiva Bredbånd AS uten stedsangivelse; den gjelder trolig Rudshøgda, men er ikke " +
      "ført som sikret kraft. Eidsiva sier selv at det ikke bygges før kundene er på plass.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Eidsiva: Eidsiva planlegger nytt datasenter",
        source_url: "https://www.eidsiva.no/artikler/eidsiva-digital-planlegger-nytt-datasenter/",
        publisher: "Eidsiva",
        source_type: "web",
        source_date: "2025-10-13",
        primary_source: true,
        excerpt_or_summary:
          "Eidsiva Digital har inngått avtale med Ringsaker kommune om kjøp av 50 mål på Rudshøgda " +
          "for sitt andre datasenter. Bygges i takt med etterspørsel; ingen effekt eller dato. " +
          "Bekrefter prosjekt og tomtekjøp.",
      },
      {
        source_name: "Nordavind – Rudshøgda sør (tomteside)",
        source_url: "https://sites.nordavind.com/dcsites/rudshogda-sor/",
        publisher: "Nordavind Energy Sites AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Rudshøgda næringsområde, 60°54'17.91\"N 10°49'26.73\"E, 50 000 m², 66 kV, 9 MW kort sikt / " +
          "40 MW 18–60 mnd, regulert industri, eid av Ringsaker kommune, opsjonsavtale. Bekrefter " +
          "tomt, ikke anlegg.",
      },
      {
        source_name: "Statnett – liste over reservasjoner (forbruk), 30.09.2026",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Sak 24/01619 (ELB100): Vang TRA, kunde Elvia AS, sluttkunde Eidsiva Bredbånd AS, " +
          "datasenter, 10 MW reservert 22.01.2026, planlagt tilknytning 30.12.2035. Stedsnavn ikke " +
          "oppgitt. Køliste: Eidsiva Bredbånd Gjøvik 4 MW, Vardal TRA (25/01992).",
      },
      {
        source_name: "Enhetsregisteret: EIDSIVA DIGITAL AS (880258222)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/880258222",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Vormstuguvegen 40, Lillehammer; bredbåndsvirksomhet, 177 ansatte; avdelinger i " +
          "Lillehammer, Gjøvik og Oslo. Bekrefter selskapet, ikke anlegg på Rudshøgda.",
      },
      {
        source_name: "Kartverket: punktsøk ved Nordavinds Rudshøgda-koordinat",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok?lat=60.90498&lon=10.82409&radius=800&koordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Nærmeste adresse Kinnlimarka 28 (gnr 222/19), 2360 Rudshøgda, Ringsaker. Bekrefter " +
          "adresseområde/kommune, ikke tomtegrense eller anlegg.",
      },
      {
        source_name: "Eidsiva: Datasenter (produktside)",
        source_url: "https://www.eidsiva.no/bedrift/produkter-og-tjenester/datasenter/",
        publisher: "Eidsiva",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Eidsiva tilbyr colocation-datasentertjenester med døgnbemannet SOC og 100 % nasjonalt, " +
          "offentlig eierskap. Oppgir ikke lokasjoner eller effekt.",
      },
      {
        source_name: "Eidsiva: Eidsiva kjøper datasenter på Gjøvik",
        source_url: "https://www.eidsiva.no/artikler/eidsiva-kjoper-etablert-datasenter/",
        publisher: "Eidsiva",
        source_type: "web",
        source_date: "2024-01-15",
        primary_source: true,
        excerpt_or_summary:
          "Eidsiva (Eidsiva Energi AS, datterselskap Eidsiva Bredbånd) kjøper etablert 6 MW " +
          "datasenter i Gjøvik og ser på muligheter for flere datasentre. Brukt her for " +
          "konsernforhold.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Eidsiva Digital Gjøvik, Hans Mustads gate 31",
    description:
      "Etablert colocation-datasenter i Gjøvik med fjellhaller under et kontorbygg i Hans Mustads " +
      "gate 31. Eidsiva Digital kjøpte anlegget fra Tietoevry i januar 2024 og overtok full drift " +
      "1. juli 2025. Eidsiva oppgir kapasiteten til 6 MW og omtaler anlegget som et av Norges " +
      "sikreste. Anlegget var tidligere EVRYs og Tietoevrys datasenter på Gjøvik.",
    municipality: "Gjøvik",
    address: "Hans Mustads gate 31",
    postal_code: "2821",
    city: "Gjøvik",
    latitude: 60.79213,
    longitude: 10.68155,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Eidsivas første datasenter og et av få norske anlegg med helt offentlig, nasjonalt " +
      "eierskap rettet mot kunder med særskilte sikkerhetskrav. Selskapet står med 4 MW i " +
      "Statnetts kapasitetskø ved Vardal og planlegger et andre anlegg på Rudshøgda.",
    notes:
      "Opprettet i runde 10 etter verifisering av bifunnet fra runde 9. Adressen er nå bekreftet " +
      "uavhengig av katalog og Brønnøysund-avdeling: Kystverkets sak 2024/2704 «Diesel til grunn " +
      "– Hans Mustadsgate 31» (ansvarlig Tietoevry Tech Services Norway AS / Tietoevry Norway AS, " +
      "2024–2025), Arbeidstilsynets forhåndsmelding fra Eidsiva Digital AS for byggearbeid i Hans " +
      "Mustadsgate 31 (07.11.–31.12.2025), Gjøvik kommunes saksframlegg 2021 («EVRY sitt bygg i " +
      "Hans Mustad gate») og Oppland Arbeiderblad 09.01.2024 («anlegget i Hans Mustads gate»). " +
      "Samme fysiske anlegg som tidligere EVRY Gjøvik / Tietoevry Gjøvik – tidligere operatør er " +
      "alias, ikke eget anlegg. Historikk: bygget ble ifølge OA (2007) reist av AS Industribygg " +
      "(Gjøvik kommunes eiendomsselskap) for Statens Datasentral; Digi (2022) skriver at " +
      "fjellhallene opprinnelig ble bygget av Telenor til OL i 1994 – opphavet er ikke entydig " +
      "dokumentert. EVRY brukte Gjøvik som reserve-/katastrofesenter fra 2015. Eidsiva kunngjorde " +
      "kjøpet 09.01.2024 (gjennomført januar 2024); Tietoevry sto for driften i en " +
      "overgangsperiode, og Eidsiva Digital overtok full drift 01.07.2025. Eiendomsforholdet er " +
      "uavklart: AS Industribygg sto som eier av gnr 67 bnr 68 i 2017 og 2020, og det er ikke " +
      "dokumentert om Eidsiva eier bygningen/fjellhallene eller leier. «6 MW» er Eidsivas " +
      "oppgitte kapasitet for anlegget (ikke målt IT-last); katalogen Inflect oppgir 1,2 MW " +
      "kritisk IT-last og 1 000 m² for EVRY-perioden. 4 MW i Statnetts kapasitetskø ved Vardal " +
      "TRA (sak 25/01992, sluttkunde «Eidsiva Bredbånd Gjøvik») er ikke sikret kraft. " +
      "Skatteetaten har rammeavtale med Eidsiva Digital om datasenterkapasitet (2025), men er " +
      "ikke ført som kunde fordi kilden ikke navngir anlegget. Miljødirektoratets sak 2025/969 " +
      "(kvoteplikt) har tre dokumenter om «anlegg tilhørende Eidsiva Digital AS» (feb.–mars " +
      "2026); innholdet er ikke offentlig, og kobling til Gjøvik er ikke bekreftet. Koordinaten " +
      "er Kartverkets adressepunkt for bygningen; fjellhallenes nøyaktige plassering er ikke " +
      "offentlig.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Eidsiva: Eidsiva kjøper datasenter på Gjøvik",
        source_url: "https://www.eidsiva.no/artikler/eidsiva-kjoper-etablert-datasenter/",
        publisher: "Eidsiva",
        source_type: "web",
        source_date: "2024-01-15",
        primary_source: true,
        excerpt_or_summary:
          "Eidsiva går inn i datasentermarkedet ved kjøp av et etablert datasenter på 6 MW på Gjøvik " +
          "(pressemelding via NTB 09.01.2024). Bekrefter anlegget; oppgir verken adresse, selger " +
          "eller kjøpesum.",
      },
      {
        source_name: "Eidsiva Energi: Årsrapport 2024",
        source_url: "https://www.eidsiva.no/siteassets/filer-og-pdf/finansiell-informasjon/rapporter-og-presentasjoner/barekraftsrapporter/arsrapport-2024.pdf",
        publisher: "Eidsiva Energi AS",
        source_type: "document",
        source_date: "2025-03-01",
        primary_source: true,
        excerpt_or_summary:
          "Eidsiva Digital gjennomførte i januar 2024 oppkjøpet av Tietoevrys 6 MW store datasenter " +
          "på Gjøvik, arbeidet gjennom 2024 med å overta driften, og tilbyr co-location. Datasenteret " +
          "er operativt.",
      },
      {
        source_name: "Eidsiva Energi: Halvårsrapport første halvår 2025",
        source_url: "https://www.eidsiva.no/siteassets/filer-og-pdf/finansiell-informasjon/rapporter-og-presentasjoner/eidsiva-energi-forste-halvar-2025.pdf",
        publisher: "Eidsiva Energi AS",
        source_type: "document",
        source_date: "2025-08-28",
        primary_source: true,
        excerpt_or_summary:
          "Eidsiva Digital overtok fra 1. juli 2025 full drift av datasenteret på Gjøvik og er " +
          "tildelt rammeavtale med Skatteetaten om datasentertjenester. Investeringer og kostnader " +
          "knyttet til datasenteret omtales.",
      },
      {
        source_name: "Eidsiva Energi: Årsrapport 2025",
        source_url: "https://live.euronext.com/sites/default/files/company_press_releases/attachments_oslo/2026/03/26/669427_%C3%85rsrapport%202025.pdf",
        publisher: "Eidsiva Energi AS (Oslo Børs)",
        source_type: "document",
        source_date: "2026-03-26",
        primary_source: true,
        excerpt_or_summary:
          "Eidsiva Digital har posisjon i datasentermarkedet gjennom eierskap til datasenteret på " +
          "Gjøvik; oppkjøpet er fullt integrert i 2025. Oppgir ikke effekt eller adresse.",
      },
      {
        source_name: "Eidsiva: Eidsiva Digital vokser i bedriftsmarkedet",
        source_url: "https://www.eidsiva.no/artikler/eidsiva-bredband-vokser-i-bedriftsmarkedet/",
        publisher: "Eidsiva",
        source_type: "web",
        source_date: "2025-01-01",
        primary_source: true,
        excerpt_or_summary:
          "Oppkjøpet av datasenteret på Gjøvik med kapasitet på 6 MW markerte inntreden i " +
          "datasentermarkedet i 2024; ytterligere investeringer i datasenteret planlegges i 2025. " +
          "Publiseringsdato er omtrentlig (2025).",
      },
      {
        source_name: "Eidsiva: Eidsiva Digital inngår rammeavtale med Skatteetaten",
        source_url: "https://www.eidsiva.no/artikler/eidsiva-digital-inngar-rammeavtale-med-skatteetaten/",
        publisher: "Eidsiva",
        source_type: "web",
        source_date: "2025-07-11",
        primary_source: true,
        excerpt_or_summary:
          "Rammeavtale om drift og tilrettelegging av datasenterkapasitet i Eidsiva Digitals anlegg " +
          "for virksomheter med særskilte sikkerhetskrav, kunngjort på Doffin juni 2025. Navngir ikke " +
          "Gjøvik.",
      },
      {
        source_name: "Eidsiva: Eidsiva planlegger nytt datasenter",
        source_url: "https://www.eidsiva.no/artikler/eidsiva-digital-planlegger-nytt-datasenter/",
        publisher: "Eidsiva",
        source_type: "web",
        source_date: "2025-10-13",
        primary_source: true,
        excerpt_or_summary:
          "Eidsiva Digital eier og driver et av landets sikreste datasentre i Gjøvik; Rudshøgda blir " +
          "selskapets andre.",
      },
      {
        source_name: "Kystverket sak 2024/2704: Diesel til grunn – Hans Mustadsgate 31, Gjøvik (eInnsyn)",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01j76vzv9bfrj8rsqmkjkabk6g/journalpost?limit=50&expand=korrespondansepart",
        publisher: "Kystverket",
        source_type: "register",
        source_date: "2024-06-14",
        primary_source: true,
        excerpt_or_summary:
          "Journal med 13 dokumenter 2024–2025 om diesellekkasje og opprydding i Hans Mustads gate " +
          "31, med Tietoevry Tech Services Norway AS/Tietoevry Norway AS som ansvarlig og Sweco som " +
          "rådgiver. Bekrefter Tietoevrys dieselanlegg på adressen; ordet datasenter står ikke i " +
          "titlene.",
      },
      {
        source_name: "Arbeidstilsynet: Forhåndsmelding – Hans Mustadsgate 31, Gjøvik 07.11.2025–31.12.2025 (eInnsyn)",
        source_url: "https://api.einnsyn.no/journalpost/jp_01k9nepsb6ev1ah41qrjaamfww?expand=korrespondansepart",
        publisher: "Arbeidstilsynet",
        source_type: "register",
        source_date: "2025-11-04",
        primary_source: true,
        excerpt_or_summary:
          "Forhåndsmelding om bygge-/anleggsarbeid i Hans Mustadsgate 31 med Eidsiva Digital AS som " +
          "avsender. Bekrefter at Eidsiva Digital er byggherre på adressen; arbeidets art framgår " +
          "ikke.",
      },
      {
        source_name: "Arbeidstilsynet sak 2025/42599: Søknad om samtykke, Gjøvik kommune – Eidsiva Digital AS (eInnsyn)",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01jzp0z0yhfdb8setptg11mxaq/journalpost?expand=korrespondansepart",
        publisher: "Arbeidstilsynet",
        source_type: "register",
        source_date: "2025-07-15",
        primary_source: true,
        excerpt_or_summary:
          "Arbeidstilsynet innvilget 15.07.2025 samtykke i byggesak i Gjøvik med Eidsiva Digital AS " +
          "som mottaker (søknad fra arkitektfirma 03.07.2025). Adressen er avskjermet i sakstittelen.",
      },
      {
        source_name: "Digitaliserings- og forvaltningsdepartementet sak 2026/1432: Oppfølging etter besøk på Gjøvik – Eidsiva Datasenter (eInnsyn)",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01ks4nv1c2e1fswrmzjv96j944/journalpost?expand=korrespondansepart",
        publisher: "Digitaliserings- og forvaltningsdepartementet",
        source_type: "register",
        source_date: "2026-05-13",
        primary_source: true,
        excerpt_or_summary:
          "Inngående brev fra Eidsiva Digital AS etter departementets besøk ved Eidsivas datasenter " +
          "på Gjøvik. Bekrefter at anlegget er i drift i 2026; ingen adresse eller effekt.",
      },
      {
        source_name: "Gjøvik kommune: Planinitiativ for del av campus Gjøvik (sak 127/2021)",
        source_url: "https://www.gjovik.kommune.no/_f/p2/icf9be3a7-39e2-4c0d-ac30-870e10d82c8e/vedtak-2007618_4_a.pdf",
        publisher: "Gjøvik kommune",
        source_type: "document",
        source_date: "2021-11-26",
        primary_source: true,
        excerpt_or_summary:
          "Saksframlegg som opplyser at Helsetjenestens driftsorganisasjon for nødnett da var " +
          "lokalisert i «EVRY sitt bygg i Hans Mustad gate». Bekrefter EVRY-bygget på gateadressen; " +
          "omtaler ikke datasenteret.",
      },
      {
        source_name: "Arbeidstilsynet sak 2017/47231: Gnr 67 bnr 68 – Hans Mustads gate 31 – AS Industribygg (eInnsyn)",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01j74aqme6fz8ryzk3qk09v5ea",
        publisher: "Arbeidstilsynet",
        source_type: "register",
        source_date: "2017-11-09",
        primary_source: true,
        excerpt_or_summary:
          "Bruksendring for en kontorleietaker i Hans Mustads gate 31 med AS Industribygg som " +
          "tiltakshaver. Viser at AS Industribygg var gårdeier på gnr 67 bnr 68 i 2017; sier " +
          "ingenting om datasenteret.",
      },
      {
        source_name: "Miljødirektoratet sak 2025/969: Vurdering av kvoteplikt for anlegg – dokumenter om Eidsiva Digital AS (eInnsyn)",
        source_url: "https://api.einnsyn.no/search?query=Eidsiva%20Digital%20kvoteplikt",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-03-27",
        primary_source: true,
        excerpt_or_summary:
          "Dok. 32 (23.02.2026) anmodning om opplysninger om anlegg tilhørende Eidsiva Digital AS, " +
          "dok. 116 (20.03.2026) opplysninger om kvoteplikt, dok. 124 (27.03.2026) konklusjon. " +
          "Anleggsnavn og konklusjon framgår ikke av journalen.",
      },
      {
        source_name: "Enhetsregisteret: EIDSIVA DIGITAL AS AVD GJØVIK (936524826)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/underenheter/936524826",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Underenhet i Hans Mustads gate 31, 2821 Gjøvik, oppstart 01.11.2025, 6 ansatte. Bekrefter " +
          "avdeling og adresse, ikke selve anlegget.",
      },
      {
        source_name: "Kartverket: Hans Mustads gate 31, Gjøvik",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?sok=Hans%20Mustads%20gate%2031&kommunenavn=Gj%C3%B8vik",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Adressepunkt 60.79213, 10.68155, gnr 67 bnr 68, Gjøvik (3407). Bekrefter adresse og " +
          "matrikkelenhet, ikke anlegg.",
      },
      {
        source_name: "Statnett – liste over kapasitetskø (forbruk), 30.09.2026",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Sak 25/01992 (ELB272): Vardal TRA, kunde Elvia AS, sluttkunde Eidsiva Bredbånd Gjøvik, " +
          "datasenter, 4 MW i kø, moden bestilling 21.11.2024, ønsket tilknytning 30.03.2026. " +
          "Køplass, ikke reservasjon.",
      },
      {
        source_name: "EVRY: kontaktside Gjøvik (Wayback 2017)",
        source_url: "https://web.archive.org/web/20170814121346/https://www.evry.com/no/kontakt/norge/gjovik/gjovik/",
        publisher: "EVRY (arkivert av Internet Archive)",
        source_type: "web",
        source_date: "2017-08-14",
        primary_source: true,
        excerpt_or_summary:
          "EVRYs egen kontaktside oppgir besøksadresse Hans Mustadsgt. 31, 2821 Gjøvik. Bekrefter " +
          "EVRYs lokasjon på adressen, ikke datahallene spesifikt.",
      },
      {
        source_name: "Eidsiva: Datasenter (produktside)",
        source_url: "https://www.eidsiva.no/bedrift/produkter-og-tjenester/datasenter/",
        publisher: "Eidsiva",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Colocation-datasentertjenester med døgnbemannet SOC og nasjonalt, offentlig eierskap. " +
          "Oppgir ikke lokasjon eller effekt.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Arcem Elverum, Sperre-tomta",
    description:
      "Planlagt datasenter på den tidligere Sperre Støperi-tomta i Industrigata 22 på Vestad i " +
      "Elverum, der det nedlagte støperiet skal gjøres om. Prosjektselskapet Industrigata 22 AS " +
      "står i Statnetts kø med 99 MW ved Vang transformatorstasjon. Planinitiativ for " +
      "detaljregulering er levert, og Arcem venter reguleringsvedtak i 2028 og mulig drift fra " +
      "2032.",
    municipality: "Elverum",
    address: "Industrigata 22",
    postal_code: "2406",
    city: "Elverum",
    latitude: 60.87225,
    longitude: 11.54301,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et stort datasenter på en eksisterende industritomt i Elverum. Tilknytningen krever " +
      "forsterket regionalnett, så kraftsporet er langt.",
    notes:
      "Opprettet i runde 6 (2026-09-30). Aliaser: Industrigata 22, Sperre-tomta. Koordinaten er " +
      "Kartverkets adressepunkt for Industrigata 22 (tomt, ikke bygg). 99 MW er køplass (sak " +
      "24/01769), ikke sikret kraft; tallet er ført som planlagt fordi Arcem oppgir det for " +
      "prosjektet. Industrigata 22 AS eies av Bonum Eiendom AS; Arcem er utvikler.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Statnett – kapasitetskø forbruk (Power BI)",
        source_url: "https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/#kapasitetsko",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Sak 24/01769 (ELB155): Vang TRA, Innlandet, NO1, Elvia, sluttkunde Industrigata 22 AS, " +
          "datasenter, 99 MW i kø, moden bestilling 06.09.2024, ønsket tilknytning 30.03.2026. " +
          "Bekrefter køplass, ikke reservasjon eller anlegg.",
      },
      {
        source_name: "Enhetsregisteret: INDUSTRIGATA 22 AS (912535401)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/912535401",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Stiftet 1968, tidl. SPERRE STØPERI AS, formål investering i fast eiendom, adresse " +
          "Inkognitogata 8 Oslo, styreleder Anders Bakken Eriksen. Bekrefter selskap, ikke anlegg.",
      },
      {
        source_name: "Arcem – Projects",
        source_url: "https://arcem.no/projects",
        publisher: "Arcem",
        source_type: "web",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Elverum: 99 MW, «In capacity queue». Nedlagt metallstøperi som blir datasenter; regulering " +
          "pågår, vedtak ventet 2028.",
      },
      {
        source_name: "Planned Elverum Data Center Could Transform Former Industrial Site…",
        source_url: "https://media.arcem.no/planned-elverum-data-center-could-transform-former-industrial-site-into-future-oriented-business-hub/",
        publisher: "Arcem (media.arcem.no)",
        source_type: "web",
        source_date: "2026-03-29",
        primary_source: true,
        excerpt_or_summary:
          "Sperre Støperi-tomta, Industrigata 22. Søkt 99 MW, i kø. Krever forsterket regionalnett " +
          "Hamar–Elverum og ny transformatorstasjon. Bonum-prosjektleder Bjørn Wikan, Rambøll " +
          "plankonsulent, 40–150 jobber, mulig drift 2032.",
      },
      {
        source_name: "Kartverket adresse-API: Industrigata 22, Elverum",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?sok=Industrigata%2022&kommunenavn=Elverum",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Vegadresse Industrigata 22, 2406 Elverum, gnr 13 bnr 357, punkt 60.87225/11.54301. " +
          "Bekrefter adresse og matrikkel, ikke anlegg.",
      },
      {
        source_name: "Kommuneinfo: Industrigata 22-punktet",
        source_url: "https://ws.geonorge.no/kommuneinfo/v1/punkt?nord=60.87225&ost=11.54301&koordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Punktet ligger i Elverum kommune (3420), Innlandet. Bekrefter kommune, ikke anlegg.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Ugna Lalm (tidl. Krefter), Kolbotn industriområde",
    description:
      "Datasenterprosjekt på Kolbotn industriområde på Lalm, startet av Krefter AS i 2021–2022 og " +
      "videreført av Ugna-gruppen. Et bygg ble satt opp i 2022, men anlegget har aldri fått strøm " +
      "og har ikke vært i drift. Statnett reserverte 10 MW ved Vågåmo til Ugna Properties AS i " +
      "september 2026, og selskapet sendte samme måned fornyet konsesjonssøknad til NVE for " +
      "Kolbotten industriområde.",
    municipality: "Vågå",
    postal_code: "2682",
    city: "Lalm",
    latitude: 61.80933,
    longitude: 9.29978,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et omstridt prosjekt med stoppordre i 2022 og mistanke om kryptoutvinning. En fersk " +
      "Statnett-reservasjon kan bety at prosjektet tas opp igjen.",
    notes:
      "Opprettet i runde 9 (2026-10-02) fra Nordavind-notatet. Koordinaten er Nordavinds " +
      "kartpunkt for tomta (ved Kvennbergvegen) og er ikke bekreftet som selve bygget. Type er " +
      "ukjent: selskapet sier datalagring, mens kommunen og NRK beskriver kryptocontainere. Ikke " +
      "samme prosjekt som Kitebrook Børdalen. Runde 10 (2026-10-02): NVEs journal viser at Ugna " +
      "Properties AS i september 2026 sendte fornyet søknad om anleggskonsesjon for Kolbotten " +
      "industriområde med henvisning til mottatt kapasitetsreservasjon fra Statnett (sak " +
      "2026/19609), og at NVE har plassert søknaden i kø. Reservasjonen på 10 MW (22/00654) er " +
      "dermed stedfestet til Lalm og ført som sikret kraft; sikkerheten er hevet fra lav til " +
      "medium. Bare journaltitlene er lest, ikke dokumentene. Den forrige søknaden ble avvist i " +
      "oktober 2025 på grunn av manglende framdrift. Det er ikke bekreftet at bygget fortsatt " +
      "står: lokalpressen skrev i 2025 at det muligens rives. Krefters øvrige søknader (Tessand i " +
      "Vågå og Skansen i Sel) har ingen aktivitet etter 2023.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Statnett – liste over reservasjoner (forbruk), 30.09.2026",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Sak 22/00654 (ELB3954): Vågåmo TRA, kunde Fjellnett AS, sluttkunde Ugna Properties AS, " +
          "datasenter, 10 MW reservert 07.09.2026, uten planlagt tilknytningsdato. Bekrefter " +
          "kraftreservasjon til prosjektselskapet.",
      },
      {
        source_name: "Nordavind – Lalm (tomteside)",
        source_url: "https://sites.nordavind.com/dcsites/lalm/",
        publisher: "Nordavind Energy Sites AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Kolbotn industriområde, Vågå, 61°48'33.6\"N 9°17'59.2\"E, 1 927 + 10 350 m², 66 kV, " +
          "10/25/100 MW på kort/mellomlang/lang sikt. Tomta er solgt. Bekrefter tomt og salg, ikke " +
          "drift.",
      },
      {
        source_name: "Enhetsregisteret: UGNA PROPERTIES AS (927511983)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/927511983",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Stiftet 06.07.2021, Dronning Eufemias gate 20 Oslo; formål investering i teknologi, KI og " +
          "datalagring. Bekrefter selskapet, ikke anlegget.",
      },
      {
        source_name: "Enhetsregisteret: UGNA AS (931571559)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/931571559",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Holdingselskap stiftet 22.05.2023, samme adresse i Oslo. Bekrefter selskapet.",
      },
      {
        source_name: "Enhetsregisteret: KREFTER SOLUTIONS AS (928128105)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/928128105",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Datterselskap med adresse Kvennbergvegen 27, 2682 Lalm; elektriske anlegg, bygg og fiber. " +
          "Bekrefter selskap og adresse på industriområdet, ikke datasenter.",
      },
      {
        source_name: "Kartverket: punktsøk ved Nordavinds Lalm-koordinat",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok?lat=61.80933&lon=9.29978&radius=400&koordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Nærmeste adresser er Kvennbergvegen 31 (gnr 1/51, ca. 60 m) og 27 (gnr 1/52, ca. 170 m), " +
          "2682 Lalm, Vågå. Bekrefter adresse/kommune, ikke anlegg.",
      },
      {
        source_name: "Historien om Nordavind",
        source_url: "https://nordavind.com/historien-om-nordavind/",
        publisher: "Nordavind Energy Sites AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Tomta på Kolbotn industriområde på Lalm ble solgt til Krefter/Grand Technik for etablering " +
          "av et 10 MW datasenter.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: [
      "AQ Compute / hscale OSL1, Hønefoss",
      "Odin Green DC — registrert datasenteroperatør med c/o-adresse i Asker",
    ],
    title: "hscale OSL1 (tidl. AQ Compute), Hønefoss",
    description:
      "Datasenter for AI og HPC på Nedre Kilemoen i Hønefoss, eid av Odin Green DC AS og driftet av " +
      "hscale (tidligere AQ Compute). Første bygg har vært i drift siden 2024 med ca. 6 MW, og " +
      "NexGen Cloud er første leietaker. OSL2 og OSL3 er planlagt til 2027 og 2028, og campus er " +
      "oppgitt til 200 MW.",
    municipality: "Ringerike",
    address: "Follummoveien 94",
    postal_code: "3516",
    city: "Hønefoss",
    latitude: 60.20531,
    longitude: 10.23463,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Et av de større anleggene i Oslos randsone, på et tidligere industriområde.",
    notes:
      "Runde 2 (2026-09-30): nytt navn etter at AQ Compute ble hscale. Eier er Odin Green DC AS, " +
      "som har som eneste formål å utvikle, eie og drive dette datasenteret. Selskapet lå " +
      "tidligere som et eget lead fra Nkom-registeret med c/o-adresse i Asker; det er slått " +
      "sammen hit og arkivert (dedup 2026-09-30). TikTok Norway AS og Bulk i Statnetts kø ved " +
      "Ringerike er ikke dette anlegget. Runde 9 (2026-10-02): Nscale Drift AS har en avdeling " +
      "(underenhet, 17 ansatte, fra mars 2025) registrert på Follummoveien 94, som er hscale " +
      "OSL1s adresse og teig (51/55). Nscale fører selv «Oslo» som partnerdrevet datasenter i " +
      "drift. Det er en driftsavdeling i dette anlegget, ikke et eget anlegg. Ingen kilde navngir " +
      "hscale som vert eller oppgir MW, så Nscale er ikke ført som kunde.",
    kilder: [
      {
        source_name: "Nkom: Odin Green DC AS registrert som datasenteroperatør",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Odin Green DC AS (925218790) står i Nkoms register over kommersielle datasenteroperatører. " +
          "Registeret oppgir ikke lokasjon; selskapets eneste formål er datasenteret i Hønefoss.",
      },
      {
        source_name: "DataCenterMap: AQ Compute / hscale OSL1, Hønefoss",
        source_url: "https://www.datacentermap.com/norway/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som AQ Compute / hscale OSL1, Hønefoss, operatør AQ Compute, adresse Follummoveien 94, 3516 Hønefoss. " +
          "Kolokasjonsanlegg på Follum i Hønefoss, oppgitt som AQ Computes første colocation-datasenter.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "STACK Årbogen datasenter, Treklyngen vest",
    description:
      "Planlagt datasenter på Årbogen/Treklyngen vest nord for Hønefoss, der STACK Infrastructure " +
      "er forslagsstiller for detaljregulering 518. Planområdet var ca. 316 daa ved oppstart i " +
      "desember 2024 og er utvidet to ganger i 2026. Planprogrammet ble fastsatt i april 2025; " +
      "planforslaget er ennå ikke på høring. STACK kjøpte tomt i Treklyngen i 2021.",
    municipality: "Ringerike",
    city: "Hønefoss",
    latitude: 60.1985,
    longitude: 10.25617,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et stort, KU-pliktig datasenterprosjekt i Kilemoen/Follum-klyngen, der flere aktører til " +
      "sammen har flere hundre MW reservert eller i kø ved Ringerike transformatorstasjon.",
    notes:
      "Opprettet i runde 8 (2026-10-01) fra Ringerike TRA-gjennomgangen. Anlegget er bekreftet av " +
      "Ringerike kommunes plansak 518 «Årbogen datasenter». Koordinaten er midtpunktet av teigene " +
      "87/588–590 i plansakens tittel (Kartverket), ikke et byggepunkt. Statnett har 100 MW " +
      "reservert (24/01774) til «Stack AS», men det finnes ikke noe slikt STACK-selskap i " +
      "Brønnøysund, så tallet er ikke ført som sikret kraft. Prosjektselskap og hjemmelshaver er " +
      "ikke dokumentert; SI OSL 06 AS (c/o STACK) er en mulig kandidat. Eget anlegg, ikke hscale " +
      "OSL1 eller Green Mountain Kilemoen (ca. 1,3 km unna).",
    public_candidate: false,
    kilder: [
      {
        source_name: "Ringerike kommune: plan 518 Årbogen datasenter – innspill ved varsel om oppstart",
        source_url: "https://www.ringerike.kommune.no/globalassets/bilder-blokker-og-filarkiv/bilder-og-dokumenter/samfunn/areal-og-byplan/pagaende-planprosesser/518-arbogen-datasenter_innspill-ved-varsel-om-oppstart.pdf",
        publisher: "Ringerike kommune",
        source_type: "regulation",
        source_date: "2025-02-05",
        primary_source: true,
        excerpt_or_summary:
          "Innspill til oppstart av detaljregulering (varslet 11.12.2024, frist 05.02.2025). " +
          "Bekrefter at Stack Infrastructure AS er forslagsstiller og COWI plankonsulent, et " +
          "planområde på ca. 316 daa på begge sider av E16, KU-plikt (over 15 000 m² BRA) og " +
          "datasenter som hovedformål.",
      },
      {
        source_name: "eInnsyn: Vedtak om fastsatt planprogram – 518 Årbogen datasenter",
        source_url: "https://api.einnsyn.no/journalpost/jp_01jsy9cmjdfz5bsdhqtkg5phma",
        publisher: "eInnsyn",
        source_type: "register",
        source_date: "2025-04-28",
        primary_source: true,
        excerpt_or_summary:
          "Journalpost som viser at planprogrammet for plan 518 ble fastsatt i april 2025.",
      },
      {
        source_name: "eInnsyn: Varsel om oppstart – utvidelse av planområde, Årbogen datasenter",
        source_url: "https://api.einnsyn.no/journalpost/jp_01kgjr5nejefdtthd4fg843vs3",
        publisher: "eInnsyn (NVE)",
        source_type: "register",
        source_date: "2026-01-26",
        primary_source: true,
        excerpt_or_summary:
          "Første varsel om utvidet planområde for plan 518 (januar 2026).",
      },
      {
        source_name: "eInnsyn: Varsel om utvidet planområde – Årbogen datasenter, gnr. 87 bnr. 588, 589 mfl.",
        source_url: "https://api.einnsyn.no/journalpost/jp_01m0dx25z2ecrrbd62c2ww73j8",
        publisher: "eInnsyn (NVE)",
        source_type: "register",
        source_date: "2026-08-11",
        primary_source: true,
        excerpt_or_summary:
          "Andre varsel om utvidet planområde (august 2026). Bekrefter gnr 87/588, 589 m.fl. og at " +
          "plansaken er aktiv. Innspill ble journalført fram til 17.09.2026.",
      },
      {
        source_name: "STACK: STACK acquires land for data center outside of Oslo",
        source_url: "https://www.stackinfra.com/about/news-press/press-releases/stack-acquires-land-for-data-center-outside-of-oslo/",
        publisher: "STACK Infrastructure",
        source_type: "web",
        source_date: "2021-01-25",
        primary_source: true,
        excerpt_or_summary:
          "STACK kjøpte 60 000 m² med opsjon på 100 000 m² til i Treklyngen industripark (Ringerike) " +
          "av Follum Eiendom. Pressemeldingen viser til en kraftavtale med Ringerikskraft og har " +
          "ingen byggestartdato.",
      },
      {
        source_name: "Statnett: statistikk om tilknytningssaker (reservasjoner forbruk)",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Sak 24/01774 (ELB1057): Ringerike TRA, Glitre Nett, sluttkunde «Stack AS», Datasenter, 100 " +
          "MW reservert 20.03.2025, planlagt 30.12.2027.",
      },
      {
        source_name: "Kartverket eiendom-API: gnr 87/588–590 Ringerike",
        source_url: "https://ws.geonorge.no/eiendom/v1/geokoding?kommunenummer=3305&gardsnummer=87&bruksnummer=588&omrade=true&utkoordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-01",
        primary_source: true,
        excerpt_or_summary:
          "Teigpunkter og utstrekning for 87/588, 87/589 og 87/590 i Ringerike. Bekrefter " +
          "beliggenhet, men ikke at det står et anlegg der.",
      },
      {
        source_name: "Brønnøysundregistrene: STACK AS (928103765)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/928103765",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-01",
        primary_source: true,
        excerpt_or_summary:
          "STACK AS er et byggefirma i Bergen (stiftet 2021, næring oppføring av bygninger) og er " +
          "ikke en STACK Infrastructure-enhet. Statnetts «Stack AS» kan derfor ikke kobles til denne " +
          "enheten.",
      },
      {
        source_name: "Brønnøysundregistrene: STACK INFRASTRUCTURE NORWAY OPCO AS (932597187)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/932597187",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-01",
        primary_source: true,
        excerpt_or_summary:
          "Norsk STACK-driftsselskap, tidligere STACK Infrastructure Norway AS (nytt navn " +
          "14.09.2026), Ulvenveien 82E i Oslo, 45 ansatte. Bekrefter bare selskapet.",
      },
      {
        source_name: "Brønnøysundregistrene: SI OSL 06 AS (926807617)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/926807617",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-01",
        primary_source: true,
        excerpt_or_summary:
          "Datasenterselskap c/o STACK med navnet DIGIPLEX BUSKERUD AS fra 2021 til 2022. Det er " +
          "mulig, men ikke dokumentert, at det er prosjektselskap for Ringerike.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Green Mountain Hønefoss, Kilemoen",
    description:
      "Planlagt datasenter fra Green Mountain på Kilemoen ved Hønefoss. Green Mountain kjøpte " +
      "tomt fra Follum gård i 2025 og fikk rammetillatelse fra Ringerike kommune samme år. " +
      "Prosjektselskapet er Green Mountain Hønefoss AS. Tidslinje og kapasitet for anlegget er " +
      "ikke oppgitt.",
    municipality: "Ringerike",
    city: "Hønefoss",
    latitude: 60.20179,
    longitude: 10.23277,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et nytt hyperskala-aktuelt anlegg på Kilemoen, noen hundre meter fra hscale OSL1, i et " +
      "område der flere aktører har nettreservasjoner eller køplass ved Ringerike " +
      "transformatorstasjon.",
    notes:
      "Opprettet i runde 3 (2026-09-30). Statnett har reservert 18,5 MW til Green Mountain AS ved " +
      "Ringerike TRA og har 145 MW i kø; reservasjonen står på selskapet, ikke på " +
      "prosjektselskapet eller anlegget, og er derfor ikke ført som sikret kraft. Koordinaten er " +
      "Kartverkets stedsnavnpunkt for Kilemoen industriområde, ikke tomta. Ikke samme anlegg som " +
      "hscale OSL1 (Odin Green DC AS). Runde 7 (2026-10-01): Green Mountain Hønefoss AS er satt " +
      "som eier med lav sikkerhet, fordi hjemmelshaver til tomta ikke er dokumentert. Type " +
      "colocation bygger på Green Mountains forretningsmodell. Kapasitetstallene spriker (20/50 " +
      "MW i 2023, 163,5 MW i Statnett), så planlagt kapasitet er ikke satt.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Statnett: reservasjoner og kapasitetskø (forbruk)",
        source_url: "https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/#reservasjoner",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Green Mountain AS, Ringerike TRA (Glitre Nett): 18,5 MW reservert (23/01370, tilknytning " +
          "29.09.2027) og 145 MW i kø (24/01806, 2031). Lest via GitHub-speil, snapshot 30.09.2026.",
      },
      {
        source_name: "Brønnøysundregistrene: Green Mountain Hønefoss AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/935038499",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Org.nr. 935038499, stiftet 05.02.2025, Hodneveien 260 i Stavanger. Formål: investering i " +
          "datasentervirksomhet. Styreleder Rafi Wunsh. Søsterselskapet Green Mountain Hønefoss " +
          "Investment AS har org.nr. 935038529.",
      },
      {
        source_name: "Ringerike kommune: Utbyggingsavtale for Nedre Kilemoen, nord",
        source_url: "https://www.ringerike.kommune.no/innhold/pagaende-planprosesser/arkiv-planprosesser-2025/arkiv-utbyggingsavtaler-2025/utbyggingsavtale-for-nedre-kilemoen-nord2/",
        publisher: "Ringerike kommune",
        source_type: "regulation",
        source_date: "2025-03-17",
        primary_source: true,
        excerpt_or_summary:
          "Utbyggingsavtale mellom Odin Green DC AS og kommunen for plan 226 «Nedre Kilemoen, nord» " +
          "(51/46). Gjelder hscale OSL1 og brukes her bare til dedup: det er ikke Green Mountain.",
      },
      {
        source_name: "Kartverket stedsnavn: Kilemoen Industriområde",
        source_url: "https://ws.geonorge.no/stedsnavn/v1/navn?sok=Kilemoen&utkoordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Stedsnavnpunktet for Kilemoen Industriområde er 60,20179 / 10,23277 (Ringerike). Brukt som " +
          "omtrentlig områdepunkt.",
      },
      {
        source_name: "Azrieli Group completes acquisition of Green Mountain",
        source_url: "https://greenmountain.no/green-mountain-data-centers-acquired-by-azrieli-group-ltd/",
        publisher: "Green Mountain AS",
        source_type: "web",
        source_date: "2021-07-19",
        primary_source: true,
        excerpt_or_summary:
          "Azrieli Group kjøper 100 % av Green Mountain AS. Oppkjøpet ble fullført 31.08.2021.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "note",
    title: "Nasjonalt bilde: 112 oppføringer i 42 markeder",
    description:
      "Rammen for videre arbeid. Katalogene fører 112 og 49 oppføringer nasjonalt, med " +
      "delvis overlapp. Oslo er klart størst med 34, deretter Stavanger, Bergen og et " +
      "belte av små markeder med ett eller to anlegg hver — typisk kraftkrevende anlegg i " +
      "kommuner med rimelig kraft.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    notes:
      "Denne runden gjennomgikk Oslo-markedet i sin helhet og Billingstad, pluss de ni " +
      "kryptooperatørene og de største nasjonale aktørene. Markedene Stavanger, Bergen, Bryne, " +
      "Aksdal, Kristiansand, Skien, Trondheim og Sandefjord er identifisert, men ikke gjennomgått " +
      "anlegg for anlegg.",
    kilder: [
      {
        source_name: "DataCenterMap, nasjonal oversikt",
        source_url: "https://www.datacentermap.com/norway/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "112 oppføringer fordelt på 42 markeder. Størst: Oslo 34, Stavanger 9, Bergen 8, " +
          "Bryne 5, Aksdal 5, Kristiansand 4, Skien 4, Trondheim 4, Sandefjord 3. Resten har " +
          "ett eller to hver.",
      },
      {
        source_name: "PeeringDB, nasjonal oversikt",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "49 fasiliteter i Norge. Overlappet med DataCenterMap er delvis: PeeringDB fører " +
          "samtrafikkpunkter, DataCenterMap fører colocation-tilbud.",
      },
    ],
  },
  {
    category: "Kilder",
    item_type: "data_issue",
    title: "Katalogenes markedsinndeling plasserer anlegg i feil kommune",
    description:
      "DataCenterMap fører Tydal Data Center under markedet «Ås», som er en helt annen " +
      "kommune i en annen landsdel. Samtidig lå NTC Billingstad i Asker under et eget " +
      "marked «Billingstad» og kom ikke med i Oslo-oversikten.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    notes:
      "Regel: markedsnavn i en katalog er ikke kommune, og et marked kan både skjule anlegg og " +
      "plassere dem feil. Kommunen må alltid settes fra adressen, geokodet mot Kartverket.",
    kilder: [
      {
        source_name:
          "DataCenterMap: Tydal Data Center ført under markedet «Ås»",
        source_url: "https://www.datacentermap.com/norway/as/bitdeer-tydal/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget i Kirkvollen i Tydal kommune i Trøndelag er plassert under markedet «Ås». " +
          "Ås er en kommune i Akershus, 60 mil unna.",
      },
    ],
  },

  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "atNorth NOR01, Haugaland Business Park",
    description:
      "Planlagt datasentercampus i den nordlige delen av Haugaland Business Park. Første fase er " +
      "120 MW med drift planlagt i 2028, og atNorth oppgir 350 MW som campuspotensial. atNorth har " +
      "anleggsbidragsavtale med Fagne for 120 MW. Selskapet eies av CPP Investments og Equinix.",
    municipality: "Tysvær",
    postal_code: "5570",
    city: "Aksdal",
    latitude: 59.32677,
    longitude: 5.42717,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av de største planlagte datasentrene i Norge. 120 MW er avtalt med netteier, og campusen " +
      "kan vokse til 350 MW.",
    notes:
      "Kvalitetsrunde 2026-09-30: koordinaten er omtrentlig — midtpunktet av matrikkelenhet 3/45 " +
      "(ca. 373 daa) i parkens datasentersone. At dette er atNorths tomt er utledet, ikke " +
      "dokumentert. Tidligere stod anlegget på parkens adresse, Havnavegen 73, sammen med Green " +
      "Mountain Gismarvik. Bygg 1–4 er lagret som struktur på dette funnet, ikke som egne anlegg.",
    kilder: [
      {
        source_name: "DataCenterMap: atNorth NOR01, Haugaland Business Park",
        source_url: "https://www.datacentermap.com/norway/aksdal/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør atNorth, adresse Havnavegen 73, 5570 Aksdal.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Green Mountain Gismarvik",
    description:
      "Green Mountain signerte i april 2021 en opsjon på 50 dekar i Haugaland Business Park, i samme " +
      "næringspark som atNorths NOR01. Ingen byggestart er dokumentert, og anlegget står ikke på Green " +
      "Mountains egen anleggsliste. 300 MW og 100 000 m² finnes bare i bransjekataloger.",
    municipality: "Tysvær",
    postal_code: "5570",
    city: "Aksdal",
    latitude: 59.3154,
    longitude: 5.42391,
    verification_status: "investigated_not_confirmed",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "high",
    why_interesting:
      "En opsjon på datasentertomt i samme næringspark som atNorths 120–350 MW-prosjekt. Blir den utløst, " +
      "samles to store kraftuttak i én park i Tysvær.",
    notes:
      "Kvalitetsrunde 2026-09-30: undersøkt, ikke bekreftet. Eneste dokumenterte steg er en " +
      "opsjon på 50 dekar fra april 2021. Gismarvik mangler på Green Mountains anleggsliste og i " +
      "pressearkivet 2023–2026, og har ikke eget selskap i Brønnøysund. Næringsparken omtaler " +
      "atNorth som første store etablering, og parkens kart har bare én datasentersone. Opsjonen " +
      "er trolig sovende eller bortfalt. Koordinaten er et referansepunkt i næringsparken, ikke " +
      "en tomt. Runde 7 (2026-10-01): Siste omtale som aktiv lokasjon er fra november 2023 (Radio " +
      "Rjukan: 300 MW, oppstart 12 MW). Ingen senere kilde. Status er fortsatt ukjent; opsjonen " +
      "er ikke satt som bortfalt uten bekreftelse.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Mountain Gismarvik",
        source_url: "https://www.datacentermap.com/norway/aksdal/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Green Mountain, adresse Havnavegen 73, 5570 Aksdal.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Green Horizon Norway 3 «Heimdal», Kvernaland",
    description:
      "Planlagt campus på 48 MW med fire bygg på Orstadvegen 140/162. Fire katalogoppføringer — " +
      "campus, DC1, DC2 og DC4 — er ett fysisk anlegg.",
    municipality: "Klepp",
    address: "Orstadvegen 140",
    postal_code: "4353",
    city: "Kvernaland",
    latitude: 58.79302,
    longitude: 5.71154,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "En 48 MW-campus i et jordbruks- og industriområde på Jæren, i en kommune uten annen tung " +
      "digital infrastruktur.",
    notes:
      "DataCenterMap fører anlegget under markedet «Bryne», men Kvernaland ligger i Klepp kommune. " +
      "Kommunen er satt fra geokodet adresse.",
    kilder: [
      {
        source_name:
          "DataCenterMap: Green Horizon Norway 3 «Heimdal», Kvernaland",
        source_url: "https://www.datacentermap.com/norway/bryne/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Green Horizon, adresse Orstadvegen 140, 4353 Kvernaland.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Green Horizon «Vidar», Kvernaland",
    description:
      "Planlagt Green Horizon-anlegg oppført på Plogfabrikkvegen 8 på Kvernaland i Klepp, ca. 1 " +
      "km fra Heimdal. Green Horizons egen portefølje viser et eget anlegg på 8 MW med " +
      "tilgjengelighet fra andre kvartal 2028, og Statnett har en egen reservasjon på 8 MW ved " +
      "Fagrafjell på selskapet. Adressen bygger bare på DataCenterMap.",
    municipality: "Klepp",
    address: "Plogfabrikkvegen 8",
    postal_code: "4353",
    city: "Kvernaland",
    latitude: 58.78333,
    longitude: 5.70576,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Et mellomstort anlegg på Jæren, i samme område som Green Horizons større campus.",
    notes:
      "Runde 3 (2026-09-30): status satt til ukjent. Kan være Green Horizons Norway 2 (8 MW " +
      "reservert ved Fagrafjell på selskapsnivå), men koblingen er ikke dokumentert. Ikke samme " +
      "anlegg som Heimdal. Runde 7 (2026-10-01): status ukjent → planlagt. Green Horizons " +
      "portefølje (greenbox.no) viser et anlegg på 8 MW og et på 48 MW som separate anlegg, og " +
      "Statnett har to separate saker (24/01601, 8 MW, og 24/01503, 48 MW), begge på Green " +
      "Horizon AS. At «Vidar» er 8 MW-anlegget er utledet av MW-tallene. Reservasjonen står på " +
      "selskapet og er ikke ført som sikret kraft. Koordinaten er omtrentlig.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Horizon «Vidar», Kvernaland",
        source_url: "https://www.datacentermap.com/norway/bryne/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Green Horizon, adresse Plogfabrikkvegen 8, 4353 Kvernaland.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: ["Green Horizon Norway 1, Dysjaland"],
    title: "Green Horizon Norway 1, Kviamarka",
    description:
      "Planlagt datasenter på 36 MW i Kviamarka næringsområde mellom Nærbø og Varhaug i Hå, i " +
      "kjelleren på Miljøgartneriets utvidelse. Prosjektselskapet er Green Horizon Kviamarka AS. " +
      "Reguleringen ble godkjent i juni 2026, og drift er varslet i andre halvår 2027.",
    municipality: "Hå",
    address: "Næringsvegen 20",
    postal_code: "4365",
    city: "Nærbø",
    latitude: 58.63831,
    longitude: 5.6252,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et datasenter koblet til et gartneri, der overskuddsvarmen kan brukes i veksthus – i et " +
      "landbruksområde på Jæren.",
    notes:
      "Runde 3 (2026-09-30): ny tittel og kommune; anlegget lå feil som «Dysjaland» i Sola. " +
      "Koordinaten er omtrentlig (adressepunktet til Miljøgartneriet, Næringsvegen 13), fordi " +
      "Næringsvegen 20 ikke finnes i Kartverket. Statnett-reservasjonen på 36 MW ved Bjerkreim står " +
      "på Green Horizon AS, ikke anlegget, og er ikke ført som sikret kraft. «Bjerkreim» er " +
      "transformatorstasjonen, ikke et eget anlegg.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Horizon Norway 1, Dysjaland",
        source_url: "https://www.datacentermap.com/norway/stavanger/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Green Horizon, adresse Næringsvegen 20, 4365 Dysjaland.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "GreenBox-datasenter ved Wiig Gartneri, Orre",
    description:
      "Planlagt lite datasenter på rundt 1 500 m² ved Wiig Gartneri på Orre i Klepp, med ca. 4 MW " +
      "i første fase. Overskuddsvarmen skal brukes i veksthusene. Utbygger er Green Horizon AS " +
      "(GreenBox). Klepp kommune ga dispensasjon og rammetillatelse i november 2023; byggestart " +
      "eller drift er ikke dokumentert.",
    municipality: "Klepp",
    postal_code: "4343",
    city: "Orre",
    latitude: 58.71912,
    longitude: 5.54218,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et datasenter i jordbruksområde ved et av landets største gartnerier, med varmegjenbruk. " +
      "Kommunen ga dispensasjon mot skepsis fra Statsforvalteren og fylkeskommunen.",
    notes:
      "Opprettet i runde 8 (2026-10-01) fra leadet «GreenBox Orre / Wiig Gartneri». Alias: Green " +
      "Horizon Odin (katalog). Anlegget er bekreftet av Statsforvalterens dispensasjonssak " +
      "2023/8656 (Klepp 39/59, «datalagringssenter tilknyttet Wiig Gartneri») med Klepp kommunes " +
      "vedtak 17.11.2023. Koordinaten er Kartverkets punkt for teig 39/59 (tomt). Vikvegen 147 er " +
      "gartneriets adresse og er ikke brukt. En rammetillatelse faller bort etter tre år hvis " +
      "arbeidet ikke er satt i gang, altså rundt november 2026. Eget anlegg, ikke Vidar, Heimdal " +
      "eller Norway 1 (Kviamarka, ca. 10 km unna).",
    public_candidate: false,
    kilder: [
      {
        source_name: "eInnsyn: Statsforvaltaren i Rogaland sak 2023/8656 – Dispensasjon Klepp 39/59 Vikvegen 147, datalagringssenter tilknyttet Wiig Gartneri",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01j76hpedbepfrs5yttjmm36bx",
        publisher: "Statsforvaltaren i Rogaland (via eInnsyn)",
        source_type: "regulation",
        source_date: "2023-11-17",
        primary_source: true,
        excerpt_or_summary:
          "Saksmappe 2023/8656: dispensasjon for oppføring av datalagringssenter tilknyttet Wiig " +
          "Gartneri, Klepp 39/59, Vikvegen 147. Høring juli–aug. 2023. Kopi av melding om vedtak fra " +
          "Klepp kommune 2023-11-17. Bekrefter godkjent prosjekt og tomt, ikke at bygget er reist.",
      },
      {
        source_name: "Kartverket eiendom-API: Klepp 39/59",
        source_url: "https://api.kartverket.no/eiendom/v1/geokoding?kommunenummer=1120&gardsnummer=39&bruksnummer=59&omrade=false",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-01",
        primary_source: true,
        excerpt_or_summary:
          "Matrikkelenhet 1120-39/59 har hovedteig med punkt 58.71912, 5.54218 og en mindre teig ved " +
          "58.71867, 5.53496. Vikvegen 147 ligger på 39/16. Bekrefter eiendom og kommune (Klepp), " +
          "ikke anlegget.",
      },
      {
        source_name: "NTB Kommunikasjon: Et av landets største gartneri går sammen med nytt datasenterselskap",
        source_url: "https://kommunikasjon.ntb.no/pressemelding/17973375/et-av-landets-storste-gartneri-gar-sammen-med-nytt-datasenterselskap-for-gjenbruk-av-energi-og-reduksjon-av-c02?publisherId=17848550&lang=no",
        publisher: "Wiig Gartneri / Green Horizon",
        source_type: "web",
        source_date: "2023-06-12",
        primary_source: true,
        excerpt_or_summary:
          "Pressemelding: Green Horizon planlegger å bygge et GreenBox-datasenter ved Wiig Gartneri " +
          "på Orre. Overskuddsvarmen går til veksthuset, med et mål om å kutte 3 000 tonn CO2. " +
          "Byggestart høsten 2023, ferdig høsten 2024. Ingen MW oppgitt.",
      },
      {
        source_name: "Enhetsregisteret: Hå Datasenter Eiendom AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/935495504",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-01",
        primary_source: true,
        excerpt_or_summary:
          "Org.nr 935495504, stiftet 2025-05-02 (tidl. NFH 250521 AS), eiendomsutvikling, Vikvegen " +
          "147, 4343 Orre (Klepp). Bekrefter bare selskapet. Ingen kobling til Green Horizon eller " +
          "til noe anlegg.",
      },
      {
        source_name: "Enhetsregisteret: Wiig Gartneri AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/980414795",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-01",
        primary_source: true,
        excerpt_or_summary:
          "Wiig Gartneri AS, org.nr 980414795, Vikvegen 147, Klepp. Bekrefter selskap og adresse, " +
          "ikke datasenteret.",
      },
      {
        source_name: "Green Horizon: Data Centers in Southwestern Norway",
        source_url: "https://greenhorizon.no/data-centers/",
        publisher: "Green Horizon AS",
        source_type: "web",
        source_date: "2026-10-01",
        primary_source: true,
        excerpt_or_summary:
          "Nettstedet (2026) viser Norway 1 36 MW, Norway 2 12 MW (4 MW i konseptdesign + 8 MW fra " +
          "2028) og Norway 3 48 MW. Orre/Wiig nevnes ikke, og det er ingen adresser.",
      },
      {
        source_name: "Green Horizon (greenbox.no): Data Centers",
        source_url: "https://greenbox.no/data-centers/",
        publisher: "Green Horizon AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Porteføljen viser DC1 4 MW Tier 3, tilgjengelig Q3 2026, uten sted. Den kan være " +
          "Orre-anlegget, men det er ikke dokumentert. Siden er udatert.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Green Mountain SVG1-Rennesøy",
    description:
      "Fjellanlegg ved fjorden på Rennesøy, Green Mountains eldste anlegg, markedsført som et av " +
      "verdens grønneste datasentre.",
    municipality: "Stavanger",
    address: "Hodneveien 260",
    postal_code: "4150",
    city: "Rennesøy",
    latitude: 59.06854,
    longitude: 5.75803,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et datasenter inne i fjell, med fjordkjøling — den norske anleggstypen som skiller seg mest " +
      "fra alt annet.",
    notes:
      "PeeringDB oppgir Hodneveien 240, DataCenterMap 260. Koordinaten er nr. 260, som lot seg " +
      "geokode. Avviket er ikke oppklart.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Mountain SVG1-Rennesøy",
        source_url: "https://www.datacentermap.com/norway/stavanger/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Green Mountain, adresse Hodneveien 260, 4150 Rennesøy.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Green Mountain Jørpeland",
    description:
      "Green Mountain planla datasenter på det tidligere stålverksområdet på Jørpeland, men skrinla " +
      "planene i mars 2026. Planprogrammet var vedtatt i 2024.",
    municipality: "Strand",
    address: "Stålverksvegen 51",
    postal_code: "4100",
    city: "Jørpeland",
    latitude: 59.01823,
    longitude: 6.03708,
    verification_status: "partially_verified",
    operational_status: "historical",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Gjenbruk av et nedlagt industriområde til datasenter — en tydelig indikator på hvor bransjen " +
      "leter etter tomter med kraft og nett fra før.",
    notes:
      "Runde 2 (2026-09-30): status satt til historisk etter at Green Mountain skrinla planene " +
      "13.03.2026 (NRK). 30 MW for første bygg og 40 MW Lnett-reservasjon er historiske tall og " +
      "ikke strukturert. Kommunen er Strand, ikke Stavanger, som markedsnavnet antyder.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Mountain Jørpeland",
        source_url: "https://www.datacentermap.com/norway/stavanger/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Green Mountain, adresse Stålverksvegen 51, 4100 Jørpeland.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Microsoft Sandnes",
    description:
      "Planlagt datasenter på 25 MW på Kvål i Ganddal. Microsoft Datacenter Norway AS kjøpte tomta " +
      "(64 mål) i 2026 og bygger selv. Ingen byggestart eller åpningsdato er oppgitt.",
    municipality: "Sandnes",
    address: "Kvålkroken",
    postal_code: "4323",
    city: "Sandnes",
    latitude: 58.81713,
    longitude: 5.72007,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "En hyperskala-aktør som bygger fysisk i Norge. Microsofts norske kontoradresse i Oslo er ikke " +
      "et anlegg — dette er det.",
    notes:
      "25 MW kommer fra reguleringsplanen (plan-ID 202311), gjentatt i presse. Microsofts pressemelding " +
      "30.06.2026 bekrefter anlegget, men ikke byggestart — status satt til planlagt i datasenter-" +
      "enrichment runde 1 (2026-09-30). Ikke samme anlegg som Azure-regionen Norway West hos Green " +
      "Mountain på Rennesøy.",
    kilder: [
      {
        source_name: "DataCenterMap: Microsoft Sandnes",
        source_url: "https://www.datacentermap.com/norway/stavanger/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Microsoft, adresse Kvålkroken, 4323 Sandnes.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Kitebrook Leirdøla, Gaupne",
    description:
      "Planlagt campus på 100 MW for AI og HPC i Gaupne, på vannkraft og oppgitt som " +
      "aggregatfri — driftssikkerheten skal komme fra kraftnettet, ikke fra dieselaggregater.",
    municipality: "Luster",
    latitude: 61.47056,
    longitude: 7.25171,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "100 MW AI-kapasitet i en kommune med 5 000 innbyggere. Aggregatfri drift er uvanlig og " +
      "forutsetter svært god nettkapasitet.",
    notes:
      "Runde 2 (2026-09-30): koordinaten er flyttet fra Bluefjords' adresse (Jostedalsvegen 530) " +
      "til et omtrentlig punkt ved Leirdøla bru, ved kraftstasjonen og transformatorstasjonen tomta " +
      "grenser til. Bluefjords/Compute Nordic er et eget prosjekt. Netteier er Sygnir AS, ikke " +
      "Luster Energi.",
    kilder: [
      {
        source_name: "DataCenterMap: Kitebrook Leirdøla, Gaupne",
        source_url: "https://www.datacentermap.com/norway/gaupne/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Kitebrook, adresse Jostedalsvegen, 6868 Gaupne.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Gaupne Datapark, Gaupnegrandane",
    description:
      "Planlagt datasenter på Gaupnegrandane i Gaupne, utviklet av Sognekraft gjennom Sogn " +
      "Utvikling og prosjektselskapet Gaupne Datapark AS. Tomta er over 55 mål, og Sognekraft " +
      "oppgir mulig kapasitet på opptil 120 MW. Kommunens reguleringsplan for området er ute på " +
      "andre gangs høring.",
    municipality: "Luster",
    city: "Gaupne",
    latitude: 61.40031,
    longitude: 7.29575,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et kraftselskap som selv utvikler datasenter i egen kraftkommune, i samme dalføre som " +
      "Kitebrook Leirdøla og Bluefjords.",
    notes:
      "Opprettet i runde 3 (2026-09-30). Statnett har 120 MW reservert ved Leirdøla TRA med " +
      "sluttkunde «Gaupne Utvikling AS». At dette er Gaupne Datapark AS er ikke verifisert i " +
      "Brønnøysund, så tallet er ikke ført som sikret kraft. Koordinaten er Kartverkets " +
      "stedsnavnpunkt for Gaupnegrandane, ikke tomta.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Statnett: liste over reservasjoner (forbruk)",
        source_url: "https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/#reservasjoner",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Sak 24/01783 (ELB2930): Leirdøla (LEX) TRA, kunde Sygnir AS, sluttkunde Gaupne Utvikling " +
          "AS, datasenter, 120 MW, planlagt 30.12.2028. Samme stasjon: 23/01051 Kitebrook " +
          "Infrastructure AS 100 MW.",
      },
      {
        source_name: "Sogn Utvikling: 120 MW hyperscale datasenter i Gaupne",
        source_url: "https://www.sognutvikling.no/gaupnegrandane-prosjektside",
        publisher: "Sogn Utvikling AS (Sognekraft)",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Gaupnegrandane: regulert og opparbeidd industritomt på over 55 mål, opptil 120 MW. Teknisk " +
          "forprosjekt er gjennomført og detaljplan pågår. Nettilknytning er søkt, med " +
          "tilknytningspunkt i Fondøla.",
      },
      {
        source_name: "Hyperscale datasenter i Gaupne?",
        source_url: "https://www.sognutvikling.no/nyheiter/datasenter-gaupne",
        publisher: "Sogn Utvikling AS (Sognekraft)",
        source_type: "web",
        source_date: "2026-03-25",
        primary_source: true,
        excerpt_or_summary:
          "Konsernsjef Terje Bakke Nævdal la fram foreløpige planer for om lag 55 mål på " +
          "Gaupnegrandane. 120 MW nettkapasitet er reservert. Dialog med flere mulige brukere. " +
          "Investeringer på flere titalls milliarder. Tidlig fase.",
      },
      {
        source_name: "Sogn Utvikling: datasenter",
        source_url: "https://www.sognutvikling.no/datasenter",
        publisher: "Sogn Utvikling AS (Sognekraft)",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Prosjektoversikt: 120 MW datasenter i Gaupne og 210 MW på Vangsnes (kraft fra 2032).",
      },
      {
        source_name: "Enhetsregisteret: Gaupne Datapark AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/927936526",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "927936526, Vik, stiftet 01.09.2021, adresse Røysavegen 1 (Sognekraft). Formål er " +
          "næringsutvikling på egne eiendommer. Styreleder Terje Bakke Nævdal, daglig leder Bjørn Ole " +
          "Ellertsen.",
      },
      {
        source_name: "Reguleringsplan Gaupnegrandane",
        source_url: "https://www.luster.kommune.no/nyheiter/reguleringsplan-gaupnegrandane.12643.aspx",
        publisher: "Luster kommune",
        source_type: "regulation",
        source_date: "2025-10-28",
        primary_source: true,
        excerpt_or_summary:
          "Detaljregulering Gaupnegrandane (planID 2021005) lagt ut på 2. gangs høring av plan- og " +
          "forvaltningsutvalget 28.10.2025, med frist 09.03.2026. Formålet er nye næringsarealer.",
      },
      {
        source_name: "Kartverket stedsnavn: Gaupnegrandane",
        source_url: "https://ws.geonorge.no/stedsnavn/v1/navn",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Stedsnavnet Gaupnegrandane (industriområde) har punktet 61.40031, 7.29575 (EUREF89).",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: ["Bluefjords og Compute Nordic, Gaupne"],
    title: "Bluefjords Gaupne",
    description:
      "Datasenter i Gaupne drevet av Bluefjords AS siden 2015, med colocation og kryptoutvinning. " +
      "Compute Nordic markedsfører kapasitet på samme adresse. Bluefjords la i april 2026 fram " +
      "planinitiativ for et nytt bygg på felt BN2 i samme planområde.",
    municipality: "Luster",
    address: "Jostedalsvegen 530",
    postal_code: "6868",
    city: "Gaupne",
    latitude: 61.44092,
    longitude: 7.25008,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Løser et av de ustedfestede kryptoanleggene, og viser samtidig mønsteret: anleggene ligger i " +
      "kraftkommuner med breekjøling, ikke i byene.",
    notes:
      "Runde 3 (2026-09-30): ny tittel; tidligere «Bluefjords og Compute Nordic, Gaupne». Compute " +
      "Nordic har ikke eget bygg eller norsk selskap og er ikke strukturert som part. Kryptoandelen " +
      "oppgis ulikt: 14 % (Nkom-data i basen), 30 % (Altinget) og «opp mot ein tredjedel» (NRK). 15 " +
      "MW i drift kommer fra presse.",
    kilder: [
      {
        source_name: "DataCenterMap: Bluefjords og Compute Nordic, Gaupne",
        source_url: "https://www.datacentermap.com/norway/gaupne/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Bluefjords / Compute Nordic, adresse Jostedalsvegen 530, 6868 Gaupne.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Nscale Fauske",
    description:
      "Planlagt AI-datasenter på den gamle travbanetomta i Fauske, kjøpt av Aker Nscale i 2025. Tomta har " +
      "13 MW nettilknytning; mer krever ny kapasitet fra Statnett. Mål om åpning i 2027, men ingen " +
      "dokumentert byggestart. Oppgitt til rundt 1 000 arbeidsplasser i byggefasen og 100–150 varige.",
    municipality: "Fauske",
    postal_code: "8200",
    city: "Fauske",
    latitude: 67.27587,
    longitude: 15.41365,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et AI-anlegg i Nordland med et sysselsettingsomfang som betyr noe for en kommune på 10 000 " +
      "innbyggere. Byggefasen alene er en stor lokal sak.",
    notes:
      "Bluebite GmbH har også Fauske-adresse i Nkom-registeret, men er et annet selskap og er ikke " +
      "stedfestet. Ikke bland dem. Nscale Drift AS er Nkom-registrert, men driver Glomfjord-anlegget i " +
      "Meløy — ikke knyttet til Fauske. Status satt til planlagt i datasenter-enrichment runde 1 " +
      "(2026-09-30): ingen kilde dokumenterer byggestart.",
    kilder: [
      {
        source_name: "DataCenterMap: Nscale Fauske",
        source_url: "https://www.datacentermap.com/norway/fauske/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Nscale, adresse Follaveien, 8200 Fauske.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Nscale Glomfjord",
    description:
      "AI- og GPU-datasenter i Glomfjord industripark, drevet av Nscale. Anlegget startet som " +
      "Hydrokrafts kryptoutvinningssenter i 2021, ble kjøpt av Arkon Energy i 2022 og fikk " +
      "Nscale-navn i 2023. Nscale oppgir 30 MW i drift og utvidelse til 60 MW. Bygge- og " +
      "anleggsarbeid er meldt til Arbeidstilsynet fram til mars 2027.",
    municipality: "Meløy",
    address: "Sam Eydes vei 47",
    postal_code: "8160",
    city: "Glomfjord",
    latitude: 66.81369,
    longitude: 13.93316,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av få AI-datasentre i drift i Nord-Norge, med 40 MW tilknyttet hos Statnett og en " +
      "utvidelse under arbeid.",
    notes:
      "Opprettet i runde 8 (2026-10-01) etter spor fra Miljødirektoratets sak 2025/969. Aliaser: " +
      "Hydrokraft Glomfjord, Arkon Energy Glomfjord. Anlegget er bekreftet av Nscales egen side " +
      "og Statsforvalteren i Nordlands sak 2025/452 om datasenter i Glomfjord. Koordinaten er " +
      "Kartverkets adressepunkt for Sam Eydes vei 47 (46/4, festenr. 10), som er både selskaps- " +
      "og anleggsadresse. Den tidligere Norwegian Crystals-bygningen skal også tas i bruk, men er " +
      "ikke stedfestet. Eget anlegg, ikke Nscale Fauske eller Narvik. Runde 9 (2026-10-02): " +
      "rettelse – i Yaras kø var det Intrahouse Data Centers AS som fikk 15 MW (tildelt på " +
      "vilkår) og ACDC Glomfjord AS som hadde 30 MW (bare betinget reservert); runde 8 hadde " +
      "byttet om tallene. Intrahouse/ACDC gjaldt et eget bygg (Likeretterbygget) og er ikke del " +
      "av dette anlegget. Begge selskapene ble tvangsoppløst 09.06.2026, bygget er ikke " +
      "stedfestet, og de er beholdt som lead og avvist, ikke opprettet som egne punkter. Runde 10 " +
      "(2026-10-02): alias «SiC-bygget» (tidligere SiC Processing). Hydrokraft og Arkon er " +
      "tidligere operatører av samme bygg. Den tidligere Norwegian Crystals-fabrikken er " +
      "stedfestet til Sam Eydes vei 26 (46/4, festenr. 12), ca. 240 m nord, og er omtalt som " +
      "utvidelse her, ikke som eget punkt. Kryptovault Glomfjord (annonsert 2018 og lagt på is " +
      "samme år) er avvist som eget anlegg. Intrahouse/Likeretterbygget er fortsatt lead uten " +
      "entydig bygningspunkt. Net Zero Compute AS oppgir drift i Glomfjord fra april 2026 i et " +
      "bygg som ikke er stedfestet, og er lead. Runde 11 (2026-10-02): et vedlegg til Nscales " +
      "børsprospekt hos SEC (låneavtale med Macquarie) definerer «Glomfjord Data Centre» som " +
      "datasenteret Nscale Glomfjord AS driver på Sam Eydes vei 47. Nscale Drift II AS har en " +
      "colocation-avtale der og en skytjenesteavtale fra 15.05.2025 med Spring (SG) Pte. Ltd. om " +
      "GPU-ene; Spring er ført som kunde. Pressen omtaler Spring som et ByteDance-selskap, men " +
      "det framgår ikke av avtalen. Net Zero Compute og Intrahouse/Likeretterbygget er fortsatt " +
      "leads uten stedfestet bygg.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Glomfjord AI Data Centre",
        source_url: "https://www.nscale.com/product/glomfjord",
        publisher: "Nscale",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Nscale beskriver AI-datasenteret i Glomfjord: 30 MW i drift, utvidbart til 60 MW, fornybar " +
          "vannkraft, adiabatisk kjøling, overskuddsvarme til lokalt svømmebasseng.",
      },
      {
        source_name: "Nscale and InfraPartners announce partnership to build 60MW AI data centre in Glomfjord, Norway",
        source_url: "https://www.nscale.com/press-releases/nscale-and-infrapartners-announce-partnership-to-build-60mw-ai-data-centre-in-glomfjord-norway",
        publisher: "Nscale",
        source_type: "web",
        source_date: "2025-03-25",
        primary_source: true,
        excerpt_or_summary:
          "Nscale og InfraPartners utvider eksisterende 30 MW-anlegg i Glomfjord industripark til 60 " +
          "MW med prefabrikkerte, væskekjølte moduler. Mål: i drift Q2 2025.",
      },
      {
        source_name: "Statnett – statistikk om tilknytningssaker (tilknyttet og reservert)",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Svartisen KRA/TRA, Arva AS, sluttkunde «Nscale», Datasenter: tilknyttet 30 MW (21/00179, " +
          "2022-06-26) og 10 MW (22/00665, 2025-01-29); reservert 30 MW (22/00665/ELB2208, " +
          "2025-10-02, planlagt 2027-06-29).",
      },
      {
        source_name: "Enhetsregisteret – Nscale Glomfjord AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/924469188",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Org.nr 924469188, Sam Eydes vei 47, Meløy. Formål datasentervirksomhet og utleie av fast " +
          "eiendom. Tidligere navn: Hydrokraft Eiendom AS og Hydrokraft Glomfjord AS (til " +
          "22.09.2023). Bekrefter selskapet, ikke anlegget.",
      },
      {
        source_name: "Enhetsregisteret – Nscale Drift AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/828605062",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Org.nr 828605062, tidl. Hydrokraft Drift AS. Formål salg av datasentertjenester, 70 " +
          "ansatte, underenhet avd. Glomfjord på Sam Eydes vei 47. Bekrefter selskapet, ikke " +
          "anlegget.",
      },
      {
        source_name: "Enhetsregisteret – Nscale AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/921760310",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Org.nr 921760310, tidl. Hydrokraft AS (2018–2023). Formål drift og service av datasenter, " +
          "eiendomsutleie og krafthandel. Bekrefter selskapshistorikken, ikke anlegget.",
      },
      {
        source_name: "Enhetsregisteret – Nscale Glomfjord II AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/937180217",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Org.nr 937180217, stiftet februar 2026 (tidl. NFH 260210 AS), Sam Eydes vei 47. Formål " +
          "datavirksomhet og eiendomsutleie. Kobling til en konkret utbyggingsfase er ikke " +
          "dokumentert.",
      },
      {
        source_name: "Kartverket adressesøk – Sam Eydes vei 47, Meløy",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?sok=Sam%20Eydes%20vei%2047&kommunenummer=1837&utkoordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2023-03-01",
        primary_source: true,
        excerpt_or_summary:
          "Adressepunkt 66,81369 N / 13,93316 Ø, gnr/bnr 46/4, festenr. 10, 8160 Glomfjord; " +
          "stedfesting ikke verifisert. Bekrefter adressen, ikke anlegget.",
      },
      {
        source_name: "Statsforvalteren i Nordland – sak 2025/452 Utslipp – Meløy – datasenter i Glomfjord – Nscale Glomfjord AS",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01jhszhfexfmm847kcvd1mcwrt",
        publisher: "Statsforvalteren i Nordland (eInnsyn)",
        source_type: "regulation",
        source_date: "2025-01-15",
        primary_source: true,
        excerpt_or_summary:
          "Forurensningssak for datasenteret: vurdering av søknadsplikt for utslipp av oppvarmet " +
          "sjøvann fra kjøleanlegg (2025), vannforsyning fra Hydrodammen og vurdering av " +
          "utslippstillatelse (juli 2026).",
      },
      {
        source_name: "Miljødirektoratet – sak 2025/969 Vurdering av kvoteplikt – datasenter i Glomfjord",
        source_url: "https://api.einnsyn.no/journalpost/jp_01kkwhpdm8ep4a55exq57x89xk",
        publisher: "Miljødirektoratet (eInnsyn)",
        source_type: "regulation",
        source_date: "2026-03-10",
        primary_source: true,
        excerpt_or_summary:
          "Inngående dokument fra Nscale Drift AS i samlesaken «Vurdering av kvoteplikt for anlegg». " +
          "Innholdet er skjermet; bekrefter bare at kvoteplikt for datasenteret i Glomfjord vurderes.",
      },
      {
        source_name: "Arbeidstilsynet – forhåndsmelding bygge-/anleggsarbeid Sam Eydes vei 47",
        source_url: "https://api.einnsyn.no/journalpost/jp_01m21ks5hkefx9shc9kxvhp2cf",
        publisher: "Arbeidstilsynet (eInnsyn)",
        source_type: "regulation",
        source_date: "2026-09-03",
        primary_source: true,
        excerpt_or_summary:
          "Forhåndsmelding fra Nscale Glomfjord AS om bygge-/anleggsarbeid på Sam Eydes vei 47 for " +
          "03.09.2026–01.03.2027 (tidligere melding for 24.03–08.10.2026). Viser pågående " +
          "byggearbeid.",
      },
      {
        source_name: "DSB – nytt høyspenningsanlegg Nscale Glomfjord AS",
        source_url: "https://api.einnsyn.no/journalpost/jp_01kcj4ky64efmrk48xmsgd31p2",
        publisher: "DSB (eInnsyn)",
        source_type: "regulation",
        source_date: "2025-11-26",
        primary_source: true,
        excerpt_or_summary:
          "Melding fra Nscale Glomfjord AS om nytt høyspenningsanlegg (DSB-sak 2025/13115). Tidligere " +
          "overtok Hydrokraft Glomfjord AS driftsansvar for høyspenningsanlegg i 2023.",
      },
      {
        source_name: "Energiklagenemnda – klage over vedtak om brudd på tilknytningsplikten og nøytralitetskravene (Yara Norge)",
        source_url: "https://www.klagenemndssekretariatet.no/energiklagenemnda/energiklagenemnda-har-behandlet-klage-over-vedtak-om-brudd-pa-tilknytningsplikten-og-kravene-til-noytral-og-ikke-diskriminerende-opptreden-etter-nem-forskriften",
        publisher: "Klagenemndssekretariatet",
        source_type: "regulation",
        source_date: "2024-07-02",
        primary_source: true,
        excerpt_or_summary:
          "Hydrokraft Glomfjord (nå Nscale Glomfjord AS) klaget på at Yara som områdekonsesjonær " +
          "tildelte 15 MW på vilkår til Intrahouse Data Centers og reserverte 30 MW til ACDC " +
          "Glomfjord i strid med køen. Nemnda opprettholdt i hovedsak RMEs vedtak.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Kitebrook Børdalen",
    description:
      "Planlagt datasentercampus i Børdalen i Samnanger, utviklet av Kitebrook gjennom " +
      "prosjektselskapet KB DC Børdalen AS. Kitebrook oppgir 100 MW anleggslast og ca. 82,5 MW IT i " +
      "modulære haller. Reguleringen ble vedtatt i 2019, og 100 MW står i Statnetts kø.",
    municipality: "Samnanger",
    postal_code: "5650",
    city: "Tysse",
    latitude: 60.40302,
    longitude: 5.842,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Enda en 100 MW AI-campus fra samme aktør, i et lite tettsted på Vestlandet.",
    notes:
      "Runde 3 (2026-09-30): kommunen er rettet fra Kvam til Samnanger (postnummer 5650 Tysse). " +
      "Koordinaten er omtrentlig, ca. 600 m nord for Samnanger transformatorstasjon; tomta er ikke " +
      "stedfestet. 100 MW i kø er ikke ført som sikret kraft. Runde 4: Krefter AS (927511983, nå " +
      "Ugna Properties AS) hadde et eget planinitiativ nord for Samnanger transformatorstasjon i " +
      "2022, som ble frarådet. Det er et annet selskap og ingen del av dette prosjektet.",
    kilder: [
      {
        source_name: "DataCenterMap: Kitebrook Børdalen",
        source_url: "https://www.datacentermap.com/norway/bergen/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Kitebrook, adresse Fv133, 5650 Børdalen.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Kitebrook Matre, Masfjorden",
    description:
      "Planlagt KI- og HPC-datasenter på regulert industriareal i Matre i Masfjorden, utviklet av " +
      "Kitebrook. Første fase er 30 MW, og full utbygging er 100 MW med om lag 82,5 MW IT-last i " +
      "tre datahaller. Områdeplanen for Matre endres for å gi plass til trafo- og pumpestasjon, " +
      "med Kitebrook som tiltakshaver. Prosjektselskapet KB IFS Matre AS står i Statnetts kø med " +
      "70 MW ved Haugsvær.",
    municipality: "Masfjorden",
    city: "Matre",
    latitude: 60.8745,
    longitude: 5.5825,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Kitebrook kaller Matre flaggskipet sitt: et campus på 100 MW ved kraftverksklyngen i " +
      "Matre, med aktiv plansak og kjøling med fjordvann.",
    notes:
      "Opprettet i runde 7 (2026-10-01) fra Mongstad-/Nordhordland-researchen. Anlegget er " +
      "bekreftet av Masfjorden kommunes plandokumenter (ROS for endring av Områdeplan for Matre, " +
      "planID 463420200001). Koordinaten er omtrentlig, et punkt i Matre innenfor planområdet " +
      "(ca. 161 daa); bygg og tomt er ikke stedfestet nærmere. Statnett-reservasjonen på 30 MW " +
      "(21/00206) står på «Regn / Kitebrook», ikke på prosjektselskapet, og er derfor ikke ført " +
      "som sikret kraft. Kitebrook er utvikler; operatøren er ikke dokumentert. Eget anlegg, ikke " +
      "Kitebrook Børdalen eller Leirdøla.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Masfjorden kommune: ROS-analyse, reguleringsendring Områdeplan for Matre",
        source_url: "https://aimblob.blob.core.windows.net/aimfiles/fbe14975-258f-4cbd-af75-a15fd467fdd0.pdf",
        publisher: "Masfjorden kommune (plankonsulent ABO Plan & Arkitektur)",
        source_type: "regulation",
        source_date: "2026-04-29",
        primary_source: true,
        excerpt_or_summary:
          "Planendring for Områdeplan for Matre (planID 463420200001, saksnr. 20/234) med Kitebrook " +
          "som tiltakshavar. Endringa skal gje plass til datasenter med trafostasjon og pumpestasjon " +
          "for kjøling. Planområdet er om lag 161 daa. Stadfestar at det er planlagt eit datasenter " +
          "på tomta.",
      },
      {
        source_name: "Kost-nytteanalyse: Overskuddsvarme fra datasenter i Matre",
        source_url: "https://aimblob.blob.core.windows.net/aimfiles/486e8dbd-968c-4574-b3da-0de54e0e291d.pdf",
        publisher: "Masfjorden kommune (dokumentarkiv)",
        source_type: "document",
        source_date: "2026-04-21",
        primary_source: true,
        excerpt_or_summary:
          "Tiltakshavar er Kitebrook Energy Norway. Planen er tre datahallar på tidlegare " +
          "industriområde i Matre og fjordvatn frå Matresvågen til kjøling. IT-effekten er 27,5, 55 " +
          "og 82,5 MW, og tilført effekt aukar frå om lag 40 til om lag 100 MVA. " +
          "Havforskingsinstituttet er vurdert som mottakar av varme.",
      },
      {
        source_name: "Kitebrook: Matre Data Center Campus",
        source_url: "https://www.kitebrook.com/kitebrook-infra/matre/",
        publisher: "Kitebrook",
        source_type: "web",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Kitebrook oppgjev 100 MW ved full utbygging, om lag 82,5 MW IT og første fase på 30 MW. " +
          "Første straum kjem mid-2027. Anlegget ligg ved ein 300/132/22 kV-stasjon med fjordkjøling " +
          "og GBUS utan generatorar, og er retta mot KI og HPC.",
      },
      {
        source_name: "Statnett: statistikk om tilknytningssaker (Haugsvær TRA)",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Reservasjon 21/00206 (ELB737): Haugsvær TRA, BKK, Regn / Kitebrook, datasenter, 30 MW, " +
          "ønskt 2027-03-31. Kø 25/02560 (ELB517): KB IFS Matre AS, datasenter, 70 MW, moden " +
          "2026-05-06, ønskt 2027-07-01.",
      },
      {
        source_name: "Brønnøysundregistra: KB IFS Matre AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/925012602",
        publisher: "Brønnøysundregistra",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Stifta 02.03.2020 og registrert i Bergen. Føremålet er databehandling og datalagring. " +
          "Registeret stadfestar selskapet, ikkje anlegget.",
      },
      {
        source_name: "Kartverket adressesøk: Matre, Masfjorden",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?kommunenummer=4634&sok=Matre",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Adressepunkt «Matre» i kommune 4634 Masfjorden, rundt 60.872–60.877 N og 5.570–5.585 Ø. " +
          "Punkta er brukte til å plassere eit omtrentleg punkt. Kjelda stadfestar ikkje anlegget.",
      },
      {
        source_name: "Masfjorden kommune: Arbeid på Matre",
        source_url: "https://masfjorden.aim.prokom.no/nyhet/arbeid-paa-matre",
        publisher: "Masfjorden kommune",
        source_type: "web",
        source_date: "2025-05-05",
        primary_source: true,
        excerpt_or_summary:
          "Kommunen varsla at Kitebrook AS skulle gjere grunnundersøkingar i det regulerte " +
          "industriområdet i Matre 5. mai–4. juli 2025. Innhaldet er lese via søkjeutdrag, fordi sida " +
          "ikkje vart attgjeven fullt ut. Datoen er startdatoen for arbeidet.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "ASP Dalekvam",
    description:
      "Asp Data Center planlegger AI-rettet datasenter i den tidligere Dale-fabrikken i Dalekvam. " +
      "Første fase er 20 MW med levering i Q4 2027, og ASP oppgir 300 MW som langsiktig potensial. " +
      "Vaksdal kommunestyre ga dispensasjon 24.09.2026.",
    municipality: "Vaksdal",
    address: "Fabrikkvegen",
    postal_code: "5722",
    city: "Dalekvam",
    latitude: 60.5895,
    longitude: 5.82503,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Konvertering av en nedlagt fabrikk til AI-datasenter, i en kommune med 4 000 innbyggere. Det " +
      "er mønsteret bransjen følger: kraft og nett finnes fra før på gamle industritomter.",
    notes:
      "DataCenterMap fører anlegget under markedet «Bergen», men Dalekvam ligger i Vaksdal " +
      "kommune. Kommunen er satt fra geokodet adresse. Runde 10 (2026-10-02): Statnett-sak " +
      "23/01416 (Dale TRA, sluttkunde «Dale Fabrikker», 20 MW reservert 11.12.2023) er nå kilde " +
      "for sikret kraft. 10 MW til ASP Eiendom AS (26/03066) står i kø og er ikke ført.",
    kilder: [
      {
        source_name: "DataCenterMap: ASP Dalekvam",
        source_url: "https://www.datacentermap.com/norway/bergen/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør ASP Datacenter, adresse Fabrikkvegen, 5722 Dalekvam.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "ASP K11, Kanalvegen 11 (Forus)",
    description:
      "Colocation-datasenter på Forus, eid og drevet av Forus Industry Arena AS i Asp Data " +
      "Center-gruppen. Anlegget hadde 5 MW i drift ved utgangen av 2025 og er utsolgt. Nscale " +
      "Drift AS kjøper datasentertjenester her. En ny avtale på 6 MW har levering i tredje " +
      "kvartal 2027.",
    municipality: "Sola",
    address: "Kanalvegen 11",
    postal_code: "4033",
    city: "Stavanger",
    latitude: 58.89775,
    longitude: 5.68636,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Nscales GPU-kapasitet i Stavanger-regionen står i et leid anlegg midt i Forus " +
      "næringsområde, og anlegget utvides.",
    notes:
      "Opprettet i runde 9 (2026-10-02) fra leadet «Nscale Drift, avdeling Sola». Aliaser: Asp " +
      "K11, Forus Industry Arena, Nscale Stavanger. Anlegget er bekreftet av Asp Data Centers " +
      "prospekt (09.07.2025) og kvartalsrapport. Postadressen er 4033 Stavanger, men bygget " +
      "ligger i Sola kommune (gnr 35 bnr 360). Koordinaten er Kartverkets adressepunkt. Eget " +
      "anlegg, ikke ASP Dalekvam. Runde 10 (2026-10-02): i drift siden slutten av 2024. Asps " +
      "årsrapport 2024 oppgir at K11 er tildelt 8 MW ekstra nettkapasitet, som samsvarer med " +
      "Statnett-reservasjon 24/01721 til ASP Eiendom AS; de 8 MW er ført som sikret kraft. De " +
      "øvrige ASP-radene ved Bærheim TRA (3 MW reservert, 8 MW i kø) er på konsernnivå og er ikke " +
      "ført. ASP M12 i Midtgårdveien 12 er et eget anlegg.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Asp Data Center AS: Base Prospectus 09.07.2025",
        source_url: "https://cdn.prod.website-files.com/662f5637963f1693e3306556/686e32e3d5523d438b00de8f_Base%20Prospectus%2009072025%20-%20Asp%20Data%20Center%20AS%20-%20Final%20with%20Annexes.pdf",
        publisher: "Asp Data Center AS",
        source_type: "document",
        source_date: "2025-07-09",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter anlegget: Forus Industry Arena AS eier og driver datasenter på 5 MW (utsolgt) på " +
          "Kanalvegen 11. Risikoavsnitt 1.1.11 bekrefter avtale der Nscale Drift AS kjøper " +
          "datasentertjenester fra Forus Industry Arena AS.",
      },
      {
        source_name: "Asp Data Center: Q4 2025 financial statements and review",
        source_url: "https://live.euronext.com/sites/default/files/company_press_releases/attachments_oslo/2026/02/28/667191_ASP%20Data%20Center%202025%20fourth%20quarter%20financial%20statements%20and%20review.pdf",
        publisher: "Asp Data Center AS (Euronext Oslo)",
        source_type: "document",
        source_date: "2026-02-28",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter at K11-utvidelsen ble fullført og driftsklar i Q4 2025, med 5 MW installert og " +
          "kontraktsfestet IT-last. Gruppen består av Forus Industry Arena AS og Midtgårdveien 12 AS, " +
          "eid av Asp Eiendom AS.",
      },
      {
        source_name: "Asp Data Center: signs 6 MW agreement at K11",
        source_url: "https://www.aspdatacenter.no/news/asp-data-center-signs-6-mw-agreement-at-k11",
        publisher: "Asp Data Center AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Ny avtale om 6 MW IT-kapasitet ved K11 med et ikke navngitt internasjonalt selskap, " +
          "levering Q3 2027. Ordrereserve nær NOK 2 mrd.",
      },
      {
        source_name: "Asp Data Center – nettside",
        source_url: "https://www.aspdatacenter.no/",
        publisher: "Asp Data Center AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "K11 og M12 står som «in operation – fully occupied»; utviklingsprosjekter i Dale, Suldal " +
          "og Pori.",
      },
      {
        source_name: "Brønnøysundregistrene: Nscale Drift AS avd Stavanger (underenhet 935214238)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/underenheter/935214238",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2025-03-15",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter Nscale-avdeling med 6 ansatte på Kanalvegen 11 (Sola) fra 13.03.2025. Bekrefter " +
          "ikke anlegget i seg selv.",
      },
      {
        source_name: "Brønnøysundregistrene: Forus Industry Arena AS (985557098)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/985557098",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter selskapet: formål investering i datasentervirksomhet, c/o Asp DC AS. Bekrefter " +
          "ikke anlegget.",
      },
      {
        source_name: "Brønnøysundregistrene: Asp Data Center AS (931764225)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/931764225",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter morselskapet (stiftet 2023, formål investering i datasentervirksomhet).",
      },
      {
        source_name: "Kartverket adresse-API: Kanalvegen 11, Sola",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?sok=Kanalvegen%2011&kommunenummer=1124",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter adressepunktet (58.89775, 5.68636), Sola kommune, gnr/bnr 35/360. Bekrefter ikke " +
          "anlegget.",
      },
      {
        source_name: "Nscale: AI Infrastructure (datasenteroversikt)",
        source_url: "https://www.nscale.com/ai-infrastructure",
        publisher: "Nscale",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Nscale fører «Stavanger, Norway» som partnerdrevet datasenter i drift for AI-trening og " +
          "inferens, uten adresse eller MW.",
      },
      {
        source_name: "Statnett – statistikk om tilknytningssaker (Bærheim TRA)",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Reservert 3 MW (24/01501) og 8 MW (24/01721) til ASP Eiendom AS og 8 MW i kø (24/01798) " +
          "for ASP Data Center AS ved Bærheim TRA via Lnett. Konsernnivå, ikke koblet til K11.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "ASP Suldal, Tysingvatnet",
    description:
      "Asp Data Center planlegger et nytt datasenter på en 56 daa næringstomt ved Tysingvatnet " +
      "nær Jelsa. Suldal kommunestyre vedtok i desember 2025 enstemmig å selge tomten til Asp " +
      "Eiendom AS for 40 millioner kroner, med forbud mot kryptoutvinning og tilbakekjøpsrett. " +
      "Asp oppgir driftsklart anlegg i første kvartal 2029, og prosjektet er omtalt med et " +
      "effektbehov på 25 MW.",
    municipality: "Suldal",
    latitude: 59.39936,
    longitude: 6.15376,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Norges største kraftkommune selger selv tomt til datasenter for å få verdiskaping av " +
      "kraften lokalt. Dagens 66 kV-linje rekker ikke til 25 MW, så prosjektet avhenger av ny " +
      "linje og ny trafo.",
    notes:
      "Aliaser: Asp Suldal, ASP DC Suldal, Datasenter ved Tysingvatnet. Opprettet i runde 10 fra " +
      "leadet «ASP Suldal». Koordinaten er omtrentlig: Kartverkets teigpunkt for gnr 155 bnr 8 i " +
      "det regulerte næringsområdet ved Tysingvatnet (plan-ID 201801); nøyaktig avgrensning av " +
      "den solgte tomten er ikke kontrollert. Det finnes to vann med navnet Tysingvatnet i Suldal " +
      "– dette er det sørlige, ved fv. 46 Indre Ryfylkevegen. Ingen ASP-rad i Statnetts lister " +
      "for Suldal-området. Prosjektselskapet ASP DC Suldal AS (936901557) er registrert, men det " +
      "er ikke dokumentert at det eier tomten.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Asp Data Center: to build sustainable data center in Suldal",
        source_url: "https://www.aspdatacenter.no/news/data-center-in-suldal",
        publisher: "Asp Data Center AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter prosjektet: kommunestyret i Suldal vedtok enstemmig salg av næringstomt ved " +
          "Tysingvatnet til Asp Eiendom AS; 56 daa; kryptoforbud og tilbakekjøpsrett; " +
          "detaljplanlegging starter. Publisert januar 2026.",
      },
      {
        source_name: "Asp Data Center – nettside",
        source_url: "https://www.aspdatacenter.no/",
        publisher: "Asp Data Center AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Lokasjonsliste: «Suldal (Norway) Greenfield – RFS Q1 2029». Konserntall: 14 MW kontrahert, " +
          "67 MW «power secured», 403 MW utvidelseskapasitet – ikke fordelt per anlegg.",
      },
      {
        source_name: "Suldal kommune (arealplaner.no): Næringsområde ved Tysingvatnet, plan-ID 201801",
        source_url: "https://www.arealplaner.no/suldal1134/arealplaner/117",
        publisher: "Suldal kommune",
        source_type: "regulation",
        source_date: "2020-06-23",
        primary_source: true,
        excerpt_or_summary:
          "Detaljregulering for næringsområde ved Tysingvatnet, gnr 155 bnr 8 m.fl., endelig vedtatt " +
          "23.06.2020. Bekrefter det regulerte området, ikke datasenterprosjektet.",
      },
      {
        source_name: "Kartverket: eiendomsgeokoding 1134-155/8",
        source_url: "https://ws.geonorge.no/eiendom/v1/geokoding?kommunenummer=1134&gardsnummer=155&bruksnummer=8&omrade=false",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Teigpunkt for gnr 155 bnr 8 i Suldal (59,39936 N, 6,15376 Ø). Bekrefter eiendommens " +
          "beliggenhet, ikke prosjektet.",
      },
      {
        source_name: "Brønnøysundregistrene: ASP DC Suldal AS (936901557)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/936901557",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter prosjektselskapet: stiftet 06.10.2025, registrert 05.01.2026, formål investering " +
          "i datasentervirksomhet, c/o Asp DC AS i Stavanger. Bekrefter ikke anlegg eller " +
          "tomteeierskap.",
      },
      {
        source_name: "Statnett: statistikk om tilknytningssaker",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Ingen rad med ASP som sluttkunde i Suldal-området (Nesflaten/Suldal KRA, Saurdal KRA/TRA, " +
          "Sauda TRA) per 2026-09-30.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "ASP M12, Midtgårdveien 12 (Forus)",
    description:
      "Datasenter på 1 500 m² ved Gandsfjorden på Forus, eid av Midtgårdveien 12 AS i Asp Data " +
      "Center-gruppen. Anlegget har om lag 3 MW IT-kapasitet og sjøvannskjøling. Det ble kjøpt " +
      "fra Seabrokers Eiendom i november 2024 og kom i drift for en ikke navngitt AI-kunde 6. " +
      "mars 2026.",
    municipality: "Stavanger",
    address: "Midtgårdveien 12",
    postal_code: "4031",
    city: "Stavanger",
    latitude: 58.89699,
    longitude: 5.74926,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Et eldre bedriftsdatasenter med egen sjøvannspumpestasjon er tatt i bruk på nytt for " +
      "AI-last. Anlegget ligger i et vanlig næringsområde og er det andre Asp-anlegget i drift i " +
      "Stavanger-regionen.",
    notes:
      "Aliaser: M12, Asp M12, Midtgårdveien 12 AS. Opprettet i runde 10 fra leadet «ASP M12 " +
      "Stavanger». Bygget er fra 1997/2000 og ble ifølge Asp opprinnelig bygget og drevet som " +
      "datasenter av et norsk, multinasjonalt energiselskap (ikke navngitt). Kunden er omtalt som " +
      "«AI enterprise customer» og er ikke navngitt, så ingen kunde er ført. Statnett-radene for " +
      "ASP ved Bærheim TRA er på konsernnivå og er ikke ført som sikret kraft her. Eget anlegg, " +
      "ikke ASP K11 (Kanalvegen 11, Sola).",
    public_candidate: false,
    kilder: [
      {
        source_name: "Asp Data Center AS: Annual Report 2025",
        source_url: "https://cdn.prod.website-files.com/662f5637963f1693e3306556/69f395fdb1d553c6b561837c_Asp%20Data%20Center%20AS%20Annual%20Report%202025.pdf",
        publisher: "Asp Data Center AS",
        source_type: "document",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter anlegget: Midtgårdveien 12 er et 1 500 m² datasenter i Stavanger med ca. 3 MW IT " +
          "og fjordvannskjøling, eid av Midtgårdveien 12 AS, kjøpt fra Seabrokers Eiendom AS " +
          "15.11.2024. Opprinnelig bygget og drevet av et norsk energiselskap.",
      },
      {
        source_name: "Asp Data Center AS: Financial statement 2Q 2026",
        source_url: "https://cdn.prod.website-files.com/662f5637963f1693e3306556/6a957cb1b120ee180506d043_Asp%20Data%20Center%20AS%20Financial%20statement%202Q%202026.pdf",
        publisher: "Asp Data Center AS",
        source_type: "document",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter drift: M12 i drift fra 06.03.2026 under langsiktig avtale med en AI-kunde om 3 " +
          "MW IT; fase 2-opptrapping fra 22.06.2026; egen sjøvannspumpestasjon.",
      },
      {
        source_name: "Asp Data Center AS: Base Prospectus 09.07.2025",
        source_url: "https://cdn.prod.website-files.com/662f5637963f1693e3306556/686e32e3d5523d438b00de8f_Base%20Prospectus%2009072025%20-%20Asp%20Data%20Center%20AS%20-%20Final%20with%20Annexes.pdf",
        publisher: "Asp Data Center AS",
        source_type: "document",
        source_date: "2025-07-09",
        primary_source: true,
        excerpt_or_summary:
          "Midtgårdveien 12 AS (917 385 734) eier et datasenter med kapasitet 4 megawatt, ledig per " +
          "juli 2025. M12 overtatt 15.11.2024. De to datasentrene eies og drives av garantistene.",
      },
      {
        source_name: "Asp Data Center: Q4 2025 financial statements and review",
        source_url: "https://live.euronext.com/sites/default/files/company_press_releases/attachments_oslo/2026/02/28/667191_ASP%20Data%20Center%202025%20fourth%20quarter%20financial%20statements%20and%20review.pdf",
        publisher: "Asp Data Center AS (Euronext Oslo)",
        source_type: "document",
        source_date: "2026-02-28",
        primary_source: true,
        excerpt_or_summary:
          "Etter årsskiftet: ny langsiktig leieavtale med AI-kunde om ca. 3 MW IT på Midtgårdveien " +
          "12; inntekter fra mars 2026. Kunden er ikke navngitt.",
      },
      {
        source_name: "Asp Data Center AS: Financial Statements Q3 2025",
        source_url: "https://cdn.prod.website-files.com/662f5637963f1693e3306556/692992c8d988988b07f3e31e_Financial%20Statements%20Q3%202025.pdf",
        publisher: "Asp Data Center AS",
        source_type: "document",
        primary_source: true,
        excerpt_or_summary:
          "Midtgårdveien 12 sto tomt, men innredet som datasenter. Teknisk gjennomgang ferdig; " +
          "sjøvannskjøling; arbeid med å sikre mer nettkapasitet til M12.",
      },
      {
        source_name: "Asp Data Center – nettside",
        source_url: "https://www.aspdatacenter.no/",
        publisher: "Asp Data Center AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Lokasjonsliste: «M12 (Norway) In operation – fully occupied» og «K11 (Norway) In operation " +
          "– fully occupied»; Suldal, Dale og Pori som utviklingsprosjekter.",
      },
      {
        source_name: "Asp Data Center: Big news from Asp Data Center",
        source_url: "https://www.aspdatacenter.no/news/big-news-from-asp-data-center",
        publisher: "Asp Data Center AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Kunngjør kjøp av et 1 500 m² ferdig datasenter med fjordkjøling, aggregater og UPS; " +
          "kapasitet tilgjengelig for kunder fra desember 2024. Adressen er ikke nevnt.",
      },
      {
        source_name: "Brønnøysundregistrene: Midtgårdveien 12 AS (917385734)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/917385734",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter selskapet: stiftet 15.06.2016, formål investering i datasentervirksomhet, c/o " +
          "Asp DC AS i Stavanger. Bekrefter ikke anlegget.",
      },
      {
        source_name: "Kartverket: adressesøk Midtgårdveien 12",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?sok=Midtg%C3%A5rdveien%2012&kommunenummer=1103",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter adressen: Midtgårdveien 12, 4031 Stavanger, gnr 13 bnr 54, Stavanger kommune. " +
          "Bekrefter ikke datasenteret.",
      },
      {
        source_name: "Statnett: statistikk om tilknytningssaker",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Bærheim TRA: ASP Eiendom AS 3 MW og 8 MW reservert, ASP Data Center AS 8 MW i kø. Ingen " +
          "rad nevner M12 eller Midtgårdveien 12 AS.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: ["Datafjellet, Bønes"],
    title: "Datafjellet, Bergen (fjellhall – adresse ikke offentlig)",
    description:
      "Colocation-datasenter i fjellhall i Bergensområdet, drevet av Datafjellet AS, som er " +
      "Nkom-registrert. Selskapet holder anleggets adresse hemmelig. Selskapets egen nettside ble " +
      "oppdatert i 2026.",
    municipality: "Bergen",
    city: "Bergen",
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et fjellanlegg i Bergensområdet, den typen anlegg som er helt usynlig fra overflaten.",
    notes:
      "Kun katalogkilde pluss Nkom-registrering. Runde 10 (2026-10-02): adressen og kartpunktet " +
      "er fjernet. Det var selskapets forretningsadresse, ikke fjellhallen. Ny tittel (tidligere " +
      "«Datafjellet, Bønes»). Operatør og eier er Datafjellet AS (tidl. SBT Eiendom). Selskapet " +
      "oppgir to aggregater på 645 kVA; MW er ikke satt.",
    kilder: [
      {
        source_name: "DataCenterMap: Datafjellet, Bønes",
        source_url: "https://www.datacentermap.com/norway/bergen/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Datafjellet AS, adresse Gullstølsstien 258, 5153 Bønes.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "AVUR Casperkollen, Øvre Kråkenes 17",
    description:
      "Colocation- og driftsdatasenter i kontorbygget Casperkollen på Bønes, drevet av AVUR AS, " +
      "som også har hovedkontor og nettknutepunkt der. Bygget ble oppført i 1989 som kontorsenter " +
      "for IBM. AVUR oppgir to separate høyspentinnføringer, egen transformator på eiendommen, " +
      "UPS, dieselaggregat og fire fiberføringer. Størrelse og effekt er ikke oppgitt.",
    municipality: "Bergen",
    address: "Øvre Kråkenes 17",
    postal_code: "5152",
    city: "Bønes",
    latitude: 60.3405,
    longitude: 5.32716,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Et datasenter i et tidligere IBM-bygg midt i et boligområde på Bønes, og knutepunktet for " +
      "et eget fibernett med samtrafikk i Bergen (BIX).",
    notes:
      "Opprettet i runde 11 (2026-10-02). Aliaser: AVUR DC Bergen (ADC), Casperkollen datasenter, " +
      "AVUR Bergen. Ikke samme anlegg som Datafjellet (fjellhall, annen operatør), selv om " +
      "Datafjellets forretningsadresse ligger rundt 800 meter unna. Dagens AVUR AS ble stiftet i " +
      "2021; virksomheten het tidligere Intellit AS og Kokstad Data AS (startet 1992) og hadde " +
      "besøksadresse Kokstadvegen 29 så sent som i 2018. Når datahallen på Casperkollen ble tatt " +
      "i bruk, er ikke dokumentert. Bygget er på over 4600 m² og har også andre leietakere; " +
      "datasenteret er bare en del av det.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Avur – Data centre and colocation in Bergen (arkivert 12.04.2026)",
        source_url: "https://web.archive.org/web/20260412134201/https://avur.no/datasenter/?lang=en",
        publisher: "Avur AS (via Internet Archive)",
        source_type: "web",
        source_date: "2026-04-12",
        primary_source: true,
        excerpt_or_summary:
          "Operatørens datasenterside: AVUR driver Casperkollen, Øvre Kråkenes 17, opprinnelig bygget " +
          "for IBM. A/B-strøm, to høyspentkabler, egen transformator, UPS, dieselaggregat, " +
          "colocation. Bergen = hovedkontor og datasenter; Oslo m.fl. er PoP. Bekrefter anlegget.",
      },
      {
        source_name: "Avur – Colocation at Casperkollen (arkivert 12.04.2026)",
        source_url: "https://web.archive.org/web/20260412131415/https://avur.no/colocation/?lang=en",
        publisher: "Avur AS (via Internet Archive)",
        source_type: "web",
        source_date: "2026-04-12",
        primary_source: true,
        excerpt_or_summary:
          "Produktside: rackplass, dedikert rack, bur, remote hands og cross connect på Casperkollen; " +
          "presisjonskjøling, adgangskontroll, BIX-tilknytning. «Not an office building with a server " +
          "room». Oppgir ikke effekt.",
      },
      {
        source_name: "Avur – Kontakt (arkivert 12.04.2026)",
        source_url: "https://web.archive.org/web/20260412132049/https://avur.no/kontakt/",
        publisher: "Avur AS (via Internet Archive)",
        source_type: "web",
        source_date: "2026-04-12",
        primary_source: true,
        excerpt_or_summary:
          "Avur AS, Casperkollen, Øvre Kråkenes 17, 5152 Bønes, org.nr 928 077 993. Bekrefter " +
          "selskapets adresse.",
      },
      {
        source_name: "Enhetsregisteret: AVUR AS (928077993)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/928077993",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "AVUR AS, stiftet 01.08.2021, næringskode 61.100, forretningsadresse Casperkollen, Øvre " +
          "Kråkenes 17, 5152 Bønes; én underenhet (928275051) samme sted. Bekrefter selskap og " +
          "adresse, ikke anlegget.",
      },
      {
        source_name: "Kartverket adresse-API: Øvre Kråkenes 17",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?sok=%C3%98vre%20Kr%C3%A5kenes%2017&kommunenummer=4601",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Øvre Kråkenes 17, 5152 Bønes, Bergen (4601), gnr/bnr 16/50, punkt 60.34050, 5.32716. " +
          "Bekrefter adressen, ikke anlegget.",
      },
      {
        source_name: "Nkom, registrerte kommersielle datasenteroperatører",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "AVUR AS (928077993) står i listen, uten kryptoutvinning (oppdatert 02.10.2026). Bekrefter " +
          "operatørregistrering, ikke lokasjon eller størrelse.",
      },
      {
        source_name: "Miljødirektoratet 2025/969: Anmodning om opplysninger om anlegg tilhørende Avur AS",
        source_url: "https://api.einnsyn.no/journalpost/jp_01kjnxkzdwe68sqdwae6tfs83e",
        publisher: "Miljødirektoratet (eInnsyn)",
        source_type: "regulation",
        source_date: "2026-02-23",
        primary_source: true,
        excerpt_or_summary:
          "Utgående brev i sak «Vurdering av kvoteplikt for anlegg». Tittelen viser at direktoratet " +
          "ba AVUR om opplysninger om et anlegg. Dokumentet er ikke tilgjengelig i eInnsyn; innhold " +
          "og adresse er ikke lest.",
      },
      {
        source_name: "Miljødirektoratet 2025/969: Konklusjon anmodning om opplysninger – Avur AS",
        source_url: "https://api.einnsyn.no/journalpost/jp_01kn0dnr50ek2st4ekhf50btvy",
        publisher: "Miljødirektoratet (eInnsyn)",
        source_type: "regulation",
        source_date: "2026-03-24",
        primary_source: true,
        excerpt_or_summary:
          "Utgående konklusjonsbrev til Avur AS i kvotepliktsaken. Skjermet/ikke tilgjengelig; " +
          "utfallet er ikke kjent.",
      },
      {
        source_name: "Miljødirektoratet 2025/969: Anmodning om opplysninger om anlegg tilhørende Datafjellet AS",
        source_url: "https://api.einnsyn.no/journalpost/jp_01kjp0xhtzeakajawtaskadheh",
        publisher: "Miljødirektoratet (eInnsyn)",
        source_type: "regulation",
        source_date: "2026-02-23",
        primary_source: true,
        excerpt_or_summary:
          "Eget brev til Datafjellet AS samme dag som brevet til Avur AS. Brukt i dedup: direktoratet " +
          "behandler de to som separate operatører med hvert sitt anlegg. Dokumentet er ikke lest.",
      },
      {
        source_name: "Bergen byleksikon: Øvre Kråkenes",
        source_url: "https://www.bergenbyarkiv.no/bergenbyleksikon/arkiv/1425250",
        publisher: "Bergen Byarkiv",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "«Casperkollen kontorsenter IBM, oppført 1989 (ark. Arkitektkontoret Grieg)» på nr. 17. " +
          "Navn etter Johan Caspar Lange; Langes legat eier det utskilte området. Bekrefter byggets " +
          "opphav, ikke datasenteret.",
      },
      {
        source_name: "Casperkollen – kontorbygget",
        source_url: "https://casperkollen.no/",
        publisher: "Casperkollen (byggets nettside)",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Kontorbygg på over 4600 m², Øvre Kråkenes 17. Tilbyr leietakere serverplass «i datahall " +
          "utstyrt med nødstrøm og moderne kjøling». Avur vist blant logoene. Bekrefter datahall i " +
          "bygget.",
      },
      {
        source_name: "Enhetsregisteret: CASPERKOLLEN AS (987837756)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/987837756",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Eiendomsselskap stiftet 2005, næringskode 68.200, forretningsadresse Casperkollen, Øvre " +
          "Kråkenes 17. Bekrefter selskapet, ikke hjemmel til eiendommen.",
      },
      {
        source_name: "AVUR – Historie (arkivert 25.09.2018)",
        source_url: "https://web.archive.org/web/20180925222425/http://www.avur.no:80/om-oss/historie/",
        publisher: "AVUR (via Internet Archive)",
        source_type: "web",
        source_date: "2018-09-25",
        primary_source: true,
        excerpt_or_summary:
          "«AVUR ble startet som Kokstad Data AS i 1992»; navneskifte til Intellit i 2003 og senere " +
          "AVUR. Gir operatørhistorikk, ikke datasenterets adresse.",
      },
      {
        source_name: "AVUR – Kontakt (arkivert 25.09.2018)",
        source_url: "https://web.archive.org/web/20180925222435/http://www.avur.no:80/om-oss/kontakt/",
        publisher: "AVUR (via Internet Archive)",
        source_type: "web",
        source_date: "2018-09-25",
        primary_source: true,
        excerpt_or_summary:
          "Besøksadresse i 2018 var Kokstadvegen 29, 5257 Kokstad. Viser at hovedkontoret flyttet til " +
          "Casperkollen senere; sier ikke hvor datahallen lå i 2018.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: ["Arcem Bergen, Haukeland"],
    title: "Arcem Bergen, Langedalen",
    description:
      "Planlagt datasenter i Langedalen ved Arna transformatorstasjon i søndre Arna, utviklet av " +
      "Arcem gjennom Arcem Langedalen AS. Arcem søker inntil 130 MW nettkapasitet, men ingenting er " +
      "tildelt. Planinitiativet fra april 2026 har møtt motstand fra Bymiljøetaten og Statens " +
      "vegvesen.",
    municipality: "Bergen",
    postal_code: "5268",
    city: "Haukeland",
    latitude: 60.39432,
    longitude: 5.45573,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et stort planlagt anlegg i Bergen øst. Nærheten til transformatorstasjoner er akkurat det " +
      "kraftsporet vi leter etter.",
    notes:
      "Kvalitetsrunde 2026-09-30: koordinaten er omtrentlig, satt ved Arna transformatorstasjon " +
      "fordi tomta ikke er stedfestet i noen kilde. Tittelen «Haukeland» er beholdt for " +
      "gjenkjenning; prosjektet omtales som Langedalen/Arnatippen. 130 MW er søkt, ikke tildelt. " +
      "Runde 8 (2026-10-01): tittel endret fra «Arcem Bergen, Haukeland» til «Arcem Bergen, " +
      "Langedalen». Prosjektselskapet heter ARCEM LANGEDALEN AS (tidl. ARCEM DC 12 AS), og " +
      "planinitiativet gjelder Langedalen/Arnatippen i søndre Arna.",
    kilder: [
      {
        source_name: "DataCenterMap: Arcem Bergen, Haukeland",
        source_url: "https://www.datacentermap.com/norway/bergen/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Arcem, Inc., adresse Langedalen, 5268 Haukeland.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: [
      "ITsjefen NDC1, NDC2 og NDC4, Trondheim",
      "ITsjefen NDC2, NDC3 og NDC4, Trondheim",
    ],
    title: "ITsjefen NDC2, Brattørkaia 17B",
    description:
      "Colocation-datasenter drevet av ITsjefen AS (del av ECIT) i kontorbygget Brattørkaia 17B " +
      "på Brattøra i Trondheim. Operatøren oppgir drift siden 2008. Anlegget har primærkjøling i " +
      "lukket krets mot Trondheimsfjorden. Effekt og areal er ikke oppgitt.",
    municipality: "Trondheim",
    address: "Brattørkaia 17B",
    postal_code: "7010",
    city: "Trondheim",
    latitude: 63.43772,
    longitude: 10.3984,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    why_interesting:
      "Ett av tre aktive datasentre hos den største regionale colocation-aktøren i Trøndelag, " +
      "sjøvannskjølt og midt i Trondheim sentrum.",
    notes:
      "Primærkilde-runde 2026-09-30: tittelen er rettet fra «NDC1, NDC2 og NDC4» fordi ITsjefens " +
      "egen side lister NDC2, NDC3 og NDC4. NDC1 (Havnegata 9) er ikke nevnt, men heller ikke " +
      "bekreftet nedlagt; Havnegata 9 er forretningsadressen. Adressene per anlegg er ikke " +
      "primærbekreftet. Koordinaten er Brattørkaia 17B. Runde 8 (2026-10-01): ITsjefens egen side " +
      "bekrefter NDC4 i Tungavegen 30 med 2 MW kapasitet på over 600 m². Posten dekker tre bygg, " +
      "så MW er ikke satt. Anbefalt splitt i en senere runde: NDC2 (Brattørkaia 17B) og NDC4 " +
      "(Tungavegen 30); NDC3 har ingen offentlig adresse. Runde 9 (2026-10-02): samleposten er " +
      "splittet. Denne posten er nå NDC2 (Brattørkaia 17B); NDC4 i Tungavegen 30 er eget anlegg. " +
      "NDC står for «nethome datacenter», ITsjefens eget produktnavn. Operatøren skriver selv " +
      "«Brattørkaia 17»; bokstaven B kommer fra PeeringDB og DataCenterMap. NDC3 er et eget, " +
      "EMP-sikret anlegg uten offentlig adresse (ifølge operatøren over 5 km fra NDC1/NDC2) og er " +
      "beholdt som lead uten punkt. NDC1 i Pirsenteret (Havnegata 9, åpnet 2006) er borte fra " +
      "operatørens sider etter 2019; nedleggelse er ikke dokumentert, og det er beholdt som lead.",
    kilder: [
      {
        source_name: "DataCenterMap: ITsjefen NDC1, NDC2 og NDC4, Trondheim",
        source_url: "https://www.datacentermap.com/norway/trondheim/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør ITsjefen AS, adresse Brattørkaia 17B, 7010 Trondheim.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet mot Kartverkets adresseregister, med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "ITsjefen NDC4, Tungavegen 30",
    description:
      "Colocation-datasenter drevet av ITsjefen AS (del av ECIT) i 2. underetasje i næringsbygget " +
      "Tungavegen 30 på Tunga i Trondheim. Det er operatørens største anlegg, med over 600 m² og " +
      "oppgitt kapasitet på 2 MW. Anlegget ble tatt i bruk i 2016.",
    municipality: "Trondheim",
    address: "Tungavegen 30",
    postal_code: "7047",
    city: "Trondheim",
    latitude: 63.42597,
    longitude: 10.46837,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    why_interesting:
      "Det største datasenteret til den største regionale colocation-aktøren i Trøndelag, og det " +
      "eneste av ITsjefens anlegg med offentlig oppgitt effekt.",
    notes:
      "Splittet ut fra samleposten «ITsjefen NDC2, NDC3 og NDC4, Trondheim» i runde 9 " +
      "(2026-10-02). Eget bygg ca. 3,7 km øst for NDC2 på Brattørkaia. Anlegget er bekreftet av " +
      "ITsjefens egen side for NDC4. Åpningsåret 2016 er utledet av arkiverte operatørsider. " +
      "Operatøren skriver Tungaveien 30; offisiell adresse er Tungavegen 30 (gnr 15 bnr 19). " +
      "Bygget eies av Tunga Næringsbygg AS. NDC3 (uten offentlig adresse) er ikke dokumentert å " +
      "ligge her.",
    public_candidate: false,
    kilder: [
      {
        source_name: "ITsjefen (arkiv 2016): NDC4 – nyeste og største datasenter",
        source_url: "https://web.archive.org/web/20160927013910/http://www.itsjefen.no:80/datasenter-i-trondheim/datasenter-4-ndc4",
        publisher: "ITsjefen AS (via Internet Archive)",
        source_type: "web",
        source_date: "2016-09-27",
        primary_source: true,
        excerpt_or_summary:
          "September 2016: NDC4 omtalt som «vårt nyeste og største datasenter», Tungaveien 30, 2. " +
          "underetasje, ca. 450 m², to eksterne trafostasjoner eid av TrønderEnergi Nett. I januar " +
          "2016 var NDC3 fortsatt «det nyeste».",
      },
      {
        source_name: "ITsjefen (arkiv 2019): NDC4 – 600 m² datasenter",
        source_url: "https://web.archive.org/web/20190820014657/https://itsjefen.no/index.php/datasenter-ndc4",
        publisher: "ITsjefen AS (via Internet Archive)",
        source_type: "web",
        source_date: "2019-08-20",
        primary_source: true,
        excerpt_or_summary:
          "August 2019: NDC4 omtalt som 600 m² datasenter i Tungaveien 30, sertifisert TIA-942-A og " +
          "EN50600 i 2016. Viser utvidelse fra ca. 450 m² (2016) til 600 m².",
      },
      {
        source_name: "Koteng Eiendom: Tungavegen 30",
        source_url: "https://koteng.no/eiendommer/tungavegen-30/",
        publisher: "Koteng Eiendom AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Forvalterens side: Tungavegen 30 eies av Tunga Næringsbygg AS (931 154 141), kontorbygg " +
          "fra 1983 på 6 572 m², ny fasade 2022. Leietakerlisten nevner ikke ITsjefen eller " +
          "datasenter.",
      },
      {
        source_name: "Brønnøysund: TUNGA NÆRINGSBYGG AS (931154141)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/931154141",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "TUNGA NÆRINGSBYGG AS, stiftet 2023-03-17, næringskode 68.200 utleie av egen fast eiendom, " +
          "forretningsadresse Travbanevegen 2, Trondheim. Bekrefter selskapet, ikke anlegget.",
      },
      {
        source_name: "ITsjefen: Datasenter",
        source_url: "https://itsjefen.no/datasenter/",
        publisher: "ITsjefen AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Operatørens oversikt: tre datasentre i Trondheimsregionen, NDC4 er 600 m², flomsikkert med " +
          "kundesoner.",
      },
      {
        source_name: "Brønnøysund: ITSJEFEN AS (828105442)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/828105442",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "ITSJEFEN AS, org.nr 828105442, aktiv, forretningsadresse Havnegata 9, Trondheim. Bekrefter " +
          "selskapet, ikke anlegget.",
      },
      {
        source_name: "ECIT: ITsjefen AS",
        source_url: "https://www.ecit.com/no/kontorer/itsjefen-as/",
        publisher: "ECIT",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "ITsjefen er en del av ECIT. Nevner ikke enkeltdatasentre.",
      },
      {
        source_name: "Nkom, registrerte kommersielle datasenteroperatører",
        source_url: "https://nkom.no/datasenter/oversikt",
        publisher: "Nasjonal kommunikasjonsmyndighet",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "ITSJEFEN AS registrert som kommersiell datasenteroperatør. Registeret oppgir ikke " +
          "anleggsadresser.",
      },
      {
        source_name: "ITsjefen: NDC4",
        source_url: "https://itsjefen.no/datasenter/ndc4/",
        publisher: "ITsjefen AS",
        source_type: "web",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "NDC4: Tungaveien 30, 2. underetasje, 50 moh, utenfor flom-/rasområder. 600+ m², «2MW " +
          "kapasitet», Tier III/TIA-942A/ISO27001. Ytre/indre sone og kundesoner, " +
          "Telenor/Telia/GlobalConnect og TRDIX.",
      },
      {
        source_name: "Kartverket: Tungavegen 30, Trondheim",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?sok=Tungavegen%2030&kommunenummer=5001",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Tungavegen 30, 7047 Trondheim, gnr 15 bnr 19, punkt 63.42597, 10.46837. Bekrefter " +
          "adressen, ikke anlegget.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "note",
    title: "Dekningsstatus for den nasjonale datasenterkartleggingen",
    description:
      "Om lag 100 av 112 katalogoppføringer er åpnet og vurdert enkeltvis. De resterende tolv " +
      "ligger i små enkeltmarkeder og lot seg ikke åpne: DataCenterMap nådde grensen for gratis " +
      "sidevisninger.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    notes:
      "De gjenstående markedene er navngitt i det egne funnet om gratisgrensen. Elverum og Hamar er " +
      "dekket gjennom PeeringDB i stedet. Primærkilde-runde 2026-09-30: notatet beskriver vår egen " +
      "dekning av en katalog og har ingen ekstern primærkilde.",
    kilder: [
      {
        source_name: "DataCenterMap: markeder gjennomgått i denne runden",
        source_url: "https://www.datacentermap.com/norway/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Markedene Oslo (34), Stavanger (10), Bergen (8), Bryne (6), Aksdal (6), Trondheim (4), Gaupne (3), Fauske (1), Billingstad (1) og Namsskogan (1) er åpnet og gjennomgått oppføring for oppføring. Gjenstår: Kristiansand (4), Skien (4), Sandefjord (3), Halden (2), Husnes (2) og rundt 20 markeder med ett anlegg hver.",
      },
    ],
  },
  {
    category: "Kilder",
    item_type: "data_issue",
    title: "Markedsnavn er systematisk feil kommune i katalogen",
    description:
      "Ikke enkelttilfeller: i denne runden ga fire av de gjennomgåtte markedene feil " +
      "kommune hvis markedsnavnet var blitt brukt. Sammen med Tydal under «Ås» og " +
      "Billingstad som eget marked er dette et systematisk trekk, ikke en glipp.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    notes:
      "Kommune settes alltid fra geokodet adresse med postnummer, aldri fra markedsnavn.",
    kilder: [
      {
        source_name: "DataCenterMap: markedsnavn mot geokodet kommune",
        source_url: "https://www.datacentermap.com/norway/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Fire nye tilfeller der markedsnavnet ikke er kommunen: Kvernaland ligger i Klepp, ikke Time («Bryne»); Dalekvam i Vaksdal og Børdalen utenfor Bergen, begge ført under «Bergen»; Jørpeland i Strand, ført under «Stavanger».",
      },
    ],
  },

  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Stargate Norway / Nscale Narvik, Kvanndal",
    description:
      "AI-datasenter under bygging på Kvandal ved Bjerkvik, eid og utviklet av Nscale Norway AS og " +
      "driftet av Nordscale Operations AS (Nscale 51 %, Nordkraft 49 %). Første fase er 230 MW, og " +
      "Microsoft er kunde. Lansert som «Stargate Norway» med OpenAI i 2025, men OpenAI inngikk " +
      "aldri avtale. Utvidelse med 290 MW til 520 MW er en ambisjon uten nettreservasjon.",
    municipality: "Narvik",
    address: "Nordmoveien 301",
    postal_code: "8530",
    city: "Bjerkvik",
    latitude: 68.57838,
    longitude: 17.59023,
    verification_status: "partially_verified",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Det desidert største digitale infrastrukturprosjektet i Norge. 520 MW i full utbygging er mer " +
      "enn alle andre anlegg i dette datasettet til sammen, i en kommune med 22 000 innbyggere.",
    notes:
      "Kvalitetsrunde 2026-09-30: koordinaten er industribygget med igangsettingstillatelse på " +
      "gnr/bnr 10/742 (Nordmoveien 301), der Narvik kommune ga rammetillatelse til datasenter. " +
      "Koblingen bygg–datasenter er utledet fra matrikkelen. 230 MW er reservert hos Statnett for " +
      "netteier Nordkraft Industrinett, som har tildelt 130 MW til de to første byggene. 520 MW er " +
      "ikke sikret.",
    kilder: [
      {
        source_name: "DataCenterMap: Stargate Norway / Nscale Narvik, Kvanndal",
        source_url: "https://www.datacentermap.com/norway/narvik/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Nscale, OpenAI og Aker, adresse Kvanndal, 8530 Bjerkvik.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Google Skien",
    description:
      "Googles datasenter på Gromstul i Skien, eid av WS Computing AS. Byggetrinn 1 var under " +
      "idriftsettelse i august 2026, og trinn 2 har rammetillatelse. Statnett oppgir 240 MW for " +
      "Googles prosjekt ved Rød (120 MW tilknyttet og 120 MW reservert). Oppgitt investering i " +
      "første trinn er 600 millioner euro.",
    municipality: "Skien",
    address: "Gromstulvegen 82",
    postal_code: "3721",
    city: "Skien",
    latitude: 59.27012,
    longitude: 9.51852,
    verification_status: "partially_verified",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "En hyperskala-aktør som bygger fysisk i Norge. Investeringsbeløpet gjør det til et av de " +
      "største industriprosjektene i Telemark.",
    notes:
      "Kvalitetsrunde 2026-09-30: koordinaten er flyttet fra Skådalsvegen 361 (utenfor tomta) til " +
      "bygget med midlertidig brukstillatelse på teig 11/28, Gromstulvegen 82. 840 og 860 MW i " +
      "presse er søkt kapasitet og kø, ikke tildelt, og er ikke strukturert.",
    kilder: [
      {
        source_name: "DataCenterMap: Google Skien",
        source_url: "https://www.datacentermap.com/norway/skien/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Google, adresse Skådalsvegen, 3721 Skien.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Google Våler, Gylderåsen",
    description:
      "Planlagt hyperskala-datasenter fra Google på Gylderåsen i Våler, i et område på ca. 2000 " +
      "daa regulert til kraftkrevende industri (områderegulering vedtatt 2022). Googles norske " +
      "selskap WS Computing AS har 480 MW reservert hos Statnett ved Tegneby transformatorstasjon " +
      "i Vestby, med planlagt tilknytning 30.12.2030. Google har bekreftet planene, men " +
      "investeringsbeslutning er ikke tatt.",
    municipality: "Våler",
    latitude: 59.51015,
    longitude: 10.79239,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Googles andre norske datasenterprosjekt etter Skien, på et ferdig regulert storareal for " +
      "kraftkrevende industri. 480 MW er reservert til prosjektselskapet.",
    notes:
      "Lagt inn i datasenter-enrichment runde 2 (2026-09-30) fra Statnett-leadet «Tegneby 480 " +
      "MW». Området utvikles av KI Våler AS (eid av Våler kommune og Østfold Energi). Tomteavtale " +
      "mellom KI Våler og Google er ikke dokumentert. Koordinaten er Kartverkets stedsnavnpunkt " +
      "for Gylderåsen, ikke en tomt. Tegneby transformatorstasjon ligger i Vestby, ca. 3 km nord.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Statnett – forespørsler og reservasjon i nettet (reservasjonsliste)",
        source_url: "https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/#reservasjoner",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-06",
        primary_source: true,
        excerpt_or_summary:
          "Sak 24/01801 (ELB1461): Tegneby TRA, NO1, kunde og sluttkunde WS Computing AS, datasenter, " +
          "480 MW reservert 06.09.2026, planlagt tilknytning 30.12.2030.",
      },
      {
        source_name: "Google planlegger datasenter i Østfold",
        source_url: "https://www.nrk.no/ostfold/google-planlegger-datasenter-i-ostfold-1.17688296",
        publisher: "NRK",
        source_type: "news",
        source_date: "2025-12-11",
        excerpt_or_summary:
          "Google Norge bekrefter planer om datasenter på Gylderåsen i Våler; 480 MW søkt via WS " +
          "Computing AS. Ingen investeringsbeslutning. Kommunedirektøren anslår anleggsstart rundt " +
          "2030.",
      },
      {
        source_name: "Eventuell etablering av Google datasenter i Våler",
        source_url: "https://www.valer.kommune.no/aktuelt/eventuell-etablering-av-google-datasenter-i-v%C3%A5ler",
        publisher: "Våler kommune",
        source_type: "web",
        source_date: "2025-12-11",
        primary_source: true,
        excerpt_or_summary:
          "Kommunen omtaler at Google vurderer datasenter på Gylderåsen, at Googles utbyggingsselskap " +
          "har søkt Statnett om kraft, og historikken for området og KI Våler AS.",
      },
      {
        source_name: "Store datasenter – områderegulering Gylderåsen",
        source_url: "https://www.valer.kommune.no/kommunen-var/prosjekter/store-datasenter",
        publisher: "Våler kommune",
        source_type: "regulation",
        source_date: "2022-12-08",
        primary_source: true,
        excerpt_or_summary:
          "Områdereguleringsplan for Gylderåsen for kraftkrevende industri vedtatt av kommunestyret " +
          "8.12.2022; plandokumenter og høringsinnspill.",
      },
      {
        source_name: "Ny grønn industri – Gylderåsen",
        source_url: "https://www.ostfoldenergi.no/forretningsomrader/forretningsutvikling/nygronnindustri/",
        publisher: "Østfold Energi",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Gylderåsen-tomta er ca. 2000 mål, utvikles av KI Våler AS (Våler kommune og Østfold " +
          "Energi) og kan forsynes fra Tegneby transformatorstasjon ca. 3 km nord i Vestby.",
      },
      {
        source_name: "Enhetsregisteret – WS Computing AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/921658702",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "WS Computing AS (tidl. Wild Salmon Computing AS), org.nr 921658702, næring 63.100 " +
          "datainfrastruktur, postadresse Gromstulvegen 82 Skien.",
      },
      {
        source_name: "Kartverket stedsnavn – Gylderåsen",
        source_url: "https://ws.geonorge.no/stedsnavn/v1/navn?sok=Gylder%C3%A5sen&utkoordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Gylderåsen (ås), Våler kommune 3114, representasjonspunkt 59.51015 N, 10.79239 Ø.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Bredsand datasenter, Larkollveien 4",
    description:
      "Planlagt colocation-datasenter i et tidligere fabrikkbygg i Larkollveien 4 på " +
      "Bredsand/Dilling i Moss. Prosjektselskapet Larkollveien 4 AS, som eies av Bonum Eiendom, " +
      "er forslagsstiller for detaljreguleringen Plan 501, der oppstart ble kunngjort i juni " +
      "2026. Statnett har reservert 50 MW ved Tegneby til prosjektselskapet, og Arcem oppgir to " +
      "faser på 29 og 21 MW.",
    municipality: "Moss",
    address: "Larkollveien 4",
    postal_code: "1570",
    city: "Dilling",
    latitude: 59.40631,
    longitude: 10.69487,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et nytt datasenter i Østfold med Statnett-reservasjon på selve prosjektselskapet, tett på " +
      "et boligområde der planene har møtt sterk lokal kritikk.",
    notes:
      "Opprettet i runde 7 (2026-10-01) fra leadet «Arcem Moss / Larkollveien 4». Aliaser: Arcem " +
      "Moss, Plan 501. Anlegget er bekreftet av Moss kommunes kunngjøring av Plan 501. " +
      "Koordinaten er Kartverkets adressepunkt for Larkollveien 4 (gnr 167/100): tomt og " +
      "eksisterende bygg, ikke et prosjektert datasenterbygg. Arcem er utvikler og er ikke satt " +
      "som eier eller operatør. Ingen operatør eller kunde er kjent. Runde 8 (2026-10-01): " +
      "Storespeed markedsførte tidligere «DC 5/DC 6» ved Moss/Rygge, og en sekundær katalog " +
      "(datacenterHawk, ikke verifisert) knytter Storespeed-anlegget «Crow» til Larkollveien 4. " +
      "Storespeed er verken part i Plan 501 eller i Statnett-reservasjonen 24/01770, så det er " +
      "ikke slått sammen. Byggfaktas «Storespeed datacenter, Østfold» er beholdt som lead.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Kunngjøring: Oppstart av Plan 501 – detaljregulering for Bredsand datasenter",
        source_url: "https://www.moss.kommune.no/horinger-og-kunngjoringer/kunngjoring-oppstart-av-plan-501-detaljregulering-for-bredsand-datasenter.22062.aspx",
        publisher: "Moss kommune",
        source_type: "regulation",
        source_date: "2026-06-26",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om oppstart av detaljregulering for datasenter i Larkollveien 4 (Bredsand/Dilling), " +
          "ca. 53,8 daa. Forslagsstiller er Larkollveien 4 AS, plankonsulent Bonum Prosjekt AS. " +
          "Gjeldende plan M157 (industri) foreslås opphevet, KU er ikke påkrevd, merknadsfrist " +
          "17.08.2026.",
      },
      {
        source_name: "Statnett – statistikk om tilknytningssaker (reservasjonsliste forbruk, lastet 30.09.2026)",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Sak 24/01770 (ELB156) ved Tegneby TRA. Kunde Elvia AS, sluttkunde Larkollveien 4 AS, " +
          "datasenter. Reservert 28.08.2025, planlagt tilknytning 29.09.2027, 50 MW. Kølisten har " +
          "også 25/02068 (Bonum Prosjekt 113 AS, Tveiten TRA, 25 MW) og 25/02032 (Acrem DC 10 AS, " +
          "Ringerike TRA, 60 MW).",
      },
      {
        source_name: "Arcem – Projects (Moss)",
        source_url: "https://arcem.no/projects",
        publisher: "Arcem",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Arcem oppgir for Moss: 50 MW reservert kapasitet i to faser (29 MW + 21 MW), et tidligere " +
          "fabrikkbygg som bygges om til colocation-datasenter, og at prosjektet er i " +
          "reguleringsprosess. Galleriet viser også illustrasjoner fra blant annet Hvittingfoss, Gol " +
          "og Austrheim.",
      },
      {
        source_name: "Bonum Plans Billion-Kroner Data Center Investment in Moss",
        source_url: "https://media.arcem.no/bonum-plans-billion-kroner-data-center-investment-in-moss/",
        publisher: "Arcem",
        source_type: "web",
        source_date: "2026-02-27",
        primary_source: true,
        excerpt_or_summary:
          "Arcem gjengir en sak fra Estate Nyheter om at Bonum vil gjøre en milliardinvestering i " +
          "datasenter i Moss. Eiendommen ble kjøpt i 2019, og både bolig- og logistikkplaner førte " +
          "ikke fram.",
      },
      {
        source_name: "Bonum vil gjøre milliardinvestering i nytt datasenter",
        source_url: "https://media.bonum.no/bonum-vil-gjore-milliardinvestering-i-nytt-datasenter/",
        publisher: "Bonum",
        source_type: "web",
        source_date: "2026-02-27",
        excerpt_or_summary:
          "Bonum har industrieiendommen Larkollveien 4 (ca. 32 mål), kjøpt i 2019. Boligplaner ble " +
          "avvist av kommunen og logistikk fant ikke interesse. Nå planlegges datasenter.",
      },
      {
        source_name: "Enhetsregisteret: Larkollveien 4 AS (995317818)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/995317818",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter selskapet Larkollveien 4 AS: stiftet 2010, formål investering i fast eiendom, " +
          "næringskode utleie av egen eiendom, adresse Inkognitogata 8 i Oslo, ingen navnehistorikk. " +
          "Bekrefter ikke anlegget.",
      },
      {
        source_name: "Kartverket adresse-API: Larkollveien 4, Moss",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?sok=Larkollveien%204&kommunenummer=3103",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Bekrefter adressen Larkollveien 4, 1570 Dilling, Moss (3103), gnr 167 bnr 100, med " +
          "adressepunkt 59,40631 N / 10,69487 Ø. Bekrefter ikke anlegget.",
      },
      {
        source_name: "Kartverket kommuneinfo: punkt Larkollveien 4",
        source_url: "https://ws.geonorge.no/kommuneinfo/v1/punkt?nord=59.40631&ost=10.69487&koordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Punktet 59,40631/10,69487 ligger i Moss kommune (3103), Østfold.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "BW Frier Vest, Bamble",
    description:
      "Planlagt datasenter i Frier Vest industriområde, utviklet av BW Velora (BW Group). Inntil " +
      "250 MW ved full utbygging, uten besluttet fase. Lede har meldt at regionalnettet ikke har " +
      "kapasitet for store nye laster før ny Frier-stasjon er bygget.",
    municipality: "Bamble",
    postal_code: "3965",
    city: "Herre",
    latitude: 59.0985,
    longitude: 9.55013,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "250 MW i Grenland, i et industriområde som allerede har tung prosessindustri og kaianlegg.",
    notes:
      "Kvalitetsrunde 2026-09-30: koordinaten er flyttet fra Stathelle tettsted til Fløyåsen ved " +
      "Herre, stedfestet bare gjennom et debattinnlegg i Varden. Punktet er omtrentlig.",
    kilder: [
      {
        source_name: "DataCenterMap: BW Frier Vest, Bamble",
        source_url: "https://www.datacentermap.com/norway/skien/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør BW Velora, adresse Frier Vest næringspark, 3960 Stathelle.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Nscale Skien",
    description:
      "Planlagt datasenter på 96 MW i Skien, utviklet av Aker Nscale for AI-arbeidslast.",
    municipality: "Skien",
    city: "Skien",
    latitude: 59.2716,
    longitude: 9.5388,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Sammen med Google og BW Frier Vest gjør dette Grenland til et av de tyngste " +
      "datasenterområdene i landet.",
    notes:
      "Runde 2 (2026-09-30): Aker Nscale og Løvenskiold-Fossum Kraft Drift AS inngikk tomteavtale i " +
      "januar 2026, på tomta ved siden av Googles anlegg på Gromstul. Koordinaten er omtrentlig, " +
      "mellom Gromstul og Rød transformatorstasjon; tomta er ikke offentlig stedfestet. 96 MW står " +
      "i Statnetts kø, ikke reservert.",
    kilder: [
      {
        source_name: "DataCenterMap: Nscale Skien",
        source_url: "https://www.datacentermap.com/norway/skien/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Nscale / Aker, adresse Skien, 3721 Skien.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Bjorstaddalen datasentertomt, Skien",
    description:
      "Kommunal tomt på ca. 500 mål i Bjorstaddalen ved Bolvik, ved Statnetts Grenland " +
      "transformatorstasjon. Formannskapet i Skien behandlet i juni 2026 en opsjonsavtale om salg " +
      "til Løvenskiold-selskapet Grenland Data Center AS, med Nscale omtalt som partner. Tomta er " +
      "ikke regulert, og avtalen forutsetter regulering og krafttilgang.",
    municipality: "Skien",
    city: "Skien",
    latitude: 59.12628,
    longitude: 9.48198,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Et mulig stort datasenterprosjekt i Grenland, i tillegg til Google og Nscale på Gromstul. " +
      "Aktørene oppgir å ha søkt 576 MW, men ingenting er reservert.",
    notes:
      "Opprettet i runde 3 (2026-09-30) med lav sikkerhet. Grunnlag: opsjonen er registrert i " +
      "Skien kommunes postliste (sak 2026/21855) og omtalt i E24; Nscale er bare sitert i presse. " +
      "576 MW er søkt effekt, ikke kø eller reservasjon, og er ikke strukturert. Koordinaten er " +
      "representasjonspunktet for teig 235/57, som er større enn opsjonsarealet. Runde 7 " +
      "(2026-10-01): Skien kommune fører arealet «N26 Bolvik v/ Bjorstaddalen» som ikke avklart i " +
      "kommuneplanen, og Statnett har ingen sak for prosjektet ved Grenland TRA. Eget anlegg, " +
      "ikke Nscale Skien (Gromstul, ca. 16 km unna, Rød TRA).",
    public_candidate: false,
    kilder: [
      {
        source_name: "Skien kommune postjournal: innsynskrav om opsjonsavtale Bjorstaddalen/Nscale (sak 2026/21855)",
        source_url: "https://innsynpluss.onacos.no/skien/sok/#/?searchTerm=opsjonsavtale",
        publisher: "Skien kommune",
        source_type: "register",
        source_date: "2026-09-21",
        primary_source: true,
        excerpt_or_summary:
          "Journalført innsynssak 2026/21855 med tittel «opsjonsavtale for salg av kommunalt areal " +
          "ved Bjorstaddalen til Nscale, behandlet i formannskapet 22. juni 2026». Tittelen er " +
          "innsynskrevers formulering; selve saksframlegget er ikke publisert. Journalen har også " +
          "notat 2026/110418 fra Kilebygda lokalutvalg om tomtesalg og ny næring i Bjorstaddalen, som " +
          "ikke er publisert.",
      },
      {
        source_name: "Enhetsregisteret: GRENLAND DATA CENTER AS (937692145)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/937692145",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-07-06",
        primary_source: true,
        excerpt_or_summary:
          "Stiftet 28.04.2026, historisk navn NFH 260404 AS (til 06.07.2026). Formål: utvikle, bygge " +
          "og drifte datasentre. Fossumvegen 51, Skien. Daglig leder/styreleder Leopold Axel " +
          "Løvenskiold.",
      },
      {
        source_name: "Kartverket eiendom-API: teig 4003-235/57",
        source_url: "https://ws.geonorge.no/eiendom/v1/geokoding?kommunenummer=4003&gardsnummer=235&bruksnummer=57&utkoordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2025-03-14",
        primary_source: true,
        excerpt_or_summary:
          "Teigen 235/57 i Skien har representasjonspunkt 59,12628 N / 9,48198 Ø. Teigen strekker seg " +
          "omtrent fra 59,123 til 59,152 N, så den er langt større enn opsjonsarealet på 500 mål.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Tonstad DataPark, Sirdal",
    description:
      "Datasentercampus i Sirdal, overtatt av GreenScale. Oppgitt til 420 000 m² tomt og 300 MW " +
      "nettkapasitet.",
    municipality: "Sirdal",
    postal_code: "4440",
    city: "Tonstad",
    latitude: 58.67481,
    longitude: 6.74875,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "300 MW nettkapasitet i en kraftkommune med 1 800 innbyggere. Tomtestørrelsen alene gjør det " +
      "til en av de største næringsetableringene i Agder.",
    notes:
      "Runde 2 (2026-09-30): 300 MW er reservert hos Statnett (Ertsmyra, via Glitre Nett) med " +
      "Tonstad Datapark AS som sluttkunde. Koordinaten er GreenScales eget campuspunkt, ikke lenger " +
      "tettstedet Tonstad. Tomtearbeid startet i februar 2026, men reguleringsendringen er " +
      "påklaget.",
    kilder: [
      {
        source_name: "DataCenterMap: Tonstad DataPark, Sirdal",
        source_url: "https://www.datacentermap.com/norway/tonstad/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør GreenScale, adresse Tonstad, 4440 Tonstad.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Fyresdal Datacenter (Fossefall), Molandsmoen",
    description:
      "Lite datasenter på Molandsmoen industriområde i Fyresdal, etablert 2021–2022 med 5 MW " +
      "effektrettighet i distribusjonsnettet og først brukt til kryptoutvinning. Fossefall " +
      "inngikk i november 2025 avtale om å kjøpe eierselskapet Fyresdal Datacenter AS fra Norsk " +
      "Data og vil bygge det om til en AI-fabrikk. Selskapet fikk i juni 2026 rammeløyve for " +
      "nybygg på gnr 38 bnr 136, som kommunen omregulerte til datasenter i mars 2026. Planlagt " +
      "effekt oppgis ulikt, fra 10 til 18 MW.",
    municipality: "Fyresdal",
    address: "Molandsmoen 28",
    postal_code: "3870",
    city: "Fyresdal",
    latitude: 59.20136,
    longitude: 8.08256,
    verification_status: "partially_verified",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Fossefalls første anlegg og hovedformålet med selskapets emisjon på 500 mill. kr. Det " +
      "ligger rundt 450 meter fra EdgeConneX' hyperskalatomt, men er et eget og langt mindre " +
      "anlegg med egen kraftforsyning.",
    notes:
      "Opprettet i runde 11 (2026-10-02). Koordinaten er Kartverkets adressepunkt for Molandsmoen " +
      "28 (gnr 38 bnr 136, ca. 8 daa), som er tomta for nybygget i byggesak 2026/688. Det " +
      "eksisterende datasenterbygget er ikke stedfestet i noen kilde som navngir det; kommunens " +
      "plansak sier at 38/117 (Molandsmoen 7B) gjelder «etablering i eksisterande bygg», men " +
      "nevner ikke Fossefall. Byggesaksdokumentene ligger ikke åpent og er ikke lest. " +
      "Igangsettingsløyve er ikke funnet. Drift: Fossefall skrev 25.11.2025 at anlegget var i " +
      "drift, mens E24 i juni 2026 omtaler det som under utvikling; drift i dag er ikke " +
      "dokumentert. Operatør er ikke satt: Fossefall sier de selv skal eie og drifte, og har " +
      "avtale med CBRE Data Centre Solutions om utvikling og drift. Seekr er investor og kunde i " +
      "Fossefall, ikke dokumentert som kunde ved dette anlegget. Fyresdal Datacenter AS står " +
      "fortsatt med forretningsadresse i Horten; gjennomføringsdato for kjøpet er ikke kunngjort. " +
      "Kraft: 5 MW effektrettighet (Lede), tidligere eier oppga inntil 5,5 MW. Statnett-sak " +
      "26/03132 (Grenland TRA, Lede, sluttkunde FOSSEFALL AS, 1 MW i kø, moden 01.12.2025) kan " +
      "gjelde Fyresdal, fordi Einangsmoen normalt forsynes radielt fra Bolvik, men ingen kilde " +
      "bekrefter det.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Lede: Konsesjonssøknad Molandsmoen koblingsstasjon",
        source_url: "https://lede.no/getfile.php/1359408-1760376471/Lede/Prosjekter/Molandsmoen/Konsesjonss%C3%B8knad%20Molandsmoen%20Koblingsstasjon%20%281%29.pdf",
        publisher: "Lede AS",
        source_type: "document",
        source_date: "2025-07-01",
        primary_source: true,
        excerpt_or_summary:
          "Kap. 3.2: Telemark Nett og Myldr – Energipark Fyresdal AS etablerte i 2021–2022 et " +
          "datasenter i distribusjonsnettet på Molandsmoen med effektrettighet på 5 MW. Bekrefter " +
          "anlegget og effekten, ikke adressen.",
      },
      {
        source_name: "Fyresdal kommune, innsyn: sak 2026/688 Molandsmoen gbnr. 38/136 – Fyresdal datacenter AS – byggesak",
        source_url: "https://prod02.elementscloud.no/publikum/939772766_PROD-939772766/Case/8547",
        publisher: "Fyresdal kommune",
        source_type: "register",
        source_date: "2026-06-11",
        primary_source: true,
        excerpt_or_summary:
          "Søknad om rammetillatelse 28.05.2026 og rammeløyve datert 08.06.2026 for gbnr 38/136; " +
          "bytte av ansvarlig søker i september 2026. Bekrefter prosjekt, part og tomt. Dokumentene " +
          "er ikke åpent tilgjengelige.",
      },
      {
        source_name: "Fyresdal kommune, postliste: Brakkerigg Fossefall – Molandsmoen gbnr. 38/75 (sak 2026/936)",
        source_url: "https://prod02.elementscloud.no/publikum/939772766_PROD-939772766/Search?Query=Fossefall&OrderBy=DATE&SortOrder=1&DateFrom=2026-04-02",
        publisher: "Fyresdal kommune",
        source_type: "register",
        source_date: "2026-09-11",
        primary_source: true,
        excerpt_or_summary:
          "Søknad 01.09.2026 og løyve 11.09.2026 til brakkerigg for Fossefall på gbnr 38/75, " +
          "naboeiendom til 38/136. Bekrefter at Fossefall forbereder anleggsarbeid på Molandsmoen.",
      },
      {
        source_name: "Fyresdal kommune: Mindre endring av reguleringsplan for Molandsmoen industriområde",
        source_url: "https://www.fyresdal.kommune.no/nyheter/2026-04-13-mindre-endring-av-reguleringsplan-for-molandsmoen-industriomrade",
        publisher: "Fyresdal kommune",
        source_type: "regulation",
        source_date: "2026-04-13",
        primary_source: true,
        excerpt_or_summary:
          "Kommunestyret vedtok 19.03.2026 (sak 19/26) å endre gbnr 38/117, 38/120 og 38/136 fra " +
          "industri til datasenter eller kombinert industri/datasenter, planID 200402.",
      },
      {
        source_name: "Fyresdal kommune: samlet saksprotokoll, mindre endring av reguleringsplan for Molandsmoen industriområde",
        source_url: "https://www.fyresdal.kommune.no/download/18.4e5c610719d707447d92cd/1775734102690/Mindre%20endring%20reguleringsplan%20for%20Molandsmoen%20industriomr%C3%A5de%202026.pdf",
        publisher: "Fyresdal kommune",
        source_type: "document",
        source_date: "2026-03-19",
        primary_source: true,
        excerpt_or_summary:
          "38/136 (ca. 8 daa) gjelder ny etablering, 38/117 og 38/120 (ca. 1,2 daa) etablering i " +
          "eksisterende bygg. Maks 70 % BYA og 12 m høyde. Navngir ikke Fossefall.",
      },
      {
        source_name: "Fossefall: Fossefall acquires Fyresdal Datacenter AS and establishes its first AI factory",
        source_url: "https://www.fossefall.ai/news/fossefall-acquires-fyresdal-datacenter-as-and-establishes-its-first-ai-factory",
        publisher: "Fossefall",
        source_type: "web",
        source_date: "2025-11-25",
        primary_source: true,
        excerpt_or_summary:
          "Avtale om kjøp av Fyresdal Datacenter fra Norsk Data AS. Anlegget oppgis å være i drift og " +
          "ha reservert nettkapasitet. Oppgir ikke adresse eller MW.",
      },
      {
        source_name: "Fossefall: Doubling down in Fyresdal – partners with CBRE",
        source_url: "https://www.fossefall.ai/news/doubling-down-in-fyresdal-partners-with-cbre",
        publisher: "Fossefall",
        source_type: "web",
        source_date: "2025-12-17",
        primary_source: true,
        excerpt_or_summary:
          "Fossefall vil bygge en andre AI-fabrikk i Fyresdal fra grunnen på nyervervet tomt, og har " +
          "inngått samarbeid med CBRE Data Centre Solutions om utvikling og drift.",
      },
      {
        source_name: "Fossefall: Series A closing, NOK 500 million",
        source_url: "https://www.fossefall.ai/news/fossefall-enters-next-phase-of-growth-following-successful-nok-500-million-series-a-closing",
        publisher: "Fossefall",
        source_type: "web",
        source_date: "2026-06-30",
        primary_source: true,
        excerpt_or_summary:
          "Emisjon på 500 mill. kr; provenyet skal i hovedsak dekke egenkapitalen i AI-fabrikken i " +
          "Fyresdal.",
      },
      {
        source_name: "Fossefall: Fossefall Selects Armada to Accelerate Nordic AI Factory Deployment",
        source_url: "https://www.fossefall.ai/news/fossefall-selects-armada-to-accelerate-nordic-ai-factory-deployment",
        publisher: "Fossefall",
        source_type: "web",
        source_date: "2026-08-25",
        primary_source: true,
        excerpt_or_summary:
          "Bestilling av fem modulære datasentre på til sammen over 9 MW med levering innen første " +
          "kvartal 2027. Oppgir ikke hvilket sted de skal til.",
      },
      {
        source_name: "Enhetsregisteret: Fyresdal Datacenter AS (927283239)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/927283239",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Stiftet 10.05.2021, eiendomsselskap, forretningsadresse fortsatt i Horten. Bekrefter " +
          "selskapet, ikke anlegget eller eierskiftet.",
      },
      {
        source_name: "Enhetsregisteret: roller i Fyresdal Datacenter AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/927283239/roller",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Revisor Ernst & Young og regnskapsfører Jansson & Larsen Regnskap, de samme som Fossefall " +
          "Holding AS. Indikerer at selskapet er overtatt; viser ikke aksjonærer.",
      },
      {
        source_name: "Enhetsregisteret: Fossefall Holding AS (935794854)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/935794854",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Stiftet 25.06.2025, formål utvikling, finansiering, bygging og drift av datasentre for AI. " +
          "Bekrefter selskapet.",
      },
      {
        source_name: "Kartverket: adressesøk Molandsmoen 28, Fyresdal",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?sok=Molandsmoen%2028&kommunenummer=4032",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Molandsmoen 28 er gnr 38 bnr 136, adressepunkt 59.20136, 8.08256. Bekrefter adressen, ikke " +
          "anlegget.",
      },
      {
        source_name: "Statnett: statistikk om tilknytningssaker (kapasitetskø, 30.09.2026)",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Sak 26/03132: Grenland TRA, Lede AS, sluttkunde FOSSEFALL AS, datasenter, 1 MW i kø, moden " +
          "01.12.2025, ønsket 01.10.2026. Køpost på konsernnivå; ikke dokumentert koblet til " +
          "Fyresdal.",
      },
      {
        source_name: "Norsk Data: Fyresdal Datacenter AS",
        source_url: "https://norskdata.no/fyresdal-datacenter/",
        publisher: "Norsk Data AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Tidligere eiers omtale: datasenter i Fyresdal med kapasitet til inntil 5,5 MW og mulighet " +
          "for utvidelse. Oppgir ikke adresse.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "EdgeConneX Fyresdal, Molandsmoen",
    description:
      "Hyperskala datasenter under bygging på Molandsmoen i Fyresdal, på gnr 38 bnr 133 og 134. " +
      "EdgeConneX MCN Norway AS fikk rammeløyve for seks datahaller i august 2025 og startet " +
      "byggingen i første kvartal 2026. Anlegget har 140 MW reservert hos Statnett via Lede og " +
      "ytterligere 225 MW i kapasitetskø. Første bygg skal etter planen stå ferdig i 2027 og det " +
      "siste i 2029.",
    municipality: "Fyresdal",
    address: "Birtedalsvegen 57",
    postal_code: "3870",
    city: "Fyresdal",
    latitude: 59.20343,
    longitude: 8.07584,
    verification_status: "partially_verified",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av de største datasenterprosjektene i Norge som faktisk er under bygging, lagt til en " +
      "kommune med rundt 1 270 innbyggere. Tomtesalget via kommunens selskap og en mellommann har " +
      "vært omstridt, og det bygges egen 132 kV koblingsstasjon og ny ledning fra Brokke for å " +
      "forsyne anlegget.",
    notes:
      "Opprettet i runde 11 (2026-10-02). Tomt: gnr 38 bnr 133 (ca. 83 daa) og bnr 134 (ca. 90 " +
      "daa), til sammen ca. 173 daa; E24 oppgir 160 av 240 mål regulert til datasenter. " +
      "Koordinaten er midtpunktet mellom de to teigene; Kartverkets adressepunkt for " +
      "Birtedalsvegen 57 ligger på bnr 134. Plan: kommunen bruker planID 38230001, Lede bruker " +
      "4032_202201. Rammeløyve 14.08.2025 (sak 2025/183); endret rammetillatelse ble påklaget og " +
      "behandlet hos Statsforvalteren sommeren 2026 (sak 2026/6324, utfallet er ikke lest). " +
      "Igangsettingsløyve er ikke lest, men EdgeConneX oppgir at byggingen startet første kvartal " +
      "2026. Søknad om utslippstillatelse etter forurensningsforskriften ligger hos " +
      "Statsforvalteren (sak 2025/8979). Kraft: Statnett 23/01250 (ELB1848), Brokke KRA/TRA, " +
      "kunde Lede AS, sluttkunde EdgeConneX MCN Norway AS, 140 MW reservert 29.10.2024 med " +
      "planlagt tilknytning 31.05.2026, som er passert uten tilknyttet effekt. Statnett 24/01822 " +
      "(ELB1849): 225 MW i kø, moden 10.02.2025, ønsket 30.11.2028. Tilknytningen krever Ledes " +
      "nye Molandsmoen koblingsstasjon og ny 132 kV-ledning Brokke–Bjørgedalen; " +
      "konsesjonssøknadene ligger hos NVE (sak 2025/18352 og 2026/2681), vedtak er ikke funnet. " +
      "Grunneier: Lede skrev i 2025 at området tilhører Myldr – Energipark Fyresdal AS " +
      "(kommunalt); E24 skriver at tomta ble solgt via Norsk Data til EdgeConneX i slutten av " +
      "2025. Hjemmelshaver er ikke sjekket i grunnboka. Kommunen oppgir CTS som " +
      "entreprenørkontakt. EdgeConneX omtaler seg som svenskeid; eierskapet over " +
      "prosjektselskapet er ikke dokumentert i åpne registerdata.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Fyresdal kommune: Rammeløyve – Molandsmoen gbnr 38/133-134 (vedtaksbrev 14.08.2025)",
        source_url: "https://www.fyresdal.kommune.no/download/18.4e2db72e19993ad41d9177/1759146337004/Rammel%C3%B8yve%20-%20Molandsmoen%20gbnr%2038%20133-134,%20Fyresdal.PDF",
        publisher: "Fyresdal kommune",
        source_type: "document",
        source_date: "2025-08-14",
        primary_source: true,
        excerpt_or_summary:
          "Delegert vedtak 147/25, sak 2025/183: rammeløyve for seks datahaller, adkomstbygg og to " +
          "vanntårn på gbnr 38/133-134, Birtedalsvegen 57. Tiltakshaver Edgeconnex MCN Norway AS. " +
          "Bekrefter anlegget, tomta og plangrunnlaget.",
      },
      {
        source_name: "Fyresdal kommune: Rammeløyve gitt for etablering av datasenter på Molandsmoen",
        source_url: "https://www.fyresdal.kommune.no/nyheter/2025-09-29-rammeloyve-gitt-for-etablering-av-datasenter-pa-molandsmoen-gbnr.-38-133-134",
        publisher: "Fyresdal kommune",
        source_type: "web",
        source_date: "2025-09-29",
        primary_source: true,
        excerpt_or_summary:
          "Kunngjøring av rammeløyvet og av dispensasjon for avkjørsler fra fv. 3384. Bekrefter " +
          "søker, tiltakshaver og gnr/bnr.",
      },
      {
        source_name: "Fyresdal kommune: Hyperskala datasenter på Molandsmoen",
        source_url: "https://www.fyresdal.kommune.no/tenester/naering-natur-og-landbruk/hyperskala-datasenter-pa-molandsmoen",
        publisher: "Fyresdal kommune",
        source_type: "web",
        source_date: "2026-08-27",
        primary_source: true,
        excerpt_or_summary:
          "Prosjektet utvikles av EdgeConneX. Strømtilknytning 365 MW, hvorav 140 MW tildelt og 225 " +
          "MW i kø. Seks bygg på rundt 6 000 m² grunnflate, tre etasjer, inntil 25 m.",
      },
      {
        source_name: "EdgeConneX: Fyresdal, Norway (prosjektside)",
        source_url: "https://go.edgeconnex.com/-edgeconnex-fyresdal-norway-norwegian",
        publisher: "EdgeConneX",
        source_type: "web",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Byggingen startet første kvartal 2026. September–oktober 2026: stålreising bygg 1, pæling " +
          "bygg 2–4, rundt 200 personer. Bygg 1 ferdig 2027, siste bygg 2029. Utvikles og driftes av " +
          "EdgeConneX. 365 MW planlagt nettkapasitet.",
      },
      {
        source_name: "Statnett: statistikk om tilknytningssaker (reservasjoner og kø, 30.09.2026)",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Sak 23/01250: Brokke KRA/TRA, Lede AS, sluttkunde EdgeConneX MCN Norway AS, 140 MW " +
          "reservert 29.10.2024, planlagt 31.05.2026. Sak 24/01822: samme, 225 MW i kø. Bekrefter " +
          "kraftreservasjonen, ikke bygget.",
      },
      {
        source_name: "Lede: Konsesjonssøknad Molandsmoen koblingsstasjon",
        source_url: "https://lede.no/getfile.php/1359408-1760376471/Lede/Prosjekter/Molandsmoen/Konsesjonss%C3%B8knad%20Molandsmoen%20Koblingsstasjon%20%281%29.pdf",
        publisher: "Lede AS",
        source_type: "document",
        source_date: "2025-07-01",
        primary_source: true,
        excerpt_or_summary:
          "Lede fikk i september 2023 forespørsel fra EdgeConneX MCN Norway AS om 140 MW på 132 kV " +
          "til datasenter på Molandsmoen. Dimensjonert for maks 140 MW, 50 MW ved oppstart. Nevner " +
          "også et eksisterende datasenter på 5 MW i distribusjonsnettet.",
      },
      {
        source_name: "Lede: Molandsmoen koblingsstasjon (prosjektside)",
        source_url: "https://lede.no/prosjekter/molandsmoen-koblingsstasjon",
        publisher: "Lede AS",
        source_type: "web",
        source_date: "2025-07-01",
        primary_source: true,
        excerpt_or_summary:
          "Ny 132 kV koblingsstasjon på Molandsmoen, jordkabel fra Einangsmoen og ny ledning " +
          "Brokke–Bjørgedalen for å tilknytte datasenteret. Området tilhørte Myldr – Energipark " +
          "Fyresdal AS.",
      },
      {
        source_name: "Fyresdal kommune: Kunngjøring om vedtatt reguleringsendring på Molandsmoen",
        source_url: "https://www.fyresdal.kommune.no/artikler/2024/q3/2024-09-25-kunngjering-om-vedtatt-reguleringsendring-pa-molandsmoen",
        publisher: "Fyresdal kommune",
        source_type: "regulation",
        source_date: "2024-09-25",
        primary_source: true,
        excerpt_or_summary:
          "Reguleringsendring for Molandsmoen industri- og friluftsområde vedtatt i kommunestyret " +
          "19.09.2024 (sak 65/24), med plankart, bestemmelser og konsekvensutredning.",
      },
      {
        source_name: "Enhetsregisteret: EdgeConneX MCN Norway AS (931615254)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/931615254",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Stiftet 01.05.2023, næringskode 63.100, formål datasentervirksomhet, c/o-adresse i Asker. " +
          "Bekrefter selskapet, ikke anlegget; eiere framgår ikke.",
      },
      {
        source_name: "Kartverket: eiendomsgeokoding gnr 38 bnr 133, Fyresdal",
        source_url: "https://ws.geonorge.no/eiendom/v1/geokoding?kommunenummer=4032&gardsnummer=38&bruksnummer=133&omrade=true&utkoordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Teiggeometri for 38/133 (ca. 83 daa); 38/134 er ca. 90 daa. Bekrefter eiendommenes " +
          "beliggenhet, ikke anlegget.",
      },
      {
        source_name: "eInnsyn: Statsforvalteren – byggesak Fyresdal 38/133 og 38/134, endret rammetillatelse (2026/6324)",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01kt2m3t8ve0kvav2k4wfr6xas",
        publisher: "Statsforvalteren i Vestfold og Telemark",
        source_type: "register",
        source_date: "2026-06-02",
        primary_source: true,
        excerpt_or_summary:
          "Klagesak om endret rammetillatelse for Molandsmoen datasenter, mai–august 2026. Vedtak " +
          "oversendt 01.07.2026; innholdet er ikke lest.",
      },
      {
        source_name: "eInnsyn: NVE – EdgeConneX MCN Norway AS, søknad om anleggskonsesjon (2026/2681)",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01kh7bcs8vemd9taqm7q4wme57",
        publisher: "NVE",
        source_type: "register",
        source_date: "2026-02-11",
        primary_source: true,
        excerpt_or_summary:
          "EdgeConneX' egen konsesjonssøknad for transformatorstasjon på Molandsmoen, registrert " +
          "februar 2026. Vedtak er ikke funnet.",
      },
      {
        source_name: "eInnsyn: NVE – kost-nytteanalyse av overskuddsvarme, Fyresdal Datasenter (2026/8858)",
        source_url: "https://api.einnsyn.no/saksmappe/sm_01kp9f2v3se959w07v5yd5h2h8",
        publisher: "NVE",
        source_type: "register",
        source_date: "2026-04-15",
        primary_source: true,
        excerpt_or_summary:
          "Sak om kost-nytteanalyse av overskuddsvarme for EdgeConneX MCN Norway AS' datasenter i " +
          "Fyresdal, april–juni 2026.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "T1 Energy Mo i Rana",
    description:
      "Datasentertomt på rundt 86 000 m² i Mo i Rana, med 50 MW sikret nettkraft for AI-infrastruktur.",
    municipality: "Rana",
    address: "Terminalveien 22",
    postal_code: "8624",
    city: "Mo i Rana",
    latitude: 66.30513,
    longitude: 14.11593,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Mo i Rana har kraftoverskudd og industrihistorie, og 50 MW sikret nett er et konkret fortrinn " +
      "som allerede er på plass.",
    notes:
      "50 MW er oppgitt som sikret nettkraft, ikke som installert kapasitet.",
    kilder: [
      {
        source_name: "DataCenterMap: T1 Energy Mo i Rana",
        source_url: "https://www.datacentermap.com/norway/mo-i-rana/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør T1 Energy, adresse Terminalveien 22, 8624 Mo i Rana.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Terakraft Sauda I, Hellandsbygd",
    description:
      "Datasenter under bygging i det gamle Sauda I-kraftverket (Storlivatn kraftverk) i " +
      "Hellandsbygd. Byggherre og eier er prosjektselskapet YFOSS AS, og Terakraft AS står bak " +
      "merkevaren. Byggestart var november 2025, og selskapet oppgir 10 MW etter rehabilitering, " +
      "med mulig utvidelse på inntil 60 MW i nærheten.",
    municipality: "Sauda",
    address: "Handelandsvegen 140",
    postal_code: "4200",
    city: "Hellandsbygd",
    latitude: 59.68485,
    longitude: 6.51957,
    verification_status: "partially_verified",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et 100 år gammelt kraftverk gjort om til datasenter — det tydeligste eksempelet på at " +
      "bransjen følger gammel kraftinfrastruktur.",
    notes:
      "Aliaser: YFOSS AS, Terakraft AI Sauda, NO-SAU1, Storlivatn kraftverk datasenter. Runde 5 " +
      "(2026-09-30): leadet «YFOSS / Hellandsbygd» er samme anlegg (samme bygg og adresse, " +
      "Handelandsvegen 140). Status endret fra aktiv til under bygging. Vesper-fondet blir " +
      "majoritetseier av YFOSS; gjennomføring er ikke bekreftet i primærkilde. En mulig leietaker " +
      "er omtalt i presse, men ikke bekreftet. Magnoras køplass ved Sauda TRA er et annet prosjekt.",
    kilder: [
      {
        source_name: "DataCenterMap: Terakraft Sauda I, Hellandsbygd",
        source_url: "https://www.datacentermap.com/norway/sauda/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Terakraft, adresse Handelandsvegen 140, 4200 Hellandsbygd.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Green Mountain RJU1-Rjukan",
    description:
      "Green Mountains datasenter på Rjukan, i drift siden 2014, med wholesale colocation. Statnett " +
      "oppgir 33 MW tilknyttet og 33 MW reservert ved Rjukan transformatorstasjon for Green " +
      "Mountain AS, som driver anlegget gjennom avdeling Rjukan.",
    municipality: "Tinn",
    address: "Svaddevegen 161",
    postal_code: "3660",
    city: "Rjukan",
    latitude: 59.88108,
    longitude: 8.66942,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Rjukan er selve symbolet på norsk vannkraftindustri, og anlegget viderefører den bruken.",
    notes:
      "Runde 4 (2026-09-30): 66 MW er ført som sikret kraft fordi sluttkunden Green Mountain AS " +
      "selv er driftsenheten og har bare dette anlegget ved Rjukan TRA. 112,5 MW i kø er ikke " +
      "sikret. Driftskapasitet er ikke strukturert fordi operatørens 2×10 MW nettforsyning og " +
      "Statnetts 33 MW tilknyttet ikke stemmer overens.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Mountain RJU1-Rjukan",
        source_url: "https://www.datacentermap.com/norway/rjukan/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Green Mountain, adresse Svaddevegen 161, 3660 Rjukan.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Lefdal Mine Datacenter, Kjølsdalen",
    description:
      "Datasenter i en nedlagt olivingruve i Nordfjord, med fri kjøling fra fjorden og 100 % " +
      "fornybar kraft. Lefdal Mine Datacenter AS er Nkom-registrert.",
    municipality: "Stad",
    address: "Nordfjordvegen 7300",
    postal_code: "6776",
    city: "Kjølsdalen",
    latitude: 61.93203,
    longitude: 5.50621,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et datasenter inne i en gruve er den mest særegne anleggstypen i Norge, og et av de få norske " +
      "anleggene med internasjonal kjennskap.",
    notes:
      "Runde 2 (2026-09-30): 3i Infrastructure overtok i august–september 2026. 37 MW i drift og 80 " +
      "MW sikret (16,2 MW tilknyttet og 63,8 MW reservert ved Ålfoten). Lefdal kjøpte Titan Group " +
      "AS / Moskog-prosjektet 29.09.2026 – eget anlegg, ikke lagt inn.",
    kilder: [
      {
        source_name: "DataCenterMap: Lefdal Mine Datacenter, Kjølsdalen",
        source_url: "https://www.datacentermap.com/norway/maloy/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Lefdal Mine Datacenter, adresse Nordfjordvegen 7300, 6776 Kjølsdalen.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Lefdal Moskog, Sunnfjord næringspark",
    description:
      "Planlagt datasenter på en tomt på ca. 40 mål i Sunnfjord næringspark på Moskog øst for " +
      "Førde, der detaljreguleringen åpner for datasenter. Prosjektet ble utviklet av Titan Group " +
      "AS, som Lefdal Mine Datacenter kjøpte i september 2026. Lefdal oppgir om lag ni milliarder " +
      "kroner i investeringer over tre år.",
    municipality: "Sunnfjord",
    city: "Førde",
    latitude: 61.443,
    longitude: 6.0245,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Lefdal Mines første anlegg utenfor gruva i Nordfjord. Flere datasenterprosjekter står i kø " +
      "ved Moskog transformatorstasjon.",
    notes:
      "Opprettet i runde 3 (2026-09-30). 80 MW står i Statnetts kø ved Moskog TRA og er ikke ført " +
      "som sikret kraft. Runde 4: koordinaten er flyttet til felt K3 (KBA1/KBA2) etter kommunens " +
      "planomtale; punktet er omtrentlig. Arcem har nabofeltet K2 (eget anlegg). Ikke samme anlegg " +
      "som Lefdal Mine Datacenter i Kjølsdalen, og heller ikke Magnoras eget Moskog-prosjekt.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Statnett – kapasitetskø forbruk (Power BI)",
        source_url: "https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/#kapasitetsko",
        publisher: "Statnett SF",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Sak 25/02600 (ELB689), Moskog TRA, BKK AS, sluttkunde TITAN GROUP AS, datasenter, 80 MW i " +
          "kø, moden bestilling 26.11.2025, ønsket 01.10.2026. Ellers ved Moskog: ARCEM DC 16 AS 40 " +
          "MW og MAGNORA ASA 50 MW.",
      },
      {
        source_name: "Sunnfjord kommune: Detaljreguleringsplan Sunnfjord næringspark aust på høyring",
        source_url: "https://sunnfjord.kommune.no/aktuelt-fra-kommunen/detaljreguleringsplan-sunnfjord-naringspark-aust-til-hoyring-og-offentleg-ettersyn.36012.aspx",
        publisher: "Sunnfjord kommune",
        source_type: "regulation",
        source_date: "2025-12-16",
        primary_source: true,
        excerpt_or_summary:
          "Plan 22/6350 omfatter ca. 466 daa på Moskog, ca. 1 mil øst for Førde sentrum. Formål " +
          "inkluderer datasenter og/eller transformatorstasjon. Høringsfrist var 08.02.2026.",
      },
      {
        source_name: "Brønnøysundregistrene: Titan Group AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/931481258",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Org.nr. 931481258, stiftet 2023 (tidl. NFH 230550 AS), forretningsadresse Nordfjordvegen " +
          "7300, Kjølsdalen (Stad).",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Arcem Sunnfjord, Sunnfjord næringspark",
    description:
      "Planlagt datasenter på felt K2 i Sunnfjord næringspark på Moskog, sør for Moskog " +
      "transformatorstasjon og om lag 13 km øst for Førde. Arcem har intensjonsavtale om tomt i " +
      "K2 gjennom prosjektselskapet DC Sunnfjord AS (tidligere Arcem DC 16 AS). " +
      "Detaljreguleringen for K2–K4 åpner for datasenter.",
    municipality: "Sunnfjord",
    city: "Førde",
    latitude: 61.4411,
    longitude: 6.0194,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Det andre datasenterprosjektet i Sunnfjord næringspark, ved siden av Lefdals tomt i K3. " +
      "Flere datasenterprosjekter står i kø ved Moskog transformatorstasjon.",
    notes:
      "Opprettet i runde 4 (2026-09-30) fra leadet «Arcem DC16». Alias: Arcem DC 16. 40 MW står i " +
      "Statnetts kø og er ikke sikret kraft. Tomtekontrollen er en intensjonsavtale, så ingen " +
      "operatør er satt. Koordinaten er omtrentlig, midt i felt K2 etter planomtalens kart.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Sunnfjord næringspark – Om næringsparken (K2–K4)",
        source_url: "https://www.sunnfjordnaringspark.no/",
        publisher: "Sunnfjord kommune / Sunnfjord Tomteselskap",
        source_type: "web",
        source_date: "2026-09-16",
        primary_source: true,
        excerpt_or_summary:
          "Kommunens parkside: K3 er solgt til Sunnfjord Miljøverk og Titan Group (ca. 40 dekar, " +
          "datasenter). For K2 og K4 er det inngått intensjonsavtaler med Arcem (K2) og Fazenda (K4). " +
          "Neste byggetrinn skal være klart høsten 2027, med infrastrukturarbeid fra september 2026.",
      },
      {
        source_name: "Planomtale: Detaljregulering Sunnfjord næringspark aust (K2, K3, K4)",
        source_url: "https://sunnfjord.kommune.no/api/presentation/v2/nye-innsyn/filer/v-aba08a8e__580c__4b67__bc21__70eed223f3db-2151986_1_A!d-2022306690!neDXiQ?pid=1",
        publisher: "Sunnfjord kommune / Asplan Viak AS",
        source_type: "regulation",
        source_date: "2026-04-27",
        primary_source: true,
        excerpt_or_summary:
          "Planområdet er ca. 466 daa ved Moskog. K2 = KBA3/KBA4 og K3 = KBA1/KBA2. Formålene åpner " +
          "for blant annet datasenter og/eller transformatorstasjon. Kart i figur 3 viser K2 " +
          "sør/sørøst for Moskog trafostasjon. Revidert 23.04.2026.",
      },
      {
        source_name: "Sunnfjord kommune: Detaljreguleringsplan Sunnfjord næringspark aust på høyring",
        source_url: "https://sunnfjord.kommune.no/aktuelt-fra-kommunen/detaljreguleringsplan-sunnfjord-naringspark-aust-til-hoyring-og-offentleg-ettersyn.36012.aspx",
        publisher: "Sunnfjord kommune",
        source_type: "regulation",
        source_date: "2025-12-16",
        primary_source: true,
        excerpt_or_summary:
          "Formannskapet la planen ut på høring 11.12.2025, med høringsfrist 08.02.2026. Datasenter " +
          "er blant tillatte formål i K2–K4.",
      },
      {
        source_name: "Sunnfjord kommune: Sunnfjord Næringspark – finansiering og budsjett for felta K2, K3 og K4",
        source_url: "https://sunnfjord.kommune.no/aktuelt-fra-kommunen/sunnfjord-naringspark-finansiering-og-budsjett-for-felta-k2-k3-og-k4.36276.aspx",
        publisher: "Sunnfjord kommune",
        source_type: "web",
        source_date: "2026-09-28",
        primary_source: true,
        excerpt_or_summary:
          "To firma som vil etablere datasenter har opsjon på to tomter på 30 og 40 dekar i K3 og K2. " +
          "Ytterligere 4–5 datasenteraktører vil etablere seg på Moskog. Byggelån på opptil 200 mill. " +
          "kr i 2026. Firmaene er ikke navngitt.",
      },
      {
        source_name: "Enhetsregisteret: DC Sunnfjord AS (tidl. Arcem DC 16 AS)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/835366502",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "835366502, stiftet 31.03.2025, Inkognitogata 8 i Oslo. Het ARCEM DC 16 AS til 20.07.2026. " +
          "Formål: utvikling, eie og drift av datasentre og fast eiendom. Bekrefter selskap og navn, " +
          "ikke tomt eller anlegg.",
      },
      {
        source_name: "Enhetsregisteret: roller DC Sunnfjord AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/835366502/roller",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Styreleder er Anders Bakken Eriksen, som er CEO i Arcem. Knytter prosjektselskapet til " +
          "Arcem-ledelsen.",
      },
      {
        source_name: "Statnett: kapasitetskø (forbruk)",
        source_url: "https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/#kapasitetsko",
        publisher: "Statnett SF",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Sak 25/02605 (ELB731): Moskog TRA, kunde BKK AS, sluttkunde ARCEM DC 16 AS, datasenter, 40 " +
          "MW i kø, moden bestilling 19.03.2026, ønsket tilknytning 01.10.2029. Står ikke i " +
          "reservasjonslisten.",
      },
      {
        source_name: "NVE nettanlegg – transformatorstasjoner (Moskog)",
        source_url: "https://kart.nve.no/enterprise/rest/services/Nettanlegg4/MapServer/5",
        publisher: "NVE",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Statnett Moskog 420 kV ligger på 61.44563, 6.01600, BKK Moskog 132 kV på 61.44620, " +
          "6.01377, og Stakaldefossen på 61.44561, 6.00990. Brukt som referansepunkter for å " +
          "georeferere K2 i planomtalens kart.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Bulk N01 Campus, Øvrebø",
    description:
      "Bulks nasjonale campus i Øvrebø, med flere bygg: DCM100 med 1 500 m² og inntil 4 MW, DCM101 " +
      "med 1 500 m² white space over fire haller og inntil 640 rack, og DCM102 med 42 MW IT-kapasitet " +
      "bygget for GPU- og CPU-infrastruktur med høy tetthet. Fire katalogoppføringer, ett campus.",
    municipality: "Vennesla",
    address: "Stølevegen 39",
    postal_code: "4715",
    city: "Øvrebø",
    latitude: 58.25757,
    longitude: 7.89205,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Det største colocation-campuset i Sør-Norge, og et av de få norske anleggene som eksplisitt " +
      "er bygget for GPU-tetthet.",
    notes:
      "Skill mellom tallene: 42 MW gjelder IT-kapasitet i DCM102 alene, ikke hele campuset. " +
      "1 500 m² gjelder per bygg. Erstatter det tidligere, tynnere funnet for samme sted.",
    tidligere_titler: ["Bulk N01 Data Center Campus, Vennesla"],
    kilder: [
      {
        source_name: "DataCenterMap: Bulk N01 Campus, Øvrebø",
        source_url: "https://www.datacentermap.com/norway/kristiansand/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Bulk Infrastructure, adresse Stølevegen 39, 4715 Øvrebø.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Bulk Arendal, Longum nord",
    description:
      "Planlagt datasenter for AI og sky på Longum nord i Eyde Material Park, nordøst for Arendal " +
      "sentrum. Arendal bystyre vedtok i juni 2026 å selge tomta (gnr/bnr 25/121) til Bulk for " +
      "600 millioner kroner. Prosjektselskapet er Bulk Data Centers Arendal AS. Bulk står i " +
      "Statnetts kø med 150 MW, og reguleringsendringen som åpner for datasenter er på høring til " +
      "19.10.2026.",
    municipality: "Arendal",
    city: "Arendal",
    latitude: 58.50458,
    longitude: 8.78544,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Bulks andre store datasenterprosjekt på Sørlandet, på en tomt kommunen opprinnelig kjøpte " +
      "til gjenvinningsanlegg. Flere datasenterprosjekter står i kø på samme " +
      "transformatorstasjon.",
    notes:
      "Lagt inn i datasenter-enrichment runde 2 (2026-09-30) fra Statnett-leadet «Arendal 150 " +
      "MW». 150 MW er køplass (sak 25/02389), ikke reservasjon. 600 MNOK er tomteprisen, ikke " +
      "investering. Koordinaten er Kartverkets representasjonspunkt for teig 25/121. Nabotomt: " +
      "Bifrost Edge AS har eget prosjekt med 285 MW i kø (ikke lagt inn).",
    public_candidate: false,
    kilder: [
      {
        source_name: "Flertall for salg av tomt til datasenter",
        source_url: "https://www.nrk.no/sorlandet/flertall-for-salg-av-tomt-til-datasenter-1.17936452",
        publisher: "NRK Sørlandet",
        source_type: "news",
        source_date: "2026-06-25",
        excerpt_or_summary:
          "Bystyret i Arendal vedtok i ekstraordinært møte 25.06.2026 å selge gjenvinningstomta på " +
          "Longum nord til Bulk for datasenterformål.",
      },
      {
        source_name: "Eyde Material Park, Longum nord – reguleringsplan (plan-ID 42032022-10)",
        source_url: "https://www.arendal.kommune.no/tjenester/plan-bygg-og-eiendom/reguleringsplaner/vedtatte-reguleringsplaner/eyde-material-park-longum-nord.25250.aspx",
        publisher: "Arendal kommune",
        source_type: "regulation",
        source_date: "2026-08-27",
        primary_source: true,
        excerpt_or_summary:
          "Plan vedtatt 14.11.2024 (PS 24/166). Endringsforslag lagt ut til offentlig ettersyn " +
          "27.08.2026, frist 19. oktober: avfallsanlegg tas ut, og i to felt åpnes det i tillegg for " +
          "datasenter. Ligger nord for E18/Fv. 409 ved Longumkrysset, ca. 6 km nordøst for Arendal " +
          "sentrum.",
      },
      {
        source_name: "Statnett – kapasitetskø forbruk (Power BI)",
        source_url: "https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/#kapasitetsko",
        publisher: "Statnett SF",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Sak 25/02389 (ELB674), Arendal TRA, Glitre Nett AS, sluttkunde «Bulk Data Center AS», " +
          "datasenter, moden bestilling 04.09.2025, ønsket tilknytning 31.12.2028, 150 MW i kø. " +
          "Køplass, ikke reservasjon.",
      },
      {
        source_name: "Enhetsregisteret: Bulk Data Centers Arendal AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/837476682",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Org.nr. 837476682, stiftet 17.03.2026, forretningsadresse Karenslyst allé 53 Oslo, næring " +
          "datainfrastruktur. Prosjektselskap for Arendal.",
      },
      {
        source_name: "Enhetsregisteret: Bulk Infrastructure Group AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/922949891",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Org.nr. 922949891, stiftet 2019, Karenslyst allé 53 Oslo. Oppgitt kjøper i NRK; morselskap " +
          "i Bulk-konsernet.",
      },
      {
        source_name: "Kartverket eiendom-geokoding 4203-25/121",
        source_url: "https://ws.geonorge.no/eiendom/v1/geokoding?kommunenummer=4203&gardsnummer=25&bruksnummer=121&utkoordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Teig 25/121 i Arendal, representasjonspunkt 58.50458 N, 8.78544 Ø (hovedområde). Stemmer " +
          "med tomta oppgitt i DCD.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Bifrost Edge Arendal, Longum nord",
    description:
      "Planlagt datasenter fra Bifrost Edge AS på de private arealene på Longum nord i Eyde " +
      "Material Park, nordøst for Arendal sentrum. Ifølge kommunens oppstartsreferat (februar 2026) " +
      "har Bifrost avtale om å erverve arealene fra grunneier Otra Holding AS, unntatt den " +
      "kommunale tomta som er solgt til Bulk. En reguleringsendring som åpner for datasenter er på " +
      "høring til 19.10.2026. Bifrost står i Statnetts kø med 285 MW.",
    municipality: "Arendal",
    city: "Arendal",
    latitude: 58.5124,
    longitude: 8.78654,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et av de største datasenterprosjektene i kø på Sørlandet, på naboarealet til Bulk Arendal " +
      "i samme plan.",
    notes:
      "Opprettet i runde 5 (2026-09-30). Runde 6: grunneier er fortsatt Otra Holding AS " +
      "(planbeskrivelse aug. 2026). Bifrost har en avtalt ervervsrett; om det er kjøp eller opsjon, " +
      "og om det er gjennomført, er ikke dokumentert. Hjemmelshaver i grunnbok er ikke kontrollert " +
      "(krever innlogging). Arealet 26/2 + 25/1 er ca. 548 daa, mot 800–820 mål i presse. 285 MW er " +
      "køplass (sak 25/02293), ikke sikret kraft. Koordinaten ligger på 26/2, men felt KBA3 er ikke " +
      "stedfestet.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Arendal kommune: Referat oppstartsmøte – planendring Eyde Material Park Longum Nord (06.02.2026)",
        source_url: "https://karttjenester.ikt-agder.no/planinnsyn_arendal/api/plandocument?documentId=57959",
        publisher: "Arendal kommune",
        source_type: "regulation",
        source_date: "2026-02-06",
        primary_source: true,
        excerpt_or_summary:
          "Kommunen skriver at Bifrost har kjøpt Otra Holding og eier alt på Longum nord unntatt den " +
          "kommunale tomta RA1. Forslagsstiller skriver at Bifrost Edge AS har avtale om å erverve " +
          "arealene, og at Bifrost vil betale anleggsbidrag for kraft fra Bøylefoss.",
      },
      {
        source_name: "Varsel om oppstart av planarbeid – Eyde Material Park Longum Nord (05.03.2026)",
        source_url: "https://karttjenester.ikt-agder.no/planinnsyn_arendal/api/plandocument?documentId=57957",
        publisher: "Dagfin Skaar AS for Otra Holding AS (kommunens planinnsyn)",
        source_type: "regulation",
        source_date: "2026-03-05",
        primary_source: true,
        excerpt_or_summary:
          "Varselet om endring av planID 42032022-10 kommer fra Otra Holding AS. RA1 omreguleres til " +
          "KBA5, og datasenter åpnes som underformål i KBA3 og KBA5.",
      },
      {
        source_name: "Planbeskrivelse Eyde Material Park – Longum Nord, rev. 11.08.2026",
        source_url: "https://karttjenester.ikt-agder.no/planinnsyn_arendal/api/plandocument?documentId=59226",
        publisher: "Dagfin Skaar AS for Otra Holding AS (kommunens planinnsyn)",
        source_type: "regulation",
        source_date: "2026-08-11",
        primary_source: true,
        excerpt_or_summary:
          "Grunneiertabell: 25/1 og 26/2 tilhører Ola Olsbu/Otra Holding AS, 22/1 Are Venemyr og " +
          "510/6 Arendal kommune. RA1 (161,7 daa) blir KBA5. Datasenter tillates i KBA3 og KBA5, og " +
          "KBA3 kan bygges ut tidlig sammen med transformatorstasjonen i I/L1.",
      },
      {
        source_name: "Arendal kommune: Saksprotokoll KPU 27.08.2026 sak 26/68 – forslag til endringer",
        source_url: "https://karttjenester.ikt-agder.no/planinnsyn_arendal/api/plandocument?documentId=59227",
        publisher: "Arendal kommune",
        source_type: "regulation",
        source_date: "2026-08-27",
        primary_source: true,
        excerpt_or_summary:
          "Kommuneplanutvalget la endringsforslaget ut på høring enstemmig (sak 25/35750). Forslaget " +
          "er fremmet for Otra Holding og åpner for datasenter i to felt. Protokollen viser til " +
          "bystyrevedtak 26.02.2026 som er positivt til datasenter, med forbud mot kryptoutvinning.",
      },
      {
        source_name: "Reguleringsbestemmelser Eyde Material Park – Longum Nord (datert 11.08.2026)",
        source_url: "https://karttjenester.ikt-agder.no/planinnsyn_arendal/api/plandocument?documentId=59228",
        publisher: "Arendal kommune",
        source_type: "regulation",
        source_date: "2026-08-11",
        primary_source: true,
        excerpt_or_summary:
          "KBA3 og KBA5 tillater datasenter med tekniske anlegg, men ikke kryptoutvinning. Minste " +
          "tomt er 10 daa. KBA2 kan tas i bruk hvis en aktør trenger mer areal enn KBA3.",
      },
      {
        source_name: "Statnett – kapasitetskø forbruk (Power BI)",
        source_url: "https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/#kapasitetsko",
        publisher: "Statnett SF",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Sak 25/02293 (ELB672): Arendal TRA, Glitre Nett AS, sluttkunde Bifrost Edge AS, " +
          "datasenter, moden bestilling 08.03.2026, ønsket tilknytning 30.06.2027, 285 MW i kø. " +
          "Køplass, ikke reservasjon. Lest via GitHub-speilet.",
      },
      {
        source_name: "Enhetsregisteret: Bifrost Edge AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/935435005",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "935435005, stiftet 09.04.2025 i Kinn, formål datasentervirksomhet. Daglig leder er Sindre " +
          "Kvalheim og styreleder Tom Einar Jensen. Bekrefter selskapet, ikke anlegget.",
      },
      {
        source_name: "Enhetsregisteret: Otra Holding AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/911767899",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "911767899, Kristiansand, eiendomsutvikling. Styreleder er Lars Gunnar Andersen. Styret " +
          "viser ingen Bifrost-personer, så et oppkjøp er ikke synlig i registeret.",
      },
      {
        source_name: "Kartverket eiendom: 4203-26/2",
        source_url: "https://ws.geonorge.no/eiendom/v1/geokoding?kommunenummer=4203&gardsnummer=26&bruksnummer=2&utkoordsys=4258&omrade=true",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Teiggeometrien for 26/2 (Longum Øvre) i Arendal, hovedteig lokalid 233582993, er brukt til " +
          "det omtrentlige punktet. Bekrefter eiendommen, ikke anlegget eller KBA3.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Bulk Ausenfjell, Frogner",
    description:
      "Planlagt datasenter i Bulks næringsområde Ausenfjellet II ved Frogner i Lillestrøm. " +
      "Kommunen endret reguleringen i 2026 slik at datasenter tillates i feltene KBA2–4, med Bulk " +
      "Ausenfjell AS som forslagsstiller. Planbeskrivelsen oppgir 12 MW reservert hos Elvia og " +
      "ytterligere kapasitet i kø. Tomteopparbeidelse pågår; byggesøknad for datasenteret er ikke " +
      "kjent.",
    municipality: "Lillestrøm",
    city: "Frogner",
    latitude: 60.0026,
    longitude: 11.13628,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et nytt datasenterområde nær Frogner transformatorstasjon i Oslos nordøstlige randsone. " +
      "Kravet om å levere overskuddsvarme til fjernvarme ble tatt ut av planen i september 2026.",
    notes:
      "Opprettet i runde 3 (2026-09-30). Aliaser: Bulk Park Ausenfjell, Ausenfjellet II. Bulk har " +
      "søkt 100 MW (12 reservert + 88 i kø); bare de 12 MW som planbeskrivelsen knytter til " +
      "Ausenfjell er ført som sikret kraft. Koordinaten er omtrentlig, midt i teig 271/48.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Planbeskrivelse Ausenfjellet II næringsområde – endring etter enklere prosess",
        source_url: "https://www.lillestrom.kommune.no/contentassets/9e12800244c245069680705777f15ef4/planbeskrivelse.pdf",
        publisher: "Multiconsult for Bulk Ausenfjell AS / Lillestrøm kommune",
        source_type: "regulation",
        source_date: "2026-02-26",
        primary_source: true,
        excerpt_or_summary:
          "Endrer formålet slik at datasenter tillates i KBA2–4. Byggeområdene ligger på 271/48 " +
          "(grunneier Bulk Eiendom Farex AS). Bulk Data Centers AS har søkt 100 MW: Elvia har " +
          "reservert 12 MW og 88 MW står i kø.",
      },
      {
        source_name: "Planinitiativ Ausenfjellet II",
        source_url: "https://www.lillestrom.kommune.no/contentassets/9e12800244c245069680705777f15ef4/planinitiativ.pdf",
        publisher: "Multiconsult for Bulk Ausenfjell AS / Lillestrøm kommune",
        source_type: "regulation",
        primary_source: true,
        excerpt_or_summary:
          "Planinitiativet ber om å legge datasenter til formålet i BKB1–4. Oppgir feltstørrelser " +
          "(26,5/53,8/54,4/65,0 daa), igangsettingstillatelse for tomtearbeid og arealoverføring til " +
          "271/48.",
      },
      {
        source_name: "Lillestrøm kommune: Har du innspill til endring av planen for Ausenfjellet?",
        source_url: "https://www.lillestrom.kommune.no/samfunnsutvikling/si-din-mening/offentlig-ettersyn-av-arealplaner/2026/har-du-innspill-til-endring-av-planen-for-ausenfjellet/",
        publisher: "Lillestrøm kommune",
        source_type: "regulation",
        source_date: "2026-02-27",
        primary_source: true,
        excerpt_or_summary:
          "Offentlig ettersyn av plan 10261750-03 / PLAN-25/01930 med frist 27.03.2026. " +
          "Forslagsstiller er Bulk Ausenfjell AS og plankonsulent Multiconsult. Formålet er " +
          "datasenter i KBA2–4.",
      },
      {
        source_name: "Lillestrøm kommune: Planen for Ausenfjellet II er vedtatt endret",
        source_url: "https://www.lillestrom.kommune.no/samfunnsutvikling/si-din-mening/vedtatte-arealplaner/2026/planen-for-ausenfjellet-ii-er-vedtatt-endret/",
        publisher: "Lillestrøm kommune",
        source_type: "regulation",
        source_date: "2026-06-05",
        primary_source: true,
        excerpt_or_summary:
          "Hovedutvalg for miljø og samfunn vedtok 27.05.2026 at planen endres for å legge til rette " +
          "for datasenter i tillegg til lager og industri. Klagefrist var 25.06.",
      },
      {
        source_name: "Lillestrøm kommune: Deler av planen for Ausenfjellet II er endret",
        source_url: "https://www.lillestrom.kommune.no/samfunnsutvikling/si-din-mening/vedtatte-arealplaner/2026/deler-av-planen-for-ausenfjellet-ii-er-endret/",
        publisher: "Lillestrøm kommune",
        source_type: "regulation",
        source_date: "2026-09-25",
        primary_source: true,
        excerpt_or_summary:
          "Kravet om at overskuddsvarme fra et framtidig datasenter skal inn i fjernvarmenettet er " +
          "fjernet (fvl. § 35). Planen ble vedtatt 27.05.2026, og endringen ble vedtatt 16.09.2026.",
      },
      {
        source_name: "Saksfremlegg: Omgjøring av vedtak – Reguleringsplan for Ausenfjellet II",
        source_url: "https://www.lillestrom.kommune.no/contentassets/ff8973fcb26e43528cb57be610a3de87/saksfremlegg---omgjoring-av-vedtak-reguleringsplan-for-ausenfjellet-ii.pdf",
        publisher: "Lillestrøm kommune",
        source_type: "regulation",
        source_date: "2026-08-31",
        primary_source: true,
        excerpt_or_summary:
          "Fjernvarmepunktet var ugyldig fordi området ligger utenfor konsesjonsområdet. Vedtaket ble " +
          "kunngjort 05.06.2026 uten klager, og forslagsstiller har begynt å innrette seg etter det.",
      },
      {
        source_name: "Statnett: kapasitetsreservasjoner forbruk (Frogner TRA, sak 23/00821)",
        source_url: "https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/#reservasjoner",
        publisher: "Statnett",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Frogner TRA, Elvia AS som Statnetts kunde, sluttkunde Bulk Infrastructure Group AS, " +
          "datasenter, 12 MW reservert 28.04.2025, planlagt tilknytning 29.06.2029.",
      },
      {
        source_name: "Statnett: kapasitetskø forbruk (Frogner TRA, sak 25/01983)",
        source_url: "https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/#kapasitetsko",
        publisher: "Statnett",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Frogner TRA via Elvia AS, sluttkunde Bulk Infrastructure Group AS, datasenter, 88 MW i kø, " +
          "moden bestilling 19.12.2024, ønsket tilknytning 29.09.2028.",
      },
      {
        source_name: "Bulk Infrastructure: Bulk Park Ausenfjell",
        source_url: "https://bulkinfrastructure.com/no/industrial-real-estate/bulk-park-ausenfjell",
        publisher: "Bulk Infrastructure",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Bulks side om næringsparken ved Frogner trafostasjon: tomt på opptil ca. 75 daa for " +
          "industri og logistikk, med datasenter og gjenbruk av overskuddsvarme nevnt som mulighet.",
      },
      {
        source_name: "Enhetsregisteret: Bulk Ausenfjell AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/990427410",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Org.nr. 990427410, stiftet 2006, næringskode 68.200 (utleie av fast eiendom), " +
          "forretningsadresse Karenslyst allé 53, Oslo.",
      },
      {
        source_name: "Kartverket eiendom-API: teig 271/48, Lillestrøm",
        source_url: "https://ws.geonorge.no/eiendom/v1/geokoding?kommunenummer=3205&gardsnummer=271&bruksnummer=48&omrade=true&utkoordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Teigpolygon for gnr/bnr 271/48 i Lillestrøm (3205) ved Tretjerndalsveien på Frogner, brukt " +
          "til omtrentlig tomtepunkt.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: ["Gigahost, Søndre Kullerød i Sandefjord"],
    title: "Gigahost Sandefjord (DC1–DC3)",
    description:
      "Gigahosts datasentercampus i Sandefjord: DC1 (2010) og DC2 (2018) i samme bygg, og DC3 " +
      "(2023) i et eget bygg. Gigahost AS eier og driver anleggene og er Nkom-registrert.",
    municipality: "Sandefjord",
    address: "Søndre Kullerød 2",
    postal_code: "3241",
    city: "Sandefjord",
    latitude: 59.17565,
    longitude: 10.21416,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting: "Den største colocation-aktøren i Vestfold.",
    notes:
      "Runde 6 (2026-09-30): ny tittel; tidligere «Gigahost, Søndre Kullerød i Sandefjord». " +
      "Adressekonflikt: Gigahost sier DC1 ligger på Klinestadmoen (Brønnøysund: Klinestadmoen 9), " +
      "mens PeeringDB, som Gigahost selv vedlikeholder, oppgir Søndre Kullerød 2 – ca. 450 m " +
      "unna. Koordinaten er uendret. Gigahost står ikke i Statnetts lister. Et planlagt DC4 (5 " +
      "MW, 2027) har ukjent tomt og er ikke lagt inn. Runde 7 (2026-10-01): DC1 og DC2 ligger " +
      "trolig i Klinestadmoen 9, som eies av et eget eiendomsselskap, og DC3 trolig i Søndre " +
      "Kullerød 2 (bare sekundærkilder). Gigahost oppgir at DC4 er under bygging (inntil 5 MW, " +
      "2027), men tomta er ikke kjent. DC4 er derfor beholdt som lead og verken slått sammen med " +
      "campus eller lagt inn som eget anlegg.",
    kilder: [
      {
        source_name: "DataCenterMap: Gigahost, Søndre Kullerød i Sandefjord",
        source_url: "https://www.datacentermap.com/norway/sandefjord/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Gigahost AS, adresse Søndre Kullerød 2, 3241 Sandefjord.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Arcem Husnes, Grøn Næringspark",
    description:
      "Planlagt datasenter i Grøn Næringspark på Husnes. Arcem oppgir 90 MW totalt, med første fase " +
      "på 40 MW godkjent av netteier Fagne og mål om drift i 2031–2032. Første fase står i " +
      "Statnetts kø.",
    municipality: "Kvinnherad",
    postal_code: "5460",
    city: "Husnes",
    latitude: 59.8725,
    longitude: 5.77,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "90 MW i Kvinnherad, i samme næringspark som et annet planlagt anlegg. To store prosjekter i " +
      "én park i en kommune med 13 000 innbyggere.",
    notes:
      "Kvalitetsrunde 2026-09-30: koordinaten er flyttet fra Husnes sentrum til et punkt i " +
      "næringsparken. Arcems egen tomt er ikke stedfestet. 40 MW er ikke ført som sikret kraft, " +
      "fordi prosjektet står i kø hos Statnett (sak 25/02545). Runde 5: prosjektselskapet er ARCEM " +
      "GO-DC2 AS (917510784, tidligere Bonum Prosjekt 9 AS / NXT AI AS), heleid av Arcem AS. Alias: " +
      "Arcem GO-DC2.",
    kilder: [
      {
        source_name: "DataCenterMap: Arcem Husnes, Grøn Næringspark",
        source_url: "https://www.datacentermap.com/norway/husnes/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Arcem, Inc., adresse Grøn Næringspark, 5460 Husnes.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: ["NDC Husnes, Grøn Næringspark"],
    title: "Reikna NDC Husnes, Husnes industriområde",
    description:
      "Planlagt datasenter fra Reikna AS i Husnes industriområde, ved TESS Kvinnherad. Reikna la i " +
      "april 2026 bort den kommunale tomta i Grøn Næringspark og kjøpte en privat tomt på ca. 13 " +
      "000 m² med opsjon på mer. Første fase er en modul på 50 MW, med byggestart mål tidlig 2027 " +
      "og drift i 2028. 50 MW står i Statnetts kø.",
    municipality: "Kvinnherad",
    postal_code: "5460",
    city: "Husnes",
    latitude: 59.87657,
    longitude: 5.77557,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et av to datasenterprosjekter på Husnes, sammen med Arcem i Grøn Næringspark. Prosjektet " +
      "flyttet fra næringsparken til industriområdet i 2026.",
    notes:
      "Runde 2 (2026-09-30): nytt navn og ny tomt. Eget prosjekt, ikke samme anlegg som Arcem " +
      "Husnes. Koordinaten er omtrentlig, satt på adressepunktet til TESS Kvinnherad ved siden av " +
      "tomta. 150 MW-potensialet gjaldt den gamle tomta i Grøn Næringspark og er ikke videreført.",
    kilder: [
      {
        source_name: "DataCenterMap: NDC Husnes, Grøn Næringspark",
        source_url: "https://www.datacentermap.com/norway/husnes/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Reikna AS, adresse Grøn Næringspark, 5460 Husnes.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    tidligere_titler: ["Green Mountain Halden, Saugbrug"],
    title: "Saugbrugs datasenterprosjekt, Halden",
    description:
      "Mulig datasenterutvikling på Norske Skog Saugbrugs industriområde i Halden. Norske Skog og " +
      "Green Mountain har en intensjonsavtale fra februar 2026, og Norske Skog skal velge mellom " +
      "datasenter og ny produksjonslinje (PM6) i andre halvår 2026. Det finnes ingen plansak, " +
      "kraftreservasjon eller kapasitetstall.",
    municipality: "Halden",
    address: "Saugbrug industriområde",
    postal_code: "1772",
    city: "Halden",
    latitude: 59.12504,
    longitude: 11.40234,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Enda et tilfelle av datasenter på en eksisterende industritomt med kraft og nett fra før.",
    notes:
      "Runde 3 (2026-09-30): ny tittel fordi Green Mountain bare er part i en intensjonsavtale, " +
      "ikke utvikler eller operatør. Kommunestyret ble ikke enige om initiativet 17.06.2026. Tall " +
      "på 80–200 MW finnes bare i leserinnlegg. Koordinaten er Saugbrugs registrerte anleggspunkt " +
      "(Miljødirektoratet), ikke en datasentertomt. Runde 7 (2026-10-01): Statnett har ingen sak " +
      "for prosjektet ved Halden TRA. Oppstartsmøte om regulering 24.09.2025 er bare omtalt i et " +
      "leserinnlegg. Eget prosjekt, ikke Halden DC01.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Mountain Halden, Saugbrug",
        source_url: "https://www.datacentermap.com/norway/halden/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Green Mountain, adresse Saugbrug industriområde, 1772 Halden.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Halden DC01",
    description:
      "Colocation-anlegg i Halden drevet av Storespeed AS, ISO 27001-sertifisert. Magnora eier 75 % " +
      "og oppgir rundt 1 MW installert med potensial for 5 MW. Storespeed oppgir 250 kW ledig " +
      "kapasitet for nye kunder.",
    municipality: "Halden",
    address: "Violgata 8",
    postal_code: "1776",
    city: "Halden",
    latitude: 59.12347,
    longitude: 11.38597,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    why_interesting:
      "Et lite, men reelt anlegg med kjent eier, og en av Magnoras datasenterinvesteringer.",
    notes:
      "Primærkilde-runde 2026-09-30: 250 kW er ledig kapasitet, ikke anleggets størrelse. Runde 6: " +
      "anlegget er bekreftet i Magnora-rapportene (1 MW i drift, utvidelsesmulighet til 5 MW). " +
      "Magnora Data Center ASA eier 75 % av Storespeed AS; Blix Group 5 %. Storespeeds 5 MW i " +
      "Statnetts kø er ikke sikret kraft.",
    kilder: [
      {
        source_name: "DataCenterMap: Halden DC01",
        source_url: "https://www.datacentermap.com/norway/halden/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Storespeed AS, adresse Violgata 8, 1776 Halden.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Fossefall Åfjord, Stordalsveien 541",
    description:
      "Planlagt datasenter i et eksisterende industri- og kontorbygg i Stordalen i Åfjord. " +
      "Fossefall AS står i Statnetts lister med 2,2 MW reservert og 5,8 MW i kø ved Åfjord " +
      "transformatorstasjon, i en sak Storespeed tidligere omtalte som «Åfjord DC04». Fossefall " +
      "har også spilt inn 60 dekar nytt næringsareal på nabotomta til kommuneplanens arealdel. " +
      "Drift er ikke dokumentert.",
    municipality: "Åfjord",
    address: "Stordalsveien 541",
    postal_code: "7170",
    city: "Åfjord",
    latitude: 63.97861,
    longitude: 10.31937,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Et lite brownfield-prosjekt som ser ut til å ha skiftet utvikler fra Storespeed til " +
      "Fossefall, og der det samtidig søkes areal til en større utbygging på nabotomta.",
    notes:
      "Opprettet i runde 10 (2026-10-02) fra leadet «Storespeed Åfjord», med lav sikkerhet. " +
      "Aliaser: Storespeed Åfjord DC04, Beversmark østre (NÆ-2-1). Stedfestingen bygger på Åfjord " +
      "kommunes postliste (sak 2021/2130: Fossefall AS, Stordalsvegen 541, innspill til " +
      "arealdelen) og Statnett-sak 24/01506. Ingen kilde bruker ordet «datasenter» om adressen; " +
      "kommunen skriver næringsareal. Fossefalls brev og vedlegg er ikke lest. Overdragelsen fra " +
      "Storespeed er ikke kunngjort; den er utledet av at sluttkunden i Statnett-saken er byttet. " +
      "Reservasjonen står på holdingselskapet, som også har en sak ved Grenland TRA, og er ikke " +
      "ført som sikret kraft. Planlagt tilknytning 30.01.2026 er passert uten tilknyttet effekt. " +
      "Koordinaten er Kartverkets adressepunkt for Stordalsveien 541 (gnr 35 bnr 8). " +
      "Høringsfristen for arealdelen var 02.10.2026; planen er ikke vedtatt. Runde 11 " +
      "(2026-10-02): Fossefalls egne sider navngir bare Fyresdal og et svensk anlegg; Åfjord " +
      "nevnes ikke. Ingen ny informasjon.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Åfjord kommune, postliste: Fossefall AS – Stordalsvegen 541 (gnr/bnr 35/2) – Innspill til arealdelen",
        source_url: "https://www.afjord.kommune.no/tjenester/politikk-planer-og-organisasjon/postliste-dokumenter-og-vedtak/postliste-sok-etter-saker-og-dokumenter/",
        publisher: "Åfjord kommune",
        source_type: "register",
        source_date: "2025-12-05",
        primary_source: true,
        excerpt_or_summary:
          "Sak 2021/2130 (arealdelen). Dok. 2025/14803, 14917, 14918 og 15312, 5.–18.12.2025, mellom " +
          "kommunen og Fossefall AS. Vedlegg: «Kart med tomteparseller» og «WIIG – FOSEFALL (nb) " +
          "60MW». Bekrefter at Fossefall har et prosjekt på adressen; brevene er ikke lest.",
      },
      {
        source_name: "Åfjord kommune, postliste: byggesak 2026/615 Gnr 35 bnr 8 – Stordalsveien 541 – Avklaring vedrørende søknadsprosess",
        source_url: "https://www.afjord.kommune.no/tjenester/politikk-planer-og-organisasjon/postliste-dokumenter-og-vedtak/postliste-sok-etter-saker-og-dokumenter/",
        publisher: "Åfjord kommune",
        source_type: "register",
        source_date: "2026-03-12",
        primary_source: true,
        excerpt_or_summary:
          "Henvendelse 12.03.2026 og kommunens svar 27.03.2026 om søknadsprosess for eiendommen. Part " +
          "og dokumenter er unntatt offentlighet. Bekrefter at et tiltak på eiendommen er under " +
          "avklaring, ikke hvem som står bak eller hva det gjelder.",
      },
      {
        source_name: "Kommuneplanens arealdel 2026–2038, konsekvensutredning innspill: 018 Beversmark østre",
        source_url: "https://www.arealplaner.no/aafjord5058/dokumenter/1308/Konsekvensutredning%20innspill.pdf",
        publisher: "Åfjord kommune",
        source_type: "document",
        source_date: "2026-06-25",
        primary_source: true,
        excerpt_or_summary:
          "Side 46–49: forslagsstiller Fossefall AS, gnr 35 bnr 2, grunneier Skogselskapet i " +
          "Trøndelag, 60 daa fra LNFR til næringsareal. Rådmannen: innspillet tas til følge. Ordet " +
          "datasenter brukes ikke.",
      },
      {
        source_name: "Planbestemmelser til kommuneplanens arealdel 2026–2038 (høringsforslag)",
        source_url: "https://www.arealplaner.no/aafjord5058/dokumenter/1310/Planbestemmelser%20til%20kommuneplanens%20arealdel%202026-2038.pdf",
        publisher: "Åfjord kommune",
        source_type: "regulation",
        source_date: "2026-06-25",
        primary_source: true,
        excerpt_or_summary:
          "§ 2-10.3: NÆ-2-1 Beversmark østre er næringsbebyggelse med krav om vedtatt reguleringsplan " +
          "før tiltak. Forslag på høring til 02.10.2026, ikke vedtatt.",
      },
      {
        source_name: "Åfjord kommunes planregister: kommuneplanens arealdel, planID 202401",
        source_url: "https://www.arealplaner.no/aafjord5058/arealplaner/342",
        publisher: "Åfjord kommune / Norkart",
        source_type: "register",
        source_date: "2026-06-25",
        primary_source: true,
        excerpt_or_summary:
          "Planstatus planforslag. Offentlig ettersyn 25.06.–02.10.2026 etter vedtak i planutvalget. " +
          "Bekrefter planprosessen, ikke datasenteret.",
      },
      {
        source_name: "Statnett: statistikk om tilknytningssaker (kø og reservasjoner, 30.09.2026)",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/tilknytning-og-nettkapasitet/statistikk-om-tilknytningssaker/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Sak 24/01506 (ELB1715), Åfjord TRA, kunde Tensio AS, sluttkunde FOSSEFALL AS, datasenter: " +
          "2,2 MW reservert 14.11.2025 (planlagt 30.01.2026) og 5,8 MW i kø. Ingen tilknyttet effekt. " +
          "Bekrefter kraftsaken og næringstypen, ikke adressen.",
      },
      {
        source_name: "Tensio: Dette er de nye storforbrukerne av strøm i Midt-Norge",
        source_url: "https://www.tensio.no/no/proff/nyheter-proff/dette-er-de-nye-storforbrukerne-av-strom-i-midt-norge",
        publisher: "Tensio AS",
        source_type: "web",
        source_date: "2025-04-03",
        primary_source: true,
        excerpt_or_summary:
          "Netteier oppgir at Storespeed AS står i kø med 5,8 MW med uttak i Åfjord. Bekrefter at " +
          "saken var Storespeeds i april 2025. Ingen adresse.",
      },
      {
        source_name: "Storespeed.no (arkivert 05.12.2023): Åfjord DC04",
        source_url: "http://web.archive.org/web/20231205084026/https://www.storespeed.no/aringfjord--dc04.html",
        publisher: "Storespeed AS (via Internet Archive)",
        source_type: "web",
        source_date: "2023-12-05",
        primary_source: true,
        excerpt_or_summary:
          "Storespeed sikrer et brownfield-sted med 6 MW i Midt-Norge; kraft under søknad, stedet kan " +
          "være klart tidlig 2025. Siden lå uendret til august 2025. Ingen adresse.",
      },
      {
        source_name: "Kartverket adresse-API: Stordalsveien 541, Åfjord",
        source_url: "https://ws.geonorge.no/adresser/v1/sok?sok=Stordalsveien%20541&kommunenavn=%C3%85fjord",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Stordalsveien 541, 7170 Åfjord, gnr 35 bnr 8, punkt 63,97861 N 10,31937 Ø. Bekrefter " +
          "adressen, ikke at det er et datasenter der.",
      },
      {
        source_name: "Kartverket: Matrikkelen – bygningspunkt (WFS)",
        source_url: "https://wfs.geonorge.no/skwms1/wfs.matrikkelen-bygningspunkt",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Bygningsnr. 18042630 (type 319 annen kontorbygning) og 18042622 (type 219 annen " +
          "industribygning) ved Stordalsveien 541, begge tatt i bruk. Bekrefter at det står " +
          "næringsbygg på tomta, ikke bruken.",
      },
      {
        source_name: "Enhetsregisteret: Fossefall Holding AS (935794854)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/935794854",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Stiftet 25.06.2025, Oslo. Formål: utvikling, finansiering, bygging og drift av datasentre " +
          "for AI. Bekrefter selskapet og formålet, ikke anlegget.",
      },
      {
        source_name: "Enhetsregisteret: Skogselskapet i Trøndelag (990095159)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/990095159",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Forening med adresse i Skage i Namdalen. Bekrefter bare at enheten finnes; grunneierrollen " +
          "kommer fra kommunens konsekvensutredning.",
      },
      {
        source_name: "Enhetsregisteret: Stordalsveien 541 AS (924658827)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/924658827",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-10-02",
        primary_source: true,
        excerpt_or_summary:
          "Eiendomsutviklingsselskap i Halden, stiftet 2020. Navnet peker på eiendommen i Åfjord. " +
          "Bekrefter selskapet, ikke hjemmel til gnr 35 bnr 8.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "PolarDC HER01, Herøya",
    description:
      "Planlagt AI-datasenter fra Polar Data Centers i et eksisterende industribygg i Fjordgata 48 " +
      "i Herøya industripark, med ca. 40 MW startkapasitet. Reguleringsendringen ble vedtatt " +
      "17.03.2026, og Porsgrunn kommune ga byggetillatelse til POLARDC HER AS 27.03.2026. Statnett " +
      "har reservert 15 MW til prosjektselskapet.",
    municipality: "Porsgrunn",
    address: "Fjordgata 48",
    postal_code: "3936",
    city: "Porsgrunn",
    latitude: 59.11356,
    longitude: 9.63635,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Herøya er Norges største industripark, med kraft og infrastruktur fra før.",
    notes:
      "Runde 4 (2026-09-30): byggetillatelse gitt, men byggestart er ikke dokumentert, så status er " +
      "fortsatt planlagt. Planlagt tilknytning for Statnett-reservasjonen er 30.12.2028. Runde 5: " +
      "bygget er det tidligere REC Wafer-bygget, eid av Siva Herøya AS, som fester tomta av HIP. " +
      "Leadet om et CBRE-initiativ i tidligere REC-bygg gjelder dette anlegget: CBRE er " +
      "driftsleverandør for Polar, ikke egen prosjektpart. DataCenterMap fører anlegget under " +
      "markedet «Skien», men det ligger i Porsgrunn.",
    kilder: [
      {
        source_name: "DataCenterMap: PolarDC HER01, Herøya",
        source_url: "https://www.datacentermap.com/norway/skien/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført med operatør Polar Data Centers, adresse Fjordgata 48, 3936 Porsgrunn.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Adresse og kommune verifisert og geokodet med postnummer som krav.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "PolarDC DRA-OSL, Varpet i Tørdal",
    description:
      "AI-datasenter fra Polar Data Centers på Varpet industriområde i Tørdal i Drangedal. Første " +
      "trinn (DRA01, 12 MW IT) ble etablert i 2025, og Statnett oppgir 15 MW tilknyttet fra " +
      "desember 2025 og ytterligere 55 MW reservert. Statsforvalteren ga i september 2026 samlet " +
      "tillatelse for DRA1 og DRA2. Crusoe er leietaker for Crusoe Cloud.",
    municipality: "Drangedal",
    city: "Tørdal",
    latitude: 59.14649,
    longitude: 8.77174,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et AI-datasenter i drift i en liten innlandskommune, med et andre byggetrinn på gang og " +
      "mer kraft reservert.",
    notes:
      "Opprettet i runde 6 (2026-09-30) fra leadet «Polar DRA01». Aliaser: DRA01, DRA02, DRA-OSL, " +
      "Polar DC Drangedal, Crusoe Tørdal. Prosjektselskapet POLARDC DRA AS het tidligere " +
      "Klingstone AS. Anlegget er bekreftet av Statsforvalterens tillatelse (sak 2024/10650). " +
      "CBRE er Polars driftsleverandør, ikke eier. Koordinaten er omtrentlig (stedsnavnpunktet " +
      "Varpet); byggets teig er ikke bekreftet. Ikke samme anlegg som PolarDC HER01 på Herøya.",
    public_candidate: false,
    kilder: [
      {
        source_name: "Statsforvalteren: Tillatelse etter forurensningsloven – PolarDC DRA AS – Datasenter DRA-OSL – Varpet – Drangedal (sak 2024/10650)",
        source_url: "https://www.statsforvalteren.no/siteassets/vestfold-og-telemark/miljo-og-klima/forurensing/dokumenter/2026/tillatelser/polar-dc/tillatelse---polardc-dra-as.pdf",
        publisher: "Statsforvalteren i Vestfold og Telemark",
        source_type: "regulation",
        source_date: "2026-09-14",
        primary_source: true,
        excerpt_or_summary:
          "Tillatelse til PolarDC DRA AS for DRA-OSL (DRA1 og DRA2) på Varpet industriområde i " +
          "Drangedal. Klingstone AS etablerte DRA1 i 2025 (<50 MW, ikke tillatelsespliktig da). " +
          "Søknad 09.01.2026 om trinn 2. Aggregater >50 MW termisk, HVO. Varpet-planen (planID 2020 " +
          "0001), felt BI1 datasenter. Bekrefter anlegget.",
      },
      {
        source_name: "Statsforvalteren: Vilkår – PolarDC DRA AS",
        source_url: "https://www.statsforvalteren.no/siteassets/vestfold-og-telemark/miljo-og-klima/forurensing/dokumenter/2026/tillatelser/polar-dc/vilkar---polardc-dra-as.pdf",
        publisher: "Statsforvalteren i Vestfold og Telemark",
        source_type: "regulation",
        source_date: "2026-09-14",
        primary_source: true,
        excerpt_or_summary:
          "Vilkår for DRA-OSL: driftsansvarlig PolarDC DRA AS, kontinuerlig drift, testkjøring av " +
          "nødstrømsaggregater maks 450 t/år, støygrenser, støysonekart innen 3 mnd. etter oppstart.",
      },
      {
        source_name: "Statsforvalteren: Tillatelse til virksomhet etter forurensningsloven for PolarDC DRA AS for datasenter i Drangedal",
        source_url: "https://www.statsforvalteren.no/nb/vestfold-og-telemark/naringorganisasjon/tillatelse-til-a-forurense/nyheter/2026/09/tillatelse-til-virksomhet-etter-forurensningsloven-for-polardc-dra-as-for-datasenter-i-drangedal",
        publisher: "Statsforvalteren i Vestfold og Telemark",
        source_type: "web",
        source_date: "2026-09-14",
        primary_source: true,
        excerpt_or_summary:
          "Nyhetssak om vedtaket 14.09.2026 for datasenter DRA-OSL på Varpet i Drangedal; klagefrist " +
          "06.10.2026.",
      },
      {
        source_name: "Statnett: Statistikk om tilknytningssaker (Grenland TRA, Klingstone AS)",
        source_url: "https://www.statnett.no/for-aktorer-i-kraftbransjen/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/",
        publisher: "Statnett",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Grenland TRA, netteier Lede AS, sluttkunde Klingstone AS (datasenter): 15 MW tilknyttet " +
          "(21/00165, 21.12.2025) og 55 MW reservert (24/01660, reservert 28.10.2024, planlagt " +
          "tilknytning 30.12.2026). Lest via GitHub-speil.",
      },
      {
        source_name: "Polar announces new AI-ready data center powered by 100% renewable energy in Norway",
        source_url: "https://www.polardc.com/post/polar-announces-new-ai-ready-data-center-powered-by-100-renewable-energy-in-norway",
        publisher: "Polar Data Centers",
        source_type: "web",
        source_date: "2025-03-06",
        primary_source: true,
        excerpt_or_summary:
          "Polar kunngjør flerfase AI-datasenter i Tørdal; første fase DRA01 12 MW, drift 2. halvår " +
          "2025, Tier III, væskekjøling, 100 % vannkraft.",
      },
      {
        source_name: "Polar appoints CBRE to operate flagship AI-ready data center in Norway (DRA01)",
        source_url: "https://www.polardc.com/post/polar-appoints-cbre-to-operate-flagship-ai-ready-data-center-in-norway",
        publisher: "Polar Data Centers",
        source_type: "web",
        source_date: "2025-07-23",
        primary_source: true,
        excerpt_or_summary:
          "CBRE får 24/7 drift, vedlikehold og sikkerhet ved DRA01 i Tørdal; 12 MW IT i fase 1; drift " +
          "2. halvår 2025. CBRE er driftsleverandør, ikke eier.",
      },
      {
        source_name: "Polar supports Crusoe's AI growth with new high-performance data center",
        source_url: "https://www.polardc.com/post/polar-supports-crusoe-s-ai-growth-with-new-high-performance-data-center",
        publisher: "Polar Data Centers",
        source_type: "web",
        source_date: "2025-06-17",
        primary_source: true,
        excerpt_or_summary:
          "Crusoe er kunde i DRA01 (12 MW, mulighet for 52 MW), drift senere i 2025.",
      },
      {
        source_name: "Crusoe enters Europe with first Norway data center",
        source_url: "https://www.crusoe.ai/resources/newsroom/crusoe-announces-strategic-european-expansion-with-first-data-center-in",
        publisher: "Crusoe",
        source_type: "web",
        source_date: "2025-06-11",
        primary_source: true,
        excerpt_or_summary:
          "Crusoe har kontrakt på et 12 MW-anlegg i Norge med Polar for Crusoe Cloud, kan utvides til " +
          "52 MW. Stedsnavn ikke oppgitt; koblet til DRA01 via Polars melding.",
      },
      {
        source_name: "Brønnøysundregistrene: POLARDC DRA AS (928431096)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/928431096",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Stiftet 01.12.2021; historiske navn NFH 211234 AS og KLINGSTONE AS (til 12.01.2026). " +
          "Styreleder Andrew James Hayes. Bekrefter selskap og navnebytte, ikke anlegget.",
      },
      {
        source_name: "Brønnøysundregistrene: POLARDC DRA LAND AS (927295938)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/927295938",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Tidl. EXAGREEN AS (til 04.12.2025), stiftet 14.05.2021, samme styre som Polar-selskapene. " +
          "Bekrefter selskap, ikke eierskap til grunn.",
      },
      {
        source_name: "Brønnøysundregistrene: POLARDC DRA01 AS (934891538)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/934891538",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Tidl. POLAR - DRA01 AS; stiftet 07.01.2025; samme styre. Rolle i anlegget ikke " +
          "dokumentert.",
      },
      {
        source_name: "Brønnøysundregistrene: POLARDC DRA02 AS (936106536)",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/936106536",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Stiftet 26.08.2025, datasenterformål, samme styre. Rolle i trinn 2 ikke dokumentert.",
      },
      {
        source_name: "Kartverket stedsnavn: Varpet (Drangedal)",
        source_url: "https://ws.geonorge.no/stedsnavn/v1/navn?sok=Varpet&kommunenavn=Drangedal&utkoordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Stedsnavnpunkt Varpet 59.14649, 8.77174. Bekrefter stedets plassering, ikke anlegget.",
      },
      {
        source_name: "Kartverket kommuneinfo: punkt Varpet",
        source_url: "https://ws.geonorge.no/kommuneinfo/v1/punkt?nord=59.14649&ost=8.77174&koordsys=4258",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Punktet ligger i Drangedal kommune (4016), Telemark.",
      },
      {
        source_name: "Kartverket eiendom: teiger ved Varpet",
        source_url: "https://ws.geonorge.no/eiendom/v1/punkt?nord=59.14649&ost=8.77174&koordsys=4258&radius=500",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Punktet ligger på 48/141; 48/135 og 48/140 innen ca. 20 m. Bekrefter matrikkel, ikke " +
          "hvilken teig bygget står på.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Bifrost Edge Vinje, ved Vinje kraftverk",
    description:
      "Planlagt datasenter fra Bifrost Edge AS ved Statkrafts Vinje kraftverk, trolig på " +
      "kommunens datasentertomt Vesaastippen (gnr/bnr 63/5). Statnett har reservert 40 MW ved " +
      "Vinje kraftstasjon til Bifrost Edge AS. Planen er å hente strøm direkte fra kraftverket, " +
      "og avklaringen av dette hindret byggestart per juli 2026.",
    municipality: "Vinje",
    city: "Vinje",
    latitude: 59.62419,
    longitude: 7.85512,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et av få norske datasenterprosjekter med kraft reservert hos Statnett og en kommunal tomt " +
      "tilrettelagt for datasenter. Direkte tilknytning til kraftverket er uvanlig.",
    notes:
      "Opprettet i runde 4 (2026-09-30). At Bifrost skal bygge på akkurat 63/5 er utledet: det er " +
      "kommunens eneste datasentertomt ved kraftverket. Koordinaten er omtrentlig, sentroiden av " +
      "største teig på 63/5. 40 MW er ført som sikret kraft fordi Bifrost Edge AS er sluttkunde " +
      "og har bare denne saken ved Vinje; Bifrost Edge er ikke et eget prosjektselskap. Ikke " +
      "samme prosjekt som Bifrost Edges Arendal-lead (Longum nord).",
    public_candidate: false,
    kilder: [
      {
        source_name: "Statnett – reservasjoner forbruk (Power BI)",
        source_url: "https://www.statnett.no/nettkapasitet-til-produksjon-og-forbruk/foresporsler-og-reservasjon-i-nettet/#reservasjoner",
        publisher: "Statnett SF",
        source_type: "register",
        primary_source: true,
        excerpt_or_summary:
          "Sak 25/02292 (ELB1423): Vinje KRA, NO2, Statnetts kunde Statkraft Energi AS, sluttkunde " +
          "Bifrost Edge AS, datasenter, 40 MW reservert 14.12.2025, planlagt tilknytning 14.12.2026.",
      },
      {
        source_name: "Møtebok Plan- og miljøutvalet Vinje 09.06.2021 (PS 21/77)",
        source_url: "https://prep.statsforvalteren.no/contentassets/18e860e2757c42ebb82ea7ac546c716c/4-vurdering-etter-plan--og-bygningsloven.pdf",
        publisher: "Vinje kommune (publisert på statsforvalteren.no)",
        source_type: "regulation",
        source_date: "2021-06-09",
        primary_source: true,
        excerpt_or_summary:
          "Vedtak om å legge ut planprogram for detaljregulering for 63/5 Vesaastippen på høring og å " +
          "varsle oppstart av planarbeid (pbl §§ 4-1, 11-13, 12-8). Enstemmig vedtatt.",
      },
      {
        source_name: "Kartverket eiendom: 4036-63/5",
        source_url: "https://ws.geonorge.no/eiendom/v1/geokoding?kommunenummer=4036&gardsnummer=63&bruksnummer=5&utkoordsys=4258&omrade=true",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "Teiggeometri for gnr/bnr 63/5 i Vinje: to teiger nord for Vinje kraftverk (ca. 12 og 39 " +
          "mål). Bekrefter eiendommen, ikke anlegget.",
      },
      {
        source_name: "Enhetsregisteret: Bifrost Edge AS",
        source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/935435005",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-30",
        primary_source: true,
        excerpt_or_summary:
          "935435005, stiftet 09.04.2025, Kinn (c/o Localhost AS, Måløy), formål " +
          "datasentervirksomhet. Daglig leder Sindre Kvalheim, styreleder Tom Einar Jensen. Bekrefter " +
          "selskapet, ikke anlegget.",
      },
      {
        source_name: "Bifrost Edge AS – nettside",
        source_url: "https://bifrostedge.ai/",
        publisher: "Bifrost Edge AS",
        source_type: "web",
        primary_source: true,
        excerpt_or_summary:
          "Selskapet beskriver seg som en vertikalt integrert nordisk datasenterplattform for AI/HPC. " +
          "Ingen prosjekter eller lokasjoner er listet.",
      },
    ],
  },

  {
    category: "Kilder",
    item_type: "data_issue",
    title: "DataCenterMap-dekningen stopper på gratisgrensen",
    description:
      "Rundt 12 av 112 katalogoppføringer er ikke åpnet enkeltvis, fordi DataCenterMap nådde " +
      "grensen for gratis sidevisninger. Grensen er katalogens egen og respekteres; den " +
      "omgås ikke. De gjenstående markedene er navngitt: Ørnes, Masfjordnes, Sarpsborg, " +
      "Korgen, Kristiansund, Molde, Moss, Sand, Fyresdal, Røyrvik, Kirkebygden, Mandal, " +
      "Forus, Gjøvik og Hermansverk.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    notes:
      "Neste spor, i prioritert rekkefølge: PeeringDB dekker allerede Elverum og Hamar; " +
      "operatørsøk per kommune i lokalpresse; og en betalt dataeksport fra DataCenterMap hvis " +
      "kartleggingen skal bli helt komplett. Markedene har ett anlegg hver, så omfanget er lite " +
      "— men det er reelt uåpnet, ikke antatt tomt.",
    kilder: [
      {
        source_name: "DataCenterMap: grense for gratis sidevisninger nådd",
        source_url: "https://www.datacentermap.com/research/limited/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "«You have reached the limit of free page views.» Katalogen tilbyr et gratisnivå for bla og henviser profesjonell bruk til betalte dataeksporter. Grensen ble nådd etter at rundt 100 av 112 oppføringer var åpnet.",
      },
      {
        source_name: "PeeringDB: dekning av de gjenstående kommunene",
        source_url: "https://www.peeringdb.com/api/fac?country=NO",
        publisher: "PeeringDB",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Elverum (to Nordavind-anlegg), Molde/Eide (Troll Housing) og Hamar (Nordavind Heggvin) er dekket gjennom PeeringDB uten katalogen. De øvrige gjenstående markedene har ingen PeeringDB-fasilitet.",
      },
    ],
  },

  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Prosessindustri",
    item_type: "finding",
    title: "Herøya industripark",
    description:
      "Norges største industripark. Minst seks anlegg med utslippstillatelse på samme område: Yara Porsgrunn (gjødsel), Eramet Norway Porsgrunn (ferrolegeringer), INOVYN PVC-fabrikk, Addcon Nordic, REEtec demonstrasjonsanlegg for sjeldne jordarter og Norsk Gjenvinning." +
      " Yara Porsgrunn alene har en ammoniakkfabrikk på 530 000 tonn i året, tre salpetersyrefabrikker på til sammen 1,3 millioner tonn syre, to NPK-fabrikker på rundt 2 millioner tonn og en kalksalpeterfabrikk på rundt 1 million tonn.",
    municipality: "Porsgrunn",
    address: "Hydrovegen 45",
    city: "Porsgrunn",
    latitude: 59.12046,
    longitude: 9.62139,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et sammenhengende industriområde av denne størrelsen setter rammene for hele Porsgrunn — tungtrafikk, utslipp til luft og vann, og beredskapssoner rundt kjemisk produksjon.",
    notes:
      "Ett funn for hele parken, ikke seks. Anleggene har egne tillatelser, men deler område, infrastruktur og lokal påvirkning." +
      " Kapasitetstallene er Yaras egne. De øvrige anleggene i parken har ikke oppgitt kapasitet.",
    kilder: [
      {
        source_name: "Norske utslipp: Herøya industripark",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Seks anlegg med utslippstillatelse registrert på samme område, alle regulert av Miljødirektoratet. Flertallet har utslipp til både luft og vann.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Yara Porsgrunn",
        source_url: "https://www.yara.no/om-yara/yara-i-norge/yara-porsgrunn/",
        publisher: "Yara Norge",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Kapasitetstall per fabrikkenhet: ammoniakk 530 000 tonn/år, tre salpetersyrefabrikker 1,3 millioner tonn/år, to NPK-fabrikker rundt 2,0 millioner tonn/år, kalksalpeter rundt 1 million tonn/år. Europas største produksjonskapasitet for NPK etter nitrofosfatmetoden.",
      },
      {
        source_name:
          "Yara fortsetter arbeidet med å kutte Norges største punktutslipp",
        source_url:
          "https://www.yara.com/news-and-media/news/archive/news-2022/yara-fortsetter-arbeidet-med-a-kutte-norges-storste-punktutslipp/",
        publisher: "Yara International",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Yara omtaler selv anlegget på Herøya som Norges største punktutslipp.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Kjemisk industri",
    item_type: "finding",
    title: "Rafnes og Bamble industriområde",
    description:
      "Petrokjemisk industriområde i Bamble med INOVYN Norge avd. Rafnes, Ineos Rafnes, Ineos Bamble og Norsk Spesialolje. Produksjon av uorganiske og organiske kjemiske råvarer og basisplast.",
    municipality: "Bamble",
    address: "Herreveien 801",
    city: "Stathelle",
    latitude: 59.09613,
    longitude: 9.59335,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Petrokjemi er blant de få virksomhetstypene som gir sikkerhetssoner og beredskapsplaner langt utenfor egen tomt.",
    notes: "Fire tillatelser på ett industriområde, samlet i ett funn.",
    kilder: [
      {
        source_name: "Norske utslipp: Rafnes og Bamble industriområde",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Fire anlegg med utslippstillatelse fra Miljødirektoratet, alle med utslipp til luft og vann.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Metallindustri",
    item_type: "finding",
    title: "Mo industripark",
    description:
      "Stort industriområde i Mo i Rana med Elkem Rana, Ferroglobe Mangan Norge, 7 Steel Nordic (tidligere Celsa Armeringsstål), SMA Mineral og Miljøteknikk Terrateam. Smelteverk, stålproduksjon, kalk og materialgjenvinning på samme sted.",
    municipality: "Rana",
    address: "Verkstedløypa 11",
    city: "Mo i Rana",
    latitude: 66.31336,
    longitude: 14.16755,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Industriparken er byens økonomiske ryggrad og samtidig dens tyngste miljøbelastning, midt i et boligområde med 26 000 innbyggere.",
    notes:
      "Fem tillatelser samlet i ett funn. Alle deler industriområdet ved Ranfjorden.",
    kilder: [
      {
        source_name: "Norske utslipp: Mo industripark",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Fem anlegg med utslippstillatelse fra Miljødirektoratet innenfor samme industriområde.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Prosessindustri",
    item_type: "finding",
    title: "Borregaard og Sarpsborg industriområde",
    description:
      "Borregaards bioraffineri i Sarpsborg, med spesialcellulose og eget forbrenningsanlegg, sammen med Nordic Paper, Hafsil og SAREN Energy på samme område." +
      " Borregaard bruker rundt 1 million kubikkmeter tømmer i året og har en årlig produksjonskapasitet på 160 000 tonn lignin.",
    municipality: "Sarpsborg",
    address: "Borregaard",
    city: "Sarpsborg",
    latitude: 59.27292,
    longitude: 11.11629,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av Europas mest integrerte bioraffinerier, midt i Sarpsborg. Lukt fra celluloseproduksjon er en dokumentert og langvarig lokal sak.",
    notes: "Fem tillatelser på samme industriområde ved Glomma.",
    kilder: [
      {
        source_name: "Norske utslipp: Borregaard og Sarpsborg industriområde",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Fem anlegg med utslippstillatelse fra Miljødirektoratet, flertallet med utslipp til både luft og vann.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Om Borregaard",
        source_url: "https://www.borregaard.com/company",
        publisher: "Borregaard",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Bioraffineriet bruker rundt 1 million kubikkmeter tømmer i året og produserer spesialcellulose, biopolymerer, biovanillin, cellulosefibriller og bioetanol.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Prosessindustri",
    item_type: "finding",
    title: "Øra industriområde",
    description:
      "Industriområdet på Øra i Fredrikstad med Kronos Titan (titandioksid), Kemira Chemicals, Polynt Composites, Unger Fabrikker, FREVARs forbrenningsanlegg og SAREN Energy Bio-El.",
    municipality: "Fredrikstad",
    address: "Habornveien 61",
    city: "Gamle Fredrikstad",
    latitude: 59.18537,
    longitude: 10.96719,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Seks tunge anlegg på én halvøy tett på boligområdene i Gamle Fredrikstad, med både kjemisk produksjon og avfallsforbrenning.",
    notes: "Seks tillatelser samlet i ett funn.",
    kilder: [
      {
        source_name: "Norske utslipp: Øra industriområde",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Seks anlegg med utslippstillatelse fra Miljødirektoratet på samme industriområde.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Prosessindustri",
    item_type: "finding",
    title: "Mongstad raffineri og industriområde",
    description:
      "Norges største oljeraffineri, med tilhørende kraftvarmeverk, SAR Treatment og Puma Energy på samme område." +
      " Raffineriet har en kapasitet på 12 millioner tonn råolje i året, tilsvarende 230 000 fat per dag, og råoljeterminalen kan lagre 9,5 millioner fat.",
    municipality: "Alver",
    address: "Mongstad 121",
    city: "Mongstad",
    latitude: 60.81494,
    longitude: 5.03326,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Raffineriet er landets største punktutslipp av CO2 og et av de største industrianleggene overhodet.",
    notes: "Fire tillatelser på Mongstad-området.",
    kilder: [
      {
        source_name: "Norske utslipp: Mongstad raffineri og industriområde",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Raffineri og kraftvarmeverk med utslippstillatelse fra Miljødirektoratet, med utslipp til luft og vann.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Equinors raffineri på Mongstad",
        source_url: "https://www.equinor.com/no/energi/mongstad",
        publisher: "Equinor",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Raffineriet har kapasitet på 12 millioner tonn råolje i året (230 000 fat per dag). Råoljeterminalen har kapasitet på 9,5 millioner fat.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Kjemisk industri",
    item_type: "finding",
    title: "Dynea-området på Lillestrøm",
    description:
      "Kjemisk industriområde med Dynea Lillestrøm, Allnex Norway, Microbeads og Life Technologies. Produksjon av basisplast og kjemiske produkter.",
    municipality: "Lillestrøm",
    address: "Svelleveien 33",
    city: "Lillestrøm",
    latitude: 59.9467,
    longitude: 11.06882,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Kjemisk produksjon midt i Lillestrøm, i et område som ellers bygges ut med bolig.",
    notes: "Fire tillatelser på samme område.",
    kilder: [
      {
        source_name: "Norske utslipp: Dynea-området på Lillestrøm",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Fire anlegg med utslippstillatelse fra Miljødirektoratet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Metallindustri",
    item_type: "finding",
    title: "Fiskaa industriområde, Kristiansand",
    description:
      "Industriområdet på Fiskaa med Glencore Nikkelverk, Elkem Carbon og Elkem Testvirksomhet." +
      " Glencore Nikkelverk har en årlig kapasitet på rundt 95 000 tonn nikkel, 30 000 tonn kobber og 5 200 tonn kobolt.",
    municipality: "Kristiansand",
    address: "Vesterveien 31",
    city: "Kristiansand",
    latitude: 58.1388,
    longitude: 7.97123,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Nikkelverket er et av Europas største raffinerier for nikkel, og ligger tett på boligområder vest i Kristiansand.",
    notes: "Tre tillatelser på samme område.",
    kilder: [
      {
        source_name: "Norske utslipp: Fiskaa industriområde, Kristiansand",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Tre anlegg med utslippstillatelse fra Miljødirektoratet, alle med utslipp til luft og vann.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Nikkelverk — vår historie",
        source_url: "https://www.nikkelverk.no/en/who-we-are/our-history",
        publisher: "Glencore Nikkelverk",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Årlig kapasitet er bygget opp til rundt 95 000 tonn nikkel, i tillegg til kobber og kobolt. Anlegget er et av de største nikkelraffineriene i den vestlige verden.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Kjemisk industri",
    item_type: "finding",
    title: "Jotun og BASF i Sandefjord",
    description:
      "Jotun Gimle, Jotun Vindal og BASF Sandefjord — maling, lakk og kjemiske produkter.",
    municipality: "Sandefjord",
    address: "Hystadveien 167",
    city: "Sandefjord",
    latitude: 59.11094,
    longitude: 10.22479,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Tre kjemiske produksjonsanlegg i en by på 60 000, i områder som ellers er bolig og næring.",
    notes: "Tre tillatelser i samme by, ikke samme tomt.",
    kilder: [
      {
        source_name: "Norske utslipp: Jotun og BASF i Sandefjord",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Tre anlegg med utslippstillatelse fra Miljødirektoratet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Prosessindustri",
    item_type: "finding",
    title: "Tjeldbergodden",
    description:
      "Metanolfabrikk og industrigassanlegg (AGA) på Tjeldbergodden i Aure.",
    municipality: "Aure",
    address: "Tjeldbergoddvegen 100",
    city: "Kjørsvikbugen",
    latitude: 63.41242,
    longitude: 8.68501,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Nordens største metanolfabrikk, i en kommune med 3 500 innbyggere — anlegget definerer stedet.",
    notes: "To tillatelser på samme anlegg.",
    kilder: [
      {
        source_name: "Norske utslipp: Tjeldbergodden",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Metanolfabrikk og industrigassanlegg med utslippstillatelse fra Miljødirektoratet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Prosessindustri",
    item_type: "finding",
    title: "Heidelberg Materials Brevik sementfabrikk",
    description:
      "Sementfabrikk i Brevik med utslippstillatelse fra Miljødirektoratet, og anlegg for forbrenning av farlig avfall på samme sted." +
      " Karbonfangstanlegget i Brevik, åpnet i 2025 som verdens første i fullskala i sementindustrien, fanger rundt 400 000 tonn CO2 i året — omtrent halvparten av fabrikkens utslipp.",
    municipality: "Porsgrunn",
    address: "Setrevegen 2",
    city: "Brevik",
    latitude: 59.06192,
    longitude: 9.68934,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Sementproduksjon er blant de største punktutslippene i landet, og fabrikken ligger rett ved boligbebyggelsen i Brevik.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret." +
      " Fangstanlegget gir skipstrafikk med flytende CO2 fra Brevik til Øygarden — en transportkjede som i seg selv er stedsrelevant.",
    kilder: [
      {
        source_name:
          "Norske utslipp: Heidelberg Materials Brevik sementfabrikk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Brevik cement plant",
        source_url:
          "https://www.sement.heidelbergmaterials.no/en/norcembrevik_eng",
        publisher: "Heidelberg Materials Sement Norge",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget fanger rundt 400 000 tonn CO2 per år, om lag 50 prosent av fabrikkens utslipp. Flytende CO2 skipes til mottaksanlegg i Øygarden for lagring under havbunnen, som del av Langskip.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Metallindustri",
    item_type: "finding",
    title: "Alcoa Lista aluminiumsverk",
    description:
      "Aluminiumsverk på Lista med utslipp til luft og vann. Aludyne Norway ligger på samme område." +
      " Nominell kapasitet er 95 000 tonn primæraluminium i året etter oppstart av elektrolysehall 3.",
    municipality: "Farsund",
    address: "Vollmonaveien 40",
    city: "Farsund",
    latitude: 58.07307,
    longitude: 6.78323,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et aluminiumsverk definerer arbeidsmarkedet og miljøbildet i en kommune på 9 500 innbyggere.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret." +
      " Følg opp: Alcoa har i egne pressemeldinger omtalt både kapasitetsøkning og stenging av én produksjonslinje for å kutte kraftkostnader. Faktisk driftsnivå må sjekkes på nytt før tallet brukes som dagens produksjon.",
    kilder: [
      {
        source_name: "Norske utslipp: Alcoa Lista aluminiumsverk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Alcoa Norge",
        source_url: "https://www.alcoa.com/norway/no",
        publisher: "Alcoa",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppstart av elektrolysehall 3 ga en kapasitetsøkning på 31 000 tonn og bringer verket opp til en nominell kapasitet på 95 000 tonn i året.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Metallindustri",
    item_type: "finding",
    title: "Hydro Karmøy og Speira",
    description:
      "Aluminiumsverk og valseverk på Karmøy — Hydro Aluminium Karmøy og Speira Karmøy Rolling Mill på samme område.",
    municipality: "Karmøy",
    address: "Hydrovegen 160",
    city: "Håvik",
    latitude: 59.31491,
    longitude: 5.31259,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av Norges største aluminiumsanlegg, tett på boligområdene på Håvik.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Hydro Karmøy og Speira",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Metallindustri",
    item_type: "finding",
    title: "Hydro Aluminium Sunndal",
    description:
      "Europas største aluminiumsverk etter kapasitet, på Sunndalsøra." +
      " Verket har en kapasitet på 400 000 tonn primæraluminium og 500 000 tonn støperiprodukter i året, i tillegg til 80 000 tonn anoder.",
    municipality: "Sunndal",
    address: "Flaggnutvegen 1",
    city: "Sunndalsøra",
    latitude: 62.68051,
    longitude: 8.55392,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Anlegget er grunnen til at Sunndalsøra finnes som tettsted, og dominerer dalbunnen fysisk.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Hydro Aluminium Sunndal",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Sunndal Primary Production",
        source_url:
          "https://www.hydro.com/en/global/about-hydro/hydro-worldwide/europe/norway/sunndal/sunndal-primary-production/",
        publisher: "Hydro",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Europas største aluminiumsverk, med kapasitet på 400 000 tonn primæraluminium og 500 000 tonn støperiprodukter per år, samt 80 000 tonn anoder.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Metallindustri",
    item_type: "finding",
    title: "Hydro Aluminium Årdal",
    description:
      "Aluminiumsverk og karbonfabrikk i Øvre Årdal, to anlegg med hver sin utslippstillatelse.",
    municipality: "Årdal",
    address: "Røtisvegen 20B",
    city: "Øvre Årdal",
    latitude: 61.31157,
    longitude: 7.82489,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Verket ligger midt i dalbunnen i en kommune på 5 000 innbyggere, med boligbebyggelse tett inntil.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Hydro Aluminium Årdal",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Metallindustri",
    item_type: "finding",
    title: "Hydro Aluminium Husnes",
    description: "Aluminiumsverk på Husnes i Kvinnherad.",
    municipality: "Kvinnherad",
    address: "Onarheimsvegen 52",
    city: "Husnes",
    latitude: 59.86812,
    longitude: 5.76826,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Ligger i samme kommune som to planlagte datasentre i Grøn Næringspark — samlet gir det stort kraftuttak i en liten kommune.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Hydro Aluminium Husnes",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Metallindustri",
    item_type: "finding",
    title: "Boliden Odda sinkverk",
    description:
      "Sinkverk på Eitrheim i Odda, med Fluorsid Noralf på samme område." +
      " Verket produserer i dag rundt 200 000 tonn sink i året, og utvidelsen Green Zinc Odda skal ta kapasiteten til 350 000 tonn.",
    municipality: "Ullensvang",
    address: "Eitrheim",
    city: "Odda",
    latitude: 60.08839,
    longitude: 6.53337,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av Europas største sinkverk, innerst i Sørfjorden med boligbebyggelse tett på. Området har lang historie med tungmetallforurensning.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret." +
      " Utvidelsen er en av de største industriinvesteringene på fastlandet på mange år, og gir flere år med anleggsarbeid innerst i Sørfjorden.",
    kilder: [
      {
        source_name: "Norske utslipp: Boliden Odda sinkverk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Boliden øker sinkkapasiteten i Odda",
        source_url:
          "https://www.metalsupply.no/article/view/142372/boliden_oker_sinkkapasiteten_i_odda",
        publisher: "Metalsupply",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Sinkverket har i dag en årlig kapasitet på 200 000 tonn. Utvidelsen tar kapasiteten til 350 000 tonn sink i året, en økning på 75 prosent, med ny røsteovn, nytt svovelsyreanlegg og ny elektrolysehall.",
      },
      {
        source_name: "Boliden Odda",
        source_url: "https://afry.com/no-no/prosjekt/boliden-odda",
        publisher: "AFRY",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Prosjektet Green Zinc Odda 4.0 er en totalmodernisering av sinkverket, med en samlet investering på rundt 700 millioner euro.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Metallindustri",
    item_type: "finding",
    title: "Finnfjord smelteverk",
    description: "Ferrosilisiumverk på Finnfjord i Senja kommune.",
    municipality: "Senja",
    address: "Ferroveien 5A",
    city: "Finnsnes",
    latitude: 69.22259,
    longitude: 18.08218,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Det største industrianlegget i Midt-Troms, tett på Finnsnes.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Finnfjord smelteverk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Metallindustri",
    item_type: "finding",
    title: "Elkem Salten",
    description: "Smelteverk i Sørfold med utslipp til luft og vann.",
    municipality: "Sørfold",
    address: "Valljordveien 34",
    city: "Straumen",
    latitude: 67.36347,
    longitude: 15.58938,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Dominerende arbeidsplass og utslippskilde i en kommune på under 2 000 innbyggere.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Elkem Salten",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Prosessindustri",
    item_type: "finding",
    title: "Norske Skog Skogn",
    description: "Papirfabrikk på Skogn i Levanger.",
    municipality: "Levanger",
    address: "Sjøvegen 108",
    city: "Skogn",
    latitude: 63.71185,
    longitude: 11.15832,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "En av landets største papirfabrikker, med egen havn og tungtransport gjennom tettstedet.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Norske Skog Skogn",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Prosessindustri",
    item_type: "finding",
    title: "Norske Skog Saugbrugs",
    description:
      "Papirfabrikk midt i Halden sentrum. Green Mountain har samtidig en mulig datasenterutvikling på samme industriområde.",
    municipality: "Halden",
    address: "Porsnesveien 4",
    city: "Halden",
    latitude: 59.12504,
    longitude: 11.40234,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "En papirfabrikk i sentrum av en by på 32 000 er uvanlig, og industriområdet er nå aktuelt for datasenter.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Norske Skog Saugbrugs",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Avfall",
    item_type: "finding",
    title: "Noah Langøya",
    description:
      "Behandlings- og deponianlegg for farlig avfall på øya Langøya utenfor Holmestrand, i et tidligere kalkbrudd." +
      " Tillatelsen åpner for inntil 1 060 000 tonn avfall til sluttbehandling i året. Mottakskapasiteten for uorganisk farlig avfall rekker til rundt 2030, med planlagt tilbakeføring av øya til friluftsformål i 2034.",
    municipality: "Holmestrand",
    address: "Langøya",
    city: "Holmestrand",
    latitude: 59.49039,
    longitude: 10.38501,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Landets viktigste anlegg for uorganisk farlig avfall, på en øy med begrenset gjenværende kapasitet. Både driften og hva som skjer etterpå er en nasjonal sak.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret." +
      " Hva som skal erstatte Langøya etter 2030 er en uavklart nasjonal sak. Raudsand i Molde har vært blant de foreslåtte alternativene.",
    kilder: [
      {
        source_name: "Norske utslipp: Noah Langøya",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Tillatelse for Noah Solutions",
        source_url:
          "https://www.miljodirektoratet.no/globalassets/dokumenter/industri/noahsolutions-tillatelse030222.pdf",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Tillatelsen omfatter mottak av inntil 1 060 000 tonn avfall per år til sluttbehandling på Langøya.",
      },
      {
        source_name: "Sikrer mottakskapasiteten i minst sju år",
        source_url:
          "https://www.noah.no/sikrer-mottakskapasiteten-i-minst-sju-ar/",
        publisher: "NOAH",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Behandlingskapasitet for uorganisk farlig avfall frem til 2030. Tidsplanen for endelig tilbakeføring til friluftsformål i 2034 endres ikke.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Avfall",
    item_type: "finding",
    title: "Returkraft energigjenvinning",
    description:
      "Forbrenningsanlegg for avfall med energigjenvinning i Kristiansand." +
      " Anlegget tar imot rundt 130 000 tonn restavfall i året fra hele Agder, og har vært i drift siden 2010.",
    municipality: "Kristiansand",
    address: "Setesdalsveien 205",
    city: "Kristiansand",
    latitude: 58.18072,
    longitude: 7.93311,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Regionens avfallsforbrenning, i Setesdalsveien tett på boligområder.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret." +
      " Returkraft har også et CCS-prosjekt under utvikling. Anlegget ligger på Langemyr.",
    kilder: [
      {
        source_name: "Norske utslipp: Returkraft energigjenvinning",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Om Returkraft",
        source_url: "https://www.returkraft.no/om-returkraft",
        publisher: "Returkraft",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget på Langemyr i Kristiansand tar imot rundt 130 000 tonn restavfall per år fra Agder-regionen, og startet drift i 2010.",
      },
      {
        source_name: "Endret tillatelse for Returkraft AS",
        source_url:
          "https://www.statsforvalteren.no/siteassets/fm-agder/dokument-agder/miljo-og-klima/forurensning/tillatelser/2020-returkraft/endret-tillatelse-for-returkraft-as.pdf",
        publisher: "Statsforvalteren i Agder",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Gjeldende tillatelse etter forurensningsloven for forbrenningsanlegget.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Avfall",
    item_type: "finding",
    title: "BIR Ressurs energigjenvinning",
    description:
      "Forbrenningsanlegg for avfall i Rådal i Bergen, med utslipp til luft og vann." +
      " Tillatelsen omfatter inntil 240 000 tonn avfall i året, med nominell timekapasitet på 28,7 tonn. I 2024 ga forbrenningen 300 GWh varme til fjernvarmenettet og 90 GWh strøm.",
    municipality: "Bergen",
    address: "Fanavegen 219",
    city: "Rådal",
    latitude: 60.2826,
    longitude: 5.31782,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Bergens avfallsforbrenning, i et område som ellers er bolig og handel.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: BIR Ressurs energigjenvinning",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Forbrenningsanlegget",
        source_url:
          "https://bir.no/om-bir/%C3%A5rsrapport-2024/baerekraft-og-samfunnsansvar/forbrenningsanlegget/",
        publisher: "BIR",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget kan brenne 28 tonn avfall per time og tar imot rundt 200 000 tonn restavfall årlig. I 2024 ga forbrenningen 300 GWh varmeenergi til fjernvarmenettet og 90 GWh elektrisitet.",
      },
      {
        source_name: "Endring av tillatelse etter forurensningsloven for BIR",
        source_url:
          "https://www.statsforvalteren.no/siteassets/fm-vestland/miljo-og-klima/kunngjering/bir.pdf",
        publisher: "Statsforvalteren i Vestland",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Tillatelsen gjelder forbrenning av inntil 240 000 tonn avfall per år, med nominell timekapasitet 28,7 tonn og maksimal timekapasitet 31,4 tonn.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Avfall",
    item_type: "finding",
    title: "Forus Energigjenvinning",
    description:
      "Forbrenningsanlegg med to linjer på Forus, sammen med Lyse Neos fjernvarmeanlegg i samme område." +
      " De to linjene har en samlet kapasitet på 110 000 tonn avfall i året, og gir 225 GWh til fjernvarme og 50 GWh strøm. Anlegget har vært i drift siden 2002 og går døgnkontinuerlig.",
    municipality: "Sandnes",
    address: "Forusbeen 202",
    city: "Sandnes",
    latitude: 58.88332,
    longitude: 5.69922,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Avfallsforbrenning midt i Nord-Jærens største næringsområde, tett på bolig i både Sandnes og Stavanger.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret." +
      " Eierne er IVAR IKS, Lyse Neo og Westco. Lyse Neos fjernvarmeanlegg ligger på samme område.",
    kilder: [
      {
        source_name: "Norske utslipp: Forus Energigjenvinning",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Hva gjør vi",
        source_url: "https://www.forusenergi.no/hva-gjor-vi",
        publisher: "Forus Energigjenvinning",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "To forbrenningslinjer med samlet kapasitet 110 000 tonn avfall per år, som gir 225 GWh tilgjengelig for fjernvarme og 50 GWh elektrisitet. I drift siden 2002, døgnkontinuerlig.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Prosessindustri",
    item_type: "finding",
    title: "Rockwool Moss",
    description:
      "Produksjon av mineralull i Moss, med utslipp til luft og vann.",
    municipality: "Moss",
    address: "Værlegata 56",
    city: "Moss",
    latitude: 59.42707,
    longitude: 10.66059,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting: "Et tungt produksjonsanlegg nær Moss sentrum og havna.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Rockwool Moss",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Prosessindustri",
    item_type: "finding",
    title: "Leca Rælingen",
    description: "Produksjon av lettklinker i Rælingen.",
    municipality: "Rælingen",
    address: "Årnesvegen 1",
    city: "Nordby",
    latitude: 59.88635,
    longitude: 11.11214,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Det eneste tunge industrianlegget i en ellers boligpreget kommune på Nedre Romerike.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Leca Rælingen",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Gruve",
    item_type: "finding",
    title: "Sibelco Nordic Stjernøya",
    description:
      "Nefelinsyenittbrudd på Stjernøya i Alta, med egen utskipningshavn.",
    municipality: "Alta",
    address: "Lillebukt 2",
    city: "Kvalfjord",
    latitude: 70.26402,
    longitude: 22.61788,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av verdens få nefelinsyenittbrudd, på en øy uten veiforbindelse. Uttaket former hele øya.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Sibelco Nordic Stjernøya",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Gruve",
    item_type: "finding",
    title: "Quartz Corp Drag",
    description:
      "Kvartsforedling på Drag i Hamarøy, basert på uttak i området.",
    municipality: "Hamarøy",
    address: "Hellandsveien 14",
    city: "Drag",
    latitude: 68.04504,
    longitude: 16.08919,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Hjørnesteinsbedriften i et tettsted på rundt 500 innbyggere.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Quartz Corp Drag",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Avfall",
    item_type: "finding",
    title: "Speira Recycling Raudsand",
    description:
      "Gjenvinningsanlegg for aluminium på Raudsand i Molde, i et tidligere gruveområde.",
    municipality: "Molde",
    address: "Kristenvikvegen 50",
    city: "Raudsand",
    latitude: 62.84727,
    longitude: 8.11761,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Raudsand har vært foreslått som nasjonalt deponi for farlig avfall, og gruveområdet er en langvarig lokal og nasjonal strid.",
    notes:
      "Adressen er nærmeste adresse til anleggets registrerte punkt. Kapasitet og produksjonsvolum er ikke oppgitt i registeret.",
    kilder: [
      {
        source_name: "Norske utslipp: Speira Recycling Raudsand",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegg med utslippstillatelse regulert av Miljødirektoratet, som håndterer de største virksomhetene. Registeret dokumenterer at anlegget finnes og er regulert, ikke hvor store utslippene er i dag.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Kilder",
    item_type: "note",
    title: "Norske utslipp er den beste inngangen til tunge anlegg",
    description:
      "Miljødirektoratets utslippsregister dekker 866 anlegg nasjonalt, med koordinat, bransje og " +
      "forurensningsmyndighet. Hvem som regulerer anlegget er i praksis et størrelsesfilter: " +
      "Miljødirektoratet håndterer de største, statsforvalterne resten. Det gir en autoritativ " +
      "kandidatliste uten å måtte gjette hva som er stort.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    notes:
      "Denne runden dekket de 157 Miljødirektoratet-regulerte anleggene i prioriterte bransjer. De " +
      "øvrige 709, i hovedsak statsforvalterregulerte og mindre, er ikke gjennomgått enkeltvis. " +
      "Registeret oppgir ikke kapasitet — tonn per år, MW og personekvivalenter må hentes andre steder.",
    kilder: [
      {
        source_name: "Norske utslipp, nasjonal gjennomgang",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "866 anlegg med utslippstillatelse i Norge. 211 er regulert av Miljødirektoratet selv — de største virksomhetene — resten av statsforvalterne. 157 av de 211 ligger i bransjer med tydelig områdebetydning: avfall, metall, kjemi, sement, papir, uttak og lagring.",
      },
    ],
  },

  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Bekkelaget renseanlegg",
    description:
      "Oslos største avløpsrenseanlegg, bygget inn i fjellet ved Ormsund. Kapasiteten ble doblet " +
      "fra 270 000 til 540 000 nitrogen-personekvivalenter ved utvidelsen som ble satt i prøvedrift i 2021. " +
      "Anlegget kan ta imot 7 000 liter avløpsvann per sekund.",
    municipality: "Oslo",
    address: "Ormsundveien 5",
    postal_code: "0198",
    city: "Oslo",
    latitude: 59.88263,
    longitude: 10.77039,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et renseanlegg i denne størrelsen er en varig nabo: lukt, tungtransport av slam og " +
      "anleggsperioder som strekker seg over år. Bekkelaget ligger tett på bolig på Ormsund og Ekeberg.",
    notes:
      "Fjellanlegg — det synlige fotavtrykket er mindre enn kapasiteten tilsier. Kommunale " +
      "renseanlegg står ikke i Miljødirektoratets utslippsregister; tallene her kommer fra Oslo kommune selv.",
    kilder: [
      {
        source_name: "Bekkelaget renseanlegg",
        source_url:
          "https://www.oslo.kommune.no/vann-og-avlop/bekkelaget-renseanlegg/",
        publisher: "Oslo kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget er beregnet for 540 000 nitrogen-personekvivalenter etter utvidelsen, og mottok 330 000 i 2024. Maksimalt 7 000 liter per sekund kan tas imot, hvorav 3 500 liter per sekund gjennom full rensing.",
      },
      {
        source_name: "I dag dobles kapasiteten ved Bekkelaget RA",
        source_url: "https://www.vanytt.no/?p=19175",
        publisher: "VANytt",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Anlegget fra 2001 var bygget for 270 000 personekvivalenter. Prøvedrift av det utvidede anlegget startet i 2021, med kapasitet beregnet for avløpet fra rundt 500 000 mennesker i 2040.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse, kommune og koordinat bekreftet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "IVAR sentralrenseanlegg Nord-Jæren, Mekjarvik",
    description:
      "Regionens hovedrenseanlegg i Mekjarvik i Randaberg, med avløpsvann fra over 300 000 " +
      "innbyggere i fem kommuner. Anlegget har også biogass- og gjødselproduksjon fra slammet.",
    municipality: "Randaberg",
    address: "Mekjarvik 10",
    postal_code: "4072",
    city: "Randaberg",
    latitude: 59.02015,
    longitude: 5.6172,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Lukt fra biogassdelen har vært en reell nabosak med tilsyn fra Statsforvalteren — " +
      "nettopp den typen forhold en adressesøkende bruker vil vite om.",
    notes:
      "Følg opp: gjeldende tillatelse og dagens kapasitet i personekvivalenter er ikke bekreftet i " +
      "et gjeldende vedtak. 260 000 pe er en tidligere tillatelse, ikke dagens tall.",
    kilder: [
      {
        source_name: "Sentralrenseanlegget Nord-Jæren",
        source_url: "https://www.ivar.no/snj/",
        publisher: "IVAR IKS",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget tar imot avløpsvann fra over 300 000 innbyggere i Randaberg, Stavanger, Sola, Sandnes og Gjesdal. I drift siden 1992, med nytt renseanlegg ferdig høsten 2018.",
      },
      {
        source_name: "Utslippsløyve for Sentralrenseanlegg Nord-Jæren",
        source_url:
          "https://www.statsforvalteren.no/siteassets/fm-rogaland/dokument-fmro/miljo/brev-og-artiklar/utsleppsloyve-snj-130813.pdf",
        publisher: "Statsforvalteren i Rogaland",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Utslippstillatelse for anlegget. Tidligere tillatelse var gitt for 260 000 personekvivalenter.",
      },
      {
        source_name:
          "Statsforvalteren har konkludert etter for mye lukt fra IVAR sitt biogassanlegg i Mekjarvik",
        source_url:
          "https://www.bygdebladet.no/statsforvalteren-har-konkludert-etter-for-mye-lukt-fra-ivar-sitt-biogassanlegg-i-mekjarvik/s/5-100-625322",
        publisher: "Bygdebladet",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Lukt fra biogassanlegget i Mekjarvik har vært behandlet som tilsynssak hos Statsforvalteren.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse, kommune og koordinat bekreftet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Høvringen avløpsrenseanlegg",
    description:
      "Trondheims største avløpsrenseanlegg, på Høvringen vest i byen. Dimensjonert for " +
      "170 000 personekvivalenter og avløpsvann fra to tredjedeler av kommunens befolkning.",
    municipality: "Trondheim",
    address: "Bynesveien 68A",
    postal_code: "7018",
    city: "Trondheim",
    latitude: 63.44655,
    longitude: 10.33656,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Anlegget ligger på en utsatt kolle mot fjorden, med boligområder på Byåsen ovenfor. " +
      "Trondheim har også et nabolagsanlegg på Ladehammeren, som ikke er kartlagt her ennå.",
    notes:
      "Ladehammeren renseanlegg (LARA) er ikke lagt inn. Bør med i neste runde sammen med IVAR " +
      "Grødaland og Bergens anlegg (Haukeland 132 000 pe, Flesland 63 000 pe, Hjellestad 56 000 pe).",
    kilder: [
      {
        source_name:
          "Høvringen avløpsrenseanlegg — Rent vann i Trondheimsfjorden",
        source_url:
          "https://www.trondheim.kommune.no/globalassets/10-bilder-og-filer/10-byutvikling/kommunalteknikk/vann-og-avlop/hovringen-avlopsrenseanlegg.pdf",
        publisher: "Trondheim kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget tar imot avløpsvann fra to tredjedeler av Trondheims befolkning, et rensedistrikt på 95 km², dimensjonert for 170 000 personekvivalenter og en gjennomsnittlig tilrenning på 4 000 kubikkmeter i timen.",
      },
      {
        source_name: "Kartverket adresse-API",
        source_url: "https://ws.geonorge.no/adresser/v1/sok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Adresse, kommune og koordinat bekreftet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Kilder",
    item_type: "note",
    tidligere_titler: ["Kommunale avløpsrenseanlegg mangler i Norske utslipp"],
    title:
      "Rettelse: avløpsanlegg ligger i et eget datasett hos Miljødirektoratet",
    description:
      "Forrige runde konkluderte med at kommunale avløpsrenseanlegg «praktisk talt ikke finnes» hos " +
      "Miljødirektoratet. Det var feil. Søket ble gjort i vår egen synkede kopi av industridelen av " +
      "Norske utslipp, som bare inneholder virksomheter med industribransjekode. Miljødirektoratet har " +
      "et eget, komplett datasett for avløpsanlegg — 2 961 anlegg med kapasitet, renseprosess, " +
      "driftsstatus, koordinat og faktaark — og faktaarkene ligger på norskeutslipp.no. VEAS, " +
      "Bekkelaget, Høvringen og IVAR Nord-Jæren står alle der.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    notes:
      "Metodefeilen var å lete i vår egen delmengde og konkludere om kilden. Et fravær i et uttrekk sier " +
      "noe om uttrekket, ikke om registeret — og et fravær i et register sier ikke noe om virkeligheten. " +
      "Sjekk alltid hvilket datasett kilden faktisk tilbyr før fraværet skrives ned som et funn.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg (kart-API)",
        source_url:
          "https://kart3.miljodirektoratet.no/arcgis/rest/services/avloep/MapServer/1",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Eget datasett for avløpsanlegg med navn, kommune, driftsstatus, renseprinsipp, renseprosess, dimensjonert kapasitet i personekvivalenter, utslippsmengder, koordinat og lenke til faktaark. Dataene kommer fra kommunenes årlige KOSTRA-rapportering.",
      },
      {
        source_name: "Avløpsanlegg (datasett i Geonorge)",
        source_url:
          "https://kartkatalog.geonorge.no/metadata/uuid/276db913-395d-4867-9717-eb86636806d9",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Datasettet er publisert i Geonorge med WMS og nedlasting, uten tilgangsbegrensninger.",
      },
    ],
  },

  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "NRA renseanlegg, Strømmen",
    description:
      "Nedre Romerike avløpsanlegg, bygget i fjellhaller på Strømmen. Dimensjonert kapasitet 228 170 " +
      "personekvivalenter, og det største renseanlegget i landet etter VEAS, Bekkelaget og IVAR Nord-Jæren. " +
      "180 000 mennesker er tilknyttet nettet. Rensekapasiteten er i dag inntil 1 400 liter per sekund, og " +
      "utvidelsen av sentralrenseanlegget RA-2 skal doble den til 2 800 liter per sekund.",
    municipality: "Lillestrøm",
    address: "Stalsbergenga 42",
    postal_code: "1466",
    city: "Strømmen",
    latitude: 59.954,
    longitude: 11.0225,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et fjellanlegg midt i Strømmen, i full utvidelse fram mot de skjerpede rensekravene som gjelder fra " +
      "2030. Anleggsperioden er lang, og adkomsten går gjennom et tett bebygd område.",
    notes:
      "Skill tallene: 228 170 pe er dimensjonert kapasitet fra registeret, 180 000 er antall tilknyttede " +
      "personer, og 1 400 til 2 800 liter per sekund er hydraulisk kapasitet før og etter utvidelsen.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: NRA renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=17694",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 228 170 personekvivalenter og renseprosess «Sekundær-, fosfor- og nitrogenrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Derfor er RA2 så viktig",
        source_url:
          "https://www.nrva.no/prosjekter/sentralrenseanlegget-pa-strommen/derfor-er-ra2-sa-viktig",
        publisher: "Nedre Romerike vann- og avløpsselskap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget ligger i tunnelhaller på Strømmen og renser mekanisk, kjemisk og biologisk for organisk stoff, nitrogen og fosfor. Kapasiteten på inntil 1 400 liter per sekund dobles til 2 800 liter per sekund når det nye anlegget står ferdig. 180 000 mennesker er tilknyttet nettet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Odderøya renseanlegg",
    description:
      "Kristiansands hovedrenseanlegg, med størstedelen av anlegget sprengt inn i fjellet på Odderøya. " +
      "Dimensjonert kapasitet 200 000 personekvivalenter. Utvidelsen startet i 2014 og de siste prosesstrinnene, " +
      "inkludert biogassanlegget, ble satt i drift i 2021. Utvidelsen krevde uttak av rundt 93 000 kubikkmeter " +
      "fast fjell.",
    municipality: "Kristiansand",
    address: "Sjølystveien 33",
    postal_code: "4610",
    city: "Kristiansand",
    latitude: 58.1335,
    longitude: 7.9993,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Anlegget ligger på en øy som ellers er friområde og kulturarena midt i Kristiansand, med " +
      "ventilasjonstårn og gasstank som synlige installasjoner over bakken.",
    notes:
      "Bare 50 til 60 prosent av kapasiteten er i bruk. I 2024 lekket plastkuler fra anlegget ut i sjøen — en " +
      "dokumentert hendelse, ikke en antatt påvirkning.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Odderøya renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=17756",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 200 000 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Plastkuler fra Odderøya renseanlegg er lekket ut i sjøen",
        source_url:
          "https://www.kristiansand.kommune.no/aktuelt/2024/plastkuler-fra-odderoya-renseanlegg-er-lekket-ut-i-sjoen/",
        publisher: "Kristiansand kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Kommunen melder at plastkuler fra renseanlegget er lekket ut i sjøen.",
      },
      {
        source_name:
          "Ny pumpestasjon på Bredalsholmen og sjøledning til Odderøya renseanlegg",
        source_url:
          "https://www.kristiansand.kommune.no/navigasjon/bolig-kart-og-eiendom/vi-bygger-kristiansand/nyheter/ny-pumpestasjon-pa-bredalsholmen-og-sjoledning-til-odderoya-renseanlegg/",
        publisher: "Kristiansand kommune",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Ny pumpestasjon på Bredalsholmen med sjøledning fram til Odderøya renseanlegg.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Fuglevik avløpsanlegg",
    description:
      "MOVARs hovedrenseanlegg for Mosseregionen, med dimensjonert kapasitet 192 000 personekvivalenter. " +
      "Anlegget har vært forsøksarena for HIAS-prosessen for biologisk fosforfjerning.",
    municipality: "Moss",
    address: "Båthavnveien 50",
    postal_code: "1570",
    city: "Dilling",
    latitude: 59.3841,
    longitude: 10.6618,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Regionens største VA-anlegg, ved kysten sør for Moss, i et område med både bolig og båthavn.",
    notes:
      "MOVAR IKS er ansvarlig enhet. Kambo avløpsanlegg i samme kommune (26 000 pe) er ikke lagt inn.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Fuglevik avløpsanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=17511",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 192 000 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "HIAS renseanlegg, Ottestad",
    description:
      "Hamarregionens hovedrenseanlegg, drevet av HIAS IKS. Dimensjonert kapasitet 165 000 personekvivalenter. " +
      "Anlegget ble i 2021 fullt omlagt til HIAS-prosessen, der fosfor fjernes biologisk i stedet for kjemisk, " +
      "med en maksimal biologisk kapasitet oppgitt til 192 000 personekvivalenter. Anlegget mottar avløp fra " +
      "rundt 65 000 mennesker i tillegg til industri.",
    municipality: "Stange",
    address: "Sandvikavegen 136",
    postal_code: "2312",
    city: "Ottestad",
    latitude: 60.7666,
    longitude: 11.0783,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av landets største renseanlegg, og opphavet til en renseprosess som nå prøves ut andre steder i " +
      "landet. Utslippet går til Mjøsa, som er drikkevannskilde.",
    notes:
      "Tre ulike tall: 165 000 pe dimensjonert kapasitet i registeret, 192 000 pe maksimal biologisk kapasitet " +
      "etter omleggingen, og rundt 65 000 faktisk tilknyttede personer.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: HIAS renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=9706",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 165 000 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Renseanlegg",
        source_url: "https://www.hias.no/avlop/renseanlegg/",
        publisher: "HIAS IKS",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget i Ottestad mottar avløpsvann fra rundt 65 000 mennesker i tillegg til avløp fra industri og næring. I 2021 var anlegget fullt omlagt til HIAS-prosessen med maksimal biologisk kapasitet 192 000 pe.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Tønsberg renseanlegg",
    description:
      "Interkommunalt renseanlegg med dimensjonert kapasitet 160 000 personekvivalenter. Fem kommuner i " +
      "Vestfold — Holmestrand, Horten, Tønsberg, Færder og Sandefjord — har utredet felles nitrogenrensing, og " +
      "et nytt nitrogenrenseanlegg er under planlegging.",
    municipality: "Tønsberg",
    address: "Carl 15 gate 8A",
    postal_code: "3150",
    city: "Tolvsrød",
    latitude: 59.262,
    longitude: 10.4983,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av de største anleggene i landet, og midt i den utbyggingen skjerpede nitrogenkrav for Oslofjorden " +
      "utløser. Anleggene dimensjoneres for belastningen i 2060.",
    notes:
      "Planarbeidet omfatter plassering ved Åsgårdstrand, Slagentangen og et eget nitrogenrenseanlegg ved Enga " +
      "i Sandefjord. Hvilke anlegg som blir bygget hvor er ikke avklart.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Tønsberg renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=9520",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 160 000 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Nytt nitrogenrenseanlegg",
        source_url:
          "https://www.tonsberg.kommune.no/tjenester/vann-avlop-og-renovasjon/ren-oslofjord-nitrogenrensing/nytt-nitrogenrenseanlegg/",
        publisher: "Tønsberg kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Kommunen planlegger nytt nitrogenrenseanlegg som del av arbeidet for ren Oslofjord.",
      },
      {
        source_name:
          "KVU felles renseanlegg for fem kommuner — dimensjoneringsgrunnlag",
        source_url:
          "https://www.rense.no/getfile.php/132199-1756373647/Dokumenter/Prosjekter/PN-2%20Dimensjoneringsgrunnlag.pdf",
        publisher: "Tønsberg renseanlegg IKS",
        source_type: "document",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Konseptvalgutredning for felles nitrogenrensing for Holmestrand, Horten, Tønsberg, Færder og Sandefjord. Anleggene dimensjoneres for belastningen i 2060, med SSBs høye befolkningsframskriving.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Flesland renseanlegg",
    description:
      "Bergens største avløpsrenseanlegg, med dimensjonert kapasitet 152 000 personekvivalenter. Anlegget ble " +
      "bygget om til sekundærrensing i perioden fram til 2016, med rister, sand- og fettfjerning, biologisk " +
      "rensing, sedimentering og mekanisk slamfortykking.",
    municipality: "Bergen",
    address: "Slettenvegen 93",
    postal_code: "5258",
    city: "Blomsterdalen",
    latitude: 60.2834,
    longitude: 5.2083,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Ligger tett på Bergen lufthavn og boligområdene i Blomsterdalen. Bergens fem renseanlegg håndterer til " +
      "sammen avløpet fra rundt 300 000 innbyggere.",
    notes:
      "Bergen har fem anlegg; Holen (134 000 pe), Knappen (63 000 pe), Kvernevik (56 000 pe) og Ytre Sandviken " +
      "(44 000 pe) er de øvrige. Holen er lagt inn som eget funn; de tre minste er ikke.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Flesland renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=9759",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 152 000 personekvivalenter og renseprosess «Sekundærrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Flesland renseanlegg",
        source_url: "https://www.ncc.no/vare-prosjekter/flesland-renseanlegg/",
        publisher: "NCC",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Det nye anlegget omfatter rister, sand- og fettfjerning, biologisk rensing, sedimentering og mekanisk slamfortykking.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Grødaland renseanlegg og biogassanlegg",
    description:
      "IVARs anlegg på Grødaland i Hå, med dimensjonert kapasitet 150 000 personekvivalenter. Et av landets " +
      "største kombinerte rense- og biogassanlegg, med kapasitet til å ta imot avløp fra 150 000 mennesker.",
    municipality: "Hå",
    address: "Nordsjøvegen 2385",
    postal_code: "4365",
    city: "Nærbø",
    latitude: 58.6311,
    longitude: 5.5976,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Anlegget kombinerer avløpsrensing, slambehandling og biogassproduksjon på ett sted i et jordbruksområde " +
      "på Jæren, og tar også imot avfall fra næringsmiddelindustrien.",
    notes:
      "IVAR IKS er ansvarlig enhet. Vik renseanlegg i Klepp (80 000 pe) er IVARs tredje store anlegg og er " +
      "lagt inn separat.",
    kilder: [
      {
        source_name:
          "Miljødirektoratet, avløpsanlegg: Grødaland renseanlegg og biogassanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=18492",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 150 000 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Renseanlegg Grødaland",
        source_url: "https://www.ivar.no/grodaland/",
        publisher: "IVAR IKS",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Grødaland er et av Norges største rense- og biogassanlegg, med kapasitet til å motta avløpsvann fra 150 000 mennesker.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Lillehammer renseanlegg",
    description:
      "Lillehammers renseanlegg, med dimensjonert kapasitet 144 000 personekvivalenter og full rensing for " +
      "både fosfor og nitrogen.",
    municipality: "Lillehammer",
    address: "Dampsagvegen 120",
    postal_code: "2609",
    city: "Lillehammer",
    latitude: 61.095,
    longitude: 10.4641,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Kapasiteten er langt høyere enn folketallet i kommunen, og anlegget har nitrogenrensing som mange " +
      "større anlegg ennå ikke har. Utslippet går til Mjøsa.",
    notes:
      "Den høye dimensjonerte kapasiteten skyldes blant annet industripåslipp og sesongvariasjon, ikke bare " +
      "innbyggertall. Faktisk belastning er ikke hentet inn.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Lillehammer renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=9487",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 144 000 personekvivalenter og renseprosess «Sekundær-, fosfor- og nitrogenrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Holen renseanlegg",
    description:
      "Bergens nest største avløpsrenseanlegg, på Laksevåg, med dimensjonert kapasitet 134 000 " +
      "personekvivalenter. Bygget om til sekundærrensing i 2016.",
    municipality: "Bergen",
    address: "Lyrenesveien 13",
    postal_code: "5165",
    city: "Laksevåg",
    latitude: 60.394,
    longitude: 5.2736,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Ligger inne i et tett boligområde på Laksevåg, i motsetning til Flesland som ligger i utkanten.",
    notes: "Anlegget er i fjell. Bergen kommune er ansvarlig enhet.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Holen renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=9764",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 134 000 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Solumstrand avløpsanlegg",
    description:
      "Drammens hovedrenseanlegg, med dimensjonert kapasitet 130 000 personekvivalenter — oppgitt av " +
      "Norconsult som 104 000 pe med forberedelse for 120 000. Anlegget har ledig kapasitet og oppfyller dagens " +
      "rensekrav, men skal legges ned når det nye regionale renseanlegget på Nordbykollen står ferdig.",
    municipality: "Drammen",
    address: "Svelvikveien 166",
    postal_code: "3037",
    city: "Drammen",
    latitude: 59.712,
    longitude: 10.2673,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et stort anlegg med kort gjenværende levetid: skjerpede nitrogenkrav gjør at seks anlegg i regionen " +
      "skal erstattes av ett nytt. Det betyr både avvikling her og en stor anleggsperiode i nærheten.",
    notes:
      "Ulike tall fra ulike kilder: 130 000 pe i Miljødirektoratets register, 104 000 pe med forberedelse for " +
      "120 000 hos rådgiveren. Registerets tall er lagt til grunn, avviket er notert.",
    kilder: [
      {
        source_name:
          "Miljødirektoratet, avløpsanlegg: Solumstrand avløpsanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=9381",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 130 000 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Solumstrand avløpsrenseanlegg",
        source_url:
          "https://norconsult.no/prosjekter/solumstrand-avloepsrenseanlegg/",
        publisher: "Norconsult",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Anlegget har kapasitet 104 000 personekvivalenter, med forberedelse for 120 000. Rehabilitering og utvidelse med biologisk trinn innenfor eksisterende bygningsvolum.",
      },
      {
        source_name: "Nytt regionalt renseanlegg",
        source_url:
          "https://www.drammen.kommune.no/om-kommunen/organisasjon-administrasjon/prosjekter/nytt-regionalt-renseanlegg/",
        publisher: "Drammen kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Nytt regionalt renseanlegg skal erstatte Mjøndalen, Muusøya, Bokerøya og Solumstrand i Drammen, Linnes i Lier og Lahell i Asker.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Ladehammeren renseanlegg",
    description:
      "Trondheims nest største renseanlegg, med dimensjonert kapasitet 122 000 personekvivalenter. Anlegget " +
      "har bare primærrensing, som Høvringen.",
    municipality: "Trondheim",
    address: "Ormen Langes vei 29",
    postal_code: "7040",
    city: "Trondheim",
    latitude: 63.448,
    longitude: 10.4257,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Begge Trondheims store anlegg ligger på primærrensing. Skjerpede krav i avløpsdirektivet gjør at dette " +
      "må endres, og det betyr store ombygginger på to anlegg tett på byen.",
    notes:
      "Renseprinsippet i registeret er «Kjemisk», renseprosessen «Primærrensing». Høvringen står som «Annet» " +
      "og «Primærrensing». Se eget funn for Høvringen.",
    kilder: [
      {
        source_name:
          "Miljødirektoratet, avløpsanlegg: Ladehammeren renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=9175",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 122 000 personekvivalenter og renseprosess «Primærrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Øra avløpsanlegg (FREVAR)",
    description:
      "FREVARs avløpsrenseanlegg på Øra i Fredrikstad, med dimensjonert kapasitet 120 000 personekvivalenter.",
    municipality: "Fredrikstad",
    address: "Habornveien 63",
    postal_code: "1630",
    city: "Gamle Fredrikstad",
    latitude: 59.1831,
    longitude: 10.9678,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Ligger på samme industriområde som forbrenningsanlegget og den kjemiske industrien på Øra — samlet gir " +
      "det en tett konsentrasjon av tunge anlegg på én halvøy.",
    notes:
      "Overlapper geografisk med funnet «Øra industriområde», som dekker forbrenning og kjemisk industri på " +
      "samme sted. Dette funnet gjelder avløpsanlegget spesifikt.",
    kilder: [
      {
        source_name:
          "Miljødirektoratet, avløpsanlegg: Øra avløpsanlegg (FREVAR)",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=8943",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 120 000 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Gardermoen sentralrenseanlegg",
    description:
      "Renseanlegget for Ullensaker og Nannestad, med dimensjonert kapasitet 120 000 personekvivalenter og " +
      "full rensing for fosfor og nitrogen. Nytt anlegg er nylig åpnet.",
    municipality: "Ullensaker",
    address: "Rensevegen 84",
    postal_code: "2060",
    city: "Gardermoen",
    latitude: 60.1698,
    longitude: 11.1123,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av få store anlegg med nitrogenrensing på plass. Ligger i et område under kraftig utbygging rundt " +
      "hovedflyplassen.",
    notes:
      "Ullensaker kommune er ansvarlig enhet. Bårlidalen i Eidsvoll (35 000 pe) og Fjellfoten i Nes (30 000 pe) " +
      "er nabolagets øvrige store anlegg og er ikke lagt inn.",
    kilder: [
      {
        source_name:
          "Miljødirektoratet, avløpsanlegg: Gardermoen sentralrenseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=17703",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 120 000 personekvivalenter og renseprosess «Sekundær-, fosfor- og nitrogenrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Gardermoen renseanlegg åpnet",
        source_url:
          "https://www.ullensaker.kommune.no/aktuelt/gardermoen-renseanlegg-apnet--nytt-teknologiloft-for-rent-vann-i-ullensaker-og-nannestad/",
        publisher: "Ullensaker kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Nytt renseanlegg åpnet, omtalt som et teknologiløft for rent vann i Ullensaker og Nannestad.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Sandefjord renseanlegg, Enga",
    description:
      "Sandefjords renseanlegg på Enga, med dimensjonert kapasitet 103 500 personekvivalenter. Et eget " +
      "nitrogenrenseanlegg på Enga er del av det regionale planarbeidet i Vestfold.",
    municipality: "Sandefjord",
    address: "Enga 7",
    postal_code: "3231",
    city: "Sandefjord",
    latitude: 59.0861,
    longitude: 10.2146,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Anlegget ligger i byen, og skjerpede nitrogenkrav peker mot utbygging på samme sted.",
    notes:
      "Se funnet for Tønsberg renseanlegg for det regionale nitrogenarbeidet de fem Vestfold-kommunene står i.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Sandefjord renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=8944",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 103 500 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Saulekilen renseanlegg",
    description:
      "Arendals hovedrenseanlegg, med dimensjonert kapasitet 85 000 personekvivalenter.",
    municipality: "Arendal",
    address: "Utnesveien 55",
    postal_code: "4817",
    city: "His",
    latitude: 58.4243,
    longitude: 8.7429,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Regionens største VA-anlegg, i et område med boligbebyggelse på His.",
    notes:
      "Anlegget er i fjell. Faktisk belastning og eventuelle utvidelsesplaner er ikke hentet inn — bør følges " +
      "opp mot skjerpede rensekrav.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Saulekilen renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=9752",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 85 000 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Knarrdalstrand renseanlegg",
    description:
      "Felles renseanlegg for Porsgrunn og Skien, satt i drift i 1990 og oppgradert i 2013 med kjemisk " +
      "sedimentering dimensjonert for 82 500 personekvivalenter. Anlegget skal gjøres om til pumpestasjon når " +
      "det nye Grenland renseanlegg står ferdig.",
    municipality: "Porsgrunn",
    address: "Drangedalsvegen 79",
    postal_code: "3920",
    city: "Porsgrunn",
    latitude: 59.137,
    longitude: 9.6265,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Anlegget går fra å være regionens hovedrenseanlegg til å bli en pumpestasjon. Overføringsledninger fra " +
      "dette punktet til det nye anlegget i ytre Frierfjorden er en betydelig anleggsjobb.",
    notes:
      "Statusen er fortsatt aktiv. Omleggingen til pumpestasjon skjer først når Grenland renseanlegg er bygget " +
      "— se eget funn for det.",
    kilder: [
      {
        source_name:
          "Miljødirektoratet, avløpsanlegg: Knarrdalstrand renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=8936",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 82 500 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Planprogram for Grenland renseanlegg med transportsystem",
        source_url:
          "https://www.bamble.kommune.no/_f/p1/i95b61c77-8cf9-4dac-aa82-e210218f9110/planprogram-for-grenland-renseanlegg.pdf",
        publisher: "Bamble kommune",
        source_type: "document",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Fra Knarrdalstrand, som blir omgjort til pumpestasjon, føres overføringsledninger videre til det nye renseanlegget i ytre del av Frierfjorden. Det nye anlegget skal erstatte Elstrøm, Knarrdalstrand, Heistad og Salen.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Vik renseanlegg",
    description:
      "IVARs renseanlegg på Vik i Klepp, med dimensjonert kapasitet 80 000 personekvivalenter.",
    municipality: "Klepp",
    address: "Nordsjøvegen 1248",
    postal_code: "4343",
    city: "Orre",
    latitude: 58.7125,
    longitude: 5.5414,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "IVARs tredje store renseanlegg på Jæren, ved kysten i et jordbruks- og friluftsområde.",
    notes:
      "Bore renseanlegg i samme kommune (30 000 pe, mekanisk) er ikke lagt inn.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Vik renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=10904",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 80 000 personekvivalenter og renseprosess «Sekundærrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Årabrot avløpsanlegg",
    description:
      "Haugesunds hovedrenseanlegg, med dimensjonert kapasitet 62 350 personekvivalenter og bare primærrensing.",
    municipality: "Haugesund",
    address: "Jovegen 60",
    postal_code: "5514",
    city: "Haugesund",
    latitude: 59.4439,
    longitude: 5.2482,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Byens største VA-anlegg, og et av de store norske anleggene som fortsatt bare har primærrensing. " +
      "Skjerpede krav vil kreve ombygging.",
    notes:
      "Renseprinsippet står som «Annet» i registeret, renseprosessen som «Primærrensing». Planer for " +
      "oppgradering er ikke undersøkt — åpent punkt.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Årabrot avløpsanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=10446",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 62 350 personekvivalenter og renseprosess «Primærrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Alvim renseanlegg",
    description:
      "Sarpsborgs hovedrenseanlegg, med dimensjonert kapasitet 60 000 personekvivalenter.",
    municipality: "Sarpsborg",
    address: "Fredrikstadveien 71",
    postal_code: "1722",
    city: "Sarpsborg",
    latitude: 59.2718,
    longitude: 11.0761,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Ligger i Sarpsborg by, i samme område som industrien langs Glomma.",
    notes:
      "Utslippet går til Glomma. Nitrogenkrav for Oslofjorden vil treffe også dette anlegget; planer er ikke " +
      "undersøkt.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Alvim renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=8935",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 60 000 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Nordre Follo renseanlegg",
    description:
      "Interkommunalt renseanlegg ved Vinterbro, med dimensjonert kapasitet 56 500 personekvivalenter og full " +
      "rensing for fosfor og nitrogen.",
    municipality: "Ås",
    address: "Høyungsletta 19",
    postal_code: "1407",
    city: "Vinterbro",
    latitude: 59.7534,
    longitude: 10.7833,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Anlegget ligger i fjell ved Vinterbro, tett på både E6 og boligområder, og har nitrogenrensing på plass.",
    notes: "Søndre Follo renseanlegg i Vestby (35 000 pe) er ikke lagt inn.",
    kilder: [
      {
        source_name:
          "Miljødirektoratet, avløpsanlegg: Nordre Follo renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=17705",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 56 500 personekvivalenter og renseprosess «Sekundær-, fosfor- og nitrogenrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "MIRA renseanlegg, Sørumsand",
    description:
      "Midtre Romerike avløpsselskaps renseanlegg ved Sørumsand, med dimensjonert kapasitet 63 000 " +
      "personekvivalenter.",
    municipality: "Lillestrøm",
    address: "Lystadveien 140",
    postal_code: "1920",
    city: "Sørumsand",
    latitude: 59.9794,
    longitude: 11.2203,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Det andre store renseanlegget i Lillestrøm kommune, ved siden av NRA på Strømmen.",
    notes: "Utslippet går til Glomma.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: MIRA renseanlegg",
        source_url:
          "https://www.norskeutslipp.no/Templates/NorskeUtslipp/Pages/company.aspx?CompanyID=28258",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 63 000 personekvivalenter og renseprosess «Sekundær- og fosforrensing». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Tomasjord renseanlegg",
    description:
      "Tromsøs største avløpsrenseanlegg, med dimensjonert kapasitet 38 400 personekvivalenter og kun " +
      "mekanisk rensing. Strandvegen renseanlegg i samme kommune (20 500 pe) er også mekanisk.",
    municipality: "Tromsø",
    address: "Tromsøysundvegen 216",
    postal_code: "9024",
    city: "Tomasjord",
    latitude: 69.6618,
    longitude: 19.0146,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Tromsø er den største norske byen uten biologisk eller kjemisk avløpsrensing. Skjerpede krav i " +
      "avløpsdirektivet innebærer at byen må bygge ut betydelig rensekapasitet.",
    notes:
      "Kun mekanisk rensing er dokumentert i Miljødirektoratets register for begge anleggene. Hva Tromsø " +
      "planlegger er ikke funnet — et åpent punkt som bør følges opp mot kommunens hovedplan for avløp.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg: Tomasjord renseanlegg",
        source_url:
          "https://kart3.miljodirektoratet.no/arcgis/rest/services/avloep/MapServer/1",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med dimensjonert kapasitet 38 400 personekvivalenter og renseprosess «Primærrensing (mekanisk)». Data fra kommunenes årlige KOSTRA-rapportering. Siste rapportering 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Kilder",
    item_type: "note",
    title:
      "Miljødirektoratets avløpsregister er den nasjonale inngangen til renseanlegg",
    description:
      "Miljødirektoratet har et eget, komplett datasett over avløpsanlegg, basert på kommunenes " +
      "årlige KOSTRA-rapportering. Det er tilgjengelig som åpent kart-API, med dimensjonert kapasitet i " +
      "personekvivalenter, renseprosess, driftsstatus, koordinat og faktaark per anlegg. 2 961 anlegg " +
      "nasjonalt, hvorav 139 over 10 000 pe og 30 over 50 000 pe.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    notes:
      "Kapasitetsfeltet er dimensjonert kapasitet, ikke faktisk belastning: VEAS står med 1 100 000 pe " +
      "mens faktisk belastning er rundt 867 000, og Bekkelaget med 570 000 mot 330 000 rapportert i 2024. " +
      "Bruk aldri feltet som et mål på hvor mye som faktisk renses.",
    kilder: [
      {
        source_name: "Miljødirektoratet, avløpsanlegg — nasjonalt uttrekk",
        source_url:
          "https://kart3.miljodirektoratet.no/arcgis/rest/services/avloep/MapServer/1",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "2 961 registrerte avløpsanlegg nasjonalt. 413 har kapasitet over 2 000 pe, 139 over 10 000 pe, 30 over 50 000 pe og 18 over 100 000 pe. Hver rad har navn, kommune, driftsstatus, renseprinsipp, renseprosess, dimensjonert kapasitet i personekvivalenter, koordinat og lenke til faktaark.",
      },
    ],
  },

  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Vannbehandlingsanlegg",
    item_type: "finding",
    title: "Oset vannbehandlingsanlegg",
    description:
      "Oslos hovedvannbehandlingsanlegg, i fjell ved nordenden av Maridalsvannet. Behandler normalt " +
      "85 prosent av byens drikkevann — rundt 95 millioner kubikkmeter i året, eller 3 000 liter per sekund — i " +
      "to av landets største fjellhaller. Fire nye haller for vannlagring, hver på 25 millioner liter, er " +
      "sprengt ut.",
    municipality: "Oslo",
    city: "Oslo",
    latitude: 59.972,
    longitude: 10.78916,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Drikkevannet til de fleste i Oslo behandles her. Anlegget ligger i Maridalen, et område " +
      "med strenge restriksjoner nettopp fordi det er drikkevannskilde — noe som får konsekvenser for all " +
      "arealbruk i nedbørfeltet.",
    notes:
      "Koordinaten er stedsnavnet «Oset» (fabrikk) i Kartverkets register, ikke en adresse. Anlegget er " +
      "et fjellanlegg; det synlige fotavtrykket er lite. Skullerud vannbehandlingsanlegg, som dekker resten av " +
      "byen, er ikke lagt inn.",
    kilder: [
      {
        source_name: "Oset vannbehandlingsanlegg",
        source_url: "https://no.wikipedia.org/wiki/Oset_vannbehandlingsanlegg",
        publisher: "Wikipedia",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Anlegget renser drikkevann fra Maridalsvannet og dekker normalt 85 prosent av Oslos behov, tilsvarende 95 millioner kubikkmeter i året eller 3 000 liter per sekund. Anlegget er Nord-Europas største i fjell, med to haller på 150 meters lengde, 27 meters bredde og 16 meters høyde.",
      },
      {
        source_name: "Bli med inn i de skjulte fjellhallene",
        source_url:
          "https://www.nab.no/bli-med-inn-i-de-skjulte-fjellhallene-som-snart-skal-fylles-med-100-millioner-liter-vann/s/5-143-235790",
        publisher: "Nordre Aker Budstikke",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Fire nye fjellhaller, hver med lagringskapasitet på 25 millioner liter vann, er sprengt ut ved anlegget.",
      },
      {
        source_name: "Kartverket stedsnavn-API",
        source_url: "https://api.kartverket.no/stedsnavn/v1/navn",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Stedsnavn, kommune og koordinat bekreftet i Kartverkets stedsnavnregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "VA-tunnel/fjellanlegg",
    item_type: "finding",
    title:
      "Ny vannforsyning Oslo: Huseby vannbehandlingsanlegg og Holsfjordtunnelen",
    description:
      "Oslos reservevannforsyning: en 19 kilometer lang tunnel fra Holsfjorden i Lier til Huseby, " +
      "og et nytt vannbehandlingsanlegg i fjell under Husebyskogen. Vannbehandlingsanlegget får en " +
      "produksjonskapasitet på 367 000 kubikkmeter per døgn, inntaks- og overføringsanlegget for råvann " +
      "638 000 kubikkmeter per døgn, og overføringsanlegget for rentvann 23 000 kubikkmeter per time. " +
      "Tunnelen er ferdig drevet og går under Røa og videre under Bærum. Anlegget skal være i drift i 2028, " +
      "med istandsetting fra våren 2027.",
    municipality: "Oslo",
    city: "Oslo",
    latitude: 59.9397,
    longitude: 10.66269,
    verification_status: "verified_public_source",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Landets største VA-prosjekt, og det berører adresser langt utenfor selve anlegget: " +
      "tunnelen går under boligområder i Oslo, Bærum og Lier, og riggområdene har gitt flere år med " +
      "anleggstrafikk og sprengning.",
    notes:
      "Koordinaten er stedsnavnet Husebyskogen i Oslo. Anlegget ligger i fjell; punktet er en " +
      "representasjon av overflaten over anlegget, ikke en adresse. Tunnelen er en linje gjennom tre " +
      "kommuner og er ikke representert geografisk — dette funnet bør få geometri når modellen støtter det.",
    kilder: [
      {
        source_name: "Berørte områder av ny vannforsyning i Oslo",
        source_url:
          "https://www.oslo.kommune.no/vann-og-avlop/ny-vannforsyning-oslo/berorte-omrader/",
        publisher: "Oslo kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Prosjektet omfatter en 19 km lang tunnel fra Holsfjorden til Huseby, nytt vannbehandlingsanlegg under Husebyskogen og overføringsanlegg. Tunnelen går blant annet under Røa og videre under Bærum.",
      },
      {
        source_name: "Slik bygger vi ny vannforsyning",
        source_url:
          "https://www.oslo.kommune.no/vann-og-avlop/ny-vannforsyning-oslo/slik-bygger-vi-ny-vannforsyning/",
        publisher: "Oslo kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Inntaks- og overføringsanlegget for råvann får maksimal kapasitet 638 000 kubikkmeter per døgn. Vannbehandlingsanlegget får produksjonskapasitet 367 000 kubikkmeter per døgn, og overføringsanlegget for rentvann 23 000 kubikkmeter per time.",
      },
      {
        source_name: "Nytt vannanlegg på Huseby blir ferdig i 2027",
        source_url:
          "https://www.aftenposten.no/oslo/i/ExpLka/nytt-vannanlegg-paa-huseby-blir-ferdig-i-2027",
        publisher: "Aftenposten",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Milepæl i prosjektet omtalt, med 7 millioner arbeidstimer. Reservevannløsningen skal være i drift i 2028, og istandsetting starter våren 2027.",
      },
      {
        source_name: "Kartverket stedsnavn-API",
        source_url: "https://api.kartverket.no/stedsnavn/v1/navn",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Stedsnavn, kommune og koordinat bekreftet i Kartverkets stedsnavnregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Vannbehandlingsanlegg",
    item_type: "finding",
    title: "Langevatn vannbehandlingsanlegg",
    description:
      "IVARs hovedvannverk i Gjesdal, som forsyner rundt 330 000 innbyggere i ni kommuner på " +
      "Nord-Jæren med drikkevann. Kapasitet 3 300 liter per sekund, tilsvarende rundt 285 000 kubikkmeter per " +
      "døgn. Nytt anlegg med ny behandlingsprosess ferdigstilt i 2021 etter over seks års byggetid.",
    municipality: "Gjesdal",
    address: "Gjesdal 49",
    postal_code: "4334",
    city: "Ålgård",
    latitude: 58.7594,
    longitude: 5.9536,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Drikkevannet til hele Nord-Jæren behandles på ett sted. Nedbørfeltet rundt Langevatn " +
      "har restriksjoner som følger av dette.",
    notes:
      "Koordinaten er hentet fra kart over anlegget og bekreftet mot nærmeste adresse i Gjesdal, men " +
      "anlegget har ikke egen registrert adresse — derfor medium confidence på stedfestingen. " +
      "3 300 l/s er kapasitet, ikke faktisk uttak.",
    kilder: [
      {
        source_name: "Langevatn vannbehandlingsanlegg",
        source_url: "https://www.ivar.no/langevatn/",
        publisher: "IVAR IKS",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget i Gjesdal er et av landets største og forsyner drikkevann til ni IVAR-kommuner. Kapasitet 3 300 liter per sekund. Etablert 1959, oppgradert i 1999 og 2021.",
      },
      {
        source_name: "Langevatn — nytt anlegg, ny vannbehandlingsprosess",
        source_url: "https://arsrapport.ivar.no/utgivelser/ar2021/hendelse/",
        publisher: "IVAR IKS",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Det nye anlegget ble ferdigstilt etter mer enn seks års byggetid og markert i oktober 2021. Anlegget forsyner 330 000 innbyggere.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Vannbehandlingsanlegg",
    item_type: "finding",
    title: "Vikelvdalen vannbehandlingsanlegg",
    description:
      "Trondheims vannbehandlingsanlegg, i fjell mellom Solbakken og Vikåsen. Behandler drikkevann " +
      "fra Jonsvatnet for Trondheim og Malvik, med maksimal kapasitet 1 400 liter per sekund og to " +
      "desinfeksjonstrinn.",
    municipality: "Trondheim",
    address: "Yrkesskolevegen 14",
    postal_code: "7058",
    city: "Charlottenlund",
    latitude: 63.4211,
    longitude: 10.4855,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Jonsvatnet er drikkevannskilde for hele Trondheim, og restriksjonene rundt vannet " +
      "styrer arealbruken i et stort område øst i byen.",
    notes:
      "Stedfestingen er omtrentlig: anlegget ligger i fjell mellom Solbakken og Vikåsen, og punktet er " +
      "satt ut fra denne beskrivelsen og nærmeste adresse. Derfor medium confidence.",
    kilder: [
      {
        source_name:
          "Kommunedelplan Vann i Trondheim — vannkilder og vannbehandling",
        source_url:
          "https://sites.google.com/trondheim.kommune.no/kdp-vann-i-trondheim/vedleggsrapport/8-vannkilder-og-vannbehandling",
        publisher: "Trondheim kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Jonsvatnet er hovedvannkilde for Trondheim og Malvik. Drikkevannet behandles ved Vikelvdalen vannbehandlingsanlegg, som ligger i fjellet mellom Solbakken og Vikåsen og har maksimal kapasitet 1 400 liter per sekund. Behandlingen består av råvannssil, karbonatisering for pH-justering og to desinfeksjonstrinn med UV og klorering.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Nordbykollen regionale renseanlegg",
    description:
      "Planlagt regionalt renseanlegg på Nordbykollen ved Solumstrand i Drammen, som skal erstatte " +
      "seks eksisterende anlegg: Mjøndalen, Muusøya, Bokerøya og Solumstrand i Drammen, Linnes i Lier og " +
      "Lahell i Asker. Detaljregulering med konsekvensutredning har vært på offentlig ettersyn. Drivkraften er " +
      "skjerpede krav til nitrogenrensing.",
    municipality: "Drammen",
    city: "Drammen",
    latitude: 59.71899,
    longitude: 10.2459,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Seks anlegg blir ett. For naboer på Nordbykollen betyr det et helt nytt stort anlegg " +
      "og flere år med bygging; for naboene til de seks som legges ned, betyr det avvikling. Både plan og " +
      "konsekvensutredning er offentlige.",
    notes:
      "Koordinaten er stedsnavnet Nordbykollen (ås) i Drammen. Det finnes to steder med samme navn i " +
      "kommunen; dette er det som ligger nær Solumstrand. Kapasitet er ikke oppgitt i kildene vi har lest " +
      "ennå — åpent punkt. Endelig plassering og utforming avgjøres i reguleringsplanen.",
    kilder: [
      {
        source_name: "Nytt regionalt renseanlegg",
        source_url:
          "https://www.drammen.kommune.no/om-kommunen/organisasjon-administrasjon/prosjekter/nytt-regionalt-renseanlegg/",
        publisher: "Drammen kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Nytt regionalt renseanlegg på Nordbykollen skal erstatte Mjøndalen, Muusøya, Bokerøya og Solumstrand i Drammen, Linnes i Lier og Lahell i Asker.",
      },
      {
        source_name:
          "Detaljregulering for regionalt renseanlegg Nordbykollen–Solumstrand, offentlig ettersyn",
        source_url:
          "https://www.drammen.kommune.no/politikk-samfunn/kunngjoringer/renseanlegg-nordbykollen-solumstrand-offentlig-ettersyn/",
        publisher: "Drammen kommune",
        source_type: "regulation",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Forslag til detaljregulering med konsekvensutredning for regionalt renseanlegg Nordbykollen–Solumstrand lagt ut til offentlig ettersyn.",
      },
      {
        source_name:
          "Rapport: Utslipp fra nytt renseanlegg vil gi bedre leveforhold i Drammensfjorden",
        source_url:
          "https://www.asker.kommune.no/vann-og-avlop/aktuelt-for-vann-og-avlop/nytt-renseanlegg-reduserer-utslipp/",
        publisher: "Asker kommune",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Asker deltar i samarbeidet. Rapporten konkluderer med at utslipp fra det nye anlegget vil gi bedre leveforhold i Drammensfjorden.",
      },
      {
        source_name: "Kartverket stedsnavn-API",
        source_url: "https://api.kartverket.no/stedsnavn/v1/navn",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Stedsnavn, kommune og koordinat bekreftet i Kartverkets stedsnavnregister.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Grenland renseanlegg",
    description:
      "Planlagt felles renseanlegg for Grenland, i ytre del av Frierfjorden i Porsgrunn, " +
      "dimensjonert for rundt 105 000 personekvivalenter og et areal på rundt 13 000 kvadratmeter. Skal " +
      "erstatte Elstrøm i Skien og Knarrdalstrand, Heistad og Salen i Porsgrunn, med nye overføringsledninger " +
      "og pumpestasjoner. Detaljregulering er varslet igangsatt (planID 2025008).",
    municipality: "Porsgrunn",
    city: "Porsgrunn",
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Fire anlegg erstattes av ett, og transportsystemet mellom dem berører et langt " +
      "strekk gjennom to kommuner. Planarbeidet er i gang, så dette er noe naboer kan uttale seg om nå.",
    notes:
      "Uten koordinat med vilje: plasseringen er beskrevet som «ytre del av Frierfjorden» i " +
      "planprogrammet, men eksakt tomt er ikke fastsatt i kildene vi har lest. Å sette et punkt nå ville gitt " +
      "falsk presisjon. Hentes fra reguleringsplanens geometri når den er vedtatt.",
    kilder: [
      {
        source_name:
          "Varsel om oppstart av detaljregulering for Grenland renseanlegg med transportsystem",
        source_url:
          "https://www.porsgrunn.kommune.no/lokalpolitikk/hoeringer/varsel-om-oppstart-av-detaljregulering-for-grenland-renseanlegg-med-transportsystem-i-porsgrunn-planid-2025008",
        publisher: "Porsgrunn kommune",
        source_type: "regulation",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Varsel om oppstart av detaljregulering for Grenland renseanlegg med transportsystem i Porsgrunn, planID 2025008.",
      },
      {
        source_name: "Planprogram for Grenland renseanlegg med transportsystem",
        source_url:
          "https://www.bamble.kommune.no/_f/p1/i95b61c77-8cf9-4dac-aa82-e210218f9110/planprogram-for-grenland-renseanlegg.pdf",
        publisher: "Bamble kommune",
        source_type: "document",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Nytt felles renseanlegg planlegges med kapasitet for avløp fra rundt 105 000 personekvivalenter, med nye overføringsledninger og pumpestasjoner. Anlegget legges i ytre del av Frierfjorden og omfatter rundt 13 000 kvadratmeter. Det skal erstatte Elstrøm, Knarrdalstrand, Heistad og Salen.",
      },
      {
        source_name: "Felles renseanlegg til milliarder på gang",
        source_url:
          "https://www.ta.no/felles-renseanlegg-til-milliarder-pa-gang/s/5-50-1344089",
        publisher: "Telemarksavisa",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Skien og Porsgrunn planlegger felles renseanlegg med milliardkostnad.",
      },
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    subcategory: "Renseanlegg",
    item_type: "finding",
    title: "Kvasneset reinseanlegg for Ålesund og Sula",
    description:
      "Planlagt felles renseanlegg for Ålesund og Sula, i fjellhaller på Kvasneset i Sula. " +
      "Dimensjonert for 69 000 personekvivalenter og for forholdene i 2050, med anslått 48 300 tilknyttede " +
      "innbyggere. Hydraulisk dimensjonering: 222 liter per sekund normalt, 700 liter per sekund maksimalt. " +
      "Del av prosjektet «BLÅ — fjordar for framtida», som også omfatter ny pumpestasjon på Breivika og " +
      "overføringsledning fra Larsgården.",
    municipality: "Sula",
    city: "Langevåg",
    latitude: 62.42101,
    longitude: 6.36303,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Ålesund har i dag bare mekaniske anlegg. Dette flytter regionens avløpsrensing til ett " +
      "fjellanlegg i en nabokommune, med tunneldriving og en 5,5 kilometer lang overføringsledning.",
    notes:
      "Koordinaten er stedsnavnet Kvasneset i Sula. Anlegget er i fjell; punktet viser stedet, ikke " +
      "anleggets utstrekning. Skill tallene: 69 000 pe er dimensjonert kapasitet, 48 300 er anslått antall " +
      "tilknyttede innbyggere i 2050. Ålesunds eksisterende anlegg RA2 Aspøy og RA4 Åse (25 000 pe hver) er " +
      "ikke lagt inn.",
    kilder: [
      {
        source_name: "BLÅ fjordar med Kongshaugen reinseanlegg",
        source_url:
          "https://alesund.kommune.no/samfunnsutvikling/slik-bygger-vi-alesund/prosjekt-vatn-og-avlop/felles-renseanlegg-med-sula-kommune.18021.aspx",
        publisher: "Ålesund kommune",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Felles renseanlegg for Ålesund og Sula, i prosjektet BLÅ — fjordar for framtida.",
      },
      {
        source_name: "Nytt renseanlegg for Ålesund og Sula kommuner",
        source_url:
          "https://www.asplanviak.no/prosjekter/nytt-renseanlegg-for-alesund-og-sula-kommuner/",
        publisher: "Asplan Viak",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Anlegget er dimensjonert for kommunalt avløpsvann fra opptil 69 000 personekvivalenter, med Qdim 222 l/s, Qmaksdim 600 l/s og Qmaks 700 l/s. Dimensjonert for forholdene i 2050, med anslått 48 300 tilknyttede innbyggere. Renseanlegget plasseres i fjellhaller på Kvasneset i Sula kommune.",
      },
      {
        source_name: "Kartverket stedsnavn-API",
        source_url: "https://api.kartverket.no/stedsnavn/v1/navn",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Stedsnavn, kommune og koordinat bekreftet i Kartverkets stedsnavnregister.",
      },
    ],
  },

  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Gruve",
    item_type: "finding",
    title: "Rana Gruber",
    description:
      "Jernmalmgruve i Dunderlandsdalen, med uttak ved Ørtfjell og Storforshei og oppredningsverk i Mo i Rana. " +
      "Rundt 5 millioner tonn råmalm tas ut årlig og foredles til omtrent 1,85 millioner tonn " +
      "jernoksidkonsentrat. Drift både som dagbrudd og, siden 1999, under jord. Hovedgruven flyttes fra Ørtfjell " +
      "til Stensundtjern, med malmuttak der fra slutten av 2025.",
    municipality: "Rana",
    address: "Mjølanveien 29",
    postal_code: "8622",
    city: "Mo i Rana",
    latitude: 66.32656,
    longitude: 14.15158,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Norges største jernmalmprodusent. Uttaket er i fjellet, men malmtransport og oppredning skjer i og ved " +
      "Mo i Rana, med jernbane gjennom dalen.",
    notes:
      "Koordinaten er det registrerte punktet i utslippsregisteret, som ligger ved anlegget i Mo i Rana — ikke " +
      "ved gruvene på Ørtfjell rundt 35 kilometer nordøst. Funnet dekker begge, og bør deles i to eller få " +
      "geometri senere." +
      " Skill tallene: 5 millioner tonn er råmalm, 1,85 millioner tonn er ferdig konsentrat.",
    kilder: [
      {
        source_name: "Norske utslipp: Rana Gruber",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «07.100 - Bryting av jernmalm». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Rana Gruber",
        source_url: "https://snl.no/Rana_Gruber",
        publisher: "Store norske leksikon",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Gruvene ligger i Dunderlandsdalen ved Ørtfjell og Storforshei, og er drevet både som dagbrudd og siden 1999 også under jord. Produksjonen er rundt 1,8 millioner tonn konsentrat i året.",
      },
      {
        source_name: "Rana Gruber ASA — bedriftsfakta",
        source_url:
          "http://mineralproduksjon.no/wp-content/uploads/2026/02/MP12-BED-Rana-Gruber-ASA.pdf",
        publisher: "Mineralproduksjon",
        source_type: "document",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Årlig produseres omtrent fem millioner tonn råmalm, som foredles til rundt 1,85 millioner tonn jernoksidkonsentrat. Overgangen fra Ørtfjell til Stensundtjern som hovedgruve går som planlagt, med malmuttak fra slutten av 2025.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Gruve",
    item_type: "finding",
    title: "Titania, Tellnes",
    description:
      "Ilmenittgruve i dagbrudd på Tellnes i Sokndal, i drift siden 1960. Rundt 7 millioner tonn masse tas ut " +
      "årlig, hvorav omtrent 2 millioner tonn malm og 1,6 millioner tonn gråberg fra selve dagbruddet. " +
      "Forekomsten er verdens største kjente ilmenittforekomst med reserver på rundt 400 millioner tonn, og " +
      "anlegget står for rundt 10 prosent av verdens ilmenittproduksjon.",
    municipality: "Sokndal",
    address: "Tellenesveien 484",
    postal_code: "4380",
    city: "Hauge i Dalane",
    latitude: 58.33214,
    longitude: 6.41281,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Europas største dagbrudd for titanmineraler, i en kommune med rundt 3 300 innbyggere. Uttaket, " +
      "gråbergdeponiene og transporten preger et stort område.",
    notes:
      "Tallene gjelder ulike ting: 7 millioner tonn er samlet masseuttak, 2 millioner tonn er malm, 400 " +
      "millioner tonn er reserver i forekomsten, ikke årlig produksjon. Konsentratproduksjonen på rundt 580 000 " +
      "tonn stammer fra 1999-tall og er ikke bekreftet for i dag — åpent punkt." +
      " Dagbruddet er en stor flate. Bør få geometri senere.",
    kilder: [
      {
        source_name: "Norske utslipp: Titania AS",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «07.290 - Bryting av ikke-jernholdig malm». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Titania",
        source_url: "https://snl.no/Titania",
        publisher: "Store norske leksikon",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Titania A/S driver dagbrudd på Tellnes i Sokndal. Dette er verdens største kjente ilmenittforekomst, og selskapet står for rundt 10 prosent av verdens ilmenittproduksjon.",
      },
      {
        source_name: "Tellnes gruver",
        source_url: "https://magmageopark.no/en/location-object/tellnes/",
        publisher: "Magma Geopark",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Rundt 2 millioner tonn malm og 1,6 millioner tonn gråberg fjernes fra dagbruddet hvert år.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Gruve",
    item_type: "finding",
    title: "Sydvaranger gruve, Bjørnevatn",
    description:
      "Jernmalmgruve i Bjørnevatn med separasjonsverk og utskipningshavn i Kirkenes. Nedlagt siden 2015, og nå " +
      "under forberedelse til gjenoppstart av Grangex. Den endelige investeringsbeslutningen er utsatt til " +
      "tredje kvartal 2026, og prosjektet trenger rundt 300 millioner dollar i egenkapital og lån. Selskapet " +
      "har uttalt mål om kommersielle leveranser av direktreduksjonskonsentrat i fjerde kvartal 2026.",
    municipality: "Sør-Varanger",
    address: "25/210",
    postal_code: "9900",
    city: "Kirkenes",
    latitude: 69.72476,
    longitude: 30.0341,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "En gjenåpning ville endre Sør-Varanger vesentlig: gruvedrift i Bjørnevatn, malmtog til Kirkenes og " +
      "utskipning fra byen. Prosjektet har vært utsatt flere ganger, så statusen er fortsatt usikker.",
    notes:
      "Status satt til planlagt, ikke aktiv: investeringsbeslutningen er ikke tatt. Ikke fremstill dette som " +
      "en gruve i drift. Følg opp beslutningen i tredje kvartal 2026.",
    kilder: [
      {
        source_name: "Norske utslipp: Sydvaranger",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «07.100 - Bryting av jernmalm». Anlegget står registrert med utslippstillatelse. Registrering er ikke det samme som drift.",
      },
      {
        source_name: "Grangex utsetter finansieringsmål for Sydvaranger",
        source_url:
          "https://www.nrk.no/tromsogfinnmark/grangex-utsetter-finansieringsmal-for-sydvaranger-1.17902262",
        publisher: "NRK",
        source_type: "news",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Grangex utsetter den endelige investeringsbeslutningen for gjenåpning til tredje kvartal 2026. Prosjektet trenger rundt 300 millioner dollar.",
      },
      {
        source_name:
          "Grangex completes DFS for Sydvaranger Mine, eyes 2026 restart",
        source_url:
          "https://www.mining-technology.com/news/grangex-completes-dfs-sydvaranger-mine-2026-restart/",
        publisher: "Mining Technology",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Ferdigstilt mulighetsstudie, med mål om gjenoppstart og første kommersielle eksport sent i 2026.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Gruve",
    item_type: "finding",
    title: "Nussir kobbergruve, Repparfjord",
    description:
      "Planlagt kobbergruve i Nussir og Ulveryggen ved Repparfjorden. Nussir ASA har driftskonsesjon og " +
      "tillatelse til sjødeponi for avgangsmasser i Repparfjorden. Arbeidet ble en periode stanset fordi en " +
      "tunnel manglet kommunal tillatelse; Hammerfest kommune besluttet i juli 2025 at driften kunne fortsette. " +
      "I juli 2026 ble prosjektet omtalt som fullfinansiert, og EPC-kontrakten for prosessanlegget er tildelt.",
    municipality: "Hammerfest",
    latitude: 70.46591,
    longitude: 24.0992,
    verification_status: "verified_public_source",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "En av de mest omstridte industrisakene i landet: sjødeponi i en nasjonal laksefjord, reindriftsinteresser " +
      "og en protestleir som sto i over 200 dager. Alt dette er dokumentert og pågående.",
    notes:
      "Status satt til under bygging, ikke aktiv drift: konsesjon og finansiering er på plass og tunnelarbeid " +
      "er i gang, men produksjon er ikke bekreftet startet. Confidence er medium fordi statusbildet endrer seg " +
      "raskt og kildene er av ulik karakter." +
      " Koordinaten er fjellet Nussir i Hammerfest fra Kartverkets stedsnavnregister — selve forekomsten, ikke " +
      "et anleggspunkt.",
    kilder: [
      {
        source_name:
          "Nussir ASA — driftskonsesjon for Repparfjord kobberforekomst",
        source_url:
          "https://www.regjeringen.no/globalassets/departementene/nfd/dokumenter/nussir-asa---driftskonsesjon-for-repparfjord-kobberforekomst.pdf",
        publisher: "Nærings- og fiskeridepartementet",
        source_type: "document",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary: "Driftskonsesjon for Repparfjord kobberforekomst.",
      },
      {
        source_name: "Nussir får fortsette gruvearbeidet i Repparfjorden",
        source_url:
          "https://www.nrk.no/tromsogfinnmark/nussir-far-fortsette-gruvearbeidet-i-repparfjorden-1.17487287",
        publisher: "NRK",
        source_type: "news",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Arbeidet var stanset fordi en tunnel manglet kommunens tillatelse. I juli 2025 besluttet Hammerfest kommune at driften kunne fortsette.",
      },
      {
        source_name: "Gruvekonflikten i Repparfjorden",
        source_url: "https://snl.no/gruvekonflikten_i_Repparfjorden",
        publisher: "Store norske leksikon",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oversikt over konflikten om sjødeponi, reindrift og protestaksjoner.",
      },
      {
        source_name: "Kartverket stedsnavn-API",
        source_url: "https://api.kartverket.no/stedsnavn/v1/navn",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Stedsnavn, kommune og koordinat bekreftet i Kartverkets stedsnavnregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Gruve",
    item_type: "finding",
    title: "Engebøfjellet, rutil- og granatgruve",
    description:
      "Nordic Minings gruve i Engebøfjellet ved Vevring i Sunnfjord, med uttak av rutil og granat og sjødeponi " +
      "i Førdefjorden. Anlegget er i oppstartsfase: granatleveranser er i gang, mens første rutilfrakt er " +
      "utsatt til første kvartal 2026. Selskapets mål er å nå designkapasitet innen slutten av andre kvartal " +
      "2026. Tørranlegget har hatt lavere oppetid og kapasitet enn planlagt.",
    municipality: "Sunnfjord",
    latitude: 61.49147,
    longitude: 5.4278,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Sjødeponiet i Førdefjorden er en av de største miljøstridene i landet. Anlegget er dessuten det første " +
      "nye store gruveprosjektet i drift i Norge på lang tid.",
    notes:
      "Status satt til aktiv, men i innkjøring — ikke full produksjon. Confidence medium fordi produksjons- og " +
      "kapasitetsbildet har blitt nedjustert flere ganger." +
      " Koordinaten er stedsnavnet Engjabøfjellet i Sunnfjord. Anlegget dekker et større område inne i fjellet " +
      "og ved fjorden.",
    kilder: [
      {
        source_name: "Engebøfjellet",
        source_url: "https://snl.no/Engeb%C3%B8fjellet",
        publisher: "Store norske leksikon",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Forekomst av rutil og granat i Engebøfjellet ved Vevring, med planer om sjødeponi i Førdefjorden.",
      },
      {
        source_name: "Nordic Mining er forseinka med produksjon av rutil",
        source_url:
          "https://www.nrk.no/vestland/nordic-mining-er-forseinka-med-produksjon-av-rutil-1.17586798",
        publisher: "NRK",
        source_type: "news",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Produksjonen av rutil er forsinket. Første rutilfrakt er utsatt til første kvartal 2026, og målet er designkapasitet innen slutten av andre kvartal 2026.",
      },
      {
        source_name: "Gruvekonflikten i Førdefjorden",
        source_url: "https://snl.no/Gruvekonflikten_i_F%C3%B8rdefjorden",
        publisher: "Store norske leksikon",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oversikt over konflikten om sjødeponi i Førdefjorden.",
      },
      {
        source_name: "Kartverket stedsnavn-API",
        source_url: "https://api.kartverket.no/stedsnavn/v1/navn",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Stedsnavn, kommune og koordinat bekreftet i Kartverkets stedsnavnregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Gruve",
    item_type: "finding",
    title: "Fensfeltet, sjeldne jordarter",
    description:
      "Europas største dokumenterte forekomst av sjeldne jordarter, på Fen ved Ulefoss i Nome. Rare Earths " +
      "Norway anslår minst 15 millioner tonn sjeldne jordarter i forekomsten. Staten overtok i april 2026 " +
      "planarbeidet fra Nome kommune, og en statlig plan for gruvedrift skal foreligge senest i 2028, med " +
      "ambisjon om slutten av 2027. Selskapets mål er oppstart rundt 2030.",
    municipality: "Nome",
    latitude: 59.26865,
    longitude: 9.30121,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Dette kan bli Europas første produksjon av sjeldne jordarter, i et tettbygd jordbruks- og " +
      "industriområde. At staten har overtatt planarbeidet betyr at prosessen går raskere enn en vanlig " +
      "kommunal plansak.",
    notes:
      "Status planlagt: ingen gruve i drift. 15 millioner tonn er anslått forekomst, ikke årlig produksjon. " +
      "Koordinaten er tettbebyggelsen Fen i Nome, ikke et anleggspunkt — forekomsten dekker et større område.",
    kilder: [
      {
        source_name:
          "Plan for gruvedrift på Fensfeltet skal være klar senest i 2028",
        source_url:
          "https://anlegg.bygg.no/gruvedrift-lns-telemark/plan-for-gruvedrift-pa-fensfeltet-skal-vaere-klar-senest-i-2028/2957253",
        publisher: "Byggeindustrien",
        source_type: "news",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Staten tar over planarbeidet fra Nome kommune. Planen skal være klar senest i 2028, med ambisjon om slutten av 2027.",
      },
      {
        source_name:
          "Europas største forekomst av sjeldne jordarter finnes på Fen",
        source_url:
          "https://rareearthsnorway.com/europas-st%C3%B8rste-forekomst-av-sjeldne-jordarter-finnes-p%C3%A5-fen",
        publisher: "Rare Earths Norway",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Selskapet har dokumentert Europas største forekomst av sjeldne jordarter, anslått til minst 15 millioner tonn.",
      },
      {
        source_name: "Kartverket stedsnavn-API",
        source_url: "https://api.kartverket.no/stedsnavn/v1/navn",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Stedsnavn, kommune og koordinat bekreftet i Kartverkets stedsnavnregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Gruve",
    item_type: "finding",
    title: "Skaland Graphite, Trælen",
    description:
      "Grafittgruve på Senja, med uttak ved Trælen og foredling på Skaland. Rundt 10 500 tonn grafittkonsentrat " +
      "i året, tilsvarende omtrent 2 prosent av verdensproduksjonen. Malmgehalten er 28 prosent grafitt, som " +
      "gjør forekomsten til den rikeste i produksjon i verden. Reserven ved Trælen er anslått til 1,8 millioner " +
      "tonn. Sammenhengende drift siden 1917.",
    municipality: "Senja",
    address: "Bergsfjordveien 1655",
    postal_code: "9385",
    city: "Skaland",
    latitude: 69.44157,
    longitude: 17.32902,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Den eneste grafittgruven i drift i Skandinavia og Europas største produsent av naturlig grafitt — i en " +
      "liten bygd på Senja, der virksomheten er hjørnesteinsbedrift.",
    notes:
      "Koordinaten er det registrerte punktet, som ligger ved anlegget på Skaland. Selve gruven ligger ved " +
      "Trælen rundt 7 kilometer unna (69,49644 nord, 17,21812 øst i Kartverkets stedsnavnregister). Funnet " +
      "dekker begge." +
      " Eierskapet er i endring: Mineral Commodities har eid selskapet siden 2019, og Norge Mineraler er omtalt " +
      "som kjøper. Bør bekreftes.",
    kilder: [
      {
        source_name: "Norske utslipp: Skaland Graphite AS",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.990 - Annen bryting og utvinning ikke nevnt annet sted». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Skaland Graphite",
        source_url: "https://snl.no/Skaland_Graphite",
        publisher: "Store norske leksikon",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Skaland er den eneste grafittgruven i drift i Skandinavia og Europas største produsent av naturlig grafitt, i sammenhengende drift siden 1917. Produksjonen er rundt 10 500 tonn grafittkonsentrat årlig, om lag 2 prosent av verdensproduksjonen. Malmgehalten er 28 prosent.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Gruve",
    item_type: "finding",
    title: "Store Norske Gruve 7, Adventdalen",
    description:
      "Norges siste kullgruve, i Adventdalen sørøst for Longyearbyen. Stengt 30. juni 2025 etter over 50 års " +
      "drift, og slutten på over 100 år med norsk kulldrift på Svalbard. Bakgrunnen var at Longyearbyen " +
      "lokalstyre sa opp avtalen om kullkjøp til kraftproduksjon. Store Norske avviklet driften i juli 2025 og " +
      "gjennomfører et oppryddingsprosjekt som skal være ferdig i 2026.",
    municipality: "Svalbard",
    address: "Vei 400 1401",
    postal_code: "9170",
    city: "Longyearbyen",
    verification_status: "verified_public_source",
    operational_status: "closed",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Historisk nedleggelse, og et oppryddingsprosjekt som fortsatt pågår fysisk på stedet.",
    notes:
      "Status satt til stengt, men med pågående opprydding — anlegget er ikke borte fra stedet. Kommunefeltet " +
      "står som «Svalbard», som ikke er en kommune; Kartverkets adresseregister fører Longyearbyen med " +
      "postnummer 9170. Funnet står uten koordinat med vilje: research-basen tillater bare breddegrad " +
      "mellom 57 og 72, altså fastlandet, så Svalbard på 78,16 nord kan ikke stedfestes i dagens modell.",
    kilder: [
      {
        source_name: "Norske utslipp: Store Norske (SNSG) Gruve 7 Adventdalen",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «05.100 - Bryting av steinkull». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Slutt på norsk gruvedrift: Gruve 7 på Svalbard stenges",
        source_url:
          "https://www.nrk.no/tromsogfinnmark/slutt-pa-norsk-gruvedrift_-gruve-7-pa-svalbard-stenges-1.17870128",
        publisher: "NRK",
        source_type: "news",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Gruve 7 ble stengt 30. juni 2025. Det satte punktum for over 100 år med norsk gruvedrift på Svalbard.",
      },
      {
        source_name: "Gruve 7",
        source_url: "https://www.snsk.no/bergverk/gruve-7",
        publisher: "Store Norske",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Store Norske avviklet driften i Gruve 7 i juli 2025 og gjennomfører nå et oppryddingsprosjekt som skal være ferdig i 2026.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Steinbrudd",
    item_type: "finding",
    title: "Brønnøy Kalk, Akselberg",
    description:
      "Kalksteinbrudd på Akselberg i Brønnøy, med rundt 2 millioner tonn kalkstein i året. Anlegget er " +
      "hovedleverandør av råstoff til Omya Hustadmarmor, som maler marmoren til kalsiumkarbonat.",
    municipality: "Brønnøy",
    address: "Akselbergveien 11",
    postal_code: "8960",
    city: "Velfjord",
    latitude: 65.39364,
    longitude: 12.48837,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av landets største uttak målt i tonn, og grunnlaget for en foredlingskjede videre til Hustadvika. " +
      "Uttaket og utskipningen preger et stort område i en kommune med rundt 7 800 innbyggere.",
    notes:
      "2 millioner tonn er årlig uttak. Bruddet er en stor flate og bør få geometri senere.",
    kilder: [
      {
        source_name: "Norske utslipp: Brønnøy Kalk A.S",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.110 - Bryting av dekorstein, kalkstein, gips, kritt og skifer». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Brønnøy Kalk",
        source_url: "https://www.nomin.no/bronnoy-kalk/category875.html",
        publisher: "Norsk Mineral",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Brønnøy Kalk produserer rundt 2 millioner tonn kalkstein årlig og er hovedleverandør av råstoff til Omya Hustadmarmor.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Steinbrudd",
    item_type: "finding",
    title: "Verdalskalk Tromsdalen",
    description:
      "Kalksteinbrudd i Tromsdalen i Verdal, med uttak av rundt 1,5 millioner tonn kalkstein i året. Mye av " +
      "råstoffet går til Hylla for brenning til kalk.",
    municipality: "Verdal",
    address: "Tromsdalsvegen 442",
    postal_code: "7657",
    city: "Verdal",
    latitude: 63.72419,
    longitude: 11.65273,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et av landets største kalkuttak, i en dal med landbruk og bebyggelse, og med tungtransport ut til Hylla " +
      "og videre.",
    notes:
      "1,5 millioner tonn er årlig uttak. Uttaksområdet er stort og bør få geometri senere. Eventuelle " +
      "utvidelsesplaner er ikke undersøkt.",
    kilder: [
      {
        source_name: "Norske utslipp: Verdalskalk Tromsdalen kalksteinsbrudd",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.110 - Bryting av dekorstein, kalkstein, gips, kritt og skifer». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Tromsdalen er et produksjonsanlegg for Verdalskalk",
        source_url:
          "https://kalk.no/en/selskap-og-anlegg/verdalskalk/tromsdalen/",
        publisher: "Franzefoss Minerals",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Verdalskalk tar ut rundt 1,5 millioner tonn kalkstein i året i Tromsdalen. Mye går til Hylla for brenning til kalk.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Steinbrudd",
    item_type: "finding",
    title: "Sibelco Åheim, olivin",
    description:
      "Olivinuttak i Almklovdalen ved Åheim, verdens største kommersielle olivinforekomst og olivinanlegg. " +
      "Kapasiteten er 2,5 millioner tonn i året, med dagens produksjon rundt 1,5 millioner tonn. Reservene er " +
      "anslått å holde i opptil 150 år. Anlegget ble åpnet i 1948.",
    municipality: "Vanylven",
    address: "45/4",
    postal_code: "6146",
    city: "Åheim",
    latitude: 62.04107,
    longitude: 5.51886,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Verdens største i sitt slag, i en kommune med rundt 3 000 innbyggere. Uttaket dominerer dalen og gir " +
      "utskipning fra egen havn.",
    notes:
      "Skill tallene: 2,5 millioner tonn er kapasitet, rundt 1,5 millioner tonn er faktisk produksjon.",
    kilder: [
      {
        source_name: "Norske utslipp: Sibelco Nordic AS, avd Åheim",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.910 - Bryting og utvinning av kjemiske mineraler og gjødselsmineraler». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Åheim",
        source_url: "https://www.sibelco.com/en/sites/aheim",
        publisher: "Sibelco",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Åheim er verdens største kommersielle olivinvirksomhet, med kapasitet 2,5 millioner tonn per år og reserver for opptil 150 år. Anlegget ble åpnet i 1948.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Steinbrudd",
    item_type: "finding",
    title: "Franzefoss Minerals Miljøkalk, Ballangen",
    description:
      "Kalkuttak og produksjon under Franzefoss Minerals i Ballangen-området i Narvik kommune.",
    municipality: "Narvik",
    address: "Hekkelstrand-FV819 20",
    postal_code: "8540",
    city: "Ballangen",
    latitude: 68.39729,
    longitude: 16.82869,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et av få store mineraluttak i Nordland sør for Narvik, med utskipning over egen kai.",
    notes:
      "Kapasitet og årlig uttak er ikke dokumentert i kildene vi har lest — åpent punkt. Confidence er medium " +
      "på beskrivelsen, høy på at anlegget finnes og er regulert.",
    kilder: [
      {
        source_name: "Norske utslipp: Franzefoss Minerals AS - Miljøkalk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.110 - Bryting av dekorstein, kalkstein, gips, kritt og skifer». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Steinbrudd",
    item_type: "finding",
    title: "Hammerfall Dolomitt",
    description: "Dolomittuttak ved Hammerfall i Sørfold.",
    municipality: "Sørfold",
    address: "Røsvikveien 456",
    postal_code: "8220",
    city: "Røsvik",
    latitude: 67.39173,
    longitude: 15.53847,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Sammen med Elkem Salten er dette et av de tyngste industrianleggene i en kommune med under 2 000 " +
      "innbyggere.",
    notes:
      "Årlig uttak og driftshorisont er ikke dokumentert i kildene vi har lest — åpent punkt.",
    kilder: [
      {
        source_name: "Norske utslipp: Hammerfall Dolomitt",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.110 - Bryting av dekorstein, kalkstein, gips, kritt og skifer». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Steinbrudd",
    item_type: "finding",
    title: "Mårnes kvartsittbrudd",
    description: "Kvartsittbrudd på Mårnes i Gildeskål, på Sandhornøya.",
    municipality: "Gildeskål",
    address: "Sandhornøyveien 271",
    postal_code: "8130",
    city: "Sandhornøy",
    latitude: 67.13868,
    longitude: 14.13327,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et stort uttak på en øy med få innbyggere, med utskipning direkte fra bruddet.",
    notes:
      "Årlig uttak er ikke dokumentert i kildene vi har lest — åpent punkt.",
    kilder: [
      {
        source_name: "Norske utslipp: Mårnes kvartsittbrudd",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.990 - Annen bryting og utvinning ikke nevnt annet sted». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Steinbrudd",
    item_type: "finding",
    title: "Egersund Granite",
    description:
      "Uttak av anortositt og granitt i Eigersund, med produksjon av natursteinsblokk.",
    municipality: "Eigersund",
    address: "Jærveien 1295",
    postal_code: "4375",
    city: "Helleland",
    latitude: 58.49356,
    longitude: 5.85807,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Dalane-området har flere store uttak; dette er ett av dem, og i samme kommune som Titania og " +
      "Rekefjord-bruddet i nabokommunen.",
    notes:
      "Årlig uttak er ikke dokumentert i kildene vi har lest — åpent punkt.",
    kilder: [
      {
        source_name: "Norske utslipp: Egersund Granite",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.110 - Bryting av dekorstein, kalkstein, gips, kritt og skifer». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Steinbrudd",
    item_type: "finding",
    title: "Larvikitt-området i Tvedalen og Klåstad",
    description:
      "Norges største bergverksområde målt i antall brudd: rundt 20 larvikittbrudd i Larvik-distriktet, med " +
      "Tvedalen og Klåstad som de viktigste. Steinindustrien i Tvedalen dekker rundt 7 000 dekar og har " +
      "omkring 400 arbeidsplasser. Nær 300 000 tonn blokkstein eksporteres årlig, og 90 til 95 prosent av det " +
      "som tas ut er skrotstein — rundt 400 000 tonn i året — som skipes ut lokalt fra Svartebukt havn ved " +
      "Mørjefjorden. Larvikitt står for litt over 50 prosent av salgsverdien og 85 prosent av eksportverdien av " +
      "norsk naturstein, og ble utpekt til Norges nasjonalbergart i 2008.",
    municipality: "Larvik",
    address: "Tvedalsveien 530",
    postal_code: "3295",
    city: "Tvedalen",
    latitude: 59.03917,
    longitude: 9.85632,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Ett sammenhengende industrilandskap av steinbrudd i et område som ellers er skog og hytter, med " +
      "sprengning, tungtransport og utskipning. Ingen enkeltbrudd er svært stort, men summen er landets største " +
      "bergverk.",
    notes:
      "Ett funn for hele området, ikke ett per brudd. Miljødirektoratets register fører minst elleve enkeltbrudd " +
      "her: Aak, Bassebo, Brattås skrotsteindeponi, Håkestad, Klåstad, Krukåsen, Malerød, Saga Pearl, Skallist, " +
      "Stålaker, Tvedalen Vest og Vevjeåsen Nord." +
      " Koordinaten er Tvedalen Vest steinindustriområde. Området er stort og bør få geometri senere. " +
      "Klåstad-delen ligger rundt 20 kilometer øst, ved Tjøllingveien.",
    kilder: [
      {
        source_name: "Norske utslipp: Tvedalen Vest steinindustriområde",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.110 - Bryting av dekorstein, kalkstein, gips, kritt og skifer». Minst elleve enkeltbrudd i Larvik står registrert med utslippstillatelse i samme område.",
      },
      {
        source_name: "Larvikitt",
        source_url: "https://snl.no/larvikitt",
        publisher: "Store norske leksikon",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "De viktigste bruddområdene er Tvedalen og Klåstad. I Larvik-distriktet drives steinbruddsvirksomhet i rundt 20 brudd. Larvikitt ble utpekt til Norges nasjonalbergart i 2008.",
      },
      {
        source_name:
          "Larvikitt — landets økonomisk viktigste natursteinressurs",
        source_url:
          "https://parkoganlegg.no/nyheter/moblering-belegninger/larvikitt-landets-okonomisk-viktigste-natursteinressurs/",
        publisher: "Park & Anlegg",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Steinindustrien i Tvedalen er Norges største bergverk, med et titalls bedrifter på 7 000 dekar og rundt 400 arbeidsplasser. Nær 300 000 tonn eksporteres årlig, og 90-95 prosent av produksjonen er skrotstein som skipes ut fra Svartebukt havn, rundt 400 000 tonn årlig. Larvikitt står for over 50 prosent av salgsverdien og 85 prosent av eksportverdien av norsk naturstein.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Pukkverk",
    item_type: "finding",
    title: "Mibau Stema Jelsa",
    description:
      "Pukkverk på Jelsa i Suldal, omtalt som Europas største pukkprodusent, med egen skipsflåte for eksport. " +
      "Produksjonstallene varierer mellom kildene: NGU oppgir at Suldal er landets største pukkommune med over " +
      "3 millioner tonn i året, mens bransjekilder omtaler rundt 12 millioner tonn for Jelsa.",
    municipality: "Suldal",
    address: "Jelsavegen 523",
    postal_code: "4234",
    city: "Jelsa",
    latitude: 59.37536,
    longitude: 6.05599,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Landets største eksportuttak av pukk, med utskipning direkte fra bruddet. Rogaland alene står for rundt " +
      "en tredel av det nasjonale uttaket.",
    notes:
      "Confidence medium fordi produksjonstallet spriker: NGUs tall for kommunen og bransjekildens tall for " +
      "anlegget er ikke forenlige, og vi har ikke funnet en autoritativ kilde på dagens årsproduksjon. Ikke bruk " +
      "12 millioner tonn som fastslått tall." +
      " Selskapet het tidligere Norsk Stein.",
    kilder: [
      {
        source_name: "Norske utslipp: Mibau Stema avd Jelsa",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.120 - Utvinning fra grus- og sandtak, og utvinning av leire og kaolin». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name:
          "Europas største pukkprodusent — sjanseløs uten egen skipsflåte",
        source_url:
          "https://www.mtlogistikk.no/betong-godstransport-havn/europas-storste-pukkprodusent-sjanselos-uten-egen-skipsflate/741846",
        publisher: "MT Logistikk",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Anlegget omtales som Europas største pukkprodusent, med syv lasteskip til disposisjon.",
      },
      {
        source_name: "Rogaland størst på knust fjell",
        source_url: "https://www.ngu.no/en/node/3396",
        publisher: "Norges geologiske undersøkelse",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Av Norges samlede uttak på rundt 50 millioner tonn i året kommer omtrent en tredel, 12 millioner tonn, fra Rogaland. Suldal er landets største pukkprodusent med over tre millioner tonn per år.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Pukkverk",
    item_type: "finding",
    title: "Mibau Stema Tau",
    description:
      "Pukkverk på Tau i Strand, omtalt som Norges tredje største, med en årsproduksjon på 3,5 millioner tonn. " +
      "Et utvidelsesprosjekt startet i 2023 og ferdigstilles i første kvartal 2026, og øker produksjonen til " +
      "over 5 millioner tonn i året.",
    municipality: "Strand",
    address: "Breivikvegen 6",
    postal_code: "4120",
    city: "Tau",
    latitude: 59.08863,
    longitude: 5.90817,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "En kapasitetsøkning på nesten 50 prosent i et uttak som ligger nær tettbebyggelsen på Tau, med " +
      "utskipning fra egen kai.",
    notes:
      "Skill tallene: 3,5 millioner tonn er dagens produksjon, over 5 millioner tonn er planlagt etter " +
      "utvidelsen i 2026. Selskapet het tidligere Norsk Stein / NorStone.",
    kilder: [
      {
        source_name: "Norske utslipp: Mibau Stema avd Tau",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.120 - Utvinning fra grus- og sandtak, og utvinning av leire og kaolin». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Tau",
        source_url: "https://www.mibau-stema.no/vaare-steinbrudd/tau",
        publisher: "Mibau Stema",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Tau er Norges tredje største pukkverk med en årsproduksjon på 3,5 millioner tonn. Utvidelsesprosjektet startet i 2023 og ferdigstilles i første kvartal 2026, og produksjonen øker deretter til over 5 millioner tonn årlig.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Pukkverk",
    item_type: "finding",
    title: "Rekefjord Stone",
    description:
      "Pukkverk i Rekefjord i Sokndal, et av landets store eksportuttak med utskipning fra egen havn. " +
      "NGU regner NCC i Rekefjord blant de største produsentene og eksportørene i landet." +
      " Virksomheten selger 2 til 2,5 millioner tonn stein i året til europeiske markeder, med rundt 600 skipsanløp årlig. Driften består av to brudd, ett på hver side av fjorden. Selskapet har søkt driftskonsesjon for de neste 25 årene; dagens konsesjoner gir en horisont på minst 15 år. NOAH, kontrollert av Gjelsten, er ny eier.",
    municipality: "Sokndal",
    address: "82/3-1",
    postal_code: "4380",
    city: "Hauge i Dalane",
    latitude: 58.32798,
    longitude: 6.2535,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Sammen med Titania i samme kommune gir dette Sokndal to av landets største mineraluttak, i en kommune " +
      "med rundt 3 300 innbyggere.",
    notes:
      "Årlig produksjon er ikke dokumentert i kildene vi har lest — åpent punkt. Eierskapet er omtalt både som " +
      "NCC og Rekefjord Stone; forholdet mellom dem bør avklares." +
      " Oppfølging gjennomført: produksjon, skipsanløp, eierskap og konsesjonshorisont er dokumentert. Eierforholdet til NCC er avklart: NCC hadde asfaltverk i Rekefjord, og dagens eiere kjøpte anleggene fra NCC i 2007 og 2008. Det er søkt om uttak av opptil 30 millioner tonn med horisont mot 2045 — søknad, ikke vedtak.",
    kilder: [
      {
        source_name: "Norske utslipp: Rekefjord Stone - Pukkverk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.120 - Utvinning fra grus- og sandtak, og utvinning av leire og kaolin». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Rogaland størst på knust fjell",
        source_url: "https://www.ngu.no/en/node/3396",
        publisher: "Norges geologiske undersøkelse",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Blant de største produsentene og eksportørene er Norsk Stein i Suldal, NorStone med brudd i Tau, Årdal og Dirdal, og NCC i Rekefjord i Sokndal kommune.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Om Rekefjord Stone",
        source_url: "https://rekefjord-stone.no/om-rekefjord-stone/",
        publisher: "Rekefjord Stone",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Selskapet selger årlig 2 til 2,5 millioner tonn kvalitetsstein til en rekke europeiske land, med rundt 600 skipsanløp per år. Driften består av to brudd, ett på hver side av fjorden.",
      },
      {
        source_name: "NOAH ny eier av Rekefjord Stone",
        source_url: "https://www.noah.no/noah-ny-eier-av-rekefjord-stone/",
        publisher: "NOAH",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary: "NOAH er ny eier av Rekefjord Stone.",
      },
      {
        source_name:
          "Ønsker å ta ut 30 mill. tonn stein: Slik kan det bli i 2045",
        source_url:
          "https://www.avisenagder.no/onsker-a-ta-ut-30-mill-tonn-stein-slik-kan-det-bli-i-2045/s/5-99-889006",
        publisher: "Avisen Agder",
        source_type: "news",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Selskapet ønsker å ta ut 30 millioner tonn stein, med en tidshorisont mot 2045.",
      },
      {
        source_name: "Historien",
        source_url: "https://rekefjord-stone.no/historien/",
        publisher: "Rekefjord Stone",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "NCC hadde asfaltverk i Rekefjord til dagens eiere kjøpte Ansit-verket fra NCC i 2007 og Norit-verket i 2008.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Pukkverk",
    item_type: "finding",
    title: "Franzefoss Pukk Hanekleiva",
    description:
      "Pukkverk i Hanekleiva i Holmestrand, ved E18." +
      " Bergartene som tas ut er sandstein og basalt. Direktoratet for mineralforvaltning har behandlet en sak om tildeling av utvidet driftskonsesjon for anlegget (saksnummer 21/05181).",
    municipality: "Holmestrand",
    address: "Hanekleiva 88",
    postal_code: "3070",
    city: "Sande i Vestfold",
    latitude: 59.57357,
    longitude: 10.17261,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et stort uttak rett ved hovedveien mellom Oslo og Vestfold, med tungtransport ut på E18 og " +
      "boligbebyggelse i nærheten.",
    notes:
      "Årlig produksjon, regulert volum og driftshorisont er ikke dokumentert i kildene vi har lest — åpent " +
      "punkt som bør følges opp mot driftskonsesjon og reguleringsplan." +
      " Oppfølging forsøkt: tildelingsvedtaket for utvidet driftskonsesjon er publisert som PDF hos Direktoratet for mineralforvaltning, men kunne ikke leses — dette miljøet mangler verktøy for tekstuttrekk fra PDF. Uttaksvolum og konsesjonsareal står fortsatt åpne, og skal hentes fra dette vedtaket.",
    kilder: [
      {
        source_name: "Norske utslipp: FRANZEFOSS PUKK AS, avd. Hanekleiva",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.120 - Utvinning fra grus- og sandtak, og utvinning av leire og kaolin». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Hanekleiva",
        source_url: "https://www.franzefoss.no/vare-anlegg/hanekleiva",
        publisher: "Franzefoss",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Anlegget tar ut bergartene sandstein og basalt i Sande i Vestfold, og har utsalg for privatkunder.",
      },
      {
        source_name:
          "Tildeling av driftskonsesjon (utvidelse) etter mineralloven for Hanekleiva pukkverk",
        source_url:
          "https://www.dirmin.no/sites/default/files/_21_05181-25_tildeling_av_driftskonsesjon_utvidelse_etter_mineralloven_for_hanekleiva_pukkver_839977_12_1.pdf",
        publisher: "Direktoratet for mineralforvaltning",
        source_type: "document",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Vedtak om tildeling av utvidet driftskonsesjon, saksnummer 21/05181-25. Dokumentets innhold er ikke lest: PDF-en kunne ikke tekstuttrekkes i dette miljøet. Kilden dokumenterer at vedtaket finnes, ikke hva det inneholder.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Pukkverk",
    item_type: "finding",
    title: "Franzefoss Pukk Lierskogen",
    description:
      "Pukkverk på Lierskogen i Lier, med asfaltfabrikk på samme område." +
      " Driftskonsesjonen omfatter et område på 219 dekar, et samlet uttaksvolum på 3,7 millioner kubikkmeter og et forventet årlig uttak på 175 000 kubikkmeter, fordelt på fire etapper. Bergarten er hornfels, og anlegget tar også imot overskuddsstein fra byggeprosjekter i nærheten.",
    municipality: "Lier",
    address: "Gamle Drammensvei 1",
    postal_code: "3420",
    city: "Lierskogen",
    latitude: 59.81496,
    longitude: 10.29461,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Ligger tett på boligområdet på Lierskogen og på E18, og kombinerer uttak med asfaltproduksjon på samme " +
      "sted.",
    notes:
      "Årlig produksjon og driftshorisont er ikke dokumentert i kildene vi har lest — åpent punkt." +
      " Oppfølging gjennomført: uttaksvolum og konsesjonsareal er hentet fra Direktoratet for mineralforvaltnings høringssak. Det årlige uttaket varierer med etterspørselen. Naboer har kjørt opprop for avvikling av uttaket i perioden 2028–2032, som er den driftsperioden gjeldende bestemmelser åpner for.",
    kilder: [
      {
        source_name: "Norske utslipp: Franzefoss Pukk avd. Lierskogen",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.120 - Utvinning fra grus- og sandtak, og utvinning av leire og kaolin». Lierskogen Asfaltfabrikk står registrert på samme sted.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Lierskogen pukkverk i Lier kommune — driftskonsesjon",
        source_url:
          "https://dirmin.no/arkiv/hoering/lierskogen-pukkverk-i-lier-kommune-driftskonsesjon",
        publisher: "Direktoratet for mineralforvaltning",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Samlet volum anslått til 3,7 millioner kubikkmeter, forventet årlig uttak 175 000 kubikkmeter, konsesjonsområde 219 dekar, drift planlagt i fire etapper. Bergarten er hornfels.",
      },
      {
        source_name: "Lierskogen",
        source_url: "https://www.franzefoss.no/vare-anlegg/lierskogen",
        publisher: "Franzefoss",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Anlegget tar ut hornfels og mottar overskuddsstein fra byggeprosjekter i nærområdet.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Pukkverk",
    item_type: "finding",
    title: "Feiring Bruk Bjønndalen",
    description:
      "Pukkverk i Bjønndalen i Nittedal, ett av Feiring Bruks anlegg på Romerike." +
      " Driftskonsesjonen oppgir et forventet årlig uttak på rundt 200 000 faste kubikkmeter og et samlet uttak på 15,5 millioner faste kubikkmeter. Bjønndalen er konsernets nest største anlegg og har vært del av Feiring siden 1977, med hovedvekt på steinprodukter til asfalt og betongtilslag. Det er investert 110 millioner kroner i nytt knuse- og vaskeanlegg.",
    municipality: "Nittedal",
    address: "Nittedalsveien 206",
    postal_code: "1480",
    city: "Slattum",
    latitude: 60.00451,
    longitude: 10.91181,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "Et stort uttak i en kommune som ellers er bolig og marka, med tungtransport gjennom dalen mot Oslo.",
    notes:
      "Årlig produksjon og driftshorisont er ikke dokumentert — åpent punkt. Feiring Bruk har flere anlegg i " +
      "området som ikke er lagt inn: Dal pukkverk i Ullensaker, Fet pukkverk i Lillestrøm og Armoen i Blaker. " +
      "De er egne fysiske uttak og hører hjemme som egne funn senere." +
      " Oppfølging gjennomført: årlig og samlet uttaksvolum er hentet fra Direktoratet for mineralforvaltnings høringssak. 15,5 millioner faste kubikkmeter samlet mot 200 000 i året innebærer en driftshorisont på flere tiår.",
    kilder: [
      {
        source_name: "Norske utslipp: Feiring Bruk avd. Bjønndalen Bruk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.120 - Utvinning fra grus- og sandtak, og utvinning av leire og kaolin». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
      {
        source_name: "Bjønndalen Bruk i Nittedal kommune — driftskonsesjon",
        source_url: "https://dirmin.no/arkiv/en/node/706",
        publisher: "Direktoratet for mineralforvaltning",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Forventet årlig uttak rundt 200 000 faste kubikkmeter, samlet uttak 15 500 000 faste kubikkmeter.",
      },
      {
        source_name: "Bjønndalen Bruk — Nittedal",
        source_url: "https://feiring.no/avdeling/nittedal/",
        publisher: "Feiring",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Bjønndalen er konsernets nest største anlegg, med i gruppen siden 1977, og produserer steinprodukter til asfalt og betongtilslag.",
      },
      {
        source_name:
          "Investerer 110 millioner i nytt knuse- og vaskeanlegg på Bjønndalen",
        source_url:
          "https://feiring.no/aktuelt/investerer-110-millioner-i-nytt-knuse-og-vaskeanlegg-pa-bjonndalen/",
        publisher: "Feiring",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Investering på 110 millioner kroner i nytt knuse- og vaskeanlegg ved Bjønndalen.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Pukkverk",
    item_type: "finding",
    title: "NCC Hedrum pukkverk",
    description:
      "Pukkverk i Hedrum i Larvik, med asfaltproduksjon i samme område.",
    municipality: "Larvik",
    address: "Lågendalsveien 129",
    postal_code: "3270",
    city: "Larvik",
    latitude: 59.10015,
    longitude: 10.05783,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Larvik har både landets største natursteinsindustri og flere store pukkuttak; dette er ett av dem.",
    notes:
      "Årlig produksjon er ikke dokumentert — åpent punkt. Grinda asfaltverk står registrert i samme område.",
    kilder: [
      {
        source_name: "Norske utslipp: NCC Industry AS Hedrum pukkverk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.120 - Utvinning fra grus- og sandtak, og utvinning av leire og kaolin». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Pukkverk",
    item_type: "finding",
    title: "Svene Pukkverk",
    description: "Pukkverk i Svene i Flesberg.",
    municipality: "Flesberg",
    address: "Østsida 234",
    postal_code: "3622",
    city: "Svene",
    latitude: 59.77438,
    longitude: 9.58084,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Det største industrianlegget i en kommune med rundt 2 700 innbyggere.",
    notes: "Årlig produksjon er ikke dokumentert — åpent punkt.",
    kilder: [
      {
        source_name: "Norske utslipp: Svene Pukkverk",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Registrert med utslippstillatelse, bransje «08.110 - Bryting av dekorstein, kalkstein, gips, kritt og skifer». Registeret dokumenterer at anlegget finnes og er regulert, med koordinat for det registrerte punktet.",
      },
      {
        source_name: "Kartverket adresse-API, punktsøk",
        source_url: "https://ws.geonorge.no/adresser/v1/punktsok",
        publisher: "Kartverket",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Kommune og nærmeste adresse bekreftet ved punktsøk mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Kilder",
    item_type: "note",
    title:
      "Slik finner vi mineraluttak: utslippsregisteret virker, DMF-kartet svarte ikke",
    description:
      "Inngangen til gruver, steinbrudd og pukkverk gikk via Miljødirektoratets utslippsregister, " +
      "som fører 100 anlegg i uttaks- og mineralbransjene med koordinat. Det gir de største uttakene, fordi " +
      "utslippstillatelse følger størrelse. Direktoratet for mineralforvaltnings egne karttjenester, som har " +
      "driftskonsesjonene, svarte med 503 ved alle forsøk. Bergrettigheter finnes som WFS via Geonorge, men " +
      "en bergrettighet er en leterett eller utvinningsrett — ikke et bevis på at det drives noe.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    notes:
      "Konsekvens: årlig uttaksvolum og driftshorisont mangler for flertallet av pukkverkene, fordi de " +
      "tallene står i driftskonsesjonen og i reguleringsplanen, ikke i utslippsregisteret. Neste runde bør gå " +
      "på DMFs driftskonsesjoner når tjenesten svarer, og på NGUs Grus- og Pukkdatabase, som har volum og " +
      "arealbruk per forekomst men bare er publisert som WMS.",
    kilder: [
      {
        source_name:
          "Miljødirektoratet, Norske utslipp — uttrekk på uttaksbransjer",
        source_url: "https://www.norskeutslipp.no/",
        publisher: "Miljødirektoratet",
        source_type: "register",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "100 anlegg i bransjene 05 (steinkull), 07 (malm), 08 (uttak av stein, kalk, grus og industrimineraler) og 23.6-23.9 (bearbeiding av mineraler) er registrert med utslippstillatelse i vår egen kopi av registeret, med koordinat og bransjekode per anlegg.",
      },
      {
        source_name: "Bergrettigheter WFS",
        source_url:
          "https://wfs.geonorge.no/skwms1/wfs.bergrettigheter?request=GetCapabilities&service=WFS",
        publisher: "Direktoratet for mineralforvaltning",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Bergrettigheter er tilgjengelig som WFS via Geonorge, med objekttypene Bergrettighet og BergrettighetGrense. Datasettet viser undersøkelses- og utvinningsretter for statens mineraler.",
      },
      {
        source_name: "Direktoratet for mineralforvaltnings kartløsning",
        source_url: "https://minit.dirmin.no/kart/",
        publisher: "Direktoratet for mineralforvaltning",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "DMFs egne ArcGIS-tjenester på kart.dirmin.no og minit.dirmin.no svarte med HTTP 503 ved forsøk 26. september 2026. Driftskonsesjoner kunne derfor ikke hentes maskinelt.",
      },
    ],
  },
];
