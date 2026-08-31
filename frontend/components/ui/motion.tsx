"use client";

import type { Variants } from "framer-motion";

/* ---------------------------------------------------------------------------
   NEXUS 2.0 animation grammar
   Three distinct roles, one shared token set so everything stays consistent.

   - cinematic (framer-motion)   : large transitions — page, incident, simulation
   - micro      (Unlumen-style)  : hover, nav, cards, buttons, focus
   - continuous (SmoothUI-style) : counters, status, feeds, AI output
--------------------------------------------------------------------------- */

export const durations = {
  cinematic: 0.65,
  page: 0.3,
  micro: 0.18,
  continuous: 0.5,
  status: 0.4,
} as const;

export const easings = {
  cinematic: [0.22, 1, 0.36, 1] as [number, number, number, number],
  micro: [0.4, 0, 0.2, 1] as [number, number, number, number],
  spring: { type: "spring", stiffness: 90, damping: 18 },
} as const;

/* --- Cinematic (large transitions) ---------------------------------------- */

export const cinematicReveal: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: durations.cinematic,
      ease: easings.cinematic,
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    filter: "blur(4px)",
    transition: {
      duration: durations.page,
      ease: easings.cinematic,
    },
  },
};

export const cinematicStagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const cinematicStaggerItem: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: durations.cinematic,
      ease: easings.cinematic,
    },
  },
};

/* --- Micro (Unlumen-style interactions) ------------------------------------ */

export const microHover = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: { duration: durations.micro, ease: easings.micro },
} as const;

export const navItem: Variants = {
  rest: { opacity: 0.55, x: 0 },
  hover: { opacity: 1, x: 4, transition: { duration: durations.micro, ease: easings.micro } },
  active: {
    opacity: 1,
    x: 0,
    transition: { duration: durations.micro, ease: easings.micro },
  },
};

/* --- Continuous (SmoothUI-style state changes) ----------------------------- */

export const continuousFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.continuous } },
};

export const continuousSlideIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.continuous, ease: easings.micro },
  },
};

export const statusDot: Variants = {
  pulse: {
    scale: [1, 1.35, 1],
    opacity: [0.7, 1, 0.7],
    transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
  },
  breathe: {
    scale: [1, 1.08, 1],
    opacity: [0.4, 0.7, 0.4],
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
  },
  idle: { scale: 1, opacity: 1 },
};
