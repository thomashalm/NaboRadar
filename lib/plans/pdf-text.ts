import { extractText, getDocumentProxy } from "unpdf";

/** Sider som leses. Formålet står i innledningen; resten av et 80-siders planprogram trengs ikke. */
const MAKS_SIDER = 15;

/**
 * Tekstlaget i en PDF, eller null når dokumentet ikke har et (skannet) eller ikke kan leses.
 * Brukes bare under synk (scripts/enrich-plans.ts), aldri i en sidevisning.
 */
export async function pdfTekst(data: Uint8Array): Promise<string | null> {
  try {
    const pdf = await getDocumentProxy(data, { verbosity: 0 });
    const { text } = await extractText(pdf, { mergePages: false });
    const tekst = (text as string[]).slice(0, MAKS_SIDER).join("\n");
    await pdf.cleanup?.().catch(() => {});
    // Et skannet dokument gir noen få tegn fra topptekst eller stempel.
    return tekst.replace(/\s/g, "").length >= 200 ? tekst : null;
  } catch {
    return null;
  }
}
