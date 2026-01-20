import React, { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { LanguageContext } from '../context/LanguageContext';
import './Cart.css';

const Cart = () => {
  const { t } = useContext(LanguageContext);
  const { cart, removeFromCart, updateQuantity, getTotalPrice } = useContext(CartContext);

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <h2>{t('cart.carritoVacio')}</h2>
        <p>{t('cart.agregarPerfumes')}</p>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>{t('cart.titulo')}</h1>
      <div className="cart-container">
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="cart-item">
              <img src={item.image_url || 'https://via.placeholder.com/100'} alt={item.name} />
              <div className="item-details">
                <h3>{item.name}</h3>
                <p className="item-brand">{item.brand}</p>
                <p className="item-price">${item.price}</p>
              </div>
              <div className="item-actions">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                  className="quantity-input"
                />
                <span className="subtotal">${(item.price * item.quantity).toFixed(2)}</span>
                <button
                  className="remove-btn"
                  onClick={() => removeFromCart(item.id)}
                >
                  {t('cart.eliminar')}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-summary">
          <h2>{t('cart.resumenOrder')}</h2>
          <div className="summary-row">
            <span>{t('cart.subtotal')}</span>
            <span>${getTotalPrice().toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>{t('cart.envio')}:</span>
            <span>$10.00</span>
          </div>
          <div className="summary-row">
            <span>{t('cart.impuesto')}:</span>
            <span>${(getTotalPrice() * 0.1).toFixed(2)}</span>
          </div>
          <div className="summary-total">
            <span>{t('cart.total')}:</span>
            <span>${(getTotalPrice() + 10 + getTotalPrice() * 0.1).toFixed(2)}</span>
          </div>
          <button className="checkout-btn">{t('cart.procesarCompra')}</button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
