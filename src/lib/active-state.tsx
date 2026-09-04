import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_STATE_ID,
  STATES,
  type DataMode,
  type StateConfig,
  type StateId,
  parsePublicStateId,
} from "@/config/states";

const STORAGE_KEY = "sv.state";
const LEGACY_STORAGE_KEY = "sv.desk.stateId";

const ActiveStateContext = createContext<{
  stateId: StateId;
  setStateId: (id: StateId) => void;
  config: StateConfig;
  deskMode: DataMode | null;
  setDeskMode: (mode: DataMode | null) => void;
}>({
  stateId: DEFAULT_STATE_ID,
  setStateId: () => undefined,
  config: STATES[DEFAULT_STATE_ID],
  deskMode: null,
  setDeskMode: () => undefined,
});

export function readStatePref(): StateId {
  if (typeof window === "undefined") return DEFAULT_STATE_ID;
  try {
    const stored =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return parsePublicStateId(stored);
  } catch {
    return DEFAULT_STATE_ID;
  }
}

export function writeStatePref(id: StateId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

export function ActiveStateProvider({ children }: { children: ReactNode }) {
  const [stateId, setStateIdState] = useState<StateId>(DEFAULT_STATE_ID);
  const [deskMode, setDeskMode] = useState<DataMode | null>(null);

  useEffect(() => {
    setStateIdState(readStatePref());
  }, []);

  const setStateId = useCallback((id: StateId) => {
    const next = parsePublicStateId(id);
    setStateIdState(next);
    setDeskMode(null);
    writeStatePref(next);
  }, []);

  const value = useMemo(
    () => ({
      stateId,
      setStateId,
      config: STATES[stateId],
      deskMode,
      setDeskMode,
    }),
    [stateId, setStateId, deskMode],
  );

  return (
    <ActiveStateContext.Provider value={value}>{children}</ActiveStateContext.Provider>
  );
}

export function useActiveState() {
  return useContext(ActiveStateContext);
}

/** Always stamp the desk on game/catalog links so KY never opens as TN. */
export function deskSearch(stateId: StateId | string | null | undefined): { state: StateId } {
  return { state: parsePublicStateId(stateId) };
}

/** Home / Games URL search. Tennessee stays the bare path. */
export function deskPageSearch(
  stateId: StateId | string | null | undefined,
): { state?: StateId } {
  const id = parsePublicStateId(stateId);
  return id === DEFAULT_STATE_ID ? {} : { state: id };
}

export function gameStateSearch(stateId: StateId): { state: StateId } {
  return deskSearch(stateId);
}
