/**
 * Server-only radar scope. Compares prior trusted snapshot vs current desk.
 * PUBLIC_STATE_IDS only. Never invents remaining counts.
 */
import { PUBLIC_STATE_IDS, getState } from "@/config/states";
import { loadDeskCatalog, seedSnapshotsIfEmpty } from "@/data/states/load.server";
import { readPriorCatalog } from "@/data/states/snapshots.server";
import {
  assembleRadarScope,
  detectGrandCaptures,
  EMPTY_RADAR,
  isMonitoredDesk,
  quietJackpotContacts,
  type RadarCapture,
  type RadarContact,
  type RadarScopePayload,
} from "./radar";

export async function buildRadarScope(): Promise<RadarScopePayload> {
  await seedSnapshotsIfEmpty();
  const captures: RadarCapture[] = [];
  const contacts: RadarContact[] = [];

  await Promise.all(
    PUBLIC_STATE_IDS.map(async (stateId) => {
      if (!isMonitoredDesk(stateId)) return;
      const loaded = await loadDeskCatalog(stateId);
      if (!loaded.games.length) return;
      const shortName = getState(stateId).shortName;
      const snapshotAt = loaded.fetchedAt || loaded.weekLabel || "";
      const prior = await readPriorCatalog(stateId, loaded.fetchedAt);
      const found = prior?.length
        ? detectGrandCaptures(prior, loaded.games, {
            stateId,
            shortName,
            snapshotAt,
          })
        : [];
      captures.push(...found);
      const capturedNumbers = new Set(found.map((row) => row.gameId));
      contacts.push(
        ...quietJackpotContacts(loaded.games, { stateId, shortName }, capturedNumbers),
      );
    }),
  );

  if (!captures.length && !contacts.length) return EMPTY_RADAR;
  return assembleRadarScope(captures, contacts);
}
