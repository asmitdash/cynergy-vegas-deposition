/**
 * The canonical Vegas wedding night — 22 events.
 * Each event is tagged with which witnesses experienced/logged it.
 * Some events have deliberately seeded contradictions between witnesses
 * for the demo (marked with `contradictionSeed`).
 */

export type WitnessId = "groom" | "bestman" | "security" | "chapel";

export interface NightEvent {
  id: number;
  time: string; // 24-hour HH:MM
  event: string;
  witnesses: WitnessId[];
  notes?: string;
  contradictionSeed?: string; // brief describing what conflict is baked in
  witnessSpin?: Partial<Record<WitnessId, string>>; // how each witness would recount it
}

export const NIGHT_EVENTS: NightEvent[] = [
  {
    id: 1,
    time: "19:00",
    event: "Groom and Best Man check into Luxor Room 2401.",
    witnesses: ["groom", "bestman"],
    witnessSpin: {
      groom: "We got there around 7, dropped bags, went downstairs.",
      bestman: "Room 2401, seventh floor. Danny was already tense.",
    },
  },
  {
    id: 2,
    time: "19:30",
    event: "Hotel bar. Groom orders whiskey sour. Best Man orders a Long Island Iced Tea pitcher, refilled 3×.",
    witnesses: ["groom", "bestman", "security"],
    contradictionSeed: "Groom will claim 'one drink total' — Best Man and Security logs will contradict.",
    witnessSpin: {
      groom: "One drink. That's all I had at the bar. Everyone keeps trying to make it more than it was.",
      bestman: "I ordered the pitcher, but he was drinking with me. We refilled it three times.",
      security: "19:34:12 — Guest Chen and Guest Torres seated at bar zone LX-BAR-3. Beverage log: 1× whiskey sour (Chen), 3× Long Island Iced Tea pitcher (Torres). Duration 01:42:18.",
    },
  },
  {
    id: 3,
    time: "20:15",
    event: "A woman in a red dress approaches the table. She introduces herself as 'Destiny'.",
    witnesses: ["bestman"],
    notes: "Groom does not recall Destiny at all.",
    witnessSpin: {
      bestman: "Total smokeshow. Called herself Destiny — no last name. She's the one who suggested the chapel.",
    },
  },
  {
    id: 4,
    time: "21:00",
    event: "Groom, Best Man, and Destiny take a rideshare to Chapel of Eternal Bliss.",
    witnesses: ["groom", "bestman", "chapel"],
    witnessSpin: {
      groom: "I remember getting in a car. I don't remember with who.",
      bestman: "The three of us. Destiny was giving directions.",
      chapel: "21:07:14 — three individuals arrived. Note: this was my sister chapel, Chapel of Eternal Bliss. Their logs, not mine.",
    },
  },
  {
    id: 5,
    time: "21:30",
    event: "Groom attempts to marry Destiny. Chapel Bot refuses — Groom is flagged as already married in Nevada state DB. Ceremony aborted.",
    witnesses: ["groom", "chapel"],
    witnessSpin: {
      groom: "I signed something. The officiant was rude. I don't know why.",
      chapel: "Chapel of Eternal Bliss aborted the ceremony at 21:32. No certificate issued. The system correctly flagged Mr. Chen as already married.",
    },
  },
  {
    id: 6,
    time: "22:00",
    event: "Best Man says 'Plan B: tigers.' Group rideshares to Siegfried & Roy Secret Garden (closed).",
    witnesses: ["bestman", "security"],
    witnessSpin: {
      bestman: "I said tigers. He was game. Destiny came with us.",
      security: "22:14:03 — perimeter alarm, Zone SG-ENC-2 (tiger enclosure). Three individuals on camera: Chen, Torres, Unknown Female.",
    },
  },
  {
    id: 7,
    time: "22:30",
    event: "Best Man bribes the night guard $500. Group enters tiger enclosure.",
    witnesses: ["bestman", "security"],
    witnessSpin: {
      bestman: "Yeah, I paid the guard. Cash. It was worth it.",
      security: "Gate access logs: night guard Manuel Ruiz override at 22:31:04. Cash bribe reported next morning.",
    },
  },
  {
    id: 8,
    time: "22:45",
    event: "Groom poses for photo with Bengal tiger 'Rajah'. Flash startles tiger.",
    witnesses: ["bestman", "security"],
    witnessSpin: {
      bestman: "Danny got up close. Rajah was NOT happy about the flash.",
      security: "22:45:19 — 14 frames captured of Guest Chen at tiger enclosure. Guest's phone recovered damaged the following morning.",
    },
  },
  {
    id: 9,
    time: "23:00",
    event: "Security guards arrive. Group flees through rear exit into Mirage parking structure. Groom separates from Best Man here.",
    witnesses: ["bestman", "security"],
  },
  {
    id: 10,
    time: "23:20",
    event: "Groom (alone) enters Mirage poker room. Sits at $5 blackjack table.",
    witnesses: ["groom", "security"],
    contradictionSeed: "Groom recalls winning $3,000. Casino ledger via Security shows $240 net loss.",
    witnessSpin: {
      groom: "I was up. I remember being up big — three grand at least.",
      security: "23:22:17 — Chen facial rec entry, Table 14. Wagered $480, net loss $240. Exit 00:08:53.",
    },
  },
  {
    id: 11,
    time: "23:45",
    event: "Groom leaves casino floor with cocktail server 'Amber Nguyen'. Elevator to floor 18.",
    witnesses: ["security"],
    witnessSpin: {
      security: "00:11:37 — Chen and staff Amber Nguyen enter elevator, destination floor 18. Chen exits alone at 00:57:42.",
    },
  },
  {
    id: 12,
    time: "00:15",
    event: "Best Man (separate location) gets tattoo at 24-hour parlor: 'Destiny Forever' on left ribs.",
    witnesses: ["bestman"],
    witnessSpin: {
      bestman: "$150. No regrets. Danny doesn't know.",
    },
  },
  {
    id: 13,
    time: "01:00",
    event: "Groom exits Mirage alone, rideshare to Fremont Street.",
    witnesses: ["groom", "security"],
  },
  {
    id: 14,
    time: "01:30",
    event: "Groom buys Elvis costume from street vendor at Fremont, $40 cash.",
    witnesses: ["groom"],
    witnessSpin: {
      groom: "I was helping some bachelor party. They asked me to wear it. I don't know how I ended up with it on.",
    },
  },
  {
    id: 15,
    time: "02:00",
    event: "Groom (in Elvis costume) performs 'Viva Las Vegas' at open-mic bar. Bystander uploads video to TikTok.",
    witnesses: ["groom"],
  },
  {
    id: 16,
    time: "02:45",
    event: "Best Man finds Groom at Fremont Street. Both rideshare to Chapel of Eternal Love (different 24-hour chapel).",
    witnesses: ["bestman", "chapel"],
    witnessSpin: {
      bestman: "Found him singing. In an Elvis costume. I had to get him off the street.",
      chapel: "02:51:33 — two individuals arrived. Groom Chen (in Elvis costume) and Guest Torres.",
    },
  },
  {
    id: 17,
    time: "03:00",
    event: "Groom (still in Elvis costume) 'marries' Best Man in novelty ceremony. Chapel Bot issues NOVELTY (non-legal) certificate.",
    witnesses: ["bestman", "chapel"],
    contradictionSeed: "Groom will deny this outright. Best Man and Chapel Bot both have proof (certificate photo/scan).",
    witnessSpin: {
      bestman: "It was hilarious. I have the certificate on my phone. Danny signed it.",
      chapel: "Certificate NV-LOVE-20260702-0847 issued at 03:04:11. Marcus Chen and Jake Torres. Novelty ceremony, non-legal.",
    },
  },
  {
    id: 18,
    time: "03:30",
    event: "Both return to Luxor Room 2401. Best Man passes out. Groom leaves again at 03:47.",
    witnesses: ["bestman", "security"],
  },
  {
    id: 19,
    time: "04:15",
    event: "Rideshare pickup at Luxor, drop-off at Siegfried & Roy Secret Garden main gate.",
    witnesses: ["security"],
    notes: "How Groom re-entered enclosure is unclear — night guard override logs suggest Ruiz let him back in.",
    witnessSpin: {
      security: "04:12:33 pickup, 04:26:51 drop-off. Gate access logs show night guard override 04:31:16. No video coverage of enclosure interior.",
    },
  },
  {
    id: 20,
    time: "05:30",
    event: "Best Man wakes in Room 2401, realizes Groom is missing.",
    witnesses: ["bestman"],
  },
  {
    id: 21,
    time: "06:00",
    event: "Zoo staff find Groom asleep in tiger enclosure. Elvis costume shredded, no injuries. Groom remembers nothing since ~23:00.",
    witnesses: ["groom", "security"],
    witnessSpin: {
      groom: "I woke up in a bathtub. Or… a tiger enclosure. It's fuzzy. My phone was dead.",
      security: "06:04:18 — zoo staff report guest Chen located Zone SG-ENC-2. Paramedic dispatched. 06:11:02 conscious, declined transport.",
    },
  },
  {
    id: 22,
    time: "06:30",
    event: "Groom and Best Man reunite at Luxor lobby. Detective (player) begins interrogation.",
    witnesses: ["groom", "bestman"],
  },
];

/**
 * Filter events by witness and produce a compact markdown block
 * that will be ingested as that witness's private memory namespace.
 */
export function eventsForWitness(witnessId: WitnessId): string {
  const rows = NIGHT_EVENTS.filter((e) => e.witnesses.includes(witnessId));
  const lines = [
    `# ${witnessId.toUpperCase()} — private memory of the Vegas wedding night`,
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
