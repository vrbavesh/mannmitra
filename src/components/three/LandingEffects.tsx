"use client";

import dynamic from "next/dynamic";
import { animate } from "motion/mini";
import { inView } from "motion";
import { useEffect, useState } from "react";

const FluidScene = dynamic(() => import("./FluidScene"), { ssr: false });

export default function LandingEffects() {
  const [mode, setMode] = useState<"pending" | "static" | "enhanced">("pending");
  const [active, setActive] = useState(false);
  useEffect(() => {
    const root = document.getElementById("landing")!;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const strip = root.querySelector<HTMLElement>("[data-day-strip]");
    const cells = Array.from(strip?.children ?? []) as HTMLElement[];
    const resetDays = () => cells.forEach((cell) => cell.style.removeProperty("transform"));
    const liftDays = (event: PointerEvent) => {
      if (media.matches || event.pointerType !== "mouse") return;
      // The HTML's 90px proximity falloff, scoped to the current row on phones.
      cells.forEach((cell) => {
        const r = cell.getBoundingClientRect();
        const sameRow = Math.abs(event.clientY - (r.top + r.height / 2)) <= r.height / 2 + 12;
        const k = sameRow
          ? Math.max(0, 1 - Math.abs(event.clientX - (r.left + r.width / 2)) / 90)
          : 0;
        cell.style.transform = `translateY(${-9 * k}px) scale(${1 + k * 0.3})`;
      });
    };
    strip?.addEventListener("pointermove", liftDays);
    strip?.addEventListener("pointerleave", resetDays);
    const animations: ReturnType<typeof animate>[] = [];
    let stopReveal: (() => void) | undefined;
    const reveal = () => {
      resetDays();
      stopReveal?.();
      animations.forEach((animation) => animation.complete());
      animations.length = 0;
      if (media.matches) return;
      stopReveal = inView(
        "[data-landing-panel]:not(:first-child)",
        (element) => {
          animations.push(
            animate(
              element.firstElementChild as HTMLElement,
              { opacity: [0.7, 1], transform: ["translateY(12px)", "translateY(0)"] },
              { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
            ),
          );
        },
        { amount: 0.2 },
      );
    };
    const device = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    let visible = true;
    let canEnhance = false;
    const update = () => {
      const enabled =
        canEnhance &&
        !media.matches &&
        !device.connection?.saveData &&
        (device.deviceMemory ?? 8) > 2 &&
        (device.hardwareConcurrency || 4) > 2;
      setMode(enabled ? "enhanced" : "static");
      setActive(visible && !document.hidden);
    };
    let idle: number | undefined;
    const enhance = () => {
      canEnhance = true;
      update();
    };
    const deferScene = () => {
      // Let the readable page finish loading before the optional renderer competes for work.
      idle = window.requestIdleCallback
        ? window.requestIdleCallback(enhance, { timeout: 2000 })
        : window.setTimeout(enhance, 0);
    };
    if (document.readyState === "complete") deferScene();
    else window.addEventListener("load", deferScene, { once: true });
    const frame = requestAnimationFrame(() => {
      update();
      reveal();
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(root);
    media.addEventListener("change", update);
    media.addEventListener("change", reveal);
    document.addEventListener("visibilitychange", update);
    return () => {
      cancelAnimationFrame(frame);
      strip?.removeEventListener("pointermove", liftDays);
      strip?.removeEventListener("pointerleave", resetDays);
      resetDays();
      window.removeEventListener("load", deferScene);
      if (idle !== undefined) {
        if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
        else window.clearTimeout(idle);
      }
      observer.disconnect();
      media.removeEventListener("change", update);
      media.removeEventListener("change", reveal);
      stopReveal?.();
      animations.forEach((animation) => animation.stop());
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <div data-scene-mode={mode}>{mode === "enhanced" ? <FluidScene active={active} /> : null}</div>
  );
}
