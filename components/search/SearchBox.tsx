"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { GeocodeResponse } from "@/app/api/geocode/route";
import { buildAreaHref, type AreaBasePath } from "@/lib/area-params";
import type { SearchLocation } from "@/lib/geocoding/types";

/** Må samsvare med MIN_QUERY_LENGTH på serveren. */
const MIN_QUERY_LENGTH = 2;
/** Venter til brukeren tar en liten pause før vi søker. */
const DEBOUNCE_MS = 250;

type Status = "idle" | "loading" | "success" | "error";

interface SearchBoxProps {
  /** Radius som følger med til resultatsiden. */
  radius: number;
  size?: "large" | "compact";
  autoFocus?: boolean;
  /** Kalles etter at et treff er valgt (f.eks. for å lukke «Endre sted»). */
  onSelected?: () => void;
  /** Overstyr navigasjon (f.eks. i en transition for å vise lastetilstand). Standard: router.push. */
  onNavigate?: (href: string) => void;
  /** Hvilken resultatvisning søket skal lande på. Standard er den offentlige. */
  basePath?: AreaBasePath;
}

export function SearchBox({ radius, size = "compact", autoFocus, onSelected, onNavigate, basePath }: SearchBoxProps) {
  const router = useRouter();
  const id = useId();
  const inputId = `${id}-input`;
  const listboxId = `${id}-listbox`;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchLocation[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;
  const visibleStatus: Status = tooShort ? "idle" : status;
  const showList = open && !tooShort && visibleStatus !== "idle";
  const activeId = showList && results[activeIndex] ? `${id}-option-${activeIndex}` : undefined;
  const large = size === "large";

  useEffect(() => {
    if (tooShort) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const body = (await response.json()) as GeocodeResponse;
        if (!response.ok || "error" in body) throw new Error("unavailable");
        setResults(body.results);
        setActiveIndex(body.results.length > 0 ? 0 : -1);
        setStatus("success");
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setActiveIndex(-1);
        setStatus("error");
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, tooShort]);

  // Lukk listen ved klikk utenfor.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function select(location: SearchLocation) {
    setOpen(false);
    setQuery(location.label);
    const href = buildAreaHref({ lat: location.latitude, lng: location.longitude, radius, label: location.label, basePath });
    if (onNavigate) onNavigate(href);
    else {
      setNavigating(true);
      router.push(href);
    }
    onSelected?.();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = results.length;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setOpen(true);
        if (count) setActiveIndex((i) => (i + 1) % count);
        break;
      case "ArrowUp":
        event.preventDefault();
        setOpen(true);
        if (count) setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
        break;
      case "Enter": {
        const target = results[activeIndex] ?? results[0];
        if (showList && target) {
          event.preventDefault();
          select(target);
        }
        break;
      }
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        } else {
          setQuery("");
        }
        break;
    }
  }

  const liveMessage =
    visibleStatus === "success"
      ? results.length === 0
        ? "Fant ingen steder som matcher søket."
        : `${results.length} treff. Bruk piltastene for å velge.`
      : visibleStatus === "error"
        ? "Vi får ikke søkt etter steder akkurat nå."
        : "";

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className={large ? "mb-2.5 block text-sm font-medium text-ink" : "sr-only"}>
        Søk etter adresse eller sted
      </label>

      <div
        className={`group relative flex items-center rounded-2xl border bg-surface transition-shadow ${
          showList ? "border-line-strong shadow-pop" : "border-line shadow-float"
        } focus-within:border-accent`}
      >
        <SearchIcon className={`pointer-events-none absolute text-muted ${large ? "left-5 size-6" : "left-4 size-5"}`} />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-activedescendant={activeId}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          placeholder="Sognsvann, Majorstuen eller Karl Johans gate 1"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={`w-full min-w-0 rounded-2xl bg-transparent text-ink placeholder:text-muted/70 focus:outline-none ${
            large ? "h-16 pr-14 pl-14 text-lg sm:h-[4.5rem] sm:text-xl" : "h-13 pr-12 pl-12 text-base"
          }`}
        />
        <div className={`absolute ${large ? "right-5" : "right-4"}`} aria-hidden="true">
          {(visibleStatus === "loading" || navigating) && <Spinner />}
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {liveMessage}
      </div>

      {showList && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
          {visibleStatus === "error" ? (
            <Message tone="error">Vi får ikke søkt etter steder akkurat nå. Prøv igjen.</Message>
          ) : visibleStatus === "success" && results.length === 0 ? (
            <Message>Fant ingen steder som matcher søket.</Message>
          ) : visibleStatus === "loading" && results.length === 0 ? (
            <Message>Søker …</Message>
          ) : null}

          <ul
            id={listboxId}
            role="listbox"
            aria-label="Forslag"
            className={`max-h-[min(60vh,26rem)] overflow-y-auto py-1.5 ${results.length === 0 ? "hidden" : ""}`}
          >
            {results.map((location, index) => (
              <li
                key={location.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setActiveIndex(index)}
                onClick={() => select(location)}
                className={`mx-1.5 flex min-h-14 cursor-pointer items-center gap-3.5 rounded-xl px-3 py-2.5 ${
                  index === activeIndex ? "bg-accent-soft" : ""
                }`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                    index === activeIndex ? "bg-surface text-accent" : "bg-canvas text-muted"
                  }`}
                  aria-hidden="true"
                >
                  {location.type === "address" ? <PinIcon /> : <PlaceIcon />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-ink">{location.label}</span>
                  <span className="block truncate text-sm text-muted">{location.subtitle}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Message({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  return (
    <p className={`px-5 py-4 text-[15px] ${tone === "error" ? "text-danger" : "text-muted"}`}>{children}</p>
  );
}

function Spinner() {
  return <span className="block size-5 animate-spin rounded-full border-2 border-line-strong border-t-accent" />;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-[18px]">
      <path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function PlaceIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="size-[18px]">
      <path d="m3 19 6-10 4 6 2-3 6 7H3Z" />
      <circle cx="16.5" cy="6.5" r="1.5" />
    </svg>
  );
}
