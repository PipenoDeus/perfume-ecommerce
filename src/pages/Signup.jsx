import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { API_BASE_URL } from '../services/apiConfig';
import './Auth.css';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    regionId: '',
    communeId: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingCommunes, setLoadingCommunes] = useState(false);

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
          setRegions(data || []);
        }
      } catch (err) {
        console.error('[Signup] Error loading regions:', err);
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
          setCommunes(data || []);
        }
      } catch (err) {
        console.error('[Signup] Error loading communes:', err);
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

  const formatPhoneNumber = (value) => {
    const digits = value.replace(/\D/g, '');
    const localDigits = `9${digits.replace(/^9?/, '').slice(0, 8)}`.slice(0, digits.length > 0 ? 9 : 0);

    if (!localDigits.length) return '';
    if (localDigits.length <= 1) return `${localDigits}`;
    if (localDigits.length <= 5) return `${localDigits.slice(0, 1)} ${localDigits.slice(1)}`;

    return `${localDigits.slice(0, 1)} ${localDigits.slice(1, 5)} ${localDigits.slice(5, 9)}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'regionId') {
      setFormData((prev) => ({
        ...prev,
        regionId: value,
        communeId: '',
      }));
      return;
    }

    const nextValue = name === 'phone' ? formatPhoneNumber(value) : value;

    setFormData(prev => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { name, email, phone, address, regionId, communeId, password, confirmPassword } = formData;

      // Validaciones
      if (!name || !email || !password || !confirmPassword) {
        throw new Error('Por favor completa todos los campos obligatorios');
      }

      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      if (password !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Por favor ingresa un email válido');
      }

      if (loadingRegions) {
        throw new Error('Espera a que carguen las regiones antes de registrarte');
      }

      if (!regionId || !regions.some((region) => region.id === Number(regionId))) {
        throw new Error('Por favor selecciona una región válida');
      }

      if (loadingCommunes) {
        throw new Error('Espera a que carguen las comunas antes de registrarte');
      }

      const selectedCommune = communes.find((commune) => commune.id === Number(communeId));
      if (!selectedCommune) {
        throw new Error('Por favor selecciona una comuna válida');
      }

      const selectedRegion = regions.find((region) => region.id === Number(regionId));
      const city = selectedCommune.name;

      const phoneDigits = phone.replace(/\D/g, '');
      const phoneValue = phoneDigits ? `+56 ${phone.trim()}` : null;

      if (phoneValue && !/^\+56 9 \d{4} \d{4}$/.test(phoneValue)) {
        throw new Error('Ingresa un teléfono válido con formato +56 9 2731 9536');
      }

      // Crear usuario en Supabase Auth (no esperar respuesta)
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phoneValue,
            address: address || null,
            city: city || null,
            region: selectedRegion?.name || null,
          }
        }
      }).then(({ data, error }) => {
        if (error) {
          setError(error.message || 'Error al registrarse');
          setLoading(false);
        }
      });

      // Navegar después de 1 segundo (tiempo para que se cree la sesión)
      setTimeout(() => {
        setLoading(false);
        navigate('/');
      }, 1000);
      
    } catch (err) {
      setError(err.message || 'Error al registrarse');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Crear Cuenta</h1>
          <p className="auth-subtitle">Únete a Bego Qamar</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Nombre Completo</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder=""
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Correo Electrónico *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Teléfono</label>
              <div className="phone-input-wrapper">
                <span className="phone-prefix">+56</span>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9 2731 9536"
                  maxLength={11}
                  inputMode="numeric"
                  autoComplete="tel-national"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="regionId">Región</label>
              <select
                id="regionId"
                name="regionId"
                value={formData.regionId}
                onChange={handleChange}
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

            <div className="form-group">
              <label htmlFor="communeId">Comuna</label>
              <select
                id="communeId"
                name="communeId"
                value={formData.communeId}
                onChange={handleChange}
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

            <div className="form-group">
              <label htmlFor="address">Dirección</label>
              <input
                id="address"
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Calle Principal 123"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña *</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar Contraseña *</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || loadingRegions || loadingCommunes || regions.length === 0}
              className="btn btn-login"
            >
              {loading
                ? 'Registrando...'
                : loadingRegions
                  ? 'Cargando regiones...'
                  : loadingCommunes
                    ? 'Cargando comunas...'
                    : 'Crear Cuenta'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="auth-link">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-banner">
          <div className="banner-content">
            <h2>Bego Qamar</h2>
            <p>Descubre nuestros aromas exclusivos</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
