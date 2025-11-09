"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: number;
  name: string;
  quantity: number;
}

interface Settings {
  id: number;
  lowStockThreshold: number;
  moderateStockThreshold: number;
  highStockThreshold: number;
}

export default function StockNotifications() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showNotifications, setShowNotifications] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  if (!settings || !showNotifications) return null;

  const lowThreshold = settings.lowStockThreshold;
  const outOfStock = products.filter(p => p.quantity === 0);
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity < lowThreshold);

  if (outOfStock.length === 0 && lowStock.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {outOfStock.length > 0 && (
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Out of Stock ({outOfStock.length})
              </h3>
              <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                {outOfStock.map(product => (
                  <li key={product.id}>
                    <strong>{product.name}</strong> - Quantity: 0
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => router.push("/suppliers")}
              className="ml-4 px-3 py-1 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              Restock
            </button>
          </div>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-400 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                Low Stock ({lowStock.length})
              </h3>
              <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                {lowStock.map(product => (
                  <li key={product.id}>
                    <strong>{product.name}</strong> - Quantity: {product.quantity} (below {lowThreshold})
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => router.push("/inventory")}
              className="ml-4 px-3 py-1 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              View
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowNotifications(false)}
        className="text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Dismiss notifications
      </button>
    </div>
  );
}

