"use client";

import { useEffect } from "react";

export default function SWRegister() {
	useEffect(() => {
		if (typeof window !== "undefined" && "serviceWorker" in navigator) {
			const onLoad = () => {
				navigator.serviceWorker
					.register("/sw.js")
					.catch((e) => console.log("SW reg failed", e));
			};
			window.addEventListener("load", onLoad);
			return () => window.removeEventListener("load", onLoad);
		}
	}, []);

	return null;
}


