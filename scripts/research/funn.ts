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
    category: "Datasenter / industri / tekniske anlegg",
    subcategory: "Eksplosivproduksjon",
    item_type: "finding",
    title: "Planlagt produksjonsanlegg for eksplosiver",
    description:
      "Varslet planoppstart for et produksjonsanlegg for eksplosiver i skogsområdet ved Dustad, " +
      "sør i Asker (tidligere Hurum). Planområdet ligger uten adresse innen 600 m; nærmeste " +
      "adressenavn er Dustadveien, 1,2 km unna. Forslagsstiller er oppgitt som foretak, ikke kommunen.",
    municipality: "Asker",
    city: "Tofte",
    latitude: 59.56754,
    longitude: 10.51647,
    verification_status: "verified_public_source",
    operational_status: "planned",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et eksplosivanlegg er blant de få virksomhetene som faktisk endrer hva det betyr å bo i " +
      "nærheten. Planen er dokumentert; hvem som står bak og hva anlegget skal brukes til er det ikke.",
    notes:
      "Runde 2: Miljødirektoratets utslippsregister plasserer Chemring Nobels anlegg på Engeneveien 7A, " +
      "samme adresse som selskapet er registrert på, og 12 km fra dette planområdet. Det bekrefter at " +
      "planen gjelder et annet sted enn det eksisterende anlegget. Ingen forsvarstilknytning er dokumentert. Chemring Nobel AS er den eneste eksplosivprodusenten " +
      "registrert i Asker, men den registrerte adressen ligger 12 km nord for planområdet, så " +
      "selskapet kan ikke knyttes til stedet på grunnlag av adresse alene.",
    kilder: [
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
    title: "Løvenskioldbanen under omregulering",
    description:
      "Varslet detaljregulering for Løvenskioldbanen ved Dælimosen i Bærum. Kartverket fører " +
      "«Løvenskioldbanen» som idrettsanlegg 332 m fra planområdets senterpunkt, og «Skytterkollen» " +
      "som idrettshall 155 m unna.",
    municipality: "Bærum",
    address: "Dælimosen",
    postal_code: "1359",
    city: "Eiksmarka",
    latitude: 59.96122,
    longitude: 10.58635,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "high",
    why_interesting:
      "Skytestøy er en av de få nabobelastningene folk faktisk søker etter, og den fanges ikke av " +
      "de modellberegnede støysonene våre, som dekker veitrafikk og bane.",
    notes:
      "Forsvarsbyggs nasjonale datasett over skyte- og øvingsfelt er gjennomgått: dette er ikke et " +
      "militært felt. Skytefunksjon er *ikke* verifisert. Kartverket klassifiserer anlegget som «Idrettsanlegg», " +
      "ikke «Skytebane». Navnet Skytterkollen 155 m unna peker mot skyting, men et stedsnavn er " +
      "ikke en kilde på bruk. Må bekreftes mot Bærum kommune eller anleggseier før noe sies om støy.",
    kilder: [
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
    kilder: [
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
      "Datasenterprosjekt i Hovinbyen, beskrevet av operatøren som et anlegg som skal sette ny " +
      "standard for bærekraft og sikkerhet. Om det er i drift, under bygging eller planlagt går " +
      "ikke klart fram av kilden.",
    municipality: "Oslo",
    address: "Østre Aker vei 24C",
    postal_code: "0581",
    city: "Oslo",
    latitude: 59.92941,
    longitude: 10.8181,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "medium",
    interest_level: "high",
    why_interesting:
      "Et nytt datasenter midt i Hovinbyen, Oslos største transformasjonsområde, der det ellers " +
      "planlegges tett bolig. Effektbehov og kjøling er relevant for hele nabolaget.",
    notes:
      "Driftsstatus er ikke bekreftet. Skygard er registrert hos Nkom som kommersiell " +
      "datasenteroperatør, med kontoradresse Karenslyst allé 10.",
    kilder: [
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
    item_type: "finding",
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
    confidence: "medium",
    interest_level: "low",
    why_interesting:
      "Et datasenter i et kontorområde på Bryn som er under transformasjon til bolig.",
    notes: "Kun én kilde.",
    kilder: [
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
    item_type: "finding",
    title: "Ullevål Stadion datasenter, Sognsveien 75",
    description:
      "Fasilitet oppført i PeeringDB på Ullevål Stadion, med DNB Næringseiendom som organisasjon.",
    municipality: "Oslo",
    address: "Sognsveien 75",
    postal_code: "0855",
    city: "Oslo",
    latitude: 59.94856,
    longitude: 10.73282,
    verification_status: "partially_verified",
    operational_status: "active",
    sensitivity: "internal_only",
    confidence: "low",
    interest_level: "low",
    why_interesting:
      "Et samtrafikkpunkt i et idretts- og kontoranlegg midt i byen.",
    notes:
      "Kun én kilde, og organisasjonen er en eiendomsbesitter — det kan være et teknisk rom i " +
      "bygget snarere enn et datasenter.",
    kilder: [
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
    interest_level: "high",
    why_interesting:
      "Det første dokumenterte datasenteret i Asker. Ligger i et næringsområde tett på bolig og " +
      "på E18-korridoren, og er verdt å følge med på om det utvides.",
    notes:
      "Kun én bransjekilde. Bør bekreftes mot operatøren, Nkom-registeret eller byggesak.",
    kilder: [
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
];
