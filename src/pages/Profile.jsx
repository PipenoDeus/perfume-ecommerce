import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { orderService } from '../services/paymentService';
import './Profile.css';

const Profile = () => {
  const { user, userRole } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await orderService.getUserOrders();
        if (isMounted) {
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(t('profile.error'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, [t]);

  const formatDate = (value) => {
    if (!value) return '';
    return new Date(value).toLocaleDateString('es-CL');
  };

  const formatCLP = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatStatus = (status) => {
    const map = {
      pending: 'Pendiente',
      paid: 'Pagado',
      failed: 'Fallido',
      cancelled: 'Cancelado',
      processing: 'Procesando',
    };
    return map[status] || status;
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>{t('profile.titulo')}</h1>
      </div>

      <div className="profile-grid">
        <section className="profile-card">
          <h2>{t('profile.infoCuenta')}</h2>
          <div className="profile-row">
            <span>{t('profile.nombre')}</span>
            <strong>{user?.user_metadata?.full_name || '-'}</strong>
          </div>
          <div className="profile-row">
            <span>{t('profile.email')}</span>
            <strong>{user?.email || '-'}</strong>
          </div>
          <div className="profile-row">
            <span>{t('profile.rol')}</span>
            <strong>{userRole || '-'}</strong>
          </div>
        </section>

        <section className="profile-card">
          <h2>{t('profile.historial')}</h2>
          {loading && <p className="profile-state">{t('profile.cargando')}</p>}
          {error && <p className="profile-state error">{error}</p>}
          {!loading && !error && orders.length === 0 && (
            <p className="profile-state">{t('profile.noOrdenes')}</p>
          )}
          {!loading && !error && orders.length > 0 && (
            <div className="orders-list">
              {orders.map((order) => (
                <div key={order.id} className="order-item">
                  <div className="order-header">
                    <div>
                      <h3>{t('profile.orden')} #{order.id.slice(0, 8).toUpperCase()}</h3>
                      <p>{t('profile.fecha')}: {formatDate(order.created_at)}</p>
                    </div>
                    <div className="order-meta">
                      <span>
                        {t('profile.estado')}:{' '}
                        <strong>{formatStatus(order.status)}</strong>
                      </span>
                      <span>
                        {t('profile.total')}:{' '}
                        <strong>{formatCLP(order.total)}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="order-items">
                    <h4>{t('profile.items')}</h4>
                    <ul>
                      {(order.items || []).map((item, index) => (
                        <li key={`${order.id}-${index}`}>
                          <span>{item.name}</span>
                          <span>{t('profile.cantidad')}: {item.quantity}</span>
                          <span>{t('profile.precio')}: {formatCLP(item.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Profile;
