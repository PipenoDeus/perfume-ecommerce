import React, { useState, useEffect, useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import { supabase } from '../services/supabase';
import './OrderTrackingManager.css';

const OrderTrackingManager = () => {
  const { t } = useContext(LanguageContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [statusInput, setStatusInput] = useState('shipped');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setOrders(Array.isArray(data) ? data : []);
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
      paid: 'Pagado',
      processing: 'Procesando',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      failed: 'Fallido',
    };
    return map[status] || status;
  };

  const handleEditTracking = (order) => {
    setEditingId(order.id);
    setTrackingInput(order.tracking_number || '');
    setStatusInput(order.status || 'shipped');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTrackingInput('');
    setStatusInput('shipped');
  };

  const handleSaveTracking = async (orderId) => {
    if (!trackingInput.trim()) {
      setError('El número de seguimiento no puede estar vacío');
      return;
    }

    try {
      setError(null);
      const { error: err } = await supabase
        .from('orders')
        .update({
          tracking_number: trackingInput.trim(),
          status: statusInput,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (err) throw err;

      setSuccess('Seguimiento actualizado correctamente');
      setEditingId(null);
      setTrackingInput('');
      setStatusInput('shipped');
      loadOrders();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error al actualizar: ' + err.message);
    }
  };

  const pendingOrders = orders.filter(o => !o.tracking_number);
  const trackedOrders = orders.filter(o => o.tracking_number);

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
                      <p><strong>Cliente:</strong> {order.shipping_address?.city || 'N/A'}</p>
                    </div>

                    {editingId === order.id ? (
                      <div className="tracking-form">
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
                          <option value="paid">Pagado</option>
                          <option value="processing">Procesando</option>
                          <option value="shipped">Enviado</option>
                          <option value="delivered">Entregado</option>
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
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Número de Seguimiento</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackedOrders.map(order => (
                      <tr key={order.id}>
                        <td>#{order.id.slice(0, 8).toUpperCase()}</td>
                        <td>{formatCLP(order.total)}</td>
                        <td><span className="status-badge">{formatStatus(order.status)}</span></td>
                        <td className="tracking-cell">
                          <code>{order.tracking_number}</code>
                        </td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>
                          {editingId === order.id ? (
                            <div className="inline-edit">
                              <input
                                type="text"
                                value={trackingInput}
                                onChange={(e) => setTrackingInput(e.target.value)}
                                className="tracking-input-sm"
                              />
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
