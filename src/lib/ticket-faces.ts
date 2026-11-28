import raw from "../data/ticket-faces.json" with { type: "json" };

/** Measured color and shape. No image bytes and no official URLs. */
export type TicketFaceRecord = {
  bg: string;
  bg2: string;
  foil: string;
  accent: string;
  ink: string;
  aspect: number;
  orientation: "portrait" | "landscape" | "square";
};

const HEX = /^#[0-9A-F]{6}$/;

function isRecord(value: unknown): value is TicketFaceRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as TicketFaceRecord;
  return (
    HEX.test(row.bg) &&
    HEX.test(row.bg2) &&
    HEX.test(row.foil) &&
    HEX.test(row.accent) &&
    HEX.test(row.ink) &&
    typeof row.aspect === "number" &&
    Number.isFinite(row.aspect) &&
    row.aspect > 0.15 &&
    row.aspect < 4 &&
    (row.orientation === "portrait" ||
      row.orientation === "landscape" ||
      row.orientation === "square")
  );
}

const FACES: Record<string, TicketFaceRecord> = {};
for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
  if (isRecord(value)) FACES[key] = value;
}

export function ticketFaceKey(state: string, number: number): string {
  return `${state}:${number}`;
}

export function lookupTicketFace(state: string, number: number): TicketFaceRecord | null {
  return FACES[ticketFaceKey(state, number)] ?? null;
}

export function ticketFaceCount(): number {
  return Object.keys(FACES).length;
}
