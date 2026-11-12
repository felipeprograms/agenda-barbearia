"use client";

import { useEffect, useRef, useState } from "react";

const STEP_MS = 2200;
const SPIN_MS = 9000;

export default function PhotoWheel({ photos }: { photos: string[] }) {
  const list = photos.slice(0, 8);
  const n = list.length;
  const [pos, setPos] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);

  const start = () => {
    startedAt.current = Date.now();
    setSpinning(true);
  };

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && start(), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const canSpin = n > 3 && !reduced;

  useEffect(() => {
    if (!spinning || !canSpin) return;
    const t = window.setInterval(() => {
      setPos((p) => {
        const next = (p + 1) % n;
        if (next === 0 && Date.now() - startedAt.current >= SPIN_MS) setSpinning(false);
        return next;
      });
    }, STEP_MS);
    return () => window.clearInterval(t);
  }, [spinning, canSpin, n]);

  if (n === 0) return null;

  return (
    <div
      ref={ref}
      className={`pwheel pwheel-${Math.min(n, 3)}`}
      onMouseEnter={() => canSpin && !spinning && start()}
    >
      {list.map((src, i) => {
        const slot = n > 3 ? (i + pos) % n : i;
        return (
          <div key={src + i} className="pwheel-item" data-slot={slot > 2 ? "hidden" : slot}>

            <img src={src} alt="" loading="lazy" />
          </div>
        );
      })}
    </div>
  );
}
