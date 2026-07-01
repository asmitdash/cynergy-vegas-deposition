/**
 * Story type — the shape every case file must satisfy.
 * Loaded dynamically at runtime, keyed by story ID.
 */

export interface WitnessDef {
  id: string;
  displayName: string;
  fullName: string;
  teaser: string;
  motive: string;
  personaSystemPrompt: string;
}

export interface StoryEvent {
  id: number;
  time: string; // 24h HH:MM
  event: string;
  witnesses: string[]; // witness ids
  notes?: string;
  contradictionSeed?: string;
  witnessSpin?: Record<string, string>;
}

export interface SeededContradiction {
  description: string;
  witnesses: string[];
}

export interface Story {
  id: string;
  title: string;
  tagline: string;
  synopsis: string;
  setting: string;
  inspiration: string;
  witnesses: WitnessDef[];
  events: StoryEvent[];
  seededContradictions: SeededContradiction[];
}

/**
 * Filter a story's events down to what one witness personally experienced,
 * rendered as a markdown block that becomes that witness's private memory.
 */
export function eventsMarkdownForWitness(story: Story, witnessId: string): string {
  const rows = story.events.filter((e) => e.witnesses.includes(witnessId));
  const witness = story.witnesses.find((w) => w.id === witnessId);
  const lines = [
    `# ${witness?.displayName ?? witnessId} — private memory of the ${story.title} case`,
    "",
    "Only these events are in my direct experience. Anything not listed I do not know.",
    "",
  ];
  for (const e of rows) {
    lines.push(`## ${e.time} — Event #${e.id}`);
    lines.push(e.event);
    if (e.witnessSpin?.[witnessId]) {
      lines.push("");
      lines.push(`My recollection: "${e.witnessSpin[witnessId]}"`);
    }
    if (e.notes) {
      lines.push("");
      lines.push(`Notes: ${e.notes}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
