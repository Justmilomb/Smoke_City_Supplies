import React from "react";

export type CartItem = {
  productId: string;
  productName: string;
  priceEach: number;
  quantity: number;
  image?: string;
  maxStock?: number;
};

type CartState = {
  items: CartItem[];
};

type CartActions = {
  add: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  remove: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number, maxStock?: number) => void;
  clear: () => void;
};

const CART_KEY = "smoke-city-supplies-cart";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

const CartContext = React.createContext<
  { state: CartState; actions: CartActions } | undefined
>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>(loadCart);

  React.useEffect(() => {
    saveCart(items);
  }, [items]);

  const add = React.useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      const qty = item.quantity ?? 1;
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        if (existing) {
          return prev.map((i) => {
            if (i.productId !== item.productId) return i;
            const cap = item.maxStock;
            const newQty = cap != null ? Math.min(i.quantity + qty, cap) : i.quantity + qty;
            return { ...i, quantity: newQty, maxStock: item.maxStock };
          });
        }
        const cap = item.maxStock;
        const cappedQty = cap != null ? Math.min(qty, cap) : qty;
        return [...prev, { ...item, quantity: cappedQty }];
      });
    },
    []
  );

  const remove = React.useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = React.useCallback((productId: string, quantity: number, maxStock?: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    const capped = maxStock != null ? Math.min(quantity, maxStock) : quantity;
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: capped } : i))
    );
  }, []);

  const clear = React.useCallback(() => setItems([]), []);

  const value = React.useMemo(
    () => ({
      state: { items },
      actions: { add, remove, updateQuantity, clear },
    }),
    [items, add, remove, updateQuantity, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function useCartCount(): number {
  const { state } = useCart();
  return state.items.reduce((sum, i) => sum + i.quantity, 0);
}
