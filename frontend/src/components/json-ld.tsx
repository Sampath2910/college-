"use client";

import { useEffect } from "react";

/**
 * Injects a JSON-LD structured-data block into <head> imperatively.
 *
 * React 19 warns ("Encountered a script tag while rendering React component")
 * whenever an inline <script> is created during a client render — which happens
 * on soft navigation to a page that renders one. Appending the script to the
 * document ourselves keeps the structured data (search engines execute JS and
 * still read it) without ever handing a <script> element to React's renderer.
 *
 * `json` is pre-serialized by the caller so the effect's dependency is a stable
 * string, and `<` is escaped there to avoid breaking out of the script tag.
 */
export function JsonLd({ json }: { json: string }) {
  useEffect(() => {
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.text = json;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [json]);

  return null;
}
