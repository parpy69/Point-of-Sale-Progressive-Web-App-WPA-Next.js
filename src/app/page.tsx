"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Trim and normalize email (case-insensitive)
    const trimmedEmail = email.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();
    const normalizedPassword = password.trim();

    // Validate email format
    if (!trimmedEmail) {
      setError("Please enter a valid email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    // Check credentials
    if (
      (normalizedEmail === "parpyfn@gmail.com" && normalizedPassword === "Trillixjoy1!") ||
      (normalizedEmail === "demo@demo.com" && normalizedPassword === "demo")
    ) {
      // Store login state
      localStorage.setItem("isLoggedIn", "true");
      // Redirect to dashboard
      router.push("/dashboard");
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" suppressHydrationWarning>
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-10 shadow-2xl border border-gray-100" suppressHydrationWarning>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 mb-4 shadow-lg relative">
            <span className="text-4xl font-extrabold text-white relative z-10" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 12px rgba(255,255,255,0.5)' }}>V</span>
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M32 10 L28 26 L32 30 L36 26 L32 10 Z M28 26 L24 38 L32 34 L28 26 Z M24 38 L20 50 L32 46 L24 38 Z M36 26 L40 38 L32 34 L36 26 Z M40 38 L44 50 L32 46 L40 38 Z"
                fill="white"
                opacity="0.5"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Velocity
          </h1>
          <p className="mt-3 text-sm text-gray-500">Sign in to your account</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                className="block w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-black placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 hover:bg-white"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                className="block w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-black placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 hover:bg-white"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border-2 border-red-400 px-4 py-3">
              <p className="text-base text-red-700 font-semibold text-center">{error}</p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
