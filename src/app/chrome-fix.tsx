"use client";

import { useEffect } from "react";

export default function ChromeFix() {
  useEffect(() => {
    // Remove Chrome extension injected attributes that cause hydration mismatches
    const removeChromeAttrs = () => {
      const allElements = document.querySelectorAll("*");
      allElements.forEach((el) => {
        // Remove common Chrome extension attributes
        const attrsToRemove = [
          "__gchrome_uniqueid",
          "__gcrchrome_uniqueid",
          "data-new-gr-c-s-check-loaded",
          "data-gr-ext-installed",
        ];
        attrsToRemove.forEach((attr) => {
          if (el.hasAttribute(attr)) {
            el.removeAttribute(attr);
          }
        });
      });
    };

    // Run immediately and after a short delay
    removeChromeAttrs();
    setTimeout(removeChromeAttrs, 100);
  }, []);

  return null;
}

