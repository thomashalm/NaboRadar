/** Pilen på en utvider. Roterer når `details.disclosure` er åpen (globals.css). */
export function Chevron({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`chevron size-4 shrink-0 text-subtle ${className}`}
    >
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </svg>
  );
}
