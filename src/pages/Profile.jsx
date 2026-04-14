import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { orderService } from '../services/paymentService';
import { supabase } from '../services/supabase';
import './Profile.css';

const ORDERS_PER_PAGE = 10;

const Profile = () => {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [orders, setOrders] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileMessageType, setProfileMessageType] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
  });
  const [regions, setRegions] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [orderShippingForm, setOrderShippingForm] = useState({
    address: '',
    city: '',
  });

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');

        const ordersData = await orderService.getUserOrders();

        if (isMounted) {
          const visibleOrders = Array.isArray(ordersData)
            ? ordersData.filter((order) => order?.status !== 'failed')
            : [];

          setOrders(visibleOrders);
        }
      } catch (err) {
        console.error('[Profile] Error loading orders:', err);
        if (isMounted) {
          setError(t('profile.error'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const fetchProfileData = async () => {
      if (!user?.id) {
        if (isMounted) setProfileData(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('full_name, email, phone, address, city')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.warn('[Profile] Profile details unavailable:', error);
          return;
        }

        if (isMounted) {
          setProfileData(data || null);
        }
      } catch (err) {
        console.warn('[Profile] Could not load extra user data:', err);
      }
    };

    fetchOrders();
    fetchProfileData();

    return () => {
      isMounted = false;
    };
  }, [t, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadRegions = async () => {
      try {
        const { data, error } = await supabase
          .from('regions')
          .select('id, code, name')
          .eq('active', true)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;

        if (isMounted) {
          setRegions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('[Profile] Could not load regions:', err);
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

  const formatPhoneInput = (value) => {
    const digits = value.replace(/\D/g, '');
    const localDigits = `9${digits.replace(/^9?/, '').slice(0, 8)}`.slice(0, digits.length > 0 ? 9 : 0);

    if (!localDigits.length) return '';
    if (localDigits.length <= 1) return `${localDigits}`;
    if (localDigits.length <= 5) return `${localDigits.slice(0, 1)} ${localDigits.slice(1)}`;

    return `${localDigits.slice(0, 1)} ${localDigits.slice(1, 5)} ${localDigits.slice(5, 9)}`;
  };

  useEffect(() => {
    setFormData({
      full_name: profileData?.full_name || user?.user_metadata?.full_name || '',
      phone: formatPhoneInput(profileData?.phone || user?.user_metadata?.phone || ''),
      address: profileData?.address || user?.user_metadata?.address || '',
      city: profileData?.city || user?.user_metadata?.city || '',
    });
  }, [
    profileData,
    user?.user_metadata?.full_name,
    user?.user_metadata?.phone,
    user?.user_metadata?.address,
    user?.user_metadata?.city,
  ]);

  const profileName = profileData?.full_name || user?.user_metadata?.full_name || '-';
  const profileEmail = profileData?.email || user?.email || '-';
  const profilePhone = profileData?.phone || user?.user_metadata?.phone || '-';
  const profileRegion = profileData?.city || user?.user_metadata?.city || '';
  const profileAddress = [
    profileData?.address || user?.user_metadata?.address,
    profileRegion,
  ].filter(Boolean).join(', ') || '-';

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'phone' ? formatPhoneInput(value) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  const resetProfileForm = () => {
    setFormData({
      full_name: profileData?.full_name || user?.user_metadata?.full_name || '',
      phone: formatPhoneInput(profileData?.phone || user?.user_metadata?.phone || ''),
      address: profileData?.address || user?.user_metadata?.address || '',
      city: profileData?.city || user?.user_metadata?.city || '',
    });
    setIsEditing(false);
    setProfileMessage('');
    setProfileMessageType('');
  };

  const normalizePhone = (value) => {
    const formatted = formatPhoneInput(value);
    return formatted ? `+56 ${formatted}` : null;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!user?.id) return;

    setSavingProfile(true);
    setProfileMessage('');
    setProfileMessageType('');

    try {
      if (loadingRegions) {
        throw new Error('Espera a que carguen las regiones antes de guardar');
      }

      if (!formData.city || !regions.some((region) => region.name === formData.city)) {
        throw new Error('Por favor selecciona una región válida');
      }

      const normalizedPhone = normalizePhone(formData.phone || '');

      if (normalizedPhone && !/^\+56 9 \d{4} \d{4}$/.test(normalizedPhone)) {
        throw new Error('Ingresa un teléfono válido con formato +56 9 2731 9536');
      }

      const payload = {
        full_name: formData.full_name.trim() || null,
        phone: normalizedPhone,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
      };

      let savedProfile = null;

      const { data: updatedData, error: updateError } = await supabase
        .from('users')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select('full_name, email, phone, address, city')
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      savedProfile = updatedData;

      if (!savedProfile) {
        const { data: insertedData, error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .select('full_name, email, phone, address, city')
          .single();

        if (insertError) {
          throw insertError;
        }

        savedProfile = insertedData;
      }

      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: {
          full_name: payload.full_name,
          phone: payload.phone,
          address: payload.address,
          city: payload.city,
        },
      });

      if (authUpdateError) {
        console.warn('[Profile] Auth metadata update warning:', authUpdateError);
      }

      setProfileData(savedProfile || { email: user.email, ...payload });
      setFormData({
        full_name: savedProfile?.full_name || '',
        phone: formatPhoneInput(savedProfile?.phone || ''),
        address: savedProfile?.address || '',
        city: savedProfile?.city || '',
      });
      setIsEditing(false);
      setProfileMessage(t('profile.perfilActualizado'));
      setProfileMessageType('success');
    } catch (err) {
      console.error('[Profile] Error updating profile:', err);
      setProfileMessage(err.message || t('profile.errorActualizar'));
      setProfileMessageType('error');
    } finally {
      setSavingProfile(false);
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
      failed: 'Fallido',
      cancelled: 'Cancelado',
      processing: 'Pendiente de envio',
      shipped: 'Enviado',
      delivered: 'Recibido',
    };
    return map[status] || status;
  };

  const isOrderShippingEditable = (status) => (
    ['pending', 'paid', 'processing'].includes(String(status || '').toLowerCase())
  );

  const formatShippingCompany = (company) => {
    const normalized = String(company || '').trim().toLowerCase();

    if (normalized.includes('starken')) return 'Starken';
    if (normalized.includes('chilexpress') || normalized.includes('chile express')) {
      return 'Chilexpress';
    }
    if (normalized.includes('correoschile') || normalized.includes('correos chile')) {
      return 'CorreosChile';
    }

    return company || t('profile.sinEmpresaEnvio');
  };

  const parseOrderShippingAddress = (order) => {
    const fallback = {
      address: profileData?.address || user?.user_metadata?.address || '',
      city: profileData?.city || user?.user_metadata?.city || '',
    };

    const rawShippingAddress = order?.shipping_address;

    if (!rawShippingAddress) {
      return fallback;
    }

    const parsedAddress = typeof rawShippingAddress === 'string'
      ? (() => {
          try {
            return JSON.parse(rawShippingAddress);
          } catch {
            return { address: rawShippingAddress, city: fallback.city || '' };
          }
        })()
      : rawShippingAddress;

    if (typeof parsedAddress === 'string') {
      return { address: parsedAddress, city: fallback.city || '' };
    }

    return {
      ...fallback,
      ...parsedAddress,
      address: parsedAddress?.address || fallback.address || '',
      city: parsedAddress?.city || parsedAddress?.region || fallback.city || '',
    };
  };

  const formatOrderShippingAddress = (order) => {
    const parsedAddress = parseOrderShippingAddress(order);
    const parts = [
      parsedAddress?.address,
      parsedAddress?.city || parsedAddress?.region,
      parsedAddress?.reference,
    ].filter(Boolean);

    return parts.join(', ') || t('profile.sinDireccionEnvio');
  };

  const handleEditOrderShipping = (order) => {
    if (!isOrderShippingEditable(order?.status)) {
      setError(t('profile.noEditarDireccionEnviada'));
      return;
    }

    const currentAddress = parseOrderShippingAddress(order);

    setError('');
    setProfileMessage('');
    setProfileMessageType('');
    setEditingOrderId(order.id);
    setOrderShippingForm({
      address: currentAddress.address || '',
      city: currentAddress.city || '',
    });
  };

  const handleOrderShippingChange = (e) => {
    const { name, value } = e.target;
    setOrderShippingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancelOrderShippingEdit = () => {
    setEditingOrderId(null);
    setSavingOrderId(null);
    setOrderShippingForm({ address: '', city: '' });
  };

  const handleSaveOrderShipping = async (orderId) => {
    if (!user?.id) return;

    const orderToUpdate = orders.find((order) => order.id === orderId);

    if (!orderToUpdate || !isOrderShippingEditable(orderToUpdate.status)) {
      setError(t('profile.noEditarDireccionEnviada'));
      return;
    }

    if (loadingRegions) {
      setError('Espera a que carguen las regiones antes de guardar');
      return;
    }

    if (!orderShippingForm.address.trim() || !orderShippingForm.city.trim()) {
      setError(t('cart.completarDatosEnvio'));
      return;
    }

    if (!regions.some((region) => region.name === orderShippingForm.city)) {
      setError('Por favor selecciona una región válida');
      return;
    }

    const nextShippingAddress = {
      ...parseOrderShippingAddress(orderToUpdate),
      address: orderShippingForm.address.trim(),
      city: orderShippingForm.city.trim(),
    };

    try {
      setSavingOrderId(orderId);
      setError('');
      setProfileMessage('');
      setProfileMessageType('');

      const updatedOrder = await orderService.updateOrderShippingAddress(orderId, nextShippingAddress);

      setOrders((prev) => prev.map((order) => (
        order.id === orderId
          ? {
              ...order,
              shipping_address: updatedOrder?.shipping_address || nextShippingAddress,
              updated_at: updatedOrder?.updated_at || new Date().toISOString(),
            }
          : order
      )));
      setEditingOrderId(null);
      setOrderShippingForm({ address: '', city: '' });
      setProfileMessage(t('profile.direccionActualizada'));
      setProfileMessageType('success');
    } catch (err) {
      console.error('[Profile] Error updating order shipping address:', err);
      setError(err.message || t('profile.errorActualizar'));
    } finally {
      setSavingOrderId(null);
    }
  };

  const getTrackingUrl = (company, trackingNumber) => {
    const cleanTracking = String(trackingNumber || '').trim();
    const normalizedCompany = String(company || '').trim().toLowerCase();

    if (!cleanTracking) return '';

    if (normalizedCompany.includes('starken')) {
      return `https://www.starken.cl/seguimiento?codigo=${encodeURIComponent(cleanTracking)}`;
    }

    if (normalizedCompany.includes('chilexpress') || normalizedCompany.includes('chile express')) {
      return `https://www.chilexpress.cl/Views/ChilexpressCL/Resultado-busqueda.aspx?DATA=${encodeURIComponent(cleanTracking)}`;
    }

    if (normalizedCompany.includes('correoschile') || normalizedCompany.includes('correos chile')) {
      return `https://www.correos.cl/web/guest/seguimiento-en-linea?codigos=${encodeURIComponent(cleanTracking)}`;
    }

    return '';
  };

  const totalPages = Math.ceil(orders.length / ORDERS_PER_PAGE);
  const paginatedOrders = orders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE
  );

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>{t('profile.titulo')}</h1>
      </div>

      <div className="profile-grid">
        <section className="profile-card profile-card-account">
          <div className="profile-card-header">
            <h2>{t('profile.infoCuenta')}</h2>
            <button
              type="button"
              className="profile-edit-btn"
              onClick={() => {
                if (isEditing) {
                  resetProfileForm();
                  return;
                }
                setProfileMessage('');
                setProfileMessageType('');
                setIsEditing(true);
              }}
              aria-label={t('profile.editarPerfil')}
            >
              <span className="profile-edit-icon" aria-hidden="true">✏️</span>
            </button>
          </div>

          {profileMessage && (
            <p className={`profile-feedback ${profileMessageType}`}>{profileMessage}</p>
          )}

          {isEditing ? (
            <form className="profile-edit-form" onSubmit={handleSaveProfile}>
              <div className="profile-form-group">
                <label htmlFor="full_name">{t('profile.nombre')}</label>
                <input
                  id="full_name"
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleProfileInputChange}
                  placeholder="Tu nombre"
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="phone">{t('profile.telefono')}</label>
                <div className="profile-phone-input-wrapper">
                  <span className="profile-phone-prefix">+56</span>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleProfileInputChange}
                    placeholder="9 2731 9536"
                    maxLength={11}
                    inputMode="numeric"
                    autoComplete="tel-national"
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label htmlFor="address">{t('profile.direccionEnvio')}</label>
                <input
                  id="address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleProfileInputChange}
                  placeholder="Calle y número"
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="city">{t('profile.region')}</label>
                <select
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleProfileInputChange}
                  disabled={loadingRegions}
                  required
                >
                  <option value="">
                    {loadingRegions ? 'Cargando regiones...' : 'Selecciona una región'}
                  </option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.name}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="profile-secondary-btn"
                  onClick={resetProfileForm}
                >
                  {t('profile.cancelar')}
                </button>
                <button
                  type="submit"
                  className="profile-primary-btn"
                  disabled={savingProfile || loadingRegions}
                >
                  {savingProfile ? t('profile.actualizando') : t('profile.guardarCambios')}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="profile-row">
                <span>{t('profile.nombre')}</span>
                <strong>{profileName}</strong>
              </div>
              <div className="profile-row">
                <span>{t('profile.email')}</span>
                <strong>{profileEmail}</strong>
              </div>
              <div className="profile-row">
                <span>{t('profile.telefono')}</span>
                <strong>{profilePhone}</strong>
              </div>
              <div className="profile-row">
                <span>{t('profile.direccionEnvio')}</span>
                <strong>{profileAddress}</strong>
              </div>
            </>
          )}
        </section>

        <section className="profile-card profile-card-orders">
          <h2>{t('profile.historial')}</h2>
          {loading && <p className="profile-state">{t('profile.cargando')}</p>}
          {error && <p className="profile-state error">{error}</p>}
          {!loading && !error && orders.length === 0 && (
            <p className="profile-state">{t('profile.noOrdenes')}</p>
          )}
          {!loading && !error && orders.length > 0 && (
            <div className="orders-list">
              {paginatedOrders.map((order) => {
                const trackingUrl = getTrackingUrl(order.shipping_company, order.tracking_number);

                return (
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
                    <div className="order-shipping">
                      <div className="order-shipping-header">
                        <h4>{t('profile.direccionEnvio')}</h4>
                        {isOrderShippingEditable(order.status) && editingOrderId !== order.id && (
                          <button
                            type="button"
                            className="order-shipping-edit-btn"
                            onClick={() => handleEditOrderShipping(order)}
                          >
                            {t('profile.editarDireccionEnvio')}
                          </button>
                        )}
                      </div>

                      {editingOrderId === order.id ? (
                        <div className="order-shipping-form">
                          <input
                            type="text"
                            name="address"
                            value={orderShippingForm.address}
                            onChange={handleOrderShippingChange}
                            placeholder="Calle y número"
                          />
                          <select
                            name="city"
                            value={orderShippingForm.city}
                            onChange={handleOrderShippingChange}
                            disabled={loadingRegions || savingOrderId === order.id}
                          >
                            <option value="">
                              {loadingRegions ? 'Cargando regiones...' : 'Selecciona una región'}
                            </option>
                            {regions.map((region) => (
                              <option key={region.id} value={region.name}>
                                {region.name}
                              </option>
                            ))}
                          </select>
                          <div className="order-shipping-actions">
                            <button
                              type="button"
                              className="order-shipping-save-btn"
                              onClick={() => handleSaveOrderShipping(order.id)}
                              disabled={savingOrderId === order.id || loadingRegions}
                            >
                              {savingOrderId === order.id
                                ? t('profile.actualizandoDireccion')
                                : t('profile.guardarDireccionEnvio')}
                            </button>
                            <button
                              type="button"
                              className="order-shipping-cancel-btn"
                              onClick={handleCancelOrderShippingEdit}
                              disabled={savingOrderId === order.id}
                            >
                              {t('profile.cancelar')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>{formatOrderShippingAddress(order)}</p>
                          {!isOrderShippingEditable(order.status) && (
                            <span className="order-shipping-locked">
                              {t('profile.noEditarDireccionEnviada')}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    {(order.tracking_number || order.shipping_company) && (
                      <div className="order-tracking">
                        <h4>{t('profile.tracking')}</h4>
                        <div className="tracking-details">
                          <div className="tracking-detail">
                            <span>{t('profile.estado')}</span>
                            <strong>{formatStatus(order.status)}</strong>
                          </div>
                          <div className="tracking-detail">
                            <span>{t('profile.empresaEnvio')}</span>
                            <strong>{formatShippingCompany(order.shipping_company)}</strong>
                          </div>
                        </div>
                        {order.tracking_number ? (
                          <p className="tracking-number"><strong>{order.tracking_number}</strong></p>
                        ) : (
                          <p className="tracking-hint">{t('profile.sinTracking')}</p>
                        )}
                        {trackingUrl && (
                          <>
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="tracking-link-btn"
                            >
                              {t('profile.verSeguimiento')}
                            </a>
                            <p className="tracking-hint">{t('profile.trackingHint')}</p>
                          </>
                        )}
                      </div>
                    )}
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
                );
              })}
              {totalPages > 1 && (
                <div className="orders-pagination">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>
                  <span className="pagination-info">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Profile;
