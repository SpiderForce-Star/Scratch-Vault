/**
 * Server-only radar scope for ONE selected public desk.
 * Hidden desks stay off the scope. Never invents remaining counts.
 */
import { DEFAULT_STATE_ID, getState, type StateId } from "@/config/states";
import { loadDeskCatalog, seedSnapshotsIfEmpty } from "@/data/states/load.server";
import { readPriorCatalog } from "@/data/states/snapshots.server";
import {
  assembleRadarScope,
  detectGrandCaptures,
  EMPTY_RADAR,
  isMonitoredDesk,
  quietJackpotContacts,
  type RadarScopePayload,
} from "./radar";

export async function buildRadarScope(
  stateId: StateId = DEFAULT_STATE_ID,
): Promise<RadarScopePayload> {
  if (!isMonitoredDesk(stateId)) return { ...EMPTY_RADAR, stateId };
  await seedSnapshotsIfEmpty();
  const loaded = await loadDeskCatalog(stateId);
  if (!loaded.games.length) return { ...EMPTY_RADAR, stateId };
  const shortName = getState(stateId).shortName;
  const snapshotAt = loaded.fetchedAt || loaded.weekLabel || getState(stateId).publishedAt || "";
  const prior = await readPriorCatalog(stateId, loaded.fetchedAt);
  const captures = prior?.length
    ? detectGrandCaptures(prior, loaded.games, {
        stateId,
        shortName,
        snapshotAt,
      })
    : [];
  const capturedNumbers = new Set(captures.map((row) => row.gameId));
  const contacts = quietJackpotContacts(
    loaded.games,
    { stateId, shortName, snapshotAt },
    capturedNumbers,
  );
  if (!captures.length && !contacts.length) {
    return { ...EMPTY_RADAR, stateId, snapshotAt, cycleId: `${stateId}:${snapshotAt}` };
  }
  return assembleRadarScope(captures, contacts, { stateId, snapshotAt });
}
