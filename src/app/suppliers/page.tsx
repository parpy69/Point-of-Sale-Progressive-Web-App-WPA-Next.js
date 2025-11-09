"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Supplier {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  contactName?: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplier: Supplier;
  totalAmount: number;
  status: string;
  expectedArrivalDate?: string;
  notes?: string;
  createdAt: string;
}

const inputClassName = "block w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-black placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 hover:bg-white";

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [supplierFormData, setSupplierFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    contactName: "",
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [expectedArrivalDate, setExpectedArrivalDate] = useState("");
  const [supplierPrices, setSupplierPrices] = useState<{ [productId: number]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPriceManager, setShowPriceManager] = useState(false);
  const [priceManagerSupplier, setPriceManagerSupplier] = useState<Supplier | null>(null);
  const [supplierProductPrices, setSupplierProductPrices] = useState<{ [productId: number]: number }>({});

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      router.push("/");
      return;
    }
    fetchSuppliers();
    fetchProducts();
    fetchPurchaseOrders();
  }, [router]);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/suppliers");
      if (response.ok) {
        const data = await response.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch("/api/purchase-orders");
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
    }
  };

  const openPriceManager = async (supplier: Supplier) => {
    setPriceManagerSupplier(supplier);
    setShowPriceManager(true);
    
    // Fetch existing supplier prices
    try {
      const response = await fetch(`/api/supplier-products?supplierId=${supplier.id}`);
      if (response.ok) {
        const data = await response.json();
        const priceMap: { [productId: number]: number } = {};
        data.forEach((sp: any) => {
          priceMap[sp.productId] = sp.price;
        });
        setSupplierProductPrices(priceMap);
      }
    } catch (error) {
      console.error("Failed to fetch supplier prices:", error);
      setSupplierProductPrices({});
    }
  };

  const saveSupplierPrice = async (productId: number, price: number) => {
    if (!priceManagerSupplier) return;

    if (price <= 0) {
      alert("Price must be greater than 0");
      return;
    }

    try {
      const response = await fetch("/api/supplier-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: priceManagerSupplier.id,
          productId: productId,
          price: price,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSupplierProductPrices({ ...supplierProductPrices, [productId]: price });
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || "Unknown error";
        console.error("Failed to save supplier price:", errorMsg);
        alert(`Failed to save supplier price: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Failed to save supplier price:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`An error occurred while saving the price: ${errorMsg}`);
    }
  };

  const resetSupplierForm = () => {
    setSupplierFormData({ name: "", email: "", phone: "", address: "", contactName: "" });
    setShowSupplierForm(false);
    setEditingSupplier(null);
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : "/api/suppliers";
      const method = editingSupplier ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierFormData),
      });

      const data = await response.json();

      if (response.ok) {
        resetSupplierForm();
        await fetchSuppliers();
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || "Unknown error";
        alert(`Failed to ${editingSupplier ? "update" : "add"} supplier: ${errorMsg}`);
      }
    } catch (error) {
      console.error(`Failed to ${editingSupplier ? "update" : "add"} supplier:`, error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;

    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchSuppliers();
      }
    } catch (error) {
      console.error("Failed to delete supplier:", error);
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone || "",
      address: supplier.address || "",
      contactName: supplier.contactName || "",
    });
    setShowSupplierForm(true);
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, { productId: 0, productName: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const fetchSupplierPrices = async (supplierId: number) => {
    try {
      const response = await fetch(`/api/supplier-products?supplierId=${supplierId}`);
      if (response.ok) {
        const data = await response.json();
        const priceMap: { [productId: number]: number } = {};
        data.forEach((sp: any) => {
          priceMap[sp.productId] = sp.price;
        });
        setSupplierPrices(priceMap);
      }
    } catch (error) {
      console.error("Failed to fetch supplier prices:", error);
      setSupplierPrices({});
    }
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    
    // If productId changed, update productName and price from supplier pricing
    if (field === "productId") {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        updated[index].productName = product.name;
        // Use supplier price if available, otherwise require manual entry
        const supplierPrice = selectedSupplier ? supplierPrices[parseInt(value)] : undefined;
        updated[index].unitPrice = supplierPrice || 0;
      }
    }
    
    setOrderItems(updated);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplier) {
      alert("Please select a supplier");
      return;
    }

    if (orderItems.length === 0) {
      alert("Please add at least one item to the order");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier,
          items: orderItems,
          totalAmount: calculateTotal(),
          notes: orderNotes,
          expectedArrivalDate: expectedArrivalDate || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Purchase order created successfully!");
        setOrderItems([]);
        setOrderNotes("");
        setExpectedArrivalDate("");
        setSelectedSupplier(null);
        setSupplierPrices({});
        setShowOrderForm(false);
        await fetchPurchaseOrders();
      } else {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || "Unknown error";
        alert(`Failed to create purchase order: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Failed to create purchase order:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePDF = async (orderId: number) => {
    window.open(`/api/purchase-orders/${orderId}/pdf`, '_blank');
  };

  const handleSendEmail = async (orderId: number, supplierEmail: string) => {
    const pdfUrl = `/api/purchase-orders/${orderId}/pdf`;
    
    // Create mailto link with PDF URL in body
    const subject = encodeURIComponent("Purchase Order");
    const body = encodeURIComponent(`Please find the attached purchase order.\n\nView PDF: ${window.location.origin}${pdfUrl}`);
    const mailtoLink = `mailto:${supplierEmail}?subject=${subject}&body=${body}`;
    
    window.location.href = mailtoLink;
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
                  Supplier Management
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">Manage suppliers and create purchase orders</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => router.push("/inventory")}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-white border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Inventory
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-white border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Dashboard
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6">
            {!showSupplierForm && !showOrderForm && (
              <>
                <button
                  onClick={() => {
                    resetSupplierForm();
                    setShowSupplierForm(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  + Add Supplier
                </button>
                <button
                  onClick={() => {
                    if (suppliers.length === 0) {
                      alert("Please add a supplier first");
                      return;
                    }
                    setShowOrderForm(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all"
                >
                  + Create Purchase Order
                </button>
              </>
            )}
          </div>

          {/* Supplier Form */}
          {showSupplierForm && (
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">
                {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
              </h2>
              <form onSubmit={handleSupplierSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Supplier Name *</label>
                    <input
                      type="text"
                      required
                      value={supplierFormData.name}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                      className={inputClassName}
                      placeholder="Enter supplier name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={supplierFormData.email}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                      className={inputClassName}
                      placeholder="supplier@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={supplierFormData.phone}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                      className={inputClassName}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Name</label>
                    <input
                      type="text"
                      value={supplierFormData.contactName}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, contactName: e.target.value })}
                      className={inputClassName}
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                    className={inputClassName}
                    placeholder="123 Main St, City, State ZIP"
                  />
                </div>
                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? (editingSupplier ? "Updating..." : "Adding...") : editingSupplier ? "Update Supplier" : "Add Supplier"}
                  </button>
                  <button
                    type="button"
                    onClick={resetSupplierForm}
                    className="w-full rounded-lg bg-white border-2 border-gray-300 px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Purchase Order Form */}
          {showOrderForm && (
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">Create Purchase Order</h2>
              <form onSubmit={handleCreateOrder} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Supplier *</label>
                  <select
                    required
                    value={selectedSupplier || ""}
                    onChange={async (e) => {
                      const supplierId = parseInt(e.target.value);
                      setSelectedSupplier(supplierId);
                      if (supplierId) {
                        await fetchSupplierPrices(supplierId);
                      } else {
                        setSupplierPrices({});
                      }
                    }}
                    className={inputClassName}
                  >
                    <option value="">Choose a supplier...</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-gray-700">Order Items *</label>
                    <button
                      type="button"
                      onClick={addOrderItem}
                      className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>
                  {orderItems.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No items added yet. Click "+ Add Item" to start.</p>
                  ) : (
                    <div className="space-y-3">
                      {orderItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="sm:col-span-2">
                            <select
                              required
                              value={item.productId}
                              onChange={(e) => updateOrderItem(index, "productId", e.target.value)}
                              className={inputClassName}
                            >
                              <option value="0">Select product...</option>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              type="number"
                              min="1"
                              required
                              value={item.quantity}
                              onChange={(e) => updateOrderItem(index, "quantity", parseInt(e.target.value))}
                              className={inputClassName}
                              placeholder="Qty"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Supplier Price</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={item.unitPrice || ""}
                              onChange={(e) => updateOrderItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                              className={inputClassName}
                              placeholder="0.00"
                              readOnly={!!(selectedSupplier && supplierPrices[item.productId])}
                              style={selectedSupplier && supplierPrices[item.productId] ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
                            />
                            {selectedSupplier && supplierPrices[item.productId] && (
                              <p className="text-xs text-gray-500 mt-1">From supplier catalog</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700">
                              ${(item.quantity * item.unitPrice).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeOrderItem(index)}
                              className="px-2 py-1 rounded bg-red-100 text-red-700 text-sm hover:bg-red-200 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="text-right pt-2">
                        <span className="text-lg font-bold text-gray-900">
                          Total: ${calculateTotal().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Expected Arrival Date</label>
                    <input
                      type="date"
                      value={expectedArrivalDate}
                      onChange={(e) => setExpectedArrivalDate(e.target.value)}
                      className={inputClassName}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className={inputClassName}
                      rows={3}
                      placeholder="Additional notes for the supplier..."
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || orderItems.length === 0}
                    className="w-full rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 text-white font-semibold shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? "Creating..." : "Create Purchase Order"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOrderForm(false);
                      setOrderItems([]);
                      setOrderNotes("");
                      setExpectedArrivalDate("");
                      setSelectedSupplier(null);
                      setSupplierPrices({});
                    }}
                    className="w-full rounded-lg bg-white border-2 border-gray-300 px-4 py-3 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Suppliers List */}
          {!showSupplierForm && !showOrderForm && (
            <>
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mb-6">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Suppliers ({suppliers.length})</h2>
                </div>
                {suppliers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No suppliers yet. Add your first supplier to get started.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {suppliers.map(supplier => (
                      <div key={supplier.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{supplier.name}</h3>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p><strong>Email:</strong> {supplier.email}</p>
                              {supplier.phone && <p><strong>Phone:</strong> {supplier.phone}</p>}
                              {supplier.contactName && <p><strong>Contact:</strong> {supplier.contactName}</p>}
                              {supplier.address && <p><strong>Address:</strong> {supplier.address}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openPriceManager(supplier)}
                              className="px-3 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors"
                            >
                              Set Prices
                            </button>
                            <button
                              onClick={() => handleEditSupplier(supplier)}
                              className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Purchase Orders List */}
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Purchase Orders ({purchaseOrders.length})</h2>
                </div>
                {purchaseOrders.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No purchase orders yet. Create your first purchase order to get started.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {purchaseOrders.map(order => (
                      <div key={order.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{order.orderNumber}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                order.status === 'sent' ? 'bg-green-100 text-green-700' :
                                order.status === 'received' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p><strong>Supplier:</strong> {order.supplier.name}</p>
                              <p><strong>Total:</strong> ${order.totalAmount.toFixed(2)}</p>
                              <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
                              {order.expectedArrivalDate && (
                                <p><strong>Expected Arrival:</strong> {new Date(order.expectedArrivalDate).toLocaleDateString()}</p>
                              )}
                              {order.notes && <p><strong>Notes:</strong> {order.notes}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => handleGeneratePDF(order.id)}
                              className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition-colors whitespace-nowrap"
                            >
                              View PDF
                            </button>
                            <button
                              onClick={() => handleSendEmail(order.id, order.supplier.email)}
                              className="px-3 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors whitespace-nowrap"
                            >
                              Send Email
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Supplier Price Manager Modal */}
          {showPriceManager && priceManagerSupplier && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Set Prices for {priceManagerSupplier.name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Set the prices this supplier charges for each product
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowPriceManager(false);
                      setPriceManagerSupplier(null);
                      setSupplierProductPrices({});
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>

                {products.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No products available. Add products first.</p>
                ) : (
                  <div className="space-y-3">
                    {products.map(product => (
                      <div
                        key={product.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-500">
                            Your selling price: ${product.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={supplierProductPrices[product.id] || ""}
                              onChange={(e) => {
                                const price = parseFloat(e.target.value) || 0;
                                setSupplierProductPrices({
                                  ...supplierProductPrices,
                                  [product.id]: price,
                                });
                              }}
                              onBlur={(e) => {
                                const price = parseFloat(e.target.value);
                                if (price > 0) {
                                  saveSupplierPrice(product.id, price);
                                }
                              }}
                              className="w-24 px-3 py-2 rounded-lg border-2 border-gray-200 text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                              placeholder="0.00"
                            />
                          </div>
                          {supplierProductPrices[product.id] && (
                            <button
                              onClick={async () => {
                                try {
                                  await fetch(`/api/supplier-products?supplierId=${priceManagerSupplier.id}&productId=${product.id}`, {
                                    method: "DELETE",
                                  });
                                  const newPrices = { ...supplierProductPrices };
                                  delete newPrices[product.id];
                                  setSupplierProductPrices(newPrices);
                                } catch (error) {
                                  console.error("Failed to remove price:", error);
                                }
                              }}
                              className="px-3 py-1 rounded bg-red-100 text-red-700 text-sm hover:bg-red-200 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowPriceManager(false);
                      setPriceManagerSupplier(null);
                      setSupplierProductPrices({});
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

