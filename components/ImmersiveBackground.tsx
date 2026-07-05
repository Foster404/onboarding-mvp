"use client";

import { useEffect, useRef } from "react";

export default function ImmersiveBackground() {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      spotlightRef.current?.style.setProperty("--spotlight-x", `${e.clientX}px`);
      spotlightRef.current?.style.setProperty("--spotlight-y", `${e.clientY}px`);
    }

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 animate-pulse rounded-full bg-indigo-300/40 blur-3xl [animation-duration:6s]" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 animate-pulse rounded-full bg-violet-300/30 blur-3xl [animation-duration:8s]" />
      <div className="pointer-events-none absolute bottom-[-8rem] left-1/3 h-80 w-80 animate-pulse rounded-full bg-sky-200/40 blur-3xl [animation-duration:7s]" />
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute inset-0 transition-opacity"
        style={{
          background:
            "radial-gradient(600px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), rgba(99,102,241,0.15), transparent 70%)",
        }}
      />
    </div>
  );
}
