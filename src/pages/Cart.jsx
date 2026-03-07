import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { orderService, paymentService } from '../services/paymentService';
import './Cart.css';

const Cart = () => {
  const { t } = useContext(LanguageContext);
  const { user } = useContext(AuthContext);
  const { cart, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useContext(CartContext);
  const [shippingAddress, setShippingAddress] = useState({ address: '', city: '' });
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState('');
  const [paymentInfo, setPaymentInfo] = useState(null);

  const formatCLP = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const shippingCost = 0;
  const subtotal = getTotalPrice();
  const totalAmount = subtotal + shippingCost;

  const handleCheckout = async () => {
    if (!user) {
      setCheckoutError(t('cart.iniciaSesionParaComprar'));
      return;
    }

    if (!shippingAddress.address.trim() || !shippingAddress.city.trim()) {
      setCheckoutError(t('cart.completarDatosEnvio'));
      return;
    }

    setIsSubmitting(true);
    setCheckoutError('');
    setCheckoutSuccess('');
    setPaymentInfo(null);

    try {
      const items = cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        brand: item.brand,
        image_url: item.image_url,
      }));

      const order = await orderService.createOrder(items, shippingAddress);
      if (!order?.id) {
        throw new Error('Missing order ID');
      }

      const session = await paymentService.createPaymentSession(order.id, paymentMethod);
      setPaymentInfo(session);

      if (paymentMethod === 'paypal' && session?.approvalUrl) {
        window.location.href = session.approvalUrl;
        return;
      }

      setCheckoutSuccess(t('cart.ordenCreada'));
      clearCart();
      setShippingAddress({ address: '', city: '' });
    } catch (error) {
      setCheckoutError(error.message || t('cart.errorCheckout'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        {checkoutSuccess ? (
          <>
            <h2>{checkoutSuccess}</h2>
            {paymentInfo && (
              <div className="payment-details">
                <p>{t('cart.pagoReferencia')}: {paymentInfo.reference || paymentInfo.sessionId}</p>
                {paymentInfo.bankName && (
                  <p>{t('cart.banco')}: {paymentInfo.bankName}</p>
                )}
              </div>
            )}
            <p>
              <Link to="/profile">{t('nav.perfil')}</Link>
            </p>
          </>
        ) : (
          <>
            <h2>{t('cart.carritoVacio')}</h2>
            <p>{t('cart.agregarPerfumes')}</p>
          </>
        )}
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
                <p className="item-price">{formatCLP(item.price)}</p>
              </div>
              <div className="item-actions">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.id, e.target.value)}
                  className="quantity-input"
                />
                <span className="subtotal">{formatCLP(item.price * item.quantity)}</span>
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
            <span>{formatCLP(subtotal)}</span>
          </div>
          <div className="summary-total">
            <span>{t('cart.total')}:</span>
            <span>{formatCLP(totalAmount)}</span>
          </div>
          <div className="checkout-form">
            <h3>{t('cart.datosEnvio')}</h3>
            <div className="form-group">
              <label htmlFor="address">{t('cart.direccion')}</label>
              <input
                id="address"
                type="text"
                value={shippingAddress.address}
                onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                placeholder={t('cart.direccionPlaceholder')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="city">{t('cart.ciudad')}</label>
              <input
                id="city"
                type="text"
                value={shippingAddress.city}
                onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                placeholder={t('cart.ciudadPlaceholder')}
              />
            </div>
            <div className="form-group">
              <label>{t('cart.metodoPago')}</label>
              <div className="payment-options">
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paypal"
                    checked={paymentMethod === 'paypal'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  {t('cart.metodoPaypal')}
                </label>
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  {t('cart.metodoBanco')}
                </label>
              </div>
            </div>
            {checkoutError && <p className="checkout-message error">{checkoutError}</p>}
            {checkoutSuccess && <p className="checkout-message success">{checkoutSuccess}</p>}
            {paymentInfo && (
              <div className="payment-details">
                <p>{t('cart.pagoReferencia')}: {paymentInfo.reference || paymentInfo.sessionId}</p>
                {paymentInfo.bankName && (
                  <p>{t('cart.banco')}: {paymentInfo.bankName}</p>
                )}
              </div>
            )}
            {!user && (
              <p className="checkout-message info">
                {t('cart.iniciaSesionParaComprar')} <Link to="/login">{t('nav.iniciarSesion')}</Link>
              </p>
            )}
            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={isSubmitting || !user}
            >
              {isSubmitting ? t('cart.procesando') : t('cart.procesarCompra')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
