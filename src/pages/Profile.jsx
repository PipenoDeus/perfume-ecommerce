import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { orderService } from '../services/paymentService';
import { supabase } from '../services/supabase';
import './Profile.css';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
const ORDERS_PER_PAGE = 5;
const ITEMS_PER_ORDER_PAGE = 1;

const Profile = () => {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [orders, setOrders] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileMessageType, setProfileMessageType] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
    regionId: '',
    communeId: '',
  });
  const [regions, setRegions] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [orderShippingForm, setOrderShippingForm] = useState({
    address: '',
    city: '',
    region: '',
    regionId: '',
    communeId: '',
  });
  const [orderCommunes, setOrderCommunes] = useState([]);
  const [loadingOrderCommunes, setLoadingOrderCommunes] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [itemPagesByOrder, setItemPagesByOrder] = useState({});

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

  useEffect(() => {
    let isMounted = true;

    const loadCommunes = async () => {
      if (!formData.regionId) {
        setCommunes([]);
        return;
      }

      setLoadingCommunes(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/regions/${encodeURIComponent(formData.regionId)}/communes`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error(`Error loading communes: ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          setCommunes(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('[Profile] Could not load communes:', err);
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
  }, [formData.regionId]);

  useEffect(() => {
    let isMounted = true;

    const loadOrderCommunes = async () => {
      if (!orderShippingForm.regionId) {
        setOrderCommunes([]);
        return;
      }

      setLoadingOrderCommunes(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/regions/${encodeURIComponent(orderShippingForm.regionId)}/communes`,
          { credentials: 'include' }
        );

        if (!response.ok) {
          throw new Error(`Error loading order communes: ${response.status}`);
        }

        const data = await response.json();

        if (isMounted) {
          setOrderCommunes(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('[Profile] Could not load order communes:', err);
        if (isMounted) {
          setOrderCommunes([]);
        }
      } finally {
        if (isMounted) {
          setLoadingOrderCommunes(false);
        }
      }
    };

    loadOrderCommunes();

    return () => {
      isMounted = false;
    };
  }, [orderShippingForm.regionId]);

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
      regionId: '',
      communeId: '',
    });
  }, [
    profileData,
    user?.user_metadata?.full_name,
    user?.user_metadata?.phone,
    user?.user_metadata?.address,
    user?.user_metadata?.city,
  ]);

  useEffect(() => {
    if (!regions.length || formData.regionId) {
      return;
    }

    const profileRegionName = String(user?.user_metadata?.region || '').trim();
    if (!profileRegionName) {
      return;
    }

    const matchedRegion = regions.find((region) => region.name === profileRegionName);
    if (matchedRegion) {
      setFormData((prev) => ({
        ...prev,
        regionId: String(matchedRegion.id),
      }));
    }
  }, [regions, formData.regionId, user?.user_metadata?.region]);

  useEffect(() => {
    if (!communes.length || formData.communeId || !formData.city) {
      return;
    }

    const matchedCommune = communes.find((commune) => commune.name === formData.city);
    if (matchedCommune) {
      setFormData((prev) => ({
        ...prev,
        communeId: String(matchedCommune.id),
      }));
    }
  }, [communes, formData.city, formData.communeId]);

  const profileName = profileData?.full_name || user?.user_metadata?.full_name || '-';
  const profileEmail = profileData?.email || user?.email || '-';
  const profilePhone = profileData?.phone || user?.user_metadata?.phone || '-';
  const profileRegion = user?.user_metadata?.region || '';
  const profileCommune = profileData?.city || user?.user_metadata?.city || '';
  const profileAddress = [
    profileData?.address || user?.user_metadata?.address,
    profileCommune,
    profileRegion,
  ].filter(Boolean).join(', ') || '-';

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'regionId') {
      setFormData((prev) => ({
        ...prev,
        regionId: value,
        communeId: '',
        city: '',
      }));
      return;
    }

    if (name === 'communeId') {
      const selectedCommune = communes.find((commune) => commune.id === Number(value));
      setFormData((prev) => ({
        ...prev,
        communeId: value,
        city: selectedCommune?.name || '',
      }));
      return;
    }

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
      regionId: '',
      communeId: '',
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

      if (!formData.regionId || !regions.some((region) => region.id === Number(formData.regionId))) {
        throw new Error('Por favor selecciona una región válida');
      }

      if (loadingCommunes) {
        throw new Error('Espera a que carguen las comunas antes de guardar');
      }

      const selectedCommune = communes.find((commune) => commune.id === Number(formData.communeId));
      if (!selectedCommune) {
        throw new Error('Por favor selecciona una comuna válida');
      }

      const selectedRegion = regions.find((region) => region.id === Number(formData.regionId));

      const normalizedPhone = normalizePhone(formData.phone || '');

      if (normalizedPhone && !/^\+56 9 \d{4} \d{4}$/.test(normalizedPhone)) {
        throw new Error('Ingresa un teléfono válido con formato +56 9 2731 9536');
      }

      const payload = {
        full_name: formData.full_name.trim() || null,
        phone: normalizedPhone,
        address: formData.address.trim() || null,
        city: selectedCommune.name,
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
          region: selectedRegion?.name || null,
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
        regionId: formData.regionId,
        communeId: formData.communeId,
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
    if (normalized === 'correos' || normalized.includes('correos')) {
      return 'CorreosChile';
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
      region: user?.user_metadata?.region || '',
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
            return { address: rawShippingAddress, city: fallback.city || '', region: fallback.region || '' };
          }
        })()
      : rawShippingAddress;

    if (typeof parsedAddress === 'string') {
      return { address: parsedAddress, city: fallback.city || '', region: fallback.region || '' };
    }

    return {
      ...fallback,
      ...parsedAddress,
      address: parsedAddress?.address || fallback.address || '',
      city: parsedAddress?.city || parsedAddress?.region || fallback.city || '',
      region: parsedAddress?.region || fallback.region || '',
    };
  };

  const formatOrderShippingAddress = (order) => {
    const parsedAddress = parseOrderShippingAddress(order);
    const parts = [
      parsedAddress?.address,
      parsedAddress?.city,
      parsedAddress?.region,
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

    const matchedRegion = regions.find((region) => region.name === currentAddress.region);
    setOrderShippingForm({
      address: currentAddress.address || '',
      city: currentAddress.city || '',
      region: currentAddress.region || '',
      regionId: matchedRegion ? String(matchedRegion.id) : '',
      communeId: '',
    });
  };

  const handleOrderShippingChange = (e) => {
    const { name, value } = e.target;

    if (name === 'regionId') {
      setOrderShippingForm((prev) => ({
        ...prev,
        regionId: value,
        communeId: '',
        city: '',
        region: '',
      }));
      return;
    }

    if (name === 'communeId') {
      const selectedCommune = orderCommunes.find((commune) => commune.id === Number(value));
      const selectedRegion = regions.find((region) => region.id === Number(orderShippingForm.regionId));

      setOrderShippingForm((prev) => ({
        ...prev,
        communeId: value,
        city: selectedCommune?.name || '',
        region: selectedRegion?.name || '',
      }));
      return;
    }

    setOrderShippingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCancelOrderShippingEdit = () => {
    setEditingOrderId(null);
    setSavingOrderId(null);
    setOrderShippingForm({ address: '', city: '', region: '', regionId: '', communeId: '' });
  };

  useEffect(() => {
    if (!orderCommunes.length || orderShippingForm.communeId || !orderShippingForm.city) {
      return;
    }

    const matchedCommune = orderCommunes.find((commune) => commune.name === orderShippingForm.city);
    if (matchedCommune) {
      setOrderShippingForm((prev) => ({
        ...prev,
        communeId: String(matchedCommune.id),
      }));
    }
  }, [orderCommunes, orderShippingForm.city, orderShippingForm.communeId]);

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

    if (!orderShippingForm.address.trim() || !orderShippingForm.regionId || !orderShippingForm.communeId) {
      setError(t('cart.completarDatosEnvio'));
      return;
    }

    const selectedRegion = regions.find((region) => region.id === Number(orderShippingForm.regionId));
    if (!selectedRegion) {
      setError('Por favor selecciona una región válida');
      return;
    }

    if (loadingOrderCommunes) {
      setError('Espera a que carguen las comunas antes de guardar');
      return;
    }

    const selectedCommune = orderCommunes.find((commune) => commune.id === Number(orderShippingForm.communeId));
    if (!selectedCommune) {
      setError('Por favor selecciona una comuna válida');
      return;
    }

    const nextShippingAddress = {
      ...parseOrderShippingAddress(orderToUpdate),
      address: orderShippingForm.address.trim(),
      city: selectedCommune.name,
      region: selectedRegion.name,
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
      setOrderShippingForm({ address: '', city: '', region: '', regionId: '', communeId: '' });
      setProfileMessage(t('profile.direccionActualizada'));
      setProfileMessageType('success');
    } catch (err) {
      console.error('[Profile] Error updating order shipping address:', err);
      setError(err.message || t('profile.errorActualizar'));
    } finally {
      setSavingOrderId(null);
    }
  };

  const getTrackingUrl = (company, trackingCode) => {
    const cleanTracking = String(trackingCode || '').trim();
    const normalizedCompany = String(company || '').trim().toLowerCase();

    if (!cleanTracking) return '';

    if (normalizedCompany === 'correos' || normalizedCompany.includes('correos')) {
      return 'https://www.correos.cl/seguimiento-en-linea';
    }

    if (normalizedCompany.includes('starken')) {
      return `https://www.starken.cl/seguimiento?codigo=${encodeURIComponent(cleanTracking)}`;
    }

    if (normalizedCompany.includes('chilexpress') || normalizedCompany.includes('chile express')) {
      return 'https://www.chilexpress.cl/estado-envio-paquete-courier';
    }

    return '';
  };

  const getOrderCourier = (order) => order?.courier || order?.shipping_company || '';
  const getOrderTrackingCode = (order) => String(order?.tracking_code || order?.tracking_number || '').trim();
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0)
  );
  const ordersTotalPages = Math.max(1, Math.ceil(sortedOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = sortedOrders.slice(
    (ordersPage - 1) * ORDERS_PER_PAGE,
    ordersPage * ORDERS_PER_PAGE
  );

  useEffect(() => {
    setOrdersPage(1);
  }, [orders.length]);

  useEffect(() => {
    if (ordersPage > ordersTotalPages) {
      setOrdersPage(ordersTotalPages);
    }
  }, [ordersPage, ordersTotalPages]);

  const renderOrderCard = (order) => {
    const orderCourier = getOrderCourier(order);
    const orderTrackingCode = getOrderTrackingCode(order);
    const trackingUrl = getTrackingUrl(orderCourier, orderTrackingCode);
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const totalItemPages = Math.max(1, Math.ceil(orderItems.length / ITEMS_PER_ORDER_PAGE));
    const currentItemPage = Math.min(itemPagesByOrder[order.id] || 1, totalItemPages);
    const paginatedItems = orderItems.slice(
      (currentItemPage - 1) * ITEMS_PER_ORDER_PAGE,
      currentItemPage * ITEMS_PER_ORDER_PAGE
    );

    const changeItemPage = (nextPage) => {
      setItemPagesByOrder((prev) => ({
        ...prev,
        [order.id]: nextPage,
      }));
    };

    return (
      <div key={order.id} className="order-item">
        <div className="order-header">
          <div className="order-header-left">
            <h3>{t('profile.orden')} #{order.id.slice(0, 8).toUpperCase()}</h3>
            <p>{t('profile.fecha')}: {formatDate(order.created_at)}</p>
            <div className="order-shipping-info">
              <p className="shipping-address">{formatOrderShippingAddress(order)}</p>
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
            {editingOrderId === order.id && (
              <div className="order-shipping-form">
                <input
                  type="text"
                  name="address"
                  value={orderShippingForm.address}
                  onChange={handleOrderShippingChange}
                  placeholder="Calle y número"
                />
                <select
                  name="regionId"
                  value={orderShippingForm.regionId}
                  onChange={handleOrderShippingChange}
                  disabled={loadingRegions || savingOrderId === order.id}
                >
                  <option value="">
                    {loadingRegions ? 'Cargando regiones...' : 'Selecciona una región'}
                  </option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
                <select
                  name="communeId"
                  value={orderShippingForm.communeId}
                  onChange={handleOrderShippingChange}
                  disabled={loadingRegions || !orderShippingForm.regionId || loadingOrderCommunes || savingOrderId === order.id}
                >
                  <option value="">
                    {!orderShippingForm.regionId
                      ? 'Selecciona una región primero'
                      : loadingOrderCommunes
                        ? 'Cargando comunas...'
                        : orderCommunes.length === 0
                          ? 'No hay comunas disponibles'
                          : 'Selecciona una comuna'}
                  </option>
                  {orderCommunes.map((commune) => (
                    <option key={commune.id} value={commune.id}>
                      {commune.name}
                    </option>
                  ))}
                </select>
                <div className="order-shipping-actions">
                  <button
                    type="button"
                    className="order-shipping-save-btn"
                    onClick={() => handleSaveOrderShipping(order.id)}
                    disabled={savingOrderId === order.id || loadingRegions || loadingOrderCommunes}
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
            )}
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
          <div className="items-grid">
            {paginatedItems.map((item, index) => {
              const imageUrl = item.image || item.image_url || item.photo || null;
              return (
                <div key={`${order.id}-${index}`} className="item-card">
                  <div className="item-image-container">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="item-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextElementSibling?.style.display === 'flex') {
                            e.target.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="item-image-placeholder"
                      style={{ display: imageUrl ? 'none' : 'flex' }}
                    >
                      <span>Imagen no disponible</span>
                    </div>
                  </div>
                  <div className="item-details">
                    <h5 className="item-name">{item.name}</h5>
                    {item.description && (
                      <p className="item-description">{item.description}</p>
                    )}
                    <div className="item-meta">
                      <div className="item-quantity">
                        <span className="label">Cantidad:</span>
                        <span className="value">{item.quantity}</span>
                      </div>
                      <div className="item-unit-price">
                        <span className="label">Precio unit:</span>
                        <span className="value">{formatCLP(item.price)}</span>
                      </div>
                    </div>
                    <div className="item-subtotal">
                      <span className="label">Subtotal:</span>
                      <span className="value">{formatCLP(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {totalItemPages > 1 && (
            <div className="order-items-pagination">
              <button
                type="button"
                className="pagination-btn"
                onClick={() => changeItemPage(Math.max(currentItemPage - 1, 1))}
                disabled={currentItemPage === 1}
                aria-label="Producto anterior"
                title="Producto anterior"
              >
                ←
              </button>
              <span className="pagination-info">
                Producto {currentItemPage} de {totalItemPages}
              </span>
              <button
                type="button"
                className="pagination-btn"
                onClick={() => changeItemPage(Math.min(currentItemPage + 1, totalItemPages))}
                disabled={currentItemPage === totalItemPages}
                aria-label="Producto siguiente"
                title="Producto siguiente"
              >
                →
              </button>
            </div>
          )}
        </div>
        {(orderTrackingCode || orderCourier) && (
          <div className="order-tracking">
            {orderTrackingCode ? (
              <div className="tracking-row">
                <p className="tracking-number"><strong>{orderTrackingCode}</strong></p>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="tracking-link-btn"
                  >
                    {t('profile.verSeguimiento')}
                  </a>
                )}
              </div>
            ) : (
              <p className="tracking-hint">{t('profile.sinTracking')}</p>
            )}
            {trackingUrl && orderTrackingCode && (
              <p className="tracking-hint">{t('profile.trackingHint')}</p>
            )}
            {trackingUrl && !orderTrackingCode && (
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
      </div>
    );
  };

  return (
    <div className="profile-page">
      <div className="profile-grid">
        <section className="profile-card profile-card-account">
          <div className="profile-card-header">
            <div className="profile-card-heading">
              <h1>{t('profile.titulo')}</h1>
              <h2>{t('profile.infoCuenta')}</h2>
            </div>
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
                <label htmlFor="regionId">{t('profile.region')}</label>
                <select
                  id="regionId"
                  name="regionId"
                  value={formData.regionId}
                  onChange={handleProfileInputChange}
                  disabled={loadingRegions}
                  required
                >
                  <option value="">
                    {loadingRegions ? 'Cargando regiones...' : 'Selecciona una región'}
                  </option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="profile-form-group">
                <label htmlFor="communeId">Comuna</label>
                <select
                  id="communeId"
                  name="communeId"
                  value={formData.communeId}
                  onChange={handleProfileInputChange}
                  disabled={loadingRegions || !formData.regionId || loadingCommunes}
                  required
                >
                  <option value="">
                    {!formData.regionId
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
                  disabled={savingProfile || loadingRegions || loadingCommunes}
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
              {paginatedOrders.map(renderOrderCard)}

              {ordersTotalPages > 1 && (
                <div className="orders-pagination">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setOrdersPage((prev) => Math.max(prev - 1, 1))}
                    disabled={ordersPage === 1}
                  >
                    Anterior
                  </button>
                  <span className="pagination-info">
                    Página {ordersPage} de {ordersTotalPages}
                  </span>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setOrdersPage((prev) => Math.min(prev + 1, ordersTotalPages))}
                    disabled={ordersPage === ordersTotalPages}
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
