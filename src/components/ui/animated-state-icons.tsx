"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// SuccessIcon — checkmark that draws in
export function SuccessIcon({
  className,
  size = 24,
  color = "currentColor",
}: {
  className?: string;
  size?: number;
  color?: string;
}) {
  return (
    <motion.svg
      className={cn("inline-block", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <motion.path
        d="M8 12l2.5 2.5L16 9"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

// MenuCloseIcon — hamburger <-> X toggle
export function MenuCloseIcon({
  className,
  size = 24,
  color = "currentColor",
  isOpen = false,
  onClick,
}: {
  className?: string;
  size?: number;
  color?: string;
  isOpen?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.svg
      className={cn("inline-block cursor-pointer", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      onClick={onClick}
    >
      <motion.line
        x1="4"
        x2="20"
        animate={
          isOpen
            ? { y1: 12, y2: 12, rotate: 45, originX: "12px", originY: "12px" }
            : { y1: 6, y2: 6, rotate: 0 }
        }
        transition={{ duration: 0.3 }}
      />
      <motion.line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.2 }}
      />
      <motion.line
        x1="4"
        x2="20"
        animate={
          isOpen
            ? { y1: 12, y2: 12, rotate: -45, originX: "12px", originY: "12px" }
            : { y1: 18, y2: 18, rotate: 0 }
        }
        transition={{ duration: 0.3 }}
      />
    </motion.svg>
  );
}

// PlayPauseIcon — play <-> pause toggle
export function PlayPauseIcon({
  className,
  size = 24,
  color = "currentColor",
  isPlaying = false,
  onClick,
}: {
  className?: string;
  size?: number;
  color?: string;
  isPlaying?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.svg
      className={cn("inline-block cursor-pointer", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      onClick={onClick}
    >
      <AnimatePresence mode="wait">
        {isPlaying ? (
          <motion.g
            key="pause"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </motion.g>
        ) : (
          <motion.polygon
            key="play"
            points="6,4 20,12 6,20"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
    </motion.svg>
  );
}

// LockUnlockIcon — lock <-> unlock toggle
export function LockUnlockIcon({
  className,
  size = 24,
  color = "currentColor",
  isLocked = true,
  onClick,
}: {
  className?: string;
  size?: number;
  color?: string;
  isLocked?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.svg
      className={cn("inline-block cursor-pointer", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      onClick={onClick}
    >
      <rect x="5" y="11" width="14" height="11" rx="2" />
      <motion.path
        d="M8 11V7a4 4 0 0 1 8 0v4"
        animate={
          isLocked
            ? { d: "M8 11V7a4 4 0 0 1 8 0v4" }
            : { d: "M8 11V7a4 4 0 0 1 8 0v0" }
        }
        transition={{ duration: 0.3 }}
      />
    </motion.svg>
  );
}

// CopiedIcon — clipboard -> checkmark
export function CopiedIcon({
  className,
  size = 24,
  color = "currentColor",
  copied = false,
}: {
  className?: string;
  size?: number;
  color?: string;
  copied?: boolean;
}) {
  return (
    <motion.svg
      className={cn("inline-block", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.g
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
          >
            <motion.path
              d="M5 12l5 5L20 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
            />
          </motion.g>
        ) : (
          <motion.g
            key="clipboard"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
          >
            <rect x="9" y="2" width="6" height="4" rx="1" />
            <rect x="4" y="4" width="16" height="18" rx="2" />
          </motion.g>
        )}
      </AnimatePresence>
    </motion.svg>
  );
}

// NotificationIcon — bell with shake
export function NotificationIcon({
  className,
  size = 24,
  color = "currentColor",
  hasNotification = false,
}: {
  className?: string;
  size?: number;
  color?: string;
  hasNotification?: boolean;
}) {
  return (
    <div className={cn("relative inline-block", className)}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={
          hasNotification
            ? {
                rotate: [0, -10, 10, -10, 10, 0],
                transition: { duration: 0.5 },
              }
            : {}
        }
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </motion.svg>
      <AnimatePresence>
        {hasNotification && (
          <motion.div
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// HeartIcon — heart with pop animation
export function HeartIcon({
  className,
  size = 24,
  color = "currentColor",
  filled = false,
  onClick,
}: {
  className?: string;
  size?: number;
  color?: string;
  filled?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.svg
      className={cn("inline-block cursor-pointer", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      onClick={onClick}
      animate={filled ? { scale: [1, 1.3, 1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </motion.svg>
  );
}

// DownloadDoneIcon — download arrow -> checkmark
export function DownloadDoneIcon({
  className,
  size = 24,
  color = "currentColor",
  done = false,
}: {
  className?: string;
  size?: number;
  color?: string;
  done?: boolean;
}) {
  return (
    <motion.svg
      className={cn("inline-block", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <AnimatePresence mode="wait">
        {done ? (
          <motion.path
            key="check"
            d="M5 12l5 5L20 7"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        ) : (
          <motion.g
            key="download"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 5 }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <motion.g
              animate={{ y: [0, 2, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </motion.g>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.svg>
  );
}

// SendIcon — paper plane with fly-out
export function SendIcon({
  className,
  size = 24,
  color = "currentColor",
  sent = false,
  onClick,
}: {
  className?: string;
  size?: number;
  color?: string;
  sent?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.svg
      className={cn("inline-block cursor-pointer", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      onClick={onClick}
      animate={
        sent
          ? { x: [0, 30], opacity: [1, 0], scale: [1, 0.5] }
          : { x: 0, opacity: 1, scale: 1 }
      }
      transition={{ duration: 0.4 }}
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </motion.svg>
  );
}

// ToggleIcon — switch toggle
export function ToggleIcon({
  className,
  size = 40,
  isOn = false,
  onColor = "#ff6600",
  offColor = "#333",
  onClick,
}: {
  className?: string;
  size?: number;
  isOn?: boolean;
  onColor?: string;
  offColor?: string;
  onClick?: () => void;
}) {
  const height = size * 0.55;
  const knobSize = height - 4;

  return (
    <motion.div
      className={cn("relative inline-flex cursor-pointer items-center rounded-full", className)}
      style={{ width: size, height, backgroundColor: isOn ? onColor : offColor }}
      onClick={onClick}
      animate={{ backgroundColor: isOn ? onColor : offColor }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="rounded-full bg-white shadow"
        style={{ width: knobSize, height: knobSize }}
        animate={{ x: isOn ? size - knobSize - 2 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </motion.div>
  );
}

// EyeToggleIcon — eye open/closed
export function EyeToggleIcon({
  className,
  size = 24,
  color = "currentColor",
  isVisible = true,
  onClick,
}: {
  className?: string;
  size?: number;
  color?: string;
  isVisible?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.svg
      className={cn("inline-block cursor-pointer", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      onClick={onClick}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
      <AnimatePresence>
        {!isVisible && (
          <motion.line
            x1="1"
            y1="1"
            x2="23"
            y2="23"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            exit={{ pathLength: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
    </motion.svg>
  );
}

// VolumeIcon — volume levels
export function VolumeIcon({
  className,
  size = 24,
  color = "currentColor",
  level = 2,
  onClick,
}: {
  className?: string;
  size?: number;
  color?: string;
  level?: 0 | 1 | 2;
  onClick?: () => void;
}) {
  return (
    <motion.svg
      className={cn("inline-block cursor-pointer", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      onClick={onClick}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <AnimatePresence>
        {level >= 1 && (
          <motion.path
            key="wave1"
            d="M15.54 8.46a5 5 0 0 1 0 7.07"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {level >= 2 && (
          <motion.path
            key="wave2"
            d="M19.07 4.93a10 10 0 0 1 0 14.14"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          />
        )}
      </AnimatePresence>
      {level === 0 && (
        <motion.line
          x1="23"
          y1="9"
          x2="17"
          y2="15"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.svg>
  );
}
