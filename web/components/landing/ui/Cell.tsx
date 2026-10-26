export default function Cell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <path
        d="M8.5 7v10M12 7v10M15.5 7v10"
        stroke="currentColor"
        strokeWidth="2.2"
      />
    </svg>
  );
}
