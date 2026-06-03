import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const storedCart = localStorage.getItem('cart');
      return storedCart ? JSON.parse(storedCart) : [];
    } catch (error) {
      return [];
    }
  });

  const addToCart = useCallback((perfume, quantity = 1) => {
    const stock = Number(perfume.stock || 0);
    if (stock <= 0) return;
    const safeQuantity = Math.min(Math.max(1, Number(quantity) || 1), stock);

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === perfume.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === perfume.id
            ? { ...item, quantity: Math.min(item.quantity + safeQuantity, stock) }
            : item
        );
      }
      return [...prevCart, { ...perfume, quantity: safeQuantity }];
    });
  }, []);

  const removeFromCart = useCallback((perfumeId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== perfumeId));
  }, []);

  const updateQuantity = useCallback((perfumeId, quantity) => {
    const safeQuantity = Math.max(1, Number(quantity) || 1);
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === perfumeId
          ? {
              ...item,
              quantity: item.stock
                ? Math.min(safeQuantity, item.stock)
                : safeQuantity,
            }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const getTotalPrice = useCallback(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      // Ignore localStorage errors
    }
  }, [cart]);

  const value = useMemo(() => ({
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
  }), [cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotalPrice]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
