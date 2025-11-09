"use client";

import { useEffect } from "react";

export default function HideDevIndicator() {
  useEffect(() => {
    // Hide Next.js dev indicator
    const hideIndicator = () => {
      // Find and hide any fixed bottom-left elements
      const allDivs = document.querySelectorAll("div");
      allDivs.forEach((div) => {
        const style = window.getComputedStyle(div);
        if (
          style.position === "fixed" &&
          (style.bottom === "0px" || style.bottom === "0") &&
          (style.left === "0px" || style.left === "0") &&
          div.textContent?.trim() === "N"
        ) {
          (div as HTMLElement).style.display = "none";
        }
      });

      // Also hide by common Next.js indicator classes/IDs
      const indicators = document.querySelectorAll(
        "#__next-build-watcher, [data-nextjs-toast], .nextjs-toast-root"
      );
      indicators.forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    };

    // Run immediately and on interval
    hideIndicator();
    const interval = setInterval(hideIndicator, 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}

