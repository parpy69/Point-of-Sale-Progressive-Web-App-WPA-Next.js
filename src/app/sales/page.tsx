"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
}

interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

const inputClassName = "block w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-black placeholder-gray-400 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-gray-50 hover:bg-white";

export default function SalesPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cardDetails, setCardDetails] = useState({ cardNumber: "", expiry: "", cvv: "", name: "" });
  const [giftCardNumber, setGiftCardNumber] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string; cardNumber?: string; loyaltyPoints: number } | null>(null);
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const giftCardBarcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      router.push("/");
      return;
    }
    fetchProducts();
    fetchSettings();
    // Focus barcode input for scanning
    barcodeInputRef.current?.focus();
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

  const searchCustomers = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setCustomerSearchResults([]);
      return;
    }

    try {
      // Try searching by card number first
      if (/^\d+$/.test(searchTerm.trim())) {
        const response = await fetch(`/api/customers?cardNumber=${encodeURIComponent(searchTerm.trim())}`);
        if (response.ok) {
          const customer = await response.json();
          if (customer) {
            setCustomerSearchResults([customer]);
            return;
          }
        }
      }

      // Search by name
      const response = await fetch(`/api/customers?search=${encodeURIComponent(searchTerm.trim())}`);
      if (response.ok) {
        const customers = await response.json();
        setCustomerSearchResults(Array.isArray(customers) ? customers : []);
      }
    } catch (error) {
      console.error("Failed to search customers:", error);
      setCustomerSearchResults([]);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customerSearch) {
        searchCustomers(customerSearch);
      } else {
        setCustomerSearchResults([]);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [customerSearch]);

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query)
    );
  });

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      alert(`${product.name} is out of stock`);
      return;
    }

    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.quantity) {
        alert(`Only ${product.quantity} available in stock`);
        return;
      }
      setCart(cart.map(item =>
        item.productId === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.price
            }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        subtotal: product.price
      }]);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      setBarcodeInput("");
    } else {
      alert("Product not found with this barcode");
      setBarcodeInput("");
    }
  };

  const updateCartItemQuantity = (productId: number, change: number) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > product.quantity) {
      alert(`Only ${product.quantity} available in stock`);
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * item.price
          }
        : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === "percent") {
      return (subtotal * discount) / 100;
    }
    return Math.min(discount, subtotal);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscountAmount();
  };

  const processPayment = async () => {
    const total = calculateTotal();
    
    // Validate payment method specific requirements
    if (paymentMethod === "Card") {
      if (!cardDetails.cardNumber || !cardDetails.expiry || !cardDetails.cvv || !cardDetails.name) {
        alert("Please enter all card details");
        return;
      }
      
      // Validate card number format (basic check)
      const cardNumber = cardDetails.cardNumber.replace(/\s/g, '');
      if (cardNumber.length < 13 || cardNumber.length > 19) {
        alert("Please enter a valid card number");
        return;
      }
      
      // ⚠️ DEMO MODE: In production, this should call a secure payment processor API
      // NEVER send card data to your own server - use payment processor's secure APIs
      console.warn("⚠️ DEMO MODE: Card payment is simulated. In production, integrate with Stripe/Square/etc.");
      
      // Simulate card processing
      setProcessingPayment(true);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
      setProcessingPayment(false);
    } else if (paymentMethod === "Cash") {
      if (!cashReceived || cashReceived.trim() === "") {
        alert("Please enter the cash amount received");
        return;
      }
      const received = parseFloat(cashReceived);
      if (isNaN(received) || received < total) {
        alert(`Cash received must be at least $${total.toFixed(2)}`);
        return;
      }
    } else if (paymentMethod === "Gift Card") {
      if (!giftCardNumber || giftCardNumber.trim() === "") {
        alert("Please enter or scan gift card number");
        return;
      }
      // Simulate gift card validation
      setProcessingPayment(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingPayment(false);
    } else if (paymentMethod === "Loyalty Points") {
      if (!selectedCustomer) {
        alert("Please search and select a customer");
        return;
      }
      if (selectedCustomer.loyaltyPoints < total) {
        alert(`Insufficient loyalty points. Customer has ${selectedCustomer.loyaltyPoints.toFixed(0)} points, but needs ${total.toFixed(0)} points.`);
        return;
      }
      // Simulate points redemption
      setProcessingPayment(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingPayment(false);
    } else if (paymentMethod === "PayPal") {
      // Simulate PayPal processing
      setProcessingPayment(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProcessingPayment(false);
    }

    // Process the sale
    await completeSale();
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    try {
      const total = calculateTotal();
      let customerInfo: any = null;

      // If loyalty points payment, use selected customer
      if (paymentMethod === "Loyalty Points" && selectedCustomer) {
        customerInfo = {
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          customerCardNumber: selectedCustomer.cardNumber || null
        };
      } else if (settings?.loyaltyPointsEnabled && selectedCustomer) {
        // If loyalty points are enabled and customer is selected, award points for any payment method
        customerInfo = {
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          customerCardNumber: selectedCustomer.cardNumber || null
        };
      }
      // For cash (and other payment methods), if no customer is selected or loyalty points are disabled, customerInfo remains null

      // Process each sale
      for (const item of cart) {
        const saleData: any = {
          productId: item.productId,
          quantity: item.quantity,
        };

        // Add customer info and total amount for loyalty points calculation
        if (customerInfo) {
          saleData.customerId = customerInfo.customerId;
          saleData.customerName = customerInfo.customerName;
          saleData.customerCardNumber = customerInfo.customerCardNumber;
          saleData.totalAmount = total; // Total for the entire cart
        }

        const response = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saleData),
        });

        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Non-JSON response from sales API:", text);
          throw new Error(`Server error: ${response.status} ${response.statusText}. Check console for details.`);
        }

        if (!response.ok) {
          const data = await response.json();
          const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error || "Failed to process sale";
          throw new Error(errorMsg);
        }
        
        // Success - parse response
        await response.json();
      }

      // If using loyalty points, deduct points from customer
      if (paymentMethod === "Loyalty Points" && selectedCustomer) {
        const response = await fetch(`/api/customers/${selectedCustomer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loyaltyPoints: selectedCustomer.loyaltyPoints - total
          }),
        });

        if (!response.ok) {
          console.error("Failed to update customer points");
        }
      }

      // Clear cart and reset
      setCart([]);
      setDiscount(0);
      setPaymentMethod("");
      setCardDetails({ cardNumber: "", expiry: "", cvv: "", name: "" });
      setGiftCardNumber("");
      setLoyaltyPoints("");
      setCashReceived("");
      setCustomerSearch("");
      setSelectedCustomer(null);
      setCustomerSearchResults([]);
      setShowCheckout(false);
      await fetchProducts();
      
      alert("Sale completed successfully!");
    } catch (error) {
      console.error("Checkout error:", error);
      alert(`Checkout failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setProcessingPayment(false);
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
                  Point of Sale
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">Cashier Screen</p>
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-white border-2 border-gray-200 text-gray-700 text-sm sm:text-base font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Dashboard
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Products */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search and Barcode */}
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Search Products</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={inputClassName}
                      placeholder="Search by name or barcode..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Scan Barcode</label>
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => {
                        setBarcodeInput(e.target.value);
                        if (e.target.value.length > 0) {
                          handleBarcodeScan(e.target.value);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && barcodeInput) {
                          handleBarcodeScan(barcodeInput);
                        }
                      }}
                      className={inputClassName}
                      placeholder="Scan or type barcode..."
                    />
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Products</h2>
                {filteredProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No products found</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        disabled={product.quantity <= 0}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          product.quantity <= 0
                            ? "border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed"
                            : "border-gray-200 bg-white hover:border-blue-500 hover:shadow-md active:scale-95"
                        }`}
                      >
                        <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{product.name}</h3>
                        <p className="text-lg font-bold text-blue-600 mb-1">${product.price.toFixed(2)}</p>
                        <p className={`text-xs ${
                          product.quantity <= 0 ? "text-red-600" :
                          product.quantity < 5 ? "text-orange-600" : "text-green-600"
                        }`}>
                          Stock: {product.quantity}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Cart */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 sm:p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Cart</h2>
                
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Cart is empty</p>
                ) : (
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.productId} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm">{item.productName}</h3>
                            <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="text-red-600 hover:text-red-700 text-lg font-bold"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateCartItemQuantity(item.productId, -1)}
                              className="w-8 h-8 rounded bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors"
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <button
                              onClick={() => updateCartItemQuantity(item.productId, 1)}
                              className="w-8 h-8 rounded bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <p className="font-bold text-gray-900">${item.subtotal.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Discount Section */}
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Discount</label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() => {
                        setDiscountType("percent");
                        setDiscount(0);
                      }}
                      className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                        discountType === "percent"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      onClick={() => {
                        setDiscountType("amount");
                        setDiscount(0);
                      }}
                      className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                        discountType === "amount"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Fixed Amount ($)
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={discountType === "percent" ? 100 : undefined}
                      step={discountType === "percent" ? "0.01" : "0.01"}
                      value={discount || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setDiscount(0);
                        } else {
                          const num = parseFloat(val);
                          if (!isNaN(num) && num >= 0) {
                            setDiscount(num);
                          }
                        }
                      }}
                      className={inputClassName}
                      placeholder={discountType === "percent" ? "Enter % (e.g., 10 for 10%)" : "Enter amount (e.g., 5.00)"}
                    />
                    {discountType === "percent" && discount > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {discount}% off = ${((calculateSubtotal() * discount) / 100).toFixed(2)} discount
                      </p>
                    )}
                    {discountType === "amount" && discount > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        ${discount.toFixed(2)} discount applied
                      </p>
                    )}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t-2 border-gray-300 pt-4 space-y-2 mb-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold text-gray-900">${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  {calculateDiscountAmount() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-semibold text-red-600">-${calculateDiscountAmount().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t-2 border-gray-300 pt-3 mt-2">
                    <span className="text-2xl font-extrabold text-gray-900">TOTAL:</span>
                    <span className="text-3xl font-extrabold text-blue-600">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setCart([]);
                      setDiscount(0);
                    }}
                    disabled={cart.length === 0}
                    className="w-full px-4 py-3 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear Cart
                  </button>
                  <button
                    onClick={() => setShowCheckout(true)}
                    disabled={cart.length === 0}
                    className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    Checkout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Checkout</h2>
            
            <div className="mb-6">
              <p className="text-lg font-bold text-gray-900 mb-2">Total: ${calculateTotal().toFixed(2)}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Payment Method *</label>
              <div className="space-y-2">
                {["Cash", "Card", "PayPal", "Gift Card", "Loyalty Points"].map(method => (
                  <button
                    key={method}
                    onClick={() => {
                      setPaymentMethod(method);
                      // Reset payment-specific fields when changing method
                      setCardDetails({ cardNumber: "", expiry: "", cvv: "", name: "" });
                      setGiftCardNumber("");
                      setLoyaltyPoints("");
                      setCashReceived("");
                      setCustomerSearch("");
                      setSelectedCustomer(null);
                      setCustomerSearchResults([]);
                      // Auto-focus barcode input for gift cards
                      if (method === "Gift Card") {
                        setTimeout(() => {
                          if (giftCardBarcodeRef.current) {
                            giftCardBarcodeRef.current.focus();
                          }
                        }, 100);
                      }
                    }}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      paymentMethod === method
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="font-semibold text-gray-900">{method}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Specific Fields */}
            {paymentMethod === "Card" && (
              <div className="mb-6 space-y-4">
                <div className="p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg mb-4">
                  <p className="text-xs font-semibold text-yellow-800">
                    ⚠️ DEMO MODE: This is a simulation. For production, integrate with a secure payment processor (Stripe, Square, PayPal, etc.) to handle card payments securely.
                  </p>
                </div>
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Card Number *</label>
                    <input
                      type="text"
                      maxLength={19}
                      value={cardDetails.cardNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                        const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                        setCardDetails({ ...cardDetails, cardNumber: formatted });
                      }}
                      className={inputClassName}
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cardholder Name *</label>
                    <input
                      type="text"
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                      className={inputClassName}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry *</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={cardDetails.expiry}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 2) {
                            value = value.slice(0, 2) + '/' + value.slice(2, 4);
                          }
                          setCardDetails({ ...cardDetails, expiry: value });
                        }}
                        className={inputClassName}
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">CVV *</label>
                      <input
                        type="text"
                        maxLength={4}
                        value={cardDetails.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setCardDetails({ ...cardDetails, cvv: value });
                        }}
                        className={inputClassName}
                        placeholder="123"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "Cash" && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cash Received *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={cashReceived}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Allow only numbers and decimal point
                    value = value.replace(/[^0-9.]/g, '');
                    // Prevent multiple decimal points
                    const parts = value.split('.');
                    if (parts.length > 2) {
                      value = parts[0] + '.' + parts.slice(1).join('');
                    }
                    setCashReceived(value);
                  }}
                  onBlur={(e) => {
                    const numValue = parseFloat(e.target.value);
                    const total = calculateTotal();
                    if (isNaN(numValue) || numValue < total) {
                      // Don't auto-correct, just leave it for user to fix
                    }
                  }}
                  className={inputClassName}
                  placeholder={`Enter amount (min $${calculateTotal().toFixed(2)})`}
                />
                {cashReceived && !isNaN(parseFloat(cashReceived)) && parseFloat(cashReceived) >= calculateTotal() && (
                  <p className="text-sm text-green-600 mt-2 font-semibold">
                    Change: ${(parseFloat(cashReceived) - calculateTotal()).toFixed(2)}
                  </p>
                )}
                {cashReceived && !isNaN(parseFloat(cashReceived)) && parseFloat(cashReceived) < calculateTotal() && (
                  <p className="text-sm text-red-600 mt-2 font-semibold">
                    Insufficient amount. Need at least ${calculateTotal().toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {paymentMethod === "Gift Card" && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gift Card Number *</label>
                  <input
                    type="text"
                    value={giftCardNumber}
                    onChange={(e) => setGiftCardNumber(e.target.value)}
                    className={inputClassName}
                    placeholder="Enter gift card number"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-gray-50 px-2 text-gray-500">Or</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Scan Barcode</label>
                  <input
                    ref={giftCardBarcodeRef}
                    type="text"
                    value={giftCardNumber}
                    onChange={(e) => setGiftCardNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && giftCardNumber.trim()) {
                        // Barcode scanned - focus stays in field for next scan
                        e.preventDefault();
                        // Optionally clear after a short delay for next scan
                        setTimeout(() => {
                          setGiftCardNumber("");
                          if (giftCardBarcodeRef.current) {
                            giftCardBarcodeRef.current.focus();
                          }
                        }, 100);
                      }
                    }}
                    className={inputClassName}
                    placeholder="Scan gift card barcode..."
                    autoFocus={paymentMethod === "Gift Card"}
                  />
                  <p className="text-xs text-gray-500 mt-1">Scan barcode or enter manually</p>
                </div>
              </div>
            )}

            {paymentMethod === "Loyalty Points" && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
                {!settings?.loyaltyPointsEnabled && (
                  <div className="p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                    <p className="text-xs font-semibold text-yellow-800">
                      ⚠️ Loyalty Points feature is disabled. Enable it in Settings to use this payment method.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Search Customer (Name or Card Number) *
                  </label>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      if (!e.target.value) {
                        setSelectedCustomer(null);
                        setCustomerSearchResults([]);
                      }
                    }}
                    className={inputClassName}
                    placeholder="Type customer name or scan card number..."
                  />
                  {customerSearchResults.length > 0 && !selectedCustomer && (
                    <div className="mt-2 border border-gray-200 rounded-lg bg-white max-h-40 overflow-y-auto">
                      {customerSearchResults.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerSearch(customer.name);
                            setCustomerSearchResults([]);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-semibold text-gray-900">{customer.name}</div>
                          {customer.cardNumber && (
                            <div className="text-xs text-gray-500">Card: {customer.cardNumber}</div>
                          )}
                          <div className="text-xs text-blue-600 font-semibold">
                            Points: {customer.loyaltyPoints.toFixed(0)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedCustomer && (
                  <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">{selectedCustomer.name}</span>
                      <button
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearch("");
                        }}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Clear
                      </button>
                    </div>
                    {selectedCustomer.cardNumber && (
                      <p className="text-xs text-gray-600 mb-1">Card: {selectedCustomer.cardNumber}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-700">Available Points:</span>
                      <span className={`text-lg font-bold ${
                        selectedCustomer.loyaltyPoints >= calculateTotal() 
                          ? "text-green-600" 
                          : "text-red-600"
                      }`}>
                        {selectedCustomer.loyaltyPoints.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-gray-700">Points Needed:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {calculateTotal().toFixed(0)}
                      </span>
                    </div>
                    {selectedCustomer.loyaltyPoints < calculateTotal() && (
                      <p className="text-xs text-red-600 mt-2 font-semibold">
                        Insufficient points! Customer needs {calculateTotal().toFixed(0)} points.
                      </p>
                    )}
                    {selectedCustomer.loyaltyPoints >= calculateTotal() && (
                      <p className="text-xs text-green-600 mt-2 font-semibold">
                        Points after payment: {(selectedCustomer.loyaltyPoints - calculateTotal()).toFixed(0)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "PayPal" && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <p className="text-sm text-blue-800">
                  Click "Process Payment" to redirect to PayPal or process payment.
                </p>
              </div>
            )}

            {processingPayment && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-sm font-semibold text-blue-800">Processing payment...</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCheckout(false);
                  setPaymentMethod("");
                  setCardDetails({ cardNumber: "", expiry: "", cvv: "", name: "" });
                  setGiftCardNumber("");
                  setLoyaltyPoints("");
                  setCashReceived("");
                  setCustomerSearch("");
                  setSelectedCustomer(null);
                  setCustomerSearchResults([]);
                  setProcessingPayment(false);
                }}
                disabled={processingPayment}
                className="flex-1 px-4 py-3 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                disabled={!paymentMethod || processingPayment}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingPayment ? "Processing..." : "Process Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

