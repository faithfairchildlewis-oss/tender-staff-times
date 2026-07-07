// Brightwheel export normalization.
// Brightwheel's homeroom column contains free-text room names ("The Acorns",
// "Acorns", "Room F", etc.), NOT our room codes. Inserting them raw makes a
// child invisible to every census/projection filter (room === "F" never
// matches "The Acorns"). Everything from an import must pass through here.

import type { RoomCode } from "./enrollment-logic";

const ROOM_ALIASES: [RegExp, RoomCode][] = [
  // Exact code matches first (with optional "room" prefix)
  [/^(room\s*)?f$/i, "F"],
  [/^(room\s*)?i$/i, "I"],
  [/^(room\s*)?g\s*[\/&-]?\s*h$/i, "G/H"],
  [/^(room\s*)?[gh]$/i, "G/H"],
  [/^(room\s*)?j\s*[\/&-]?\s*k$/i, "J/K"],
  [/^(room\s*)?[jk]$/i, "J/K"],
  // Classroom names
  [/acorn/i, "F"],
  [/pine\s*cone/i, "I"],
  [/sprout/i, "G/H"],
  [/(mighty\s*)?oak/i, "J/K"],
  [/(mighty\s*)?cedar/i, "SAC"],
  [/school\s*age|\bsac\b/i, "SAC"],
  [/summer|sba|bible\s*adventure|camp/i, "SUMMER"],
  // Common Brightwheel age-group labels
  [/infant/i, "F"],
  [/toddler/i, "I"],
  [/two/i, "G/H"],
  [/pre\s*-?\s*k|preschool|threes|fours/i, "J/K"],
];

/** Map a raw Brightwheel room string to a RoomCode, or null if unrecognized.
 *  Unrecognized rooms must be resolved by the director before applying an
 *  import — never guessed. */
export function normalizeRoom(raw: string | null | undefined): RoomCode | null {
  const s = (raw ?? "").replace(/["']+/g, "").trim();
  if (!s) return null;
  for (const [re, code] of ROOM_ALIASES) {
    if (re.test(s)) return code;
  }
  return null;
}

/** Brightwheel exports can include withdrawn/graduated children. Only rows
 *  with an active-looking status (or no status column at all) should be
 *  treated as enrolled. */
export function isActiveStatus(raw: string | null | undefined): boolean {
  const s = (raw ?? "").trim();
  if (!s) return true; // no status column in the export → assume active
  return /active|enrolled|current/i.test(s) && !/inactive|withdrawn|graduat|toured|prospect/i.test(s);
}
