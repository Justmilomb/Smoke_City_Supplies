import React from "react";

export type CartItem = {
  productId: string;
  productName: string;
  priceEach: number;
  quantity: number;
  image?: string;
  stockQuantity?: number; // max available stock at time of adding
};

type CartState = {
  items: CartItem[];
};

type CartActions = {
  add: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  remove: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
    (item: Omit<CartItem, "quantity"> & { quantity?: number }): boolean => {
      const qty = item.quantity ?? 1;
      let added = false;
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === item.productId);
        const maxStock = item.stockQuantity ?? Infinity;
        if (existing) {
          const newQty = existing.quantity + qty;
          if (newQty > maxStock) {
            return prev; // can't add more
          }
          added = true;
          return prev.map((i) =>
            i.productId === item.productId
              ? { ...i, quantity: newQty, stockQuantity: item.stockQuantity ?? i.stockQuantity }
              : i
          );
        }
        if (qty > maxStock) {
          return prev; // can't add more than available
        }
        added = true;
        return [...prev, { ...item, quantity: qty }];
      });
      return added;
    },
    []
  );

  const remove = React.useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = React.useCallback((productId: string, quantity: number): boolean => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return true;
    }
    let updated = false;
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          const maxStock = i.stockQuantity ?? Infinity;
          if (quantity > maxStock) {
            return i; // can't exceed stock
          }
          updated = true;
          return { ...i, quantity };
        }
        return i;
      })
    );
    return updated;
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

export function useCartItemQuantity(productId: string): number {
  const { state } = useCart();
  const item = state.items.find((i) => i.productId === productId);
  return item?.quantity ?? 0;
}
