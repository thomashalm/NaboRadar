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
      "Mindre reguleringsendring for VEAS-anlegget på Bjerkås. VEAS er renseanlegget for avløp fra Oslo, Bærum og Asker.",
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
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke anleggets egen adresse.",
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
    ],
  },
  {
    category: "Miljø / grunn / forurensning",
    item_type: "finding",
    title: "Oredalen avfallsanlegg",
    description:
      "Forenklet endring i reguleringsplan for Oredalen avfallsanlegg i sørlige Asker.",
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
      "Adressen er nærmeste adresse til planområdets senterpunkt, ikke anleggets egen adresse.",
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
    title: "OSL01 datasenter, Selma Ellefsens vei 1 på Ulven",
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
    tidligere_titler: ["STACK OSL01 datasenter, Ulven"],
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
      "Oslo-sites — BDC på Lindeberg, CJH i sentrum og NR5 på Rommen.",
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
    verification_status: "unverified",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Hvis det faktisk finnes et registrert datasenter i Bærum, er det verdt å vite hvor. " +
      "Registreringsplikten gjelder anlegg over 0,5 MW, så det er ikke en serverskap i en kjeller.",
    notes:
      "Bevisst uten koordinat: adressen ligger i et boligstrøk, og et anlegg på over 0,5 MW er lite " +
      "sannsynlig der. Selskapsadresse skal ikke settes som anleggslokasjon.",
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
    item_type: "lead",
    title:
      "Odin Green DC — registrert datasenteroperatør med c/o-adresse i Asker",
    description:
      "Selskapet står i Nkoms datasenterregister med en c/o-adresse hos et forvaltningsselskap " +
      "i Asker. Kategori A: selskap registrert på en adresse. Hvor anlegget ligger er ukjent, " +
      "og ingenting tyder på at det er i Asker.",
    municipality: "Asker",
    verification_status: "investigated_not_confirmed",
    operational_status: "unknown",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "low",
    notes:
      "Uten koordinat med vilje. En c/o-adresse hos en regnskapsfører sier ingenting om hvor et " +
      "datasenter ligger, og skal ikke plasseres i kartet.",
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
        source_name: "Enhetsregisteret: ODIN GREEN DC AS",
        source_url:
          "https://data.brreg.no/enhetsregisteret/api/enheter/925218790",
        publisher: "Brønnøysundregistrene",
        source_type: "register",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Beliggenhetsadresse c/o TMF Norway AS, Hagaløkkveien 26, 1383 Asker. " +
          "Registrert hos Nkom som kommersiell datasenteroperatør. Adressen er en c/o-adresse hos et " +
          "regnskaps- og forvaltningsselskap, ikke et anlegg.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
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
    subcategory: "Avfallsforbrenning",
    item_type: "finding",
    title: "Hafslund Celsio Klemetsrud energigjenvinningsanlegg",
    description:
      "Norges største anlegg for energigjenvinning av avfall, med utslippstillatelse fra " +
      "Miljødirektoratet og utslipp til både luft og vann.",
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
      "at anlegget har tillatelse, ikke hvor mye det faktisk slipper ut i dag.",
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
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Avfall og fjernvarme",
    item_type: "finding",
    title: "Haraldrud energigjenvinnings- og varmesentralanlegg",
    description:
      "Samlet anleggsområde på Haraldrud med både materialgjenvinning og varmesentral. Begge har " +
      "egen utslippstillatelse og utslipp til luft og vann. Ett fysisk sted, to tillatelser.",
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
    title: "Alfabygget, Hans Møller Gasmanns vei 9 — OS-IX",
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
      "Datasenter-site oppført av GlobalConnect i samme gate som Alfabygget, men i et annet bygg.",
    municipality: "Oslo",
    address: "Hans Møller Gasmanns vei 1",
    postal_code: "0598",
    city: "Oslo",
    latitude: 59.93658,
    longitude: 10.83247,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Området rundt Hans Møller Gasmanns vei framstår som en datasenterklynge med flere bygg og " +
      "operatører — det er nyttig å vite når man ser på næringsbygg i Hovinbyen.",
    notes:
      "Kun én kilde. Bør bekreftes mot GlobalConnects egne sider eller byggesak.",
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
      "Effekttallene kommer fra bransjeomtale, ikke fra en myndighetskilde.",
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
      "Datasenter i Hovinbyen på 20 MW over 25 000 m², bygget for 2,4 milliarder kroner og satt i " +
      "drift første halvår 2025. Eid av Telenor, Hafslund og HitecVision med 31,7 % hver, og " +
      "Analysys Mason med 5 %. Overskuddsvarmen leveres til fjernvarmenettet. Det klart største " +
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
      "Løst i oppfølgingsrunden: 20 MW, i drift fra første halvår 2025. Skygard kjøpte to datasentre " +
      "av Orange i Oslo — det forklarer «Orange OSL5» som alias på OSL3. Registrert hos Nkom, med " +
      "kontoradresse Karenslyst allé 10.",
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
      "Datasenter på Grorud, oppført både som Skygard OSL3 og — i PeeringDB — som Basefarm OSL3 " +
      "med stedsangivelse Grorud. Basefarm er forgjengeren til Skygard, så dette er sannsynligvis " +
      "samme anlegg under to navn.",
    municipality: "Oslo",
    address: "Stanseveien 30",
    postal_code: "0976",
    city: "Oslo",
    latitude: 59.94951,
    longitude: 10.88071,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et etablert datasenter i et næringsområde på Grorud, tett på bolig.",
    notes:
      "Aliaser: Basefarm OSL3, Orange OSL5. Sammenkoblingen av Skygard og Basefarm bygger på at " +
      "adressene sammenfaller og at Basefarm er tidligere navn — ikke på en kilde som sier det direkte.",
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
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Østre Aker vei 18 — Telia og Arelion samtrafikkpunkt",
    description:
      "Colocation- og samtrafikkanlegg med to operatøroppføringer på samme adresse: Telia (OKR/C) " +
      "og Arelion (Oslo OKR/C). Samme facility-kode peker mot ett fysisk anlegg.",
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
    notes: "Aliaser: OKR/C, TeliaSonera OKR/C.",
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
      "Datasenter i Nydalen, nybygget og i drift fra 2014, med 500 m² gulvflate. V-Hosting er " +
      "oppført på samme adresse — sannsynligvis en operatør i samme bygg.",
    municipality: "Oslo",
    address: "Sandakerveien 121",
    postal_code: "0484",
    city: "Oslo",
    latitude: 59.94931,
    longitude: 10.7701,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "medium",
    why_interesting:
      "Et datasenter midt i Nydalen, et område som ellers er kontor, bolig og høyskole.",
    notes: "Aliaser: V-Hosting Data Center, Availo.",
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
    notes: "Beskrevet som nettverksanlegg, ikke et fullt datasenter.",
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
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Forskningsparken, Gaustadalléen 21",
    description:
      "Mindre datasenter i Forskningsparken på Gaustad, direkte tilknyttet NIX. Fire oppføringer " +
      "på adressen — Nordlo, AVUR, SSC Networks og en uspesifisert — peker mot ett bygg med flere " +
      "operatører.",
    municipality: "Oslo",
    address: "Gaustadalléen 21",
    postal_code: "0349",
    city: "Oslo",
    latitude: 59.94229,
    longitude: 10.71674,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Forskningsparken er et av de eldste samtrafikkpunktene i Norge, og ligger midt i et " +
      "universitets- og boligområde.",
    notes:
      "Aliaser: AVUR Oslo, Nordlo Forskningsparken, SSC Networks. AVUR er registrert hos Nkom.",
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
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "low",
    why_interesting:
      "Et datasenter i et kontorområde på Bryn som er under transformasjon til bolig.",
    notes:
      "Nedgradert i runde 5: det eneste nettverket i fasiliteten er Fujitsus eget, samme mønster " +
      "som Sognsveien 75. Trolig et internt teknisk rom. Ikke avvist, men ikke dokumentert som " +
      "kommersielt anlegg.",
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
      "Colocation-anlegg drevet av Webhuset, på Ulven — samme kvartal som OSL01.",
    municipality: "Oslo",
    address: "Ulvenveien 87",
    postal_code: "0581",
    city: "Oslo",
    latitude: 59.92474,
    longitude: 10.81292,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "low",
    why_interesting:
      "Enda et anlegg i Ulven-klyngen; samlet gjør de området til Oslos tetteste ansamling av " +
      "datasentre.",
    notes: "Kun én kilde.",
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
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Nok et anlegg i Økern-klyngen, i et område med tung boligutbygging.",
    notes: "Svakt dokumentert. Bør bekreftes før det behandles som et faktum.",
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
    title: "Astrofarm Oslo, Nye Vakås vei 8 i Hvalstad",
    description:
      "Datasenteranlegg oppført av Astrofarm AS i næringsområdet på Hvalstad. Det eneste anlegget " +
      "i de tre kommunene utenfor Oslo som dukker opp i bransjeoversiktene.",
    municipality: "Asker",
    address: "Nye Vakås vei 8",
    postal_code: "1395",
    city: "Hvalstad",
    latitude: 59.85647,
    longitude: 10.47605,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Det første dokumenterte datasenteret i Asker. Ligger i et næringsområde tett på bolig og " +
      "på E18-korridoren, og er verdt å følge med på om det utvides.",
    notes:
      "Oppfølgingsrunde: selskapet og adressen er bekreftet i flere kilder, men Astrofarm står ikke i " +
      "Nkoms register — anlegget er trolig under 0,5 MW. DataCenterMap bruker dessuten samme ordlyd " +
      "her som for Blix BDC, så beskrivelsen av anlegget er ikke uavhengig bekreftet. Interessenivå " +
      "nedjustert til middels: et lite anlegg, ikke en stor installasjon.",
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
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
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
    item_type: "note",
    title: "Markedsbildet: hvem har flest fysiske anlegg i Norge",
    description:
      "Nasjonal oversikt, til å forstå aktørene. Nordavind DC Sites har ti registrerte " +
      "fasiliteter, alle i innlandet. Green Mountain har tre (Rennesøy, Rjukan og Ytre " +
      "Enebakk). Vaultica har OSL01 i Oslo, OSL02 i Nordre Follo og OSL03 i Lillestrøm. " +
      "Bulk har OS-IX i Oslo og N01-campus i Øvrebø. GlobalConnect har fem (tre i Oslo, " +
      "Stavanger og Trondheim).",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "low",
    notes:
      "Ingen av disse ligger i Oslo, Bærum eller Asker utover det som allerede er registrert. " +
      "Oversikten står her for å hindre at samme kartlegging gjøres om igjen.",
    kilder: [
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
    confidence: "high",
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
      "Norges største datasenterutbygging: 180 MW under bygging i Kirkvollen industriområde " +
      "i Tydal, eid av Bitdeer Technologies Group. Etablert 2021 for bitcoinutvinning, nå " +
      "under konvertering til AI-kolokasjon. Nkom oppgir 33 % kryptoutvinning.",
    municipality: "Tydal",
    city: "Tydal",
    latitude: 63.03392,
    longitude: 11.67715,
    verification_status: "verified_public_source",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "high",
    why_interesting:
      "180 MW er i en annen størrelsesorden enn alt annet i dette datasettet — mer enn " +
      "det samlede dokumenterte forbruket i Oslo. Det endrer kraftbalansen i en liten " +
      "kommune, og viser hva et datasenter kan bli.",
    notes:
      "Koordinaten er Kartverkets punkt for Kirkvollen i Tydal, ikke anleggets egen adresse. " +
      "Effekttallet kommer fra operatøren og entreprenøren, ikke fra en myndighetskilde.",
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
      "Kraftkrevende containeranlegg i Tunnsjødalen med 8 500 maskiner og 300 servere, som " +
      "utvinner kryptovaluta for søsterselskapet Bitzero Inc. Nkom oppgir 100 % " +
      "kryptoutvinning. Driften har vært omtalt som truet etter et underskudd på 55 " +
      "millioner kroner.",
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
      "Aliaser: Bitzero Namsskogan, Exanorth Tunnsjødalen. Selskapet oppga først at bruken var " +
      "hemmelig og beskrev den som skylagring.",
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
      "Datasenter i Hustadvika utenfor Molde med 97 % av forbruket til kryptoutvinning — den " +
      "høyeste andelen blant de norske anleggene av denne størrelsen. Samme eierskap som " +
      "Tydal Data Center.",
    municipality: "Hustadvika",
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et av landets største kryptoanlegg, og halvparten av et eierskap som samlet " +
      "disponerer rundt 247 MW norsk kraft.",
    notes:
      "Uten koordinat: ingen kilde oppgir anleggets adresse, bare kommunen. Må stedfestes før " +
      "det kan brukes til noe.",
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
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    notes:
      "Uten koordinat: bare bydelen er kjent, ikke adressen. Å sette et punkt på Tromsdalen som " +
      "helhet ville vært å late som vi vet hvor anlegget står.",
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
    item_type: "lead",
    title: "Fire kryptooperatører uten stedfestet anlegg",
    description:
      "Fire av de ni Nkom-operatørene med kryptoutvinning er fortsatt ikke stedfestet: Bluebite " +
      "(Fauske), Currency Edge (Kvænangen), Arctic Flux (Horten) og Nordic Blocks (Søndre Land). " +
      "Bluefjords er løst — anlegget ligger i Jostedalsvegen 530 i Gaupne.",
    municipality: null,
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
    address: "Granittveien 100",
    postal_code: "1914",
    city: "Ytre Enebakk",
    latitude: 59.75914,
    longitude: 10.99308,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
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
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "AQ Compute / hscale OSL1, Hønefoss",
    description:
      "Kolokasjonsanlegg på Follum i Hønefoss, oppgitt som AQ Computes første colocation-datasenter.",
    municipality: "Ringerike",
    address: "Follummoveien 94",
    postal_code: "3516",
    city: "Hønefoss",
    latitude: 60.20508,
    longitude: 10.23546,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et av de større anleggene i Oslos randsone, på et tidligere industriområde.",
    notes:
      "Kapasitetstall kommer fra operatør- og bransjekilder, ikke fra myndighet.",
    kilder: [
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
        excerpt_or_summary:
          "Adressen er verifisert og geokodet mot Kartverkets adresseregister.",
      },
    ],
  },
  {
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Datasenter",
    item_type: "finding",
    title: "Bulk N01 Data Center Campus, Vennesla",
    description:
      "Bulks nasjonale campus i Øvrebø i Vennesla, med flere registrerte driftsselskaper (N01, DCM101, DCM102).",
    municipality: "Vennesla",
    address: "Stølevegen 39",
    postal_code: "4715",
    city: "Øvrebø",
    latitude: 58.25757,
    longitude: 7.89205,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Bulks hovedcampus, og forklaringen på hvorfor selskapet har fire Nkom-registreringer på én kontoradresse i Oslo.",
    notes:
      "Kapasitetstall kommer fra operatør- og bransjekilder, ikke fra myndighet.",
    kilder: [
      {
        source_name: "DataCenterMap: Bulk N01 Data Center Campus, Vennesla",
        source_url: "https://www.datacentermap.com/norway/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        excerpt_or_summary:
          "Oppført som Bulk N01 Data Center Campus, Vennesla, operatør Bulk Infrastructure, adresse Stølevegen 39, 4715 Øvrebø. " +
          "Bulks nasjonale campus i Øvrebø i Vennesla, med flere registrerte driftsselskaper (N01, DCM101, DCM102).",
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
        primary_source: true,
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
      "Planlagt datasentercampus på 350 MW med fire bygg i Haugaland Business Park, rettet mot " +
      "AI-arbeidslast med fornybar kraft og avansert kjøling. Fem katalogoppføringer — campus pluss " +
      "fire bygg — er ett fysisk anlegg.",
    municipality: "Tysvær",
    address: "Havnavegen 73",
    postal_code: "5570",
    city: "Aksdal",
    latitude: 59.3154,
    longitude: 5.42391,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Det største planlagte datasenteret i Norge etter oppgitt effekt. 350 MW i én næringspark er " +
      "en kraftbruk i samme størrelsesorden som en mellomstor by.",
    notes:
      "Effekttallet kommer fra operatøren via bransjekatalog, ikke fra konsesjon eller myndighet. " +
      "Bygg 1–4 er lagret som struktur på dette funnet, ikke som egne anlegg.",
    kilder: [
      {
        source_name: "DataCenterMap: atNorth NOR01, Haugaland Business Park",
        source_url: "https://www.datacentermap.com/norway/aksdal/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
      "Planlagt anlegg på 300 MW med 100 000 m² campus i Haugaland Business Park, på fornybar " +
      "vannkraft. Ligger i samme næringspark som atNorths NOR01.",
    municipality: "Tysvær",
    address: "Havnavegen 73",
    postal_code: "5570",
    city: "Aksdal",
    latitude: 59.3154,
    longitude: 5.42391,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Sammen med atNorth gir dette 650 MW planlagt effekt i én næringspark i Tysvær — det tyngste " +
      "kraftuttaket som planlegges noe sted i dette datasettet.",
    notes:
      "Eget anlegg, ikke samme campus som atNorth, men samme næringspark. Koordinaten er parkens " +
      "adresse; anleggenes egne tomter er ikke stedfestet hver for seg.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Mountain Gismarvik",
        source_url: "https://www.datacentermap.com/norway/aksdal/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
    description: "Anlegg på 8 MW, klassifisert som Tier 3.",
    municipality: "Klepp",
    address: "Plogfabrikkvegen 8",
    postal_code: "4353",
    city: "Kvernaland",
    latitude: 58.78333,
    longitude: 5.70576,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et mellomstort anlegg på Jæren, i samme område som Green Horizons større campus.",
    notes:
      "Adressen er geokodet til Klepp, ikke Time, som markedsnavnet «Bryne» ville antydet.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Horizon «Vidar», Kvernaland",
        source_url: "https://www.datacentermap.com/norway/bryne/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Green Horizon, adresse Plogfabrikkvegen 8, 4353 Kvernaland.",
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
    title: "Green Horizon Norway 1, Dysjaland",
    description:
      "Campus på 36 MW med to bygg. Tre katalogoppføringer — campus, DC1 og DC2 — er ett anlegg.",
    municipality: "Sola",
    address: "Næringsvegen 20",
    postal_code: "4365",
    city: "Dysjaland",
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et av de større anleggene i Rogaland, i næringsområdet ved Sola.",
    notes:
      "Uten koordinat: Næringsvegen 20 med postnummer 4365 lot seg ikke geokode sikkert mot " +
      "Kartverket. Ingen omtrentlig koordinat er satt.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Horizon Norway 1, Dysjaland",
        source_url: "https://www.datacentermap.com/norway/stavanger/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Green Horizon, adresse Næringsvegen 20, 4365 Dysjaland.",
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
    confidence: "medium",
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
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Green Mountain, adresse Hodneveien 260, 4150 Rennesøy.",
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
    title: "Green Mountain Jørpeland",
    description:
      "Planlagt anlegg på det tidligere stålverksområdet i Jørpeland, på fornybar kraft.",
    municipality: "Strand",
    address: "Stålverksvegen 51",
    postal_code: "4100",
    city: "Jørpeland",
    latitude: 59.01823,
    longitude: 6.03708,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Gjenbruk av et nedlagt industriområde til datasenter — en tydelig indikator på hvor bransjen " +
      "leter etter tomter med kraft og nett fra før.",
    notes:
      "Adressen «Stålverksvegen» bekrefter industrihistorikken. Kommunen er Strand, ikke Stavanger, " +
      "som markedsnavnet antyder.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Mountain Jørpeland",
        source_url: "https://www.datacentermap.com/norway/stavanger/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
      "Datasenter på 25 MW under utvikling, oppgitt som utvidelse av Microsofts europeiske " +
      "infrastruktur.",
    municipality: "Sandnes",
    address: "Kvålkroken",
    postal_code: "4323",
    city: "Sandnes",
    latitude: 58.81713,
    longitude: 5.72007,
    verification_status: "partially_verified",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "En hyperskala-aktør som bygger fysisk i Norge. Microsofts norske kontoradresse i Oslo er ikke " +
      "et anlegg — dette er det.",
    notes:
      "Effekttallet kommer fra bransjekatalog. Ikke bekreftet mot Microsoft selv eller mot byggesak.",
    kilder: [
      {
        source_name: "DataCenterMap: Microsoft Sandnes",
        source_url: "https://www.datacentermap.com/norway/stavanger/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Microsoft, adresse Kvålkroken, 4323 Sandnes.",
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
    title: "Kitebrook Leirdøla, Gaupne",
    description:
      "Planlagt campus på 100 MW for AI og HPC i Gaupne, på vannkraft og oppgitt som " +
      "aggregatfri — driftssikkerheten skal komme fra kraftnettet, ikke fra dieselaggregater.",
    municipality: "Luster",
    address: "Jostedalsvegen",
    postal_code: "6868",
    city: "Gaupne",
    latitude: 61.44092,
    longitude: 7.25008,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "high",
    why_interesting:
      "100 MW AI-kapasitet i en kommune med 5 000 innbyggere. Aggregatfri drift er uvanlig og " +
      "forutsetter svært god nettkapasitet.",
    notes:
      "Koordinaten er Jostedalsvegen 530, altså Bluefjords' adresse i samme veg — Kitebrooks egen " +
      "tomt ved Leirdøla er ikke stedfestet. Kun én kilde.",
    kilder: [
      {
        source_name: "DataCenterMap: Kitebrook Leirdøla, Gaupne",
        source_url: "https://www.datacentermap.com/norway/gaupne/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
    title: "Bluefjords og Compute Nordic, Gaupne",
    description:
      "Datasenter i Gaupne med to operatøroppføringer på samme adresse: Bluefjords AS, som tilbyr " +
      "rack, colocation og whitespace «powered by glacier», og Compute Nordic DC1. Bluefjords er " +
      "Nkom-registrert med 14 % kryptoutvinning.",
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
      "Aliaser: BlueFjords AS, Compute Nordic DC1. Kryptoandelen på 14 % gjelder operatøren " +
      "Bluefjords, ikke nødvendigvis hele anlegget.",
    kilder: [
      {
        source_name: "DataCenterMap: Bluefjords og Compute Nordic, Gaupne",
        source_url: "https://www.datacentermap.com/norway/gaupne/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
      "AI-datasenter på 13 MW under utvikling i Fauske, med planlagt åpning i 2027. Oppgitt til rundt " +
      "1 000 arbeidsplasser i byggefasen og 100–150 varige. Nscale Drift AS er Nkom-registrert.",
    municipality: "Fauske",
    address: "Follaveien",
    postal_code: "8200",
    city: "Fauske",
    latitude: 67.25948,
    longitude: 15.39275,
    verification_status: "partially_verified",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et AI-anlegg i Nordland med et sysselsettingsomfang som betyr noe for en kommune på 10 000 " +
      "innbyggere. Byggefasen alene er en stor lokal sak.",
    notes:
      "Bluebite GmbH har også Fauske-adresse i Nkom-registeret, men er et annet selskap og er ikke " +
      "stedfestet. Ikke bland dem.",
    kilder: [
      {
        source_name: "DataCenterMap: Nscale Fauske",
        source_url: "https://www.datacentermap.com/norway/fauske/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Nscale, adresse Follaveien, 8200 Fauske.",
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
    title: "Kitebrook Børdalen",
    description:
      "Planlagt campus på 100 MW for AI og HPC på vannkraft, med avansert kjøling.",
    municipality: "Kvam",
    address: "Fv133",
    postal_code: "5650",
    city: "Børdalen",
    latitude: 60.38,
    longitude: 5.9,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Enda en 100 MW AI-campus fra samme aktør, i et lite tettsted på Vestlandet.",
    notes:
      "Koordinaten er grov og satt fra stedsnavnet Børdalen, ikke fra en verifisert adresse — «Fv133» " +
      "er en fylkesveg uten husnummer. DataCenterMap fører anlegget under markedet «Bergen», men " +
      "Børdalen ligger ikke i Bergen kommune. Begge deler gjør funnet svakt stedfestet.",
    kilder: [
      {
        source_name: "DataCenterMap: Kitebrook Børdalen",
        source_url: "https://www.datacentermap.com/norway/bergen/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
    title: "ASP Dalekvam",
    description:
      "ASP Data Center har kjøpt en tidligere tekstilfabrikk i Dalekvam og planlegger å gjøre den om " +
      "til et AI-rettet datasenter på 20 MW.",
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
      "DataCenterMap fører anlegget under markedet «Bergen», men Dalekvam ligger i Vaksdal kommune. " +
      "Kommunen er satt fra geokodet adresse.",
    kilder: [
      {
        source_name: "DataCenterMap: ASP Dalekvam",
        source_url: "https://www.datacentermap.com/norway/bergen/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
    title: "Datafjellet, Bønes",
    description:
      "Datasenter i fjellhall på Bønes i Bergen, med private, spesialbygde datarom. Datafjellet AS er " +
      "Nkom-registrert.",
    municipality: "Bergen",
    address: "Gullstølsstien 258",
    postal_code: "5153",
    city: "Bønes",
    latitude: 60.33899,
    longitude: 5.31271,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Et fjellanlegg midt i et boligområde i Bergen — den typen anlegg som er helt usynlig fra " +
      "overflaten.",
    notes: "Kun katalogkilde pluss Nkom-registrering.",
    kilder: [
      {
        source_name: "DataCenterMap: Datafjellet, Bønes",
        source_url: "https://www.datacentermap.com/norway/bergen/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Datafjellet AS, adresse Gullstølsstien 258, 5153 Bønes.",
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
    title: "Arcem Bergen, Haukeland",
    description:
      "Planlagt datasenter til flere milliarder kroner i Haukeland, med nærhet til " +
      "transformatorstasjoner og hovedveg oppgitt som begrunnelse.",
    municipality: "Bergen",
    address: "Langedalen",
    postal_code: "5268",
    city: "Haukeland",
    latitude: 60.37466,
    longitude: 5.45259,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Et stort planlagt anlegg i Bergen øst. Nærheten til transformatorstasjoner er akkurat det " +
      "kraftsporet vi leter etter.",
    notes:
      "Kun én katalogkilde, ingen effekt oppgitt. Bør følges opp mot kommunen og nettselskapet.",
    kilder: [
      {
        source_name: "DataCenterMap: Arcem Bergen, Haukeland",
        source_url: "https://www.datacentermap.com/norway/bergen/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
    title: "ITsjefen NDC1, NDC2 og NDC4, Trondheim",
    description:
      "Tre anlegg i Trondheim drevet av ITsjefen: NDC1 i Havnegata 9, NDC2 på Brattørkaia 17B og " +
      "NDC4 i Tungavegen 30. Tre separate bygg, én operatør. Nkom-registrert.",
    municipality: "Trondheim",
    address: "Brattørkaia 17B",
    postal_code: "7010",
    city: "Trondheim",
    latitude: 63.43772,
    longitude: 10.3984,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "low",
    why_interesting: "Den største regionale colocation-aktøren i Trøndelag.",
    notes:
      "Samlet i ett funn fordi de tre er samme operatørs bynett, men de er fysisk atskilte bygg. " +
      "Koordinaten er NDC2 på Brattørkaia.",
    kilder: [
      {
        source_name: "DataCenterMap: ITsjefen NDC1, NDC2 og NDC4, Trondheim",
        source_url: "https://www.datacentermap.com/norway/trondheim/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør ITsjefen AS, adresse Brattørkaia 17B, 7010 Trondheim.",
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
    item_type: "note",
    title: "Dekningsstatus for den nasjonale datasenterkartleggingen",
    description:
      "Av 112 katalogoppføringer nasjonalt er omtrent 74 åpnet og vurdert enkeltvis i de " +
      "gjennomgåtte markedene. Rundt 38 gjenstår, fordelt på Kristiansand, Skien, " +
      "Sandefjord, Halden, Husnes og en rekke markeder med ett anlegg hver.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "high",
    interest_level: "low",
    notes:
      "Neste steg er å åpne de gjenstående markedene. De er identifisert med navn og antall, " +
      "så arbeidet er avgrenset og kan tas opp igjen uten ny discovery.",
    kilder: [
      {
        source_name: "DataCenterMap: markeder gjennomgått i denne runden",
        source_url: "https://www.datacentermap.com/norway/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
      "AI-infrastrukturprosjekt fra OpenAI, Nscale og Aker ASA i Kvanndal ved Narvik. Oppgitt til " +
      "100 000 NVIDIA-GPU-er innen utgangen av 2026, med 230 MW i første fase og mulig utvidelse til " +
      "520 MW, utelukkende på fornybar kraft.",
    municipality: "Narvik",
    address: "Kvanndal",
    postal_code: "8530",
    city: "Bjerkvik",
    latitude: 68.53,
    longitude: 17.6,
    verification_status: "partially_verified",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Det desidert største digitale infrastrukturprosjektet i Norge. 520 MW i full utbygging er mer " +
      "enn alle andre anlegg i dette datasettet til sammen, i en kommune med 22 000 innbyggere.",
    notes:
      "Koordinaten er grov og satt fra stedsangivelsen Kvanndal ved Bjerkvik, ikke fra en verifisert " +
      "adresse. Effekttallene er prosjekttall fra aktørene, ikke konsesjonsgitt kapasitet. Skill " +
      "mellom første fase (230 MW) og oppgitt sluttkapasitet (520 MW).",
    kilder: [
      {
        source_name: "DataCenterMap: Stargate Norway / Nscale Narvik, Kvanndal",
        source_url: "https://www.datacentermap.com/norway/narvik/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Nscale, OpenAI og Aker, adresse Kvanndal, 8530 Bjerkvik.",
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
    title: "Google Skien",
    description:
      "Google bygger datasenter i Skien med en oppgitt investering på 600 millioner euro, ventet i " +
      "drift i 2026.",
    municipality: "Skien",
    address: "Skådalsvegen",
    postal_code: "3721",
    city: "Skien",
    latitude: 59.2723,
    longitude: 9.48707,
    verification_status: "partially_verified",
    operational_status: "under_construction",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "En hyperskala-aktør som bygger fysisk i Norge. Investeringsbeløpet gjør det til et av de " +
      "største industriprosjektene i Telemark.",
    notes:
      "Effekt er ikke oppgitt, bare investeringsbeløp. Koordinaten er Skådalsvegen 361, nærmeste " +
      "husnummer — tomtens eget punkt er ikke stedfestet.",
    kilder: [
      {
        source_name: "DataCenterMap: Google Skien",
        source_url: "https://www.datacentermap.com/norway/skien/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
    title: "BW Frier Vest, Bamble",
    description:
      "Planlagt datasenter på 250 MW i Frier Vest industripark i Grenland, med fornybar kraft og " +
      "dypvannskai.",
    municipality: "Bamble",
    address: "Frier Vest næringspark",
    postal_code: "3960",
    city: "Stathelle",
    latitude: 59.04511,
    longitude: 9.69821,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "250 MW i Grenland, i et industriområde som allerede har tung prosessindustri og kaianlegg.",
    notes:
      "Koordinaten er tettstedet Stathelle, ikke næringsparkens egen adresse.",
    kilder: [
      {
        source_name: "DataCenterMap: BW Frier Vest, Bamble",
        source_url: "https://www.datacentermap.com/norway/skien/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
    address: "Skien",
    postal_code: "3721",
    city: "Skien",
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "high",
    why_interesting:
      "Sammen med Google og BW Frier Vest gjør dette Grenland til et av de tyngste " +
      "datasenterområdene i landet.",
    notes:
      "Uten koordinat: kilden oppgir bare «within Skien». Ingen adresse, ingen tomt.",
    kilder: [
      {
        source_name: "DataCenterMap: Nscale Skien",
        source_url: "https://www.datacentermap.com/norway/skien/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Nscale / Aker, adresse Skien, 3721 Skien.",
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
    address: "Tonstad",
    postal_code: "4440",
    city: "Tonstad",
    latitude: 58.66421,
    longitude: 6.7165,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "300 MW nettkapasitet i en kraftkommune med 1 800 innbyggere. Tomtestørrelsen alene gjør det " +
      "til en av de største næringsetableringene i Agder.",
    notes:
      "Merk skillet: 300 MW er oppgitt *nettkapasitet*, ikke installert effekt eller IT-last. " +
      "Koordinaten er tettstedet Tonstad.",
    kilder: [
      {
        source_name: "DataCenterMap: Tonstad DataPark, Sirdal",
        source_url: "https://www.datacentermap.com/norway/tonstad/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
    confidence: "medium",
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
        primary_source: true,
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
      "Datasenter på 10 MW i et ombygd vannkraftverk fra 1919, nedlagt i 2008. Terakrafts " +
      "flaggskipanlegg.",
    municipality: "Sauda",
    address: "Handelandsvegen 140",
    postal_code: "4200",
    city: "Hellandsbygd",
    latitude: 59.68485,
    longitude: 6.51957,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et 100 år gammelt kraftverk gjort om til datasenter — det tydeligste eksempelet på at " +
      "bransjen følger gammel kraftinfrastruktur.",
    notes: "10 MW er oppgitt som dagens kapasitet.",
    kilder: [
      {
        source_name: "DataCenterMap: Terakraft Sauda I, Hellandsbygd",
        source_url: "https://www.datacentermap.com/norway/sauda/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Terakraft, adresse Handelandsvegen 140, 4200 Hellandsbygd.",
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
    title: "Green Mountain RJU1-Rjukan",
    description: "Green Mountains anlegg på Rjukan, wholesale colocation.",
    municipality: "Tinn",
    address: "Svaddevegen 161",
    postal_code: "3660",
    city: "Rjukan",
    latitude: 59.88108,
    longitude: 8.66942,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Rjukan er selve symbolet på norsk vannkraftindustri, og anlegget viderefører den bruken.",
    notes: "Effekt og areal er ikke oppgitt i kilden.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Mountain RJU1-Rjukan",
        source_url: "https://www.datacentermap.com/norway/rjukan/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Green Mountain, adresse Svaddevegen 161, 3660 Rjukan.",
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
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et datasenter inne i en gruve er den mest særegne anleggstypen i Norge, og et av de få norske " +
      "anleggene med internasjonal kjennskap.",
    notes: "Effekt og areal er ikke oppgitt i den gjennomgåtte kilden.",
    kilder: [
      {
        source_name: "DataCenterMap: Lefdal Mine Datacenter, Kjølsdalen",
        source_url: "https://www.datacentermap.com/norway/maloy/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Lefdal Mine Datacenter, adresse Nordfjordvegen 7300, 6776 Kjølsdalen.",
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
        primary_source: true,
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
    title: "Gigahost, Søndre Kullerød i Sandefjord",
    description:
      "Tre datasenteroppføringer — DC1, DC2 og DC3 — på samme adresse i Sandefjord. Gigahost AS er " +
      "Nkom-registrert.",
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
      "Tre katalogoppføringer, én adresse. Om det er tre separate haller i samme bygg eller tre " +
      "oppføringer av samme anlegg, går ikke fram av kilden.",
    kilder: [
      {
        source_name: "DataCenterMap: Gigahost, Søndre Kullerød i Sandefjord",
        source_url: "https://www.datacentermap.com/norway/sandefjord/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Gigahost AS, adresse Søndre Kullerød 2, 3241 Sandefjord.",
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
    title: "Arcem Husnes, Grøn Næringspark",
    description:
      "Planlagt datasenter på 90 MW i Grøn Næringspark, med 40 MW i første fase ventet i 2031, på " +
      "60 000 m² tomt.",
    municipality: "Kvinnherad",
    address: "Grøn Næringspark",
    postal_code: "5460",
    city: "Husnes",
    latitude: 59.86377,
    longitude: 5.74533,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "90 MW i Kvinnherad, i samme næringspark som et annet planlagt anlegg. To store prosjekter i " +
      "én park i en kommune med 13 000 innbyggere.",
    notes:
      "Skill mellom første fase (40 MW, 2031) og oppgitt sluttkapasitet (90 MW). Koordinaten er " +
      "tettstedet Husnes, ikke parkens egen adresse.",
    kilder: [
      {
        source_name: "DataCenterMap: Arcem Husnes, Grøn Næringspark",
        source_url: "https://www.datacentermap.com/norway/husnes/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
    title: "NDC Husnes, Grøn Næringspark",
    description:
      "Planlagt datasenter i Grøn Næringspark med 50 MW i første fase og mulighet for å skalere til " +
      "150 MW, på fornybar kraft.",
    municipality: "Kvinnherad",
    address: "Grøn Næringspark",
    postal_code: "5460",
    city: "Husnes",
    latitude: 59.86377,
    longitude: 5.74533,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Sammen med Arcem gir dette inntil 240 MW planlagt i én næringspark på Husnes.",
    notes:
      "Skill mellom første fase (50 MW) og oppgitt potensial (150 MW). Eget prosjekt, ikke samme " +
      "anlegg som Arcem, men samme park.",
    kilder: [
      {
        source_name: "DataCenterMap: NDC Husnes, Grøn Næringspark",
        source_url: "https://www.datacentermap.com/norway/husnes/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
    title: "Green Mountain Halden, Saugbrug",
    description:
      "Mulig datasenterutvikling på Norske Skog Saugbrugs industriområde, som et samarbeid mellom " +
      "Green Mountain og Norske Skog.",
    municipality: "Halden",
    address: "Saugbrug industriområde",
    postal_code: "1772",
    city: "Halden",
    latitude: 59.12347,
    longitude: 11.38597,
    verification_status: "partially_verified",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "medium",
    why_interesting:
      "Enda et tilfelle av datasenter på en eksisterende industritomt med kraft og nett fra før.",
    notes:
      "Beskrevet som «potential development» — ikke bekreftet prosjekt. Koordinaten er Violgata 8 i " +
      "Halden, ikke industriområdets eget punkt.",
    kilder: [
      {
        source_name: "DataCenterMap: Green Mountain Halden, Saugbrug",
        source_url: "https://www.datacentermap.com/norway/halden/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
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
      "Colocation-anlegg i Halden med 250 kW tilgjengelig kapasitet, ISO 27001-sertifisert, eid av " +
      "Storespeed AS med Magnora ASA i ryggen.",
    municipality: "Halden",
    address: "Violgata 8",
    postal_code: "1776",
    city: "Halden",
    latitude: 59.12347,
    longitude: 11.38597,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "low",
    why_interesting:
      "Et lite, men reelt anlegg. 250 kW gjør det til det minste dokumenterte i datasettet.",
    notes:
      "Merk størrelsen: 250 kW, ikke MW. Storespeed er Nkom-registrert, og Magnora står også bak " +
      "AI-datasenteret på Nedre Rommen i Oslo.",
    kilder: [
      {
        source_name: "DataCenterMap: Halden DC01",
        source_url: "https://www.datacentermap.com/norway/halden/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Storespeed AS, adresse Violgata 8, 1776 Halden.",
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
    title: "PolarDC HER01, Herøya",
    description: "Datasenter i Herøya industripark i Porsgrunn.",
    municipality: "Porsgrunn",
    address: "Fjordgata 48",
    postal_code: "3936",
    city: "Porsgrunn",
    latitude: 59.11356,
    longitude: 9.63635,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    why_interesting:
      "Herøya er Norges største industripark, med kraft og infrastruktur fra før.",
    notes:
      "Effekt og areal er ikke oppgitt. DataCenterMap fører anlegget under markedet «Skien», men det " +
      "ligger i Porsgrunn kommune.",
    kilder: [
      {
        source_name: "DataCenterMap: PolarDC HER01, Herøya",
        source_url: "https://www.datacentermap.com/norway/skien/",
        publisher: "DataCenterMap",
        source_type: "web",
        source_date: "2026-09-26",
        primary_source: true,
        excerpt_or_summary:
          "Oppført med operatør Polar Data Centers, adresse Fjordgata 48, 3936 Porsgrunn.",
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
];
