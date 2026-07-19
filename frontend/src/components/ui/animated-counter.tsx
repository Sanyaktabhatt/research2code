"use client";

import * as React from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  className?: string;
  formatter?: (value: number) => string;
}

/** Counts up from 0 to `value` once it scrolls into view - used for dashboard KPIs so numbers feel alive instead of static text. Non-numeric labels (e.g. "50+") should bypass this and render as plain text. */
export function AnimatedCounter({ value, className, formatter }: AnimatedCounterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 22, mass: 1 });
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (isInView) motionValue.set(value);
  }, [isInView, value, motionValue]);

  React.useEffect(() => {
    const unsubscribe = spring.on("change", (v) => setDisplay(Math.round(v)));
    return unsubscribe;
  }, [spring]);

  return (
    <span ref={ref} className={className} suppressHydrationWarning>
      {formatter ? formatter(display) : display}
    </span>
  );
}
