import { api } from "./api";

type TrackData = { projectId?: number; categorySlug?: string; query?: string; meta?: Record<string, string> };

/**
 * Records a first-party interaction. The server links it to a student only if they are signed in and have
 * granted activity consent; otherwise it is stored with no identifier. Failures are ignored: tracking must never break a page.
 */
export function track(type: string, data: TrackData = {}) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  api("/public/track", { body: { type, ...data } }).catch(() => {});
}
