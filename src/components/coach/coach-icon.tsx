/**
 * The Coach's mark: a sparkle. It reads as "ask the AI" at 14px, which the
 * word "Coach" set in a tiny button never quite did, and it sits beside the
 * pencil without competing with it.
 */
export function CoachIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M7 3 Q7.9 8.1 13 9 Q7.9 9.9 7 15 Q6.1 9.9 1 9 Q6.1 8.1 7 3Z" />
      <path d="M13 0.4 Q13.4 2.6 15.6 3 Q13.4 3.4 13 5.6 Q12.6 3.4 10.4 3 Q12.6 2.6 13 0.4Z" />
    </svg>
  );
}
