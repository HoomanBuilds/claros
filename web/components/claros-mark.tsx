// The Claros mark, identical to the favicon (app/icon.svg): a signal burst on a
// dark tile with a cream center dot. Used as the brand logo in the navbar/footer.
export function ClarosMark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Claros"
    >
      <rect width="32" height="32" fill="#0f0f0f" />
      <g stroke="#ea580c" strokeWidth="3" strokeLinecap="square">
        <line x1="16" y1="6" x2="16" y2="26" />
        <line x1="6" y1="16" x2="26" y2="16" />
        <line x1="9" y1="9" x2="23" y2="23" />
        <line x1="23" y1="9" x2="9" y2="23" />
      </g>
      <circle cx="16" cy="16" r="4" fill="#0f0f0f" stroke="#f2f1ea" strokeWidth="2" />
    </svg>
  )
}
