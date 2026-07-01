/**
 * Story registry — the source of truth for which cases the player can pick.
 * Each story is a JSON file in ./data/. Adding a story = adding a JSON + one import.
 */

import type { Story } from "./types";

import hangover from "./data/hangover.json";

// Batch 1 (film-inspired, 4 witnesses each)
import ashfall from "./data/ashfall.json";
import thrombey from "./data/thrombey.json";
import meridian from "./data/meridian.json";
import tenebris from "./data/tenebris.json";

// Batch 2 will be added here (varied witness counts 3-15)

const ALL: Story[] = [
  hangover as unknown as Story,
  ashfall as unknown as Story,
  thrombey as unknown as Story,
  meridian as unknown as Story,
  tenebris as unknown as Story,
];

export const STORIES: Record<string, Story> = Object.fromEntries(
  ALL.map((s) => [s.id, s]),
);

export function listStories(): Array<{
  id: string;
  title: string;
  tagline: string;
  witnessCount: number;
  eventCount: number;
  inspiration: string;
}> {
  return ALL.map((s) => ({
    id: s.id,
    title: s.title,
    tagline: s.tagline,
    witnessCount: s.witnesses.length,
    eventCount: s.events.length,
    inspiration: s.inspiration,
  }));
}

export function getStory(id: string): Story | null {
  return STORIES[id] ?? null;
}
