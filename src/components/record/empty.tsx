/** The muted stand-in an editor sees where a field is still empty. */
export function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-ink-faint">{children}</span>;
}
