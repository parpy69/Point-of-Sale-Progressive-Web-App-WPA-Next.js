"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches || 
                      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    if (standalone) {
      return;
    }

    // Check if mobile device
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(mobile);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("beforeinstallprompt event fired");
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowButton(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if app was installed
    window.addEventListener("appinstalled", () => {
      console.log("App installed");
      setIsInstalled(true);
      setShowButton(false);
      setDeferredPrompt(null);
    });

    // Only show button when beforeinstallprompt event fires
    // Don't show button if event hasn't fired (means app isn't installable yet)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the browser's native install prompt
      // Note: This will show a confirmation dialog - browser security requirement
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log("User choice:", outcome);
        if (outcome === "accepted") {
          setDeferredPrompt(null);
          setShowButton(false);
        }
      } catch (error) {
        console.error("Error showing install prompt:", error);
      }
    }
    // If deferredPrompt is null, don't show anything - button shouldn't be visible
  };

  // Don't show if already installed or if native prompt isn't available
  if (isInstalled || !showButton || !deferredPrompt) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-2xl hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 active:scale-95 z-50 flex items-center gap-2"
      aria-label="Install Velocity app"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Install App
    </button>
  );
}

