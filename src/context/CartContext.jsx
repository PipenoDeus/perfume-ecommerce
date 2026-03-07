import React, { createContext, useEffect, useState } from 'react';

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

  const addToCart = (perfume, quantity = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === perfume.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === perfume.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevCart, { ...perfume, quantity }];
    });
  };

  const removeFromCart = (perfumeId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== perfumeId));
  };

  const updateQuantity = (perfumeId, quantity) => {
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
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      // Ignore localStorage errors
    }
  }, [cart]);

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
