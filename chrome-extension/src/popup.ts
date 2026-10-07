import { buildNaboRadarUrl, NOT_FOUND_MESSAGE, notFound, type ExtractedAddress } from "./address";
import { isFinnListingUrl } from "./extractors/finn";

/** Settes ved bygging (build.mjs). Standard er produksjon. */
declare const NABORADAR_BASE_URL: string;

const SOURCE_TEXT: Record<ExtractedAddress["source"], string> = {
  "json-ld": "strukturerte data (JSON-LD)",
  "semantic-attribute": "merket adressefelt",
  "address-element": "adresseelement",
  "text-pattern": "tittel eller overskrift",
  "css-selector": "CSS-klasse",
  "not-listing-page": "ikke en annonse",
  none: "ingen",
};
const CONFIDENCE_TEXT: Record<ExtractedAddress["confidence"], string> = {
  high: "høy",
  medium: "middels",
  low: "lav",
  none: "ingen",
};

async function readActiveTab(): Promise<ExtractedAddress> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined || !tab.url || !isFinnListingUrl(tab.url)) return notFound("not-listing-page");
  const target = { tabId: tab.id };
  await chrome.scripting.executeScript({ target, files: ["content.js"] });
  const [injection] = await chrome.scripting.executeScript({
    target,
    func: () => globalThis.__naboradarExtract?.() ?? null,
  });
  return injection?.result ?? notFound();
}

function element(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`mangler #${id}`);
  return el;
}

function render(address: ExtractedAddress): void {
  element("loading").hidden = true;

  if (address.source === "not-listing-page") {
    element("not-listing").hidden = false;
    return;
  }
  if (!address.fullAddress) {
    element("missing-text").textContent = NOT_FOUND_MESSAGE;
    element("missing").hidden = false;
    return;
  }

  const url = buildNaboRadarUrl(NABORADAR_BASE_URL, address.fullAddress);
  element("address").textContent = address.fullAddress;
  element("details").textContent =
    `Kilde: ${SOURCE_TEXT[address.source]} · sikkerhet: ${CONFIDENCE_TEXT[address.confidence]}`;
  element("uncertain").hidden = address.confidence !== "low";
  element("open").addEventListener("click", () => {
    void chrome.tabs.create({ url });
    window.close();
  });
  element("found").hidden = false;
}

element("search").addEventListener("click", () => {
  void chrome.tabs.create({ url: NABORADAR_BASE_URL });
  window.close();
});

readActiveTab()
  .catch(() => notFound())
  .then(render);
