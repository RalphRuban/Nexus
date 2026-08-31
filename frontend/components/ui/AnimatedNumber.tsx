"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
}

export default function AnimatedNumber({
  value,
  decimals = 0,
  duration = 0.9,
}: AnimatedNumberProps) {
  const spring = useSpring(0, {
    stiffness: 80,
    damping: 20,
    duration,
  });

  const display = useTransform(spring, (latest) =>
    latest.toFixed(decimals)
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}