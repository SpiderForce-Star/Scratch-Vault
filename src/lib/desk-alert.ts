import { DESK_META } from "@/data/desk-meta";

const SEEN_KEY = "vsv.desk.lastSeenRevision";
const NOTIFY_ON_KEY = "vsv.desk.notifyEnabled";
const NOTIFIED_REV_KEY = "vsv.desk.notifiedRevision";
const EVENT = "vsv-desk-alert";

function readInt(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null || raw === "") return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function writeInt(key: string, value: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* private mode */
  }
}

function emit(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

/** Last revision the visitor dismissed / reviewed. Missing = 0. */
export function getLastSeenRevision(): number {
  return readInt(SEEN_KEY, 0);
}

/**
 * Live alert only for signed-in subscribers (trialing | active).
 * Guests and unpaid users never get a personal “you have an alert.”
 */
export function hasUnseenDeskUpdate(isSubscriber: boolean): boolean {
  if (!isSubscriber) return false;
  if (typeof window === "undefined") return false;
  return getLastSeenRevision() < DESK_META.revision;
}

export function markDeskSeen(): void {
  writeInt(SEEN_KEY, DESK_META.revision);
  emit();
}

export function subscribeDeskAlert(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onChange();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function deskNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(NOTIFY_ON_KEY) === "1";
  } catch {
    return false;
  }
}

export async function enableDeskNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  try {
    window.localStorage.setItem(NOTIFY_ON_KEY, "1");
  } catch {
    /* ignore */
  }
  emit();
  return true;
}

/** One browser notification per revision, only after they opt in on /account. */
export function maybeNotifyDeskUpdate(isSubscriber: boolean): void {
  if (!isSubscriber || !deskNotifyEnabled()) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!hasUnseenDeskUpdate(true)) return;
  if (readInt(NOTIFIED_REV_KEY, 0) >= DESK_META.revision) return;
  try {
    new Notification("Scratch Vault", {
      body: "New remaining-prize desk is ready to review.",
    });
    writeInt(NOTIFIED_REV_KEY, DESK_META.revision);
  } catch {
    /* ignore */
  }
}
