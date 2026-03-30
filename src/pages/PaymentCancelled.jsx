import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const PaymentCancelled = () => {
  const [searchParams] = useSearchParams();

  const provider = searchParams.get('provider') || 'webpay';
  const tbkOrder = searchParams.get('TBK_ORDEN_COMPRA');
  const tbkSession = searchParams.get('TBK_ID_SESION');

  return (
    <div style={{ maxWidth: 760, margin: '2rem auto', padding: '1rem' }}>
      <h1>Pago cancelado</h1>
      <p>El pago fue cancelado o abortado en {provider.toUpperCase()}.</p>

      {(tbkOrder || tbkSession) && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f6f6f6', borderRadius: 8 }}>
          {tbkOrder && <p><strong>Orden:</strong> {tbkOrder}</p>}
          {tbkSession && <p><strong>Sesión:</strong> {tbkSession}</p>}
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
        <Link to="/cart">Volver al carrito</Link>
        <Link to="/products">Seguir comprando</Link>
      </div>
    </div>
  );
};

export default PaymentCancelled;