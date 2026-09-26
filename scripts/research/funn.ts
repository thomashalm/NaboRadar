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
    item_type: "finding",
    title: "Nordavind DC Sites: tolv anlegg i Innlandet",
    description:
      "Den operatøren i Norge med flest registrerte fasiliteter: tolv anlegg, alle i Innlandet og " +
      "Trøndelag-randen. Kommunene er løst fra postnummer: Alvdal, Elverum (to anlegg), Hamar " +
      "(Heggvin), Grue (Kirkenær), Vågå (Lalm), Østre Toten (Krabyskogen), Ringsaker (Rudshøgda), " +
      "Sør-Odal (Slomarka og Tronbøl), Tynset (Tylldalen) og Rendalen (Åkrestrømmen). " +
      "Til sammenligning har Green Mountain fem, GlobalConnect fem, Vaultica fire og Bulk to.",
    municipality: null,
    verification_status: "verified_public_source",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "medium",
    notes:
      "Ett funn for hele nettverket, ikke tolv: adressene i PeeringDB er stedsnavn uten husnummer, " +
      "så ingen av dem lar seg geokode presist. Kommunene er sikre (fra postnummer), koordinatene " +
      "er det ikke. Effekt og areal er ikke oppgitt for noen av anleggene. Dekker samtidig " +
      "DataCenterMap-markedene Elverum, Harpefoss og Bismo, som ikke lot seg åpne.",
    tidligere_titler: ["Markedsbildet: hvem har flest fysiske anlegg i Norge"],
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
    subcategory: "Datasenter",
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
      "De gjenstående markedene er navngitt i det egne funnet om gratisgrensen. Elverum og Hamar " +
      "er dekket gjennom PeeringDB i stedet.",
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
      "Beskrevet som «potential development» — ikke bekreftet prosjekt. Koordinaten er rettet: den " +
      "pekte tidligere på Violgata 8 (Halden DC01 sin adresse), og er nå satt til Saugbrugs eget " +
      "registrerte anleggspunkt fra Miljødirektoratets utslippsregister.",
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
