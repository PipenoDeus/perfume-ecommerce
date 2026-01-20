import React, { createContext, useState } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

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
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === perfumeId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

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
