"use client";

import { motion } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ShaderAnimation } from "@/components/ui/shader-lines";
import {
  Cpu,
  Signal,
  Wifi,
  ScanLine,
  Radio,
  Gauge,
  Zap,
  Container,
} from "lucide-react";

// ── Glitch hacked title ──────────────────────────────────────────────────────
const GLITCH_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`01";

function GlitchTitle({ text }: { text: string }) {
  const [display, setDisplay] = useState(text);
  const [isGlitching, setIsGlitching] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const glitch = useCallback(() => {
    setIsGlitching(true);
    let ticks = 0;
    const maxTicks = 8 + Math.floor(Math.random() * 6);

    intervalRef.current = setInterval(() => {
      setDisplay(
        text
          .split("")
          .map((ch) =>
            Math.random() < 0.4
              ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
              : ch,
          )
          .join(""),
      );
      ticks++;
      if (ticks >= maxTicks) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplay(text);
        setIsGlitching(false);
      }
    }, 50);
  }, [text]);

  useEffect(() => {
    // Initial glitch on mount
    const initTimeout = setTimeout(glitch, 800);

    // Random glitches every 2-5 seconds
    const loop = setInterval(() => {
      if (!isGlitching) glitch();
    }, 2000 + Math.random() * 3000);

    return () => {
      clearTimeout(initTimeout);
      clearInterval(loop);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glitch]);

  return (
    <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-4 tracking-tighter font-mono relative select-none">
      {/* Main text */}
      <span
        className="relative inline-block text-transparent bg-clip-text
          bg-gradient-to-r from-[#00d4ff] via-white to-[#ff6600]"
        style={{
          textShadow: isGlitching
            ? "2px 0 #ff0040, -2px 0 #00d4ff, 0 0 8px rgba(0,212,255,0.5)"
            : "none",
          WebkitTextStroke: isGlitching ? "0.5px rgba(255,0,64,0.3)" : "none",
        }}
      >
        {display}
      </span>

      {/* Red offset clone — only during glitch */}
      {isGlitching && (
        <span
          className="absolute inset-0 text-[#ff0040] opacity-60 pointer-events-none"
          style={{
            clipPath: `inset(${Math.random() * 40}% 0 ${Math.random() * 40}% 0)`,
            transform: `translate(${Math.random() * 6 - 3}px, ${Math.random() * 4 - 2}px)`,
          }}
          aria-hidden
        >
          {display}
        </span>
      )}

      {/* Cyan offset clone — only during glitch */}
      {isGlitching && (
        <span
          className="absolute inset-0 text-[#00d4ff] opacity-40 pointer-events-none"
          style={{
            clipPath: `inset(${Math.random() * 40}% 0 ${Math.random() * 40}% 0)`,
            transform: `translate(${Math.random() * -6 + 3}px, ${Math.random() * 4 - 2}px)`,
          }}
          aria-hidden
        >
          {display}
        </span>
      )}

      {/* Scanline flicker */}
      {isGlitching && (
        <span
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.1) 2px, rgba(0,212,255,0.1) 4px)",
          }}
          aria-hidden
        />
      )}
    </h1>
  );
}

// ── Animated SVG supply-chain route lines ────────────────────────────────────
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="w-full h-full"
        viewBox="0 0 696 316"
        fill="none"
      >
        <title>Supply Chain Routes</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke={path.id % 3 === 0 ? "#00d4ff" : "#ff6600"}
            strokeWidth={path.width}
            strokeOpacity={0.04 + path.id * 0.012}
            initial={{ pathLength: 0.3, opacity: 0.4 }}
            animate={{
              pathLength: 1,
              opacity: [0.15, 0.35, 0.15],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 20 + path.id * 0.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

// ── Semi-truck SVG silhouette ────────────────────────────────────────────────
function TruckSilhouette() {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ bottom: "18%", width: "220px", height: "100px" }}
      initial={{ x: "-250px", opacity: 0 }}
      animate={{
        x: ["calc(-250px)", "calc(100vw + 250px)"],
        opacity: [0, 0.25, 0.25, 0.25, 0],
      }}
      transition={{
        duration: 28,
        repeat: Number.POSITIVE_INFINITY,
        ease: "linear",
        times: [0, 0.05, 0.5, 0.95, 1],
      }}
    >
      <svg
        viewBox="0 0 220 100"
        fill="none"
        className="w-full h-full"
      >
        <title>Truck</title>
        {/* Trailer */}
        <rect x="0" y="20" width="130" height="55" rx="3" fill="#00d4ff" fillOpacity="0.15" stroke="#00d4ff" strokeOpacity="0.3" strokeWidth="1" />
        {/* NXT on trailer */}
        <text x="45" y="52" fill="#00d4ff" fillOpacity="0.4" fontSize="14" fontFamily="monospace" fontWeight="bold">NXT</text>
        {/* Cab */}
        <path d="M130 30 L130 75 L180 75 L180 45 L165 30 Z" fill="#ff6600" fillOpacity="0.15" stroke="#ff6600" strokeOpacity="0.3" strokeWidth="1" />
        {/* Windshield */}
        <path d="M165 32 L180 47 L180 38 L170 32 Z" fill="#00d4ff" fillOpacity="0.1" />
        {/* Wheels */}
        <circle cx="35" cy="78" r="9" fill="#1a1e25" stroke="#00d4ff" strokeOpacity="0.4" strokeWidth="1.5" />
        <circle cx="105" cy="78" r="9" fill="#1a1e25" stroke="#00d4ff" strokeOpacity="0.4" strokeWidth="1.5" />
        <circle cx="160" cy="78" r="9" fill="#1a1e25" stroke="#ff6600" strokeOpacity="0.4" strokeWidth="1.5" />
        {/* Wheel hubs */}
        <circle cx="35" cy="78" r="3" fill="#00d4ff" fillOpacity="0.3" />
        <circle cx="105" cy="78" r="3" fill="#00d4ff" fillOpacity="0.3" />
        <circle cx="160" cy="78" r="3" fill="#ff6600" fillOpacity="0.3" />
        {/* Exhaust stack */}
        <rect x="175" y="15" width="3" height="18" rx="1" fill="#505868" fillOpacity="0.4" />
        {/* Ground line */}
        <line x1="0" y1="87" x2="220" y2="87" stroke="#2e3440" strokeWidth="1" strokeDasharray="4 4" />
      </svg>
    </motion.div>
  );
}

// ── Floating tech icons ──────────────────────────────────────────────────────
const TECH_ICONS = [
  { Icon: Cpu, x: "12%", y: "20%", delay: 0, color: "#00d4ff" },
  { Icon: Signal, x: "85%", y: "15%", delay: 2, color: "#ff6600" },
  { Icon: Wifi, x: "75%", y: "70%", delay: 4, color: "#00d4ff" },
  { Icon: Container, x: "8%", y: "65%", delay: 1.5, color: "#ff6600" },
  { Icon: ScanLine, x: "90%", y: "45%", delay: 3, color: "#00d4ff" },
  { Icon: Radio, x: "20%", y: "80%", delay: 5, color: "#00d4ff" },
  { Icon: Gauge, x: "70%", y: "25%", delay: 2.5, color: "#ff6600" },
  { Icon: Zap, x: "45%", y: "85%", delay: 3.5, color: "#00d4ff" },
];

function TechParticles() {
  return (
    <>
      {TECH_ICONS.map(({ Icon, x, y, delay, color }, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 0.2, 0.2, 0],
            scale: [0.5, 1, 1, 0.5],
            y: [0, -8, 0, 8, 0],
          }}
          transition={{
            duration: 8,
            delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        >
          <Icon size={20} color={color} strokeWidth={1.2} />
        </motion.div>
      ))}
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function BackgroundPaths({
  title = "NXT//LINK",
  subtitle = "Supply Chain Intelligence Command Center",
  ctaText = "Enter Briefing",
  ctaHref = "/briefing",
}: {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[calc(100vh-80px)] w-full flex items-center justify-center overflow-hidden bg-nxt-bg"
    >
      {/* WebGL shader background — deepest layer */}
      <div className="absolute inset-0 opacity-60">
        <ShaderAnimation />
      </div>

      {/* Animated supply-chain route lines — on top of shader */}
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* Truck passing through */}
      <TruckSilhouette />

      {/* Floating tech icons */}
      <TechParticles />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="max-w-4xl mx-auto"
        >
          {/* Title — glitchy hacked effect */}
          <GlitchTitle text={title} />

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="text-sm sm:text-base md:text-lg font-mono uppercase tracking-[0.2em] text-nxt-muted mb-10"
          >
            {subtitle}
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <div
              className="inline-block group relative bg-gradient-to-b from-[#00d4ff]/10 to-[#ff6600]/10
                p-px rounded-2xl backdrop-blur-lg overflow-hidden
                shadow-lg shadow-[#00d4ff]/5 hover:shadow-xl hover:shadow-[#00d4ff]/10
                transition-shadow duration-300"
            >
              <Link href={ctaHref}>
                <Button
                  variant="ghost"
                  className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold font-mono uppercase tracking-wider
                    backdrop-blur-md bg-nxt-card/95 hover:bg-nxt-card/100
                    text-white transition-all duration-300
                    group-hover:-translate-y-0.5 border border-[#00d4ff]/20
                    hover:shadow-md hover:border-[#00d4ff]/40"
                >
                  <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                    {ctaText}
                  </span>
                  <span
                    className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5
                      transition-all duration-300"
                  >
                    →
                  </span>
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Bottom signal bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1.5 }}
            className="mt-16 flex items-center justify-center gap-6 text-nxt-dim text-xs font-mono uppercase tracking-wider"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
              Live Signals
            </span>
            <span className="text-nxt-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]" />
              70K+ Sources
            </span>
            <span className="text-nxt-border">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff6600]" />
              Real-Time Intel
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
