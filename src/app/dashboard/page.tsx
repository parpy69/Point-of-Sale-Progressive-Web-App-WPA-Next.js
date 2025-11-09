"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import StockNotifications from "../components/StockNotifications";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      router.push("/");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" suppressHydrationWarning>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg relative">
                <span className="text-3xl font-extrabold text-white relative z-10" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 12px rgba(255,255,255,0.5)' }}>V</span>
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
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Velocity
                </h1>
                <p className="text-sm text-gray-500">Point of Sale System</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-white border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Logout
            </button>
          </div>

          {/* Stock Notifications */}
          <StockNotifications />

          {/* Dashboard Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Velocity</h2>
              <p className="text-gray-600 mb-6">Your POS dashboard is ready. Start building your point of sale system here.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push("/sales")}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-[1.02]"
                >
                  Point of Sale
                </button>
                <button
                  onClick={() => router.push("/inventory")}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02]"
                >
                  Go to Inventory
                </button>
                <button
                  onClick={() => router.push("/suppliers")}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02]"
                >
                  Supplier Management
                </button>
                <button
                  onClick={() => router.push("/settings")}
                  className="px-6 py-3 rounded-lg bg-white border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

