"use client";

import { useEffect, useRef, useState } from "react";

const STEP_MS = 2200;

export default function PhotoWheel({ photos }: { photos: string[] }) {
  const list = photos.slice(0, 8);
  const n = list.length;
  const [pos, setPos] = useState(0);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const [touch, setTouch] = useState(false);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTouch(window.matchMedia("(hover: none)").matches);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const active = n > 3 && !reduced && (touch ? visible : hover);

  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setPos((p) => (p + 1) % n), STEP_MS);
    return () => window.clearInterval(t);
  }, [active, n]);

  if (n === 0) return null;

  return (
    <div
      ref={ref}
      className={`pwheel pwheel-${Math.min(n, 3)}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
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
