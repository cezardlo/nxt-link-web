"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  trail: { x: number; y: number }[];
}

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 200 + Math.random() * 300,
    size: 0.5 + Math.random() * 1.5,
    trail: [],
  };
}

function flowField(x: number, y: number, time: number): [number, number] {
  const scale = 0.003;
  const angle =
    Math.sin(x * scale + time * 0.3) *
      Math.cos(y * scale + time * 0.2) *
      Math.PI *
      2 +
    Math.sin((x + y) * scale * 0.5 + time * 0.1) * Math.PI;

  return [Math.cos(angle) * 0.5, Math.sin(angle) * 0.5];
}

export default function NeuralBackground({
  className,
  particleCount = 300,
  color = "255, 102, 0",
  maxOpacity = 0.6,
  mouseRepelRadius = 100,
  mouseRepelForce = 2,
  trailLength = 8,
}: {
  className?: string;
  particleCount?: number;
  color?: string;
  maxOpacity?: number;
  mouseRepelRadius?: number;
  mouseRepelForce?: number;
  trailLength?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  const init = useCallback(
    (width: number, height: number) => {
      particlesRef.current = Array.from({ length: particleCount }, () =>
        createParticle(width, height)
      );
    },
    [particleCount]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      init(rect.width, rect.height);
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      timeRef.current += 0.01;

      // Trail effect - semi-transparent overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      ctx.fillRect(0, 0, width, height);

      const mouse = mouseRef.current;

      for (const p of particlesRef.current) {
        // Flow field velocity
        const [fx, fy] = flowField(p.x, p.y, timeRef.current);
        p.vx += fx * 0.1;
        p.vy += fy * 0.1;

        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRepelRadius && dist > 0) {
          const force = (1 - dist / mouseRepelRadius) * mouseRepelForce;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Damping
        p.vx *= 0.95;
        p.vy *= 0.95;

        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Store trail
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > trailLength) {
          p.trail.shift();
        }

        // Reset if out of bounds or dead
        if (
          p.x < -10 ||
          p.x > width + 10 ||
          p.y < -10 ||
          p.y > height + 10 ||
          p.life > p.maxLife
        ) {
          Object.assign(p, createParticle(width, height));
          p.trail = [];
        }

        // Draw trail
        if (p.trail.length > 1) {
          const lifeRatio = 1 - p.life / p.maxLife;
          const alpha = lifeRatio * maxOpacity;

          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
          }
          ctx.strokeStyle = `rgba(${color}, ${alpha * 0.5})`;
          ctx.lineWidth = p.size * 0.5;
          ctx.stroke();
        }

        // Draw particle
        const lifeRatio = 1 - p.life / p.maxLife;
        const alpha = lifeRatio * maxOpacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${alpha})`;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [init, color, maxOpacity, mouseRepelRadius, mouseRepelForce, trailLength]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-auto absolute inset-0 h-full w-full", className)}
      style={{ background: "transparent" }}
    />
  );
}
