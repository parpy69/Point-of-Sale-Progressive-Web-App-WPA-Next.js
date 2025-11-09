"use client";

import { useEffect } from "react";

export default function SWRegister() {
	useEffect(() => {
		if (typeof window !== "undefined" && "serviceWorker" in navigator) {
			// Register service worker
			const registerSW = async () => {
				try {
					const registration = await navigator.serviceWorker.register("/sw.js", {
						scope: "/",
					});
					
					// Check for updates
					registration.addEventListener("updatefound", () => {
						const newWorker = registration.installing;
						if (newWorker) {
							newWorker.addEventListener("statechange", () => {
								if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
									// New service worker available
									console.log("New service worker available");
								}
							});
						}
					});
				} catch (error) {
					console.error("Service Worker registration failed:", error);
				}
			};

			// Register immediately if page is already loaded, otherwise wait for load
			if (document.readyState === "complete") {
				registerSW();
			} else {
				window.addEventListener("load", registerSW);
				return () => window.removeEventListener("load", registerSW);
			}
		}
	}, []);

	return null;
}


