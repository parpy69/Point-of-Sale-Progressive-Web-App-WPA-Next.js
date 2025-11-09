"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Settings {
  id: number;
  lowStockThreshold: number;
  moderateStockThreshold: number;
  highStockThreshold: number;
  loyaltyPointsEnabled?: boolean;
  loyaltyPointsPerDollar?: number;
}

interface Recommendations {
  overall: {
    recommendedLow: number;
    recommendedModerate: number;
    recommendedHigh: number;
  };
  byProduct: Array<{
    productId: number;
    productName: string;
    averageDailySales: number;
    recommendedLow: number;
    recommendedModerate: number;
    recommendedHigh: number;
  }>;
}

export default function Settings() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    lowStockThreshold: 5,
    moderateStockThreshold: 10,
    highStockThreshold: 20,
    loyaltyPointsEnabled: false,
    loyaltyPointsPerDollar: 1.0,
  });
  const [loyaltyPointsInput, setLoyaltyPointsInput] = useState<string>("1.0");

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      router.push("/");
      return;
    }
    fetchSettings();
    fetchRecommendations();
  }, [router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setFormData({
          lowStockThreshold: data.lowStockThreshold,
          moderateStockThreshold: data.moderateStockThreshold,
          highStockThreshold: data.highStockThreshold,
          loyaltyPointsEnabled: data.loyaltyPointsEnabled ?? false,
          loyaltyPointsPerDollar: data.loyaltyPointsPerDollar ?? 1.0,
        });
        setLoyaltyPointsInput(String(data.loyaltyPointsPerDollar ?? 1.0));
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await fetch("/api/analytics/recommendations");
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data);
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Ensure loyalty points values are included and valid
      const dataToSend = {
        ...formData,
        loyaltyPointsPerDollar: formData.loyaltyPointsPerDollar || 1.0,
        loyaltyPointsEnabled: formData.loyaltyPointsEnabled ?? false
      };

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setFormData({
          lowStockThreshold: data.lowStockThreshold,
          moderateStockThreshold: data.moderateStockThreshold,
          highStockThreshold: data.highStockThreshold,
          loyaltyPointsEnabled: data.loyaltyPointsEnabled ?? false,
          loyaltyPointsPerDollar: data.loyaltyPointsPerDollar ?? 1.0,
        });
        setLoyaltyPointsInput(String(data.loyaltyPointsPerDollar ?? 1.0));
        alert("Settings saved successfully!");
      } else {
        const data = await response.json();
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || "Unknown error";
        alert(`Failed to save settings: ${errorMsg}`);
        console.error("Settings API error:", data);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`An error occurred: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const useRecommended = () => {
    if (recommendations?.overall) {
      setFormData({
        ...formData,
        lowStockThreshold: recommendations.overall.recommendedLow,
        moderateStockThreshold: recommendations.overall.recommendedModerate,
        highStockThreshold: recommendations.overall.recommendedHigh,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-x-hidden" suppressHydrationWarning>
      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg relative flex-shrink-0">
                <span className="text-2xl sm:text-3xl font-extrabold text-white relative z-10" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 12px rgba(255,255,255,0.5)' }}>V</span>
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
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                  Settings
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">Manage quantity thresholds</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-white border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Dashboard
            </button>
          </div>

          {/* Settings Form */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Quantity Thresholds</h2>
            
            {recommendations && (
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Recommended Thresholds</h3>
                    <p className="text-sm text-blue-700">
                      Based on your sales analytics (last week, month, and year)
                    </p>
                  </div>
                  <button
                    onClick={useRecommended}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Use Recommended
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600 font-medium">Low:</span>{" "}
                    <span className="text-blue-900">{recommendations.overall.recommendedLow}</span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Moderate:</span>{" "}
                    <span className="text-blue-900">{recommendations.overall.recommendedModerate}</span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">High:</span>{" "}
                    <span className="text-blue-900">{recommendations.overall.recommendedHigh}</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.lowStockThreshold}
                    onFocus={(e) => {
                      if (e.target.value === "0") {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, lowStockThreshold: value === "" ? 0 : parseInt(value) || 0 });
                    }}
                    className="block w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-black placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 hover:bg-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">Quantities below this will show red</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Moderate Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.moderateStockThreshold}
                    onFocus={(e) => {
                      if (e.target.value === "0") {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, moderateStockThreshold: value === "" ? 0 : parseInt(value) || 0 });
                    }}
                    className="block w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-black placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 hover:bg-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">Between low and moderate shows orange/yellow</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    High Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.highStockThreshold}
                    onFocus={(e) => {
                      if (e.target.value === "0") {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, highStockThreshold: value === "" ? 0 : parseInt(value) || 0 });
                    }}
                    className="block w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-black placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 hover:bg-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">Above this shows green</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>

          {/* Loyalty Points Settings */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Loyalty Points Program</h2>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Enable Loyalty Points Program
                    </label>
                    <p className="text-xs text-gray-500">
                      When enabled, customers will automatically earn points on purchases
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.loyaltyPointsEnabled}
                      onChange={(e) => {
                        setFormData({ ...formData, loyaltyPointsEnabled: e.target.checked });
                        if (!e.target.checked) {
                          setLoyaltyPointsInput("1.0");
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {formData.loyaltyPointsEnabled && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Points Per Dollar Spent
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required={formData.loyaltyPointsEnabled}
                    value={loyaltyPointsInput}
                    onFocus={(e) => {
                      if (e.target.value === "0" || e.target.value === "0.0") {
                        e.target.select();
                      }
                    }}
                    onChange={(e) => {
                      let value = e.target.value;
                      
                      // Remove leading zeros (except for 0. or 0.x)
                      if (value.length > 1 && value[0] === '0' && value[1] !== '.') {
                        value = value.replace(/^0+/, '');
                      }
                      
                      // Allow free typing - update local state
                      setLoyaltyPointsInput(value);
                      
                      // Update formData if it's a valid number
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && value !== "") {
                        setFormData({ 
                          ...formData, 
                          loyaltyPointsPerDollar: numValue
                        });
                      }
                    }}
                    onBlur={(e) => {
                      const numValue = parseFloat(e.target.value);
                      if (isNaN(numValue) || numValue < 0.1) {
                        const correctedValue = 0.1;
                        setLoyaltyPointsInput(String(correctedValue));
                        setFormData({ 
                          ...formData, 
                          loyaltyPointsPerDollar: correctedValue
                        });
                      } else {
                        setLoyaltyPointsInput(String(numValue));
                        setFormData({ 
                          ...formData, 
                          loyaltyPointsPerDollar: numValue
                        });
                      }
                    }}
                    className="block w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-black placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 hover:bg-white"
                    placeholder="1.0"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum: 0.1. Example: 1.0 = 1 point per $1 spent, 0.5 = 1 point per $2 spent, 2.0 = 2 points per $1 spent
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

