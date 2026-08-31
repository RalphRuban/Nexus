"use client";

import { motion } from "framer-motion";

import { durations, easings } from "@/components/ui/motion";

const LETTERS = "NEXUS".split("");

export default function CinematicBoot() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0, visibility: "hidden" }}
      transition={{ delay: 2.6, duration: durations.cinematic, ease: "easeInOut" }}
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950"
    >
      <div className="text-center">
        <div className="flex items-end justify-center">
          {LETTERS.map((letter, index) => (
            <motion.span
              key={`${letter}-${index}`}
              initial={{ opacity: 0, y: 24, scale: 0.8, filter: "blur(8px)" }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
              }}
              transition={{
                delay: 0.35 + index * 0.14,
                duration: durations.cinematic,
                ease: easings.cinematic,
              }}
              className="bg-gradient-to-b from-blue-300 via-blue-400 to-blue-600 bg-clip-text text-6xl font-black tracking-[0.35em] text-transparent"
            >
              {letter}
            </motion.span>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: durations.cinematic, ease: easings.cinematic }}
          className="mt-3 text-[10px] font-semibold tracking-[0.5em] text-slate-500"
        >
          FLOOD RESPONSE INTELLIGENCE
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: durations.cinematic, ease: easings.cinematic }}
          className="mx-auto mt-5 h-px w-40 origin-center bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
        />
      </div>
    </motion.div>
  );
}
