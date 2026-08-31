import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/billing")({
  component: BillingGate,
  head: () =>
    pageHead({
      title: "Billing",
      path: "/billing",
      noindex: true,
    }),
});

function BillingGate() {
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-sm text-muted">
        Loading billing…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" search={{ next: "/account" }} />;
  }

  return <Navigate to="/account" />;
}
