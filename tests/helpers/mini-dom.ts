import type { DocumentLike, ElementLike } from "@/chrome-extension/src/address";

/**
 * Et lite DOM for testene av nettleserutvidelsen. Prosjektet har ingen HTML-parser, og
 * ekstraksjonen trenger bare `querySelectorAll`, `textContent` og `getAttribute`.
 *
 * Støtter det adapterne bruker: `tag`, `[attr="v"]`, `[attr*="v" i]`, `tag[attr="v"]` og
 * kommalister. Ikke etterkommer- eller pseudovelgere — bruker en adapter det, skal testen feile.
 */

interface MiniElement extends ElementLike {
  tag: string;
  attributes: Map<string, string>;
}

const VOID_TAGS = new Set(["meta", "link", "br", "img", "input", "hr"]);
const RAW_TEXT_TAGS = new Set(["script", "style"]);

function decode(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ");
}

function parseAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of source.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    const name = match[1];
    if (name) attributes.set(name.toLowerCase(), decode(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return attributes;
}

export function parseHtml(html: string): DocumentLike {
  const elements: MiniElement[] = [];
  const open: { el: MiniElement; text: string[] }[] = [];
  const token = /<!--[\s\S]*?-->|<\/([\w-]+)\s*>|<([\w-]+)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+)/g;

  let match: RegExpExecArray | null;
  while ((match = token.exec(html))) {
    const [, closing, opening, attrs = "", text] = match;
    if (text !== undefined) {
      for (const frame of open) frame.text.push(decode(text));
    } else if (opening) {
      const tag = opening.toLowerCase();
      const el: MiniElement = { tag, attributes: parseAttributes(attrs), textContent: "", getAttribute: (n) => el.attributes.get(n.toLowerCase()) ?? null };
      elements.push(el);
      if (VOID_TAGS.has(tag) || attrs.trimEnd().endsWith("/")) continue;
      if (RAW_TEXT_TAGS.has(tag)) {
        const end = html.toLowerCase().indexOf(`</${tag}`, token.lastIndex);
        const stop = end === -1 ? html.length : end;
        el.textContent = html.slice(token.lastIndex, stop);
        token.lastIndex = html.indexOf(">", stop) + 1 || html.length;
        continue;
      }
      open.push({ el, text: [] });
    } else if (closing) {
      const index = open.map((f) => f.el.tag).lastIndexOf(closing.toLowerCase());
      for (const frame of index === -1 ? [] : open.splice(index)) frame.el.textContent = frame.text.join("");
    }
  }
  for (const frame of open) frame.el.textContent = frame.text.join("");

  return { querySelectorAll: (selectors) => elements.filter((el) => selectors.split(",").some((s) => matches(el, s.trim()))) };
}

function matches(el: MiniElement, selector: string): boolean {
  const parsed = /^([\w-]*)((?:\[[^\]]+\])*)$/.exec(selector);
  if (!parsed) throw new Error(`mini-dom støtter ikke velgeren «${selector}»`);
  const [, tag = "", conditions = ""] = parsed;
  if (tag && el.tag !== tag.toLowerCase()) return false;
  for (const condition of conditions.matchAll(/\[([\w:-]+)(\*?=)"([^"]*)"(\s+i)?\]/g)) {
    const [, name = "", operator, expected = "", insensitive] = condition;
    let actual = el.attributes.get(name.toLowerCase());
    if (actual === undefined) return false;
    let wanted = expected;
    if (insensitive) [actual, wanted] = [actual.toLowerCase(), wanted.toLowerCase()];
    if (operator === "=" ? actual !== wanted : !actual.includes(wanted)) return false;
  }
  return true;
}
