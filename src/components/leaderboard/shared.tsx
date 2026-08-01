import type { LeaderboardEntry } from "@/lib/leaderboards.functions";

export const COUNTRY_FLAGS: Record<string, string> = {
  GA: "🇬🇦", FR: "🇫🇷", CD: "🇨🇩", CG: "🇨🇬", CI: "🇨🇮", CM: "🇨🇲",
  SN: "🇸🇳", BJ: "🇧🇯", TG: "🇹🇬", ML: "🇲🇱", BF: "🇧🇫", NE: "🇳🇪",
  MA: "🇲🇦", TN: "🇹🇳", DZ: "🇩🇿", EG: "🇪🇬", NG: "🇳🇬", GH: "🇬🇭",
  KE: "🇰🇪", ZA: "🇿🇦", US: "🇺🇸", CA: "🇨🇦", GB: "🇬🇧", BE: "🇧🇪",
  CH: "🇨🇭", DE: "🇩🇪", ES: "🇪🇸", IT: "🇮🇹", PT: "🇵🇹", TD: "🇹🇩",
  GQ: "🇬🇶", RW: "🇷🇼", GN: "🇬🇳", MG: "🇲🇬",
};

export function flagFor(country: string | null): string {
  if (!country) return "🌍";
  const key = country.trim().slice(0, 2).toUpperCase();
  return COUNTRY_FLAGS[key] ?? "🌍";
}

export function medalFor(rank: number): string | null {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
}

export function LeaderAvatar({
  entry,
  size = 40,
}: {
  entry: Pick<LeaderboardEntry, "avatar_url" | "display_name" | "initials">;
  size?: number;
}) {
  const cls = "rounded-full object-cover ring-2 ring-background shadow-sm";
  if (entry.avatar_url) {
    return (
      <img
        src={entry.avatar_url}
        alt={entry.display_name}
        loading="lazy"
        decoding="async"
        className={cls}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`grid place-items-center bg-brand-blue-soft font-bold text-brand-blue ${cls}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
    >
      {entry.initials}
    </span>
  );
}