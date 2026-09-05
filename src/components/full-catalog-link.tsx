import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { deskPageSearch, useActiveState } from "@/lib/active-state";
import { fullCatalogSignupSearch } from "@/lib/catalog-lock";
import { useAccess } from "@/lib/use-access";

export function FullCatalogLink({
  locked,
  className,
  onClick,
  children,
}: {
  /** Homepage/detail pass snap.paid. Header omits this and uses access (pending still hits /games). */
  locked?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
}) {
  const { paid, isPending } = useAccess();
  const { stateId } = useActiveState();
  const blocked = locked ?? (!paid && !isPending);

  if (!blocked) {
    return (
      <Link
        to="/games"
        search={deskPageSearch(stateId)}
        className={className}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to="/signup"
      search={fullCatalogSignupSearch()}
      className={className}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
