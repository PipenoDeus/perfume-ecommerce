import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './PaymentSuccess.css';

const PaymentCancelled = () => {
  const [searchParams] = useSearchParams();

  const provider = searchParams.get('provider') || 'webpay';
  const tbkOrder = searchParams.get('TBK_ORDEN_COMPRA');
  const tbkSession = searchParams.get('TBK_ID_SESION');

  return (
    <div className="payment-success-page">
      <div className="payment-card error">
        <h1>Pago cancelado</h1>
        <p>El pago fue cancelado o interrumpido en {provider.toUpperCase()}.</p>

        {(tbkOrder || tbkSession) && (
          <div className="payment-details">
            {tbkOrder && <p><strong>Orden:</strong> {tbkOrder}</p>}
            {tbkSession && <p><strong>Sesión:</strong> {tbkSession}</p>}
          </div>
        )}

        <div className="payment-actions">
          <Link to="/cart">Volver al carrito</Link>
          <Link to="/products">Seguir comprando</Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled;