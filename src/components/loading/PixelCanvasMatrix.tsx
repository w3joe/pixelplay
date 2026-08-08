"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedY: number;
  speedX: number;
  opacity: number;
  pulse: number;
}

export function PixelCanvasMatrix() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // Color palette matching PixelPlay neon arcade theme
    const colors = ["#0d9b86", "#00f3ff", "#ffbe0b", "#ff0055", "#4895ef"];

    // Initialize floating pixel block particles
    const particleCount = Math.min(80, Math.floor((width * height) / 12000));
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.floor(Math.random() * 4 + 2) * 4, // Pixel snaps to 4px multiples
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: -(Math.random() * 0.8 + 0.2),
        speedX: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.7 + 0.3,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    // Mouse interactive ripple
    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    // Pixel Grid LED Matrix background
    const gridSize = 24;

    const render = () => {
      // Clear with dark cyber void background
      ctx.fillStyle = "#080c16";
      ctx.fillRect(0, 0, width, height);

      // 1. Draw subtle pixel LED grid
      ctx.lineWidth = 1;
      const cols = Math.ceil(width / gridSize);
      const rows = Math.ceil(height / gridSize);

      const time = Date.now() * 0.002;

      for (let c = 0; colLoop(c, cols); c++) {
        for (let r = 0; rowLoop(r, rows); r++) {
          const gx = c * gridSize;
          const gy = r * gridSize;

          // Distance from center / wave effect
          const distToCenter = Math.hypot(gx - width / 2, gy - height / 2);
          const wave = Math.sin(distToCenter * 0.01 - time) * 0.5 + 0.5;

          // Distance to mouse
          const distToMouse = Math.hypot(gx - mouseX, gy - mouseY);
          const mouseGlow = distToMouse < 120 ? (120 - distToMouse) / 120 : 0;

          if (mouseGlow > 0.1 || wave > 0.82) {
            ctx.fillStyle = mouseGlow > 0.2 ? "rgba(0, 243, 255, 0.4)" : `rgba(13, 155, 134, ${wave * 0.15})`;
            ctx.fillRect(gx + 1, gy + 1, gridSize - 2, gridSize - 2);
          } else {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
            ctx.strokeRect(gx, gy, gridSize, gridSize);
          }
        }
      }

      function colLoop(c: number, maxC: number) { return c < maxC; }
      function rowLoop(r: number, maxR: number) { return r < maxR; }

      // 2. Draw 3D Pixel LED Stage Array outline in center background
      const stageW = Math.min(width * 0.6, 500);
      const stageH = Math.min(height * 0.35, 240);
      const stageX = (width - stageW) / 2;
      const stageY = (height - stageH) / 2 - 20;

      // Simulated LED Wall Matrix on loading stage
      const ledCols = 16;
      const ledRows = 10;
      const ledW = stageW / ledCols;
      const ledH = stageH / ledRows;

      for (let lc = 0; lc < ledCols; lc++) {
        for (let lr = 0; lr < ledRows; lr++) {
          const lx = stageX + lc * ledW;
          const ly = stageY + lr * ledH;

          // Equalizer / Spectrum pattern on LED matrix
          const eqVal = Math.sin(lc * 0.6 + time * 3) * Math.cos(lr * 0.8 + time * 2) * 0.5 + 0.5;
          const active = eqVal > 0.45;

          if (active) {
            const ledColor = lc % 2 === 0 ? "#0d9b86" : "#00f3ff";
            ctx.fillStyle = ledColor;
            ctx.globalAlpha = 0.25 + eqVal * 0.45;
            ctx.fillRect(lx + 2, ly + 2, ledW - 4, ledH - 4);
            ctx.globalAlpha = 1.0;
          }
        }
      }

      // Stage Frame Pixel Border
      ctx.strokeStyle = "#00f3ff";
      ctx.shadowColor = "#00f3ff";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.strokeRect(stageX, stageY, stageW, stageH);
      ctx.shadowBlur = 0;

      // 3. Update & render floating pixel particles
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.pulse += 0.05;

        // Wrap particles
        if (p.y < -20) p.y = height + 20;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        const alpha = Math.abs(Math.sin(p.pulse)) * p.opacity;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(Math.floor(p.x / 4) * 4, Math.floor(p.y / 4) * 4, p.size, p.size);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full object-cover"
      aria-hidden="true"
    />
  );
}
