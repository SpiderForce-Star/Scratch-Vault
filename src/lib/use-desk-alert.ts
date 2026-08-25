import { useEffect, useState } from "react";
import { useAccess } from "./use-access";
import {
  hasUnseenDeskUpdate,
  markDeskSeen,
  maybeNotifyDeskUpdate,
  subscribeDeskAlert,
} from "./desk-alert";

export function useDeskAlert() {
  const { paid, user, isPending } = useAccess();
  const subscriber = Boolean(paid || user?.isDevFallback);
  const [unseen, setUnseen] = useState(false);

  useEffect(() => {
    if (isPending) return;
    const sync = () => {
      const next = hasUnseenDeskUpdate(subscriber);
      setUnseen(next);
      if (next) maybeNotifyDeskUpdate(subscriber);
    };
    sync();
    return subscribeDeskAlert(sync);
  }, [subscriber, isPending]);

  return {
    unseen,
    subscriber,
    isPending,
    markSeen: markDeskSeen,
    reviewDesk: () => {
      markDeskSeen();
      if (typeof document !== "undefined") {
        document.getElementById("desk")?.scrollIntoView({ behavior: "smooth" });
      }
    },
  };
}
