import { Lock } from "lucide-react";
import { TrialCta } from "@/components/trial-cta";
import { cn } from "@/lib/utils";
import type { HoldbackRule } from "@/config/states";
import { useI18n } from "@/lib/locale";

export function UnlockStrip({
  locked = true,
  stats,
  holdback,
}: {
  locked?: boolean;
  stats?: { grand: number; medium: number; busts: number; games: number };
  holdback?: HoldbackRule | null;
}) {
  const { t } = useI18n();
  const heat = stats ?? { grand: 0, medium: 0, busts: 0, games: 0 };

  return (
    <section className="border-b border-line bg-raised/40">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <GaugeCard
            label={t("heat.grand")}
            value={heat.grand}
            note={
              holdback
                ? t("unlock.grandNoteHoldback", { label: holdback.label })
                : t("unlock.grandNote")
            }
            locked={locked}
            tone="gold"
          />
          <GaugeCard
            label={t("heat.medium")}
            value={heat.medium}
            note={t("unlock.mediumNote")}
            locked={locked}
            tone="sage"
          />
          <BustCard busts={heat.busts} locked={locked} />
          <RadarAlertCard locked={locked} />
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            {t("unlock.price")}
          </p>
          <TrialCta />
        </div>
      </div>
    </section>
  );
}

function GaugeCard({
  label,
  value,
  note,
  locked,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  locked: boolean;
  tone: "gold" | "sage";
}) {
  const color = tone === "gold" ? "#c4a574" : "#7c9a72";
  const angle = -120 + (Math.max(0, Math.min(100, value)) / 100) * 240;
  const rad = ((angle - 90) * Math.PI) / 180;
  const nx = 50 + Math.cos(rad) * 28;
  const ny = 52 + Math.sin(rad) * 28;

  return (
    <article className="relative overflow-hidden rounded-lg border border-line bg-bg p-4">
      {locked ? <LockMark /> : null}
      <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
        {label}
      </p>
      <svg viewBox="0 0 100 70" className="mt-2 h-20 w-full" aria-hidden="true">
        <path
          d="M18 58 A 34 34 0 1 1 82 58"
          fill="none"
          stroke="#2a332c"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M18 58 A 34 34 0 1 1 82 58"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="120"
          strokeDashoffset={120 - (value / 100) * 120}
        />
        <line
          x1="50"
          y1="52"
          x2={nx}
          y2={ny}
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="50" cy="52" r="2.4" fill={color} />
      </svg>
      <p className="font-display text-2xl tabular-nums">{Math.round(value)}</p>
      <p className="mt-1 text-xs leading-relaxed text-faint">{note}</p>
    </article>
  );
}

function BustCard({ busts, locked }: { busts: number; locked: boolean }) {
  const { t } = useI18n();
  return (
    <article className="relative overflow-hidden rounded-lg border border-line bg-bg p-4">
      {locked ? <LockMark /> : null}
      <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
        {t("unlock.bustFilter")}
      </p>
      <div className="relative mt-3 h-20">
        <div className="absolute inset-x-4 top-2 h-14 rounded-sm border border-line bg-raised/80" />
        <div className="absolute inset-x-8 top-5 h-8 rounded-sm border border-line/80 bg-bg" />
        <span
          className={cn(
            "absolute top-6 left-1/2 -translate-x-1/2 -rotate-12",
            "border-2 border-danger px-3 py-1 font-mono text-sm tracking-[0.18em] text-danger uppercase",
          )}
        >
          {t("home.skip")}
        </span>
      </div>
      <p className="font-display text-2xl tabular-nums">{busts}</p>
      <p className="mt-1 text-xs leading-relaxed text-faint">
        {t("unlock.bustNote")}
      </p>
    </article>
  );
}

function RadarAlertCard({ locked }: { locked: boolean }) {
  const { t } = useI18n();
  return (
    <article className="relative overflow-hidden rounded-lg border border-line bg-bg p-4">
      {locked ? <LockMark /> : null}
      <p className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
        {t("unlock.radar")}
      </p>
      <div className="relative mt-4 flex h-16 items-center justify-center">
        <span className="absolute size-14 rounded-full border border-gold/30" />
        <span className="absolute size-9 rounded-full border border-sage/30" />
        <span className="size-2 rounded-full bg-gold" />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {t("unlock.radarBody")}
      </p>
    </article>
  );
}

function LockMark() {
  return (
    <Lock
      className="absolute top-3 right-3 size-4 text-gold/70"
      aria-hidden="true"
    />
  );
}
