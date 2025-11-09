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

    // For mobile devices, show button after delay even if event hasn't fired
    // (browser might show install option in menu)
    if (mobile) {
      const timer = setTimeout(() => {
        // Check if we can determine installability
        if (!deferredPrompt) {
          // Still show button with manual instructions
          setShowButton(true);
        }
      }, 3000);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the browser's native install prompt
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log("User choice:", outcome);
        if (outcome === "accepted") {
          setDeferredPrompt(null);
          setShowButton(false);
        }
      } catch (error) {
        console.error("Error showing install prompt:", error);
        // Fall through to show manual instructions
        showManualInstructions();
      }
    } else {
      // Show manual installation instructions
      showManualInstructions();
    }
  };

  const showManualInstructions = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    let instructions = "";
    if (isAndroid) {
      instructions = "To install:\n\n1. Tap the menu (⋮) in the top right\n2. Tap 'Install app' or 'Add to Home screen'\n3. Follow the prompts";
    } else if (isIOS) {
      instructions = "To install:\n\n1. Tap the Share button (square with arrow)\n2. Scroll and tap 'Add to Home Screen'\n3. Tap 'Add'";
    } else {
      instructions = "Look for the install icon in your browser's address bar, or check the browser menu for 'Install' option.";
    }
    
    alert(instructions);
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Show button on mobile devices
  if (!isMobile && !showButton) {
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

