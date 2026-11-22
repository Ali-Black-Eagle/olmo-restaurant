"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/** Animates its own height to fit changing content (the booking sheet grows and shrinks per step). */
export function AutoHeight({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = inner.current;
    if (!el || reduce) return;
    const ro = new ResizeObserver(() => setHeight(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [reduce]);

  if (reduce) return <div>{children}</div>;
  return (
    <motion.div animate={{ height }} initial={false} transition={{ type: "spring", stiffness: 400, damping: 40 }} style={{ overflow: "hidden" }}>
      <div ref={inner}>{children}</div>
    </motion.div>
  );
}
