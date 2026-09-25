/**
 * npm run research:seed — legger inn de manuelle research-funnene som skal finnes i basen.
 *
 * Idempotent, og skriptet er kilden: funn kjennes igjen på tittel + adresse, feltene settes til
 * det som står her, og kilder legges til hvis de mangler. Endrer noen et felt i UI-et, vinner
 * skriptet neste gang det kjøres — derfor står bare de kuraterte funnene her, ikke alt.
 *
 * Kjøres sjelden og manuelt, mot SUPABASE_DB_URL, som eier. `created_by` settes eksplisitt til
 * «seed», så det er synlig i UI-et at ingen person la det inn.
 *
 * Research publiseres aldri automatisk. Dette skriptet skriver kun til admin_research_*.
 */
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());

interface Kilde {
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

interface Funn {
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
  why_interesting: string;
  notes?: string;
  kilder: Kilde[];
}

const FUNN: Funn[] = [
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
      "Ingen forsvarstilknytning er dokumentert. Chemring Nobel AS er den eneste eksplosivprodusenten " +
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
      "Skytefunksjon er *ikke* verifisert. Kartverket klassifiserer anlegget som «Idrettsanlegg», " +
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
    interest_level: "high",
    why_interesting:
      "Hensynssone for tunnel er en av de få planmekanismene som direkte begrenser hva en nabo kan gjøre på egen eiendom.",
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
    interest_level: "medium",
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
    interest_level: "medium",
    why_interesting:
      "Datasentre er den høyest prioriterte kategorien, og vi har ingen kilde som viser fysiske anlegg. Neste steg er Nkoms registreringsplikt for datasentre — nkom.no blokkerer søk fra script, så den må åpnes manuelt.",
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
    interest_level: "high",
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
    interest_level: "high",
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
    interest_level: "medium",
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
];

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("SUPABASE_DB_URL mangler");
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    for (const funn of FUNN) {
      const finnes = await client.query<{ id: string }>(
        `select id from admin_research_items where title = $1 and coalesce(address, '') = coalesce($2, '')`,
        [funn.title, funn.address ?? null],
      );

      const id = finnes.rows[0]?.id ?? (await settInn(client, funn));
      if (finnes.rows[0]) await oppdater(client, id, funn);

      let nyeKilder = 0;
      for (const kilde of funn.kilder) {
        const harKilden = await client.query(
          `select 1 from admin_research_sources where research_item_id = $1 and source_name = $2`,
          [id, kilde.source_name],
        );
        if (harKilden.rows.length > 0) continue;
        await client.query(
          `insert into admin_research_sources (
             research_item_id, source_name, source_url, publisher, source_type, source_date,
             primary_source, supports_claim, excerpt_or_summary
           ) values ($1, $2, $3, $4, $5, $6::date, $7, $8, $9)`,
          [
            id,
            kilde.source_name,
            kilde.source_url ?? null,
            kilde.publisher ?? null,
            kilde.source_type,
            kilde.source_date ?? null,
            kilde.primary_source ?? false,
            kilde.supports_claim ?? true,
            kilde.excerpt_or_summary ?? null,
          ],
        );
        nyeKilder += 1;
      }
      console.log(
        `  ${finnes.rows[0] ? "oppdatert" : "la inn"}: ${funn.title} — ${funn.address ?? "uten adresse"}` +
          `${nyeKilder ? ` (+${nyeKilder} kilder)` : ""}`,
      );
    }

    const [antall] = (
      await client.query<{ funn: string; kilder: string }>(
        `select (select count(*) from admin_research_items) as funn,
                (select count(*) from admin_research_sources) as kilder`,
      )
    ).rows;
    console.log(`Totalt: ${antall!.funn} funn, ${antall!.kilder} kilder`);
  } finally {
    await client.end();
  }
}

async function settInn(client: pg.Client, funn: Funn): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `insert into admin_research_items (
           item_type, category, subcategory, title, description,
           municipality, address, postal_code, city, latitude, longitude, geom,
           verification_status, operational_status, sensitivity, confidence, interest_level,
           why_interesting, notes, created_by
         ) values (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
           case when $10::double precision is not null
             then extensions.st_setsrid(extensions.st_makepoint($11, $10), 4326) end,
           $12, $13, $14, $15, $16, $17, $18, 'seed'
         ) returning id`,
    [
      funn.item_type,
      funn.category,
      funn.subcategory ?? null,
      funn.title,
      funn.description,
      funn.municipality ?? null,
      funn.address ?? null,
      funn.postal_code ?? null,
      funn.city ?? null,
      funn.latitude ?? null,
      funn.longitude ?? null,
      funn.verification_status,
      funn.operational_status,
      funn.sensitivity,
      funn.confidence,
      funn.interest_level,
      funn.why_interesting,
      funn.notes ?? null,
    ],
  );
  return rows[0]!.id;
}

/** Setter feltene til det som står i skriptet. Kilder røres ikke her. */
async function oppdater(
  client: pg.Client,
  id: string,
  funn: Funn,
): Promise<void> {
  await client.query(
    `update admin_research_items set
       item_type = $2, category = $3, subcategory = $4, description = $5,
       municipality = $6, postal_code = $7, city = $8, latitude = $9, longitude = $10,
       geom = case when $9::double precision is not null
                then extensions.st_setsrid(extensions.st_makepoint($10, $9), 4326) end,
       verification_status = $11, operational_status = $12, sensitivity = $13,
       confidence = $14, interest_level = $15, why_interesting = $16, notes = $17,
       updated_at = now()
     where id = $1`,
    [
      id,
      funn.item_type,
      funn.category,
      funn.subcategory ?? null,
      funn.description,
      funn.municipality ?? null,
      funn.postal_code ?? null,
      funn.city ?? null,
      funn.latitude ?? null,
      funn.longitude ?? null,
      funn.verification_status,
      funn.operational_status,
      funn.sensitivity,
      funn.confidence,
      funn.interest_level,
      funn.why_interesting,
      funn.notes ?? null,
    ],
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
