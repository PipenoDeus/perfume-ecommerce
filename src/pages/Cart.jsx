import React, { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { orderService, paymentService } from '../services/paymentService';
import './Cart.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

const Cart = () => {
  const { t } = useContext(LanguageContext);
  const { user } = useContext(AuthContext);
  const { cart, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useContext(CartContext);
  const [shippingAddress, setShippingAddress] = useState({
    address: '',
    regionId: '',
    communeId: '',
    city: '',
    region: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('flow');
  const [regions, setRegions] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCommunes, setLoadingCommunes] = useState(false);

  useEffect(() => {
    if (!user) {
      setShippingAddress({
        address: '',
        regionId: '',
        communeId: '',
        city: '',
        region: '',
      });
      return;
    }

    setShippingAddress((prev) => ({
      address: prev.address || user?.user_metadata?.address || '',
      city: prev.city || user?.user_metadata?.city || '',
      region: prev.region || user?.user_metadata?.region || '',
      regionId: prev.regionId || '',
      communeId: prev.communeId || '',
    }));
  }, [user, user?.user_metadata?.address, user?.user_metadata?.city, user?.user_metadata?.region]);

  useEffect(() => {
    let isMounted = true;

    const loadRegions = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/regions`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Error loading regions: ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          setRegions(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setRegions([]);
        }
      } finally {
        if (isMounted) {
          setLoadingRegions(false);
        }
      }
    };

    loadRegions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!regions.length || shippingAddress.regionId || !shippingAddress.region) {
      return;
    }

    const matchedRegion = regions.find((region) => region.name === shippingAddress.region);
    if (matchedRegion) {
      setShippingAddress((prev) => ({
        ...prev,
        regionId: String(matchedRegion.id),
      }));
    }
  }, [regions, shippingAddress.region, shippingAddress.regionId]);

  useEffect(() => {
    let isMounted = true;

    const loadCommunes = async () => {
      if (!shippingAddress.regionId) {
        setCommunes([]);
        return;
      }

      setLoadingCommunes(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/regions/${encodeURIComponent(shippingAddress.regionId)}/communes`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error(`Error loading communes: ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          setCommunes(Array.isArray(data) ? data : []);
        }
      } catch {
        if (isMounted) {
          setCommunes([]);
        }
      } finally {
        if (isMounted) {
          setLoadingCommunes(false);
        }
      }
    };

    loadCommunes();

    return () => {
      isMounted = false;
    };
  }, [shippingAddress.regionId]);

  useEffect(() => {
    if (!communes.length || shippingAddress.communeId || !shippingAddress.city) {
      return;
    }

    const matchedCommune = communes.find((commune) => commune.name === shippingAddress.city);
    if (matchedCommune) {
      setShippingAddress((prev) => ({
        ...prev,
        communeId: String(matchedCommune.id),
      }));
    }
  }, [communes, shippingAddress.city, shippingAddress.communeId]);
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
      const loginMessage = t('cart.iniciaSesionParaComprar');
      setCheckoutError(loginMessage);
      window.alert(loginMessage);
      return;
    }

    if (!shippingAddress.address.trim() || !shippingAddress.regionId || !shippingAddress.communeId) {
      setCheckoutError(t('cart.completarDatosEnvio'));
      return;
    }

    setIsSubmitting(true);
    setCheckoutError('');
    setCheckoutSuccess('');
    setPaymentInfo(null);

    try {
      const selectedRegion = regions.find((region) => region.id === Number(shippingAddress.regionId));
      const selectedCommune = communes.find((commune) => commune.id === Number(shippingAddress.communeId));

      if (!selectedRegion || !selectedCommune) {
        throw new Error('Selecciona una región y comuna válidas');
      }

      const items = cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        brand: item.brand,
        image_url: item.image_url,
      }));

      const nextShippingAddress = {
        address: shippingAddress.address.trim(),
        region: selectedRegion.name,
        city: selectedCommune.name,
      };

      const order = await orderService.createOrder(items, nextShippingAddress);
      if (!order?.id) {
        throw new Error('Missing order ID');
      }

      // Limpiar carrito después de crear orden exitosamente
      clearCart();
      setShippingAddress({
        address: '',
        regionId: '',
        communeId: '',
        city: '',
        region: '',
      });

      // ===== PAYPAL =====
      if (paymentMethod === 'paypal') {
        const session = await paymentService.createPaymentSession(order.id, 'paypal');
        if (session?.approvalUrl) {
          window.location.href = session.approvalUrl;
          return;
        }
        throw new Error('No se recibió URL de aprobación de PayPal');
      }

      // ===== FLOW =====
      if (paymentMethod === 'flow') {
        const session = await paymentService.createPaymentSession(order.id, 'flow');
        if (session?.approvalUrl) {
          window.location.href = session.approvalUrl;
          return;
        }
        throw new Error('No se recibió URL de pago de Flow');
      }

      // ===== BANCO U OTROS =====
      const session = await paymentService.createPaymentSession(order.id, paymentMethod);
      setPaymentInfo(session);
      setCheckoutSuccess(t('cart.ordenCreada'));

    } catch (error) {
      console.error('[Cart] handleCheckout error:', error);
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
              <label htmlFor="regionId">{t('cart.region')}</label>
              <select
                id="regionId"
                value={shippingAddress.regionId}
                onChange={(e) => setShippingAddress((prev) => ({
                  ...prev,
                  regionId: e.target.value,
                  communeId: '',
                  city: '',
                  region: '',
                }))}
                disabled={loadingRegions}
              >
                <option value="">{loadingRegions ? 'Cargando regiones...' : t('cart.seleccionarRegion')}</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="communeId">Comuna</label>
              <select
                id="communeId"
                value={shippingAddress.communeId}
                onChange={(e) => {
                  const selectedCommune = communes.find((commune) => commune.id === Number(e.target.value));
                  const selectedRegion = regions.find((region) => region.id === Number(shippingAddress.regionId));

                  setShippingAddress((prev) => ({
                    ...prev,
                    communeId: e.target.value,
                    city: selectedCommune?.name || '',
                    region: selectedRegion?.name || '',
                  }));
                }}
                disabled={loadingRegions || !shippingAddress.regionId || loadingCommunes}
              >
                <option value="">
                  {!shippingAddress.regionId
                    ? 'Selecciona una región primero'
                    : loadingCommunes
                      ? 'Cargando comunas...'
                      : communes.length === 0
                        ? 'No hay comunas disponibles'
                        : 'Selecciona una comuna'}
                </option>
                {communes.map((commune) => (
                  <option key={commune.id} value={commune.id}>
                    {commune.name}
                  </option>
                ))}
              </select>
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
                  <span className="payment-option-text">{t('cart.metodoPaypal')}</span>
                </label>
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="flow"
                    checked={paymentMethod === 'flow'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className="payment-option-text">{t('cart.metodoFlow')}</span>
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
