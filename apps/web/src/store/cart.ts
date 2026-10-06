"use client";

import { create } from "zustand";
import type { CartDTO } from "@es/shared";
import { ApiRequestError, addCartItem, createCart, getCart, removeCartItem, updateCartItem } from "@/lib/api";

const KEY = "es-cart-id";

interface CartState {
  cart: CartDTO | null;
  cartId: string | null;
  loading: boolean;
  isOpen: boolean;
  lastAdded: { name: string; image: string | null } | null;
  init: () => Promise<void>;
  ensureCart: () => Promise<string>;
  refresh: () => Promise<void>;
  add: (variantId: string, quantity: number, meta?: { name: string; image: string | null }) => Promise<void>;
  update: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  open: () => void;
  close: () => void;
  reset: () => void;
}

function readId() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
function writeId(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

let initPromise: Promise<void> | null = null;

export const useCart = create<CartState>()((set, get) => ({
  cart: null,
  cartId: null,
  loading: false,
  isOpen: false,
  lastAdded: null,

  init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const id = readId();
      if (id) {
        try {
          const r = await getCart(id);
          set({ cart: r.cart, cartId: id });
          return;
        } catch (e) {
          if (!(e instanceof ApiRequestError && e.status === 404)) {
            set({ cartId: id });
            return;
          }
        }
      }
      // 沒有或失效 → 延後到需要時建立
      set({ cartId: null, cart: null });
    })().finally(() => {
      initPromise = null;
    });
    return initPromise;
  },

  async ensureCart() {
    const cur = get().cartId;
    if (cur) return cur;
    const r = await createCart();
    writeId(r.cart.id);
    set({ cartId: r.cart.id, cart: r.cart });
    return r.cart.id;
  },

  async refresh() {
    const id = get().cartId;
    if (!id) return;
    try {
      const r = await getCart(id);
      set({ cart: r.cart });
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 404) {
        writeId(null);
        set({ cartId: null, cart: null });
      }
    }
  },

  async add(variantId, quantity, meta) {
    set({ loading: true });
    try {
      const id = await get().ensureCart();
      const r = await addCartItem(id, variantId, quantity);
      set({ cart: r.cart, lastAdded: meta ?? null, isOpen: true });
    } finally {
      set({ loading: false });
    }
  },

  async update(itemId, quantity) {
    const id = get().cartId;
    if (!id) return;
    const prev = get().cart;
    if (prev) {
      // 樂觀更新
      const items = prev.items.map((i) => (i.id === itemId ? { ...i, quantity, lineTotal: i.variant.price * quantity } : i)).filter((i) => i.quantity > 0);
      const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
      set({ cart: { ...prev, items, subtotal, itemCount: items.reduce((s, i) => s + i.quantity, 0), amountToFreeShipping: Math.max(0, prev.freeShippingThreshold - subtotal) } });
    }
    try {
      const r = await updateCartItem(id, itemId, quantity);
      set({ cart: r.cart });
    } catch (e) {
      set({ cart: prev });
      throw e;
    }
  },

  async remove(itemId) {
    const id = get().cartId;
    if (!id) return;
    const r = await removeCartItem(id, itemId);
    set({ cart: r.cart });
  },

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  reset() {
    writeId(null);
    set({ cart: null, cartId: null, isOpen: false, lastAdded: null });
  },
}));
