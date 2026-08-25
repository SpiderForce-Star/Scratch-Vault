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
  type StateConfig,
  type StateId,
  parseStateId,
} from "@/config/states";

const STORAGE_KEY = "sv.state";
const LEGACY_STORAGE_KEY = "sv.desk.stateId";

const ActiveStateContext = createContext<{
  stateId: StateId;
  setStateId: (id: StateId) => void;
  config: StateConfig;
}>({
  stateId: DEFAULT_STATE_ID,
  setStateId: () => undefined,
  config: STATES[DEFAULT_STATE_ID],
});

export function readStatePref(): StateId {
  if (typeof window === "undefined") return DEFAULT_STATE_ID;
  try {
    const stored =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return parseStateId(stored);
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

  useEffect(() => {
    setStateIdState(readStatePref());
  }, []);

  const setStateId = useCallback((id: StateId) => {
    const next = parseStateId(id);
    setStateIdState(next);
    writeStatePref(next);
  }, []);

  const value = useMemo(
    () => ({
      stateId,
      setStateId,
      config: STATES[stateId],
    }),
    [stateId, setStateId],
  );

  return (
    <ActiveStateContext.Provider value={value}>{children}</ActiveStateContext.Provider>
  );
}

export function useActiveState() {
  return useContext(ActiveStateContext);
}

export function gameStateSearch(stateId: StateId): { state: StateId } {
  return { state: stateId };
}
