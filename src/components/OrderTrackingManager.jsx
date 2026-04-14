import React, { useState, useEffect, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { supabase } from '../services/supabase';
import './OrderTrackingManager.css';

const COURIER_OPTIONS = [
  { value: 'starken', label: 'Starken' },
  { value: 'chilexpress', label: 'Chilexpress' },
  { value: 'correoschile', label: 'CorreosChile' },
];

const OrderTrackingManager = () => {
  const { t } = useContext(LanguageContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [shippingCompanyInput, setShippingCompanyInput] = useState('');
  const [statusInput, setStatusInput] = useState('shipped');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const [{ data: ordersData, error: ordersError }, { data: usersData, error: usersError }] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('users')
          .select('id, full_name, email, phone, address, city'),
      ]);

      if (ordersError) throw ordersError;
      if (usersError) {
        console.warn('[OrderTrackingManager] No se pudieron cargar los usuarios:', usersError);
      }

      const usersMap = new Map((usersData || []).map((user) => [user.id, user]));
      const mergedOrders = (ordersData || []).map((order) => {
        const customer = usersMap.get(order.user_id) || null;
        const shippingAddress = order.shipping_address || {};

        return {
          ...order,
          customer_name: customer?.full_name || shippingAddress?.name || 'N/A',
          customer_email: customer?.email || 'N/A',
          customer_phone: customer?.phone || 'N/A',
          customer_address: shippingAddress?.address || customer?.address || 'N/A',
          customer_region: shippingAddress?.city || customer?.city || '',
        };
      });

      setOrders(mergedOrders);
    } catch (err) {
      setError('Error al cargar órdenes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

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
      paid: 'Pendiente de envio',
      processing: 'Pendiente de envio',
      shipped: 'Enviado',
      delivered: 'Recibido',
      cancelled: 'Cancelado',
      failed: 'Fallido',
    };
    return map[status] || status;
  };

  const normalizeStatusForTrackingSelect = (status) => {
    const normalized = String(status || '').toLowerCase();

    if (normalized === 'processing') return 'paid';
    if (['paid', 'shipped', 'delivered'].includes(normalized)) return normalized;

    return 'shipped';
  };

  const formatShippingCompany = (company) => {
    const map = {
      starken: 'Starken',
      chilexpress: 'Chilexpress',
      correoschile: 'CorreosChile',
    };

    return map[String(company || '').toLowerCase()] || company || 'Sin asignar';
  };

  const normalizeShippingCompany = (company) => {
    const normalized = String(company || '').trim().toLowerCase();

    if (normalized.includes('starken')) return 'starken';
    if (normalized.includes('chilexpress') || normalized.includes('chile express')) {
      return 'chilexpress';
    }
    if (normalized.includes('correoschile') || normalized.includes('correos chile')) {
      return 'correoschile';
    }

    return '';
  };

  const handleEditTracking = (order) => {
    if (order.status === 'failed' || order.status === 'cancelled') {
      setError('No se puede asignar seguimiento a órdenes fallidas o canceladas');
      return;
    }

    setError(null);
    setEditingId(order.id);
    setTrackingInput(order.tracking_number || '');
    setShippingCompanyInput(normalizeShippingCompany(order.shipping_company));
    setStatusInput(normalizeStatusForTrackingSelect(order.status));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTrackingInput('');
    setShippingCompanyInput('');
    setStatusInput('shipped');
  };

  const handleSaveTracking = async (orderId) => {
    const cleanTracking = trackingInput.trim().toUpperCase();

    if (!cleanTracking) {
      setError('El número de seguimiento no puede estar vacío');
      return;
    }

    if (!shippingCompanyInput) {
      setError('Selecciona la empresa de envío');
      return;
    }

    try {
      setError(null);
      const { error: err } = await supabase
        .from('orders')
        .update({
          tracking_number: cleanTracking,
          shipping_company: shippingCompanyInput,
          status: statusInput,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (err) throw err;

      setSuccess('Seguimiento actualizado correctamente');
      setEditingId(null);
      setTrackingInput('');
      setShippingCompanyInput('');
      setStatusInput('shipped');
      loadOrders();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err?.message?.includes('shipping_company')
        ? 'Falta la columna shipping_company en la base de datos. Ejecuta el script setup-shipping-tracking.sql en Supabase.'
        : `Error al actualizar: ${err.message}`;

      setError(message);
    }
  };

  const formatCustomerAddress = (order) => {
    const parts = [order.customer_address, order.customer_region].filter(
      (part) => part && part !== 'N/A'
    );
    return parts.length ? parts.join(', ') : 'N/A';
  };

  const pendingOrders = orders.filter(
    (order) => !order.tracking_number && ['paid', 'processing'].includes(order.status)
  );
  const trackedOrders = orders.filter((order) => order.tracking_number);

  return (
    <div className="tracking-manager">
      <h2>Gestión de Seguimiento de Órdenes</h2>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <p className="loading">Cargando órdenes...</p>
      ) : (
        <>
          {/* Órdenes sin seguimiento */}
          <section className="tracking-section">
            <h3>Órdenes Pagadas sin Seguimiento ({pendingOrders.length})</h3>
            {pendingOrders.length === 0 ? (
              <p className="empty-state">Todas las órdenes pagadas tienen seguimiento asignado</p>
            ) : (
              <div className="orders-grid">
                {pendingOrders.map(order => (
                  <div key={order.id} className="order-card">
                    <div className="order-card-header">
                      <h4>Orden #{order.id.slice(0, 8).toUpperCase()}</h4>
                      <span className="order-status">{formatStatus(order.status)}</span>
                    </div>
                    <div className="order-card-body">
                      <p><strong>Total:</strong> {formatCLP(order.total)}</p>
                      <p><strong>Fecha:</strong> {formatDate(order.created_at)}</p>
                      <p><strong>Cliente:</strong> {order.customer_name}</p>
                      <p><strong>Correo:</strong> {order.customer_email}</p>
                      <p><strong>Teléfono:</strong> {order.customer_phone}</p>
                      <p><strong>Dirección:</strong> {formatCustomerAddress(order)}</p>
                    </div>

                    {editingId === order.id ? (
                      <div className="tracking-form">
                        <select
                          value={shippingCompanyInput}
                          onChange={(e) => setShippingCompanyInput(e.target.value)}
                          className="tracking-select"
                        >
                          <option value="">Selecciona empresa de envío</option>
                          {COURIER_OPTIONS.map((company) => (
                            <option key={company.value} value={company.value}>
                              {company.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={trackingInput}
                          onChange={(e) => setTrackingInput(e.target.value)}
                          placeholder="Ej: COR123456789 o STK987654321"
                          className="tracking-input"
                        />
                        <select
                          value={statusInput}
                          onChange={(e) => setStatusInput(e.target.value)}
                          className="status-select"
                        >
                          <option value="paid">Pendiente de envio</option>
                          <option value="shipped">Enviado</option>
                          <option value="delivered">Recibido</option>
                        </select>
                        <div className="form-actions">
                          <button
                            className="btn btn-success"
                            onClick={() => handleSaveTracking(order.id)}
                          >
                            Guardar
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={handleCancelEdit}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleEditTracking(order)}
                      >
                        Asignar Seguimiento
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Órdenes con seguimiento */}
          <section className="tracking-section">
            <h3>Órdenes Rastreadas ({trackedOrders.length})</h3>
            {trackedOrders.length === 0 ? (
              <p className="empty-state">No hay órdenes con seguimiento aún</p>
            ) : (
              <div className="tracked-orders-table">
                <table>
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Cliente</th>
                      <th>Dirección</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Empresa de envío</th>
                      <th>Número de Seguimiento</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackedOrders.map(order => (
                      <tr key={order.id}>
                        <td>#{order.id.slice(0, 8).toUpperCase()}</td>
                        <td className="customer-details-cell">
                          <strong className="customer-name">{order.customer_name}</strong>
                          <span className="customer-extra">{order.customer_email}</span>
                          <span className="customer-extra">{order.customer_phone}</span>
                        </td>
                        <td className="address-cell">{formatCustomerAddress(order)}</td>
                        <td>{formatCLP(order.total)}</td>
                        <td><span className="status-badge">{formatStatus(order.status)}</span></td>
                        <td>
                          <span className="shipping-company">{formatShippingCompany(order.shipping_company)}</span>
                        </td>
                        <td className="tracking-cell">
                          <code>{order.tracking_number}</code>
                        </td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>
                          {editingId === order.id ? (
                            <div className="inline-edit">
                              <select
                                value={shippingCompanyInput}
                                onChange={(e) => setShippingCompanyInput(e.target.value)}
                                className="tracking-select-sm"
                              >
                                <option value="">Empresa de envío</option>
                                {COURIER_OPTIONS.map((company) => (
                                  <option key={company.value} value={company.value}>
                                    {company.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={trackingInput}
                                onChange={(e) => setTrackingInput(e.target.value)}
                                className="tracking-input-sm"
                              />
                              <select
                                value={statusInput}
                                onChange={(e) => setStatusInput(e.target.value)}
                                className="status-select-sm"
                              >
                                <option value="paid">Pendiente de envio</option>
                                <option value="shipped">Enviado</option>
                                <option value="delivered">Recibido</option>
                              </select>
                              <div className="inline-edit-actions">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleSaveTracking(order.id)}
                                >
                                  ✓
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={handleCancelEdit}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              className="btn btn-sm btn-edit"
                              onClick={() => handleEditTracking(order)}
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default OrderTrackingManager;
