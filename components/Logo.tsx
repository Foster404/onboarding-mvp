const sizes = {
  sm: { box: "h-7 w-7", text: "text-xs", ring: "1", dot: "1.1" },
  lg: { box: "h-12 w-12", text: "text-lg", ring: "1.3", dot: "1.6" },
} as const;

export default function Logo({ size = "lg" }: { size?: keyof typeof sizes }) {
  const { box, text, ring, dot } = sizes[size];

  return (
    <span
      className={`relative flex ${box} shrink-0 select-none items-center justify-center rounded-[22%] bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-inset ring-white/20 ${text}`}
    >
      O
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute inset-0 h-full w-full opacity-80">
        <g className="origin-[12px_12px] animate-[spin_11s_linear_infinite]">
          <ellipse
            cx="12"
            cy="12"
            rx="10.5"
            ry="4.5"
            fill="none"
            stroke="white"
            strokeWidth={ring}
            strokeOpacity="0.45"
          />
        </g>
        <g className="origin-[12px_12px] animate-[spin_9s_linear_infinite]">
          <circle cx="22" cy="12" r={dot} fill="white" fillOpacity="0.9" />
        </g>
      </svg>
    </span>
  );
}
