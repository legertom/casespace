const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateShortFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateFmt.format(typeof d === "string" ? new Date(`${d}T12:00:00Z`) : d);
}

export function fmtDateShort(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateShortFmt.format(typeof d === "string" ? new Date(`${d}T12:00:00Z`) : d);
}

export function daysAgo(d: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
