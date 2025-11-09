"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import StockNotifications from "../components/StockNotifications";

interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
}

interface Settings {
  id: number;
  lowStockThreshold: number;
  moderateStockThreshold: number;
  highStockThreshold: number;
}

const inputClassName = "block w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-black placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 hover:bg-white";

export default function Inventory() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "", quantity: "", barcode: "" });
  const [showQuantityInfo, setShowQuantityInfo] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({ name: "", price: "", quantity: "", barcode: "" });
    setShowAddForm(false);
    setEditingProduct(null);
  };

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      router.push("/");
      return;
    }
    fetchProducts();
    fetchSettings();
  }, [router]);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showQuantityInfo && !target.closest('[aria-label="Quantity information"]') && !target.closest('.quantity-info-popup')) {
        setShowQuantityInfo(false);
      }
    };

    if (showQuantityInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuantityInfo]);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const productData = {
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        barcode: formData.barcode.trim() || null,
      };

      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        alert(`Server error: ${response.status} ${response.statusText}. Check console for details.`);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        resetForm();
        await fetchProducts();
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || "Unknown error";
        alert(`Failed to ${editingProduct ? "update" : "add"} product: ${errorMsg}`);
      }
    } catch (error) {
      console.error(`Failed to ${editingProduct ? "update" : "add"} product:`, error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`Error: ${errorMsg}. Check console for details.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      barcode: product.barcode || "",
    });
    setShowAddForm(false);
  };

  const getQuantityColor = (quantity: number) => {
    // Use custom thresholds if available, otherwise use defaults
    const lowThreshold = settings?.lowStockThreshold ?? 5;
    const moderateThreshold = settings?.moderateStockThreshold ?? 10;
    const highThreshold = settings?.highStockThreshold ?? 20;

    if (quantity >= highThreshold) return "bg-green-100 text-green-700";
    if (quantity >= moderateThreshold) return "bg-yellow-100 text-yellow-700";
    if (quantity >= lowThreshold) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
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
        <div className="max-w-7xl mx-auto">
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
                  Inventory Check
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">Manage your products and stock</p>
              </div>
            </div>
                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => router.push("/settings")}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-white border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => router.push("/dashboard")}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-white border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        Dashboard
                      </button>
                    </div>
                  </div>

                  {/* Stock Notifications */}
                  <StockNotifications />

                  {/* Add Product Button */}
                  {!showAddForm && !editingProduct && (
            <div className="mb-6">
              <button
                onClick={() => {
                  setFormData({ name: "", price: "", quantity: "", barcode: "" });
                  setEditingProduct(null);
                  setShowAddForm(true);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                + Add Product
              </button>
            </div>
          )}

          {/* Add/Edit Form */}
          {(showAddForm || editingProduct) && (
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={inputClassName}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className={inputClassName}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className={inputClassName}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Barcode (Optional)</label>
                  <input
                    type="text"
                    value={formData.barcode || ""}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className={inputClassName}
                    placeholder="Enter barcode for scanning"
                  />
                </div>
                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? (editingProduct ? "Updating..." : "Adding...") : editingProduct ? "Update Product" : "Add Product"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full rounded-lg bg-white border-2 border-gray-300 px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Products List */}
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-visible sm:overflow-hidden">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">Product Name</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">Price</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold">
                        <div className="flex items-center gap-2 relative">
                          <span>Quantity</span>
                          <button
                            ref={infoButtonRef}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (infoButtonRef.current) {
                                const rect = infoButtonRef.current.getBoundingClientRect();
                                const popupWidth = 288; // 72 * 4 = 288px
                                const centerOffset = popupWidth / 2;
                                setPopupPosition({
                                  top: rect.bottom + window.scrollY + 8,
                                  left: rect.left + window.scrollX + (rect.width / 2) - centerOffset,
                                });
                              }
                              setShowQuantityInfo(!showQuantityInfo);
                            }}
                            className="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 z-10"
                            aria-label="Quantity information"
                          >
                            <span className="text-xs font-bold text-white">i</span>
                          </button>
                          {showQuantityInfo && (
                            <>
                              <div 
                                className="fixed inset-0 z-[9998]" 
                                onClick={() => setShowQuantityInfo(false)}
                              />
                              <div 
                                className="quantity-info-popup fixed w-72 max-w-[calc(100vw-2rem)] p-4 bg-white rounded-lg shadow-2xl border-2 border-gray-200 z-[9999]"
                                style={{
                                  top: `${popupPosition.top}px`,
                                  left: `${Math.max(16, Math.min(popupPosition.left, window.innerWidth - 304))}px`,
                                }}
                              >
                                <p className="text-sm text-gray-700 leading-relaxed">
                                  <strong className="text-blue-600">Automatic Deduction:</strong> When a product is sold through the POS system, the quantity in stock will automatically decrease by the amount sold.
                                </p>
                                <div className="absolute left-1/2 -translate-x-1/2 -top-2 w-3 h-3 bg-white border-l-2 border-t-2 border-gray-200 rotate-45"></div>
                              </div>
                            </>
                          )}
                        </div>
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm sm:text-base">
                          No products found. Add your first product to get started.
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm sm:text-base text-gray-900 font-medium">{product.name}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm sm:text-base text-gray-900">${product.price.toFixed(2)}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${getQuantityColor(product.quantity)}`}>
                              {product.quantity}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditClick(product)}
                                className="px-2 sm:px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs sm:text-sm font-medium hover:bg-blue-200 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="px-2 sm:px-3 py-1 rounded-lg bg-red-100 text-red-700 text-xs sm:text-sm font-medium hover:bg-red-200 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

