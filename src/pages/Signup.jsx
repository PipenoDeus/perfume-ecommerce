import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import './Auth.css';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState([]);
  const [loadingRegions, setLoadingRegions] = useState(true);

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
      const { name, email, phone, address, city, password, confirmPassword } = formData;

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

      if (!city || !regions.some((region) => region.name === city)) {
        throw new Error('Por favor selecciona una región válida');
      }

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
          <p className="auth-subtitle">Únete a QamarPerfumes</p>

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
              <label htmlFor="city">Región</label>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
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
              disabled={loading || loadingRegions || regions.length === 0}
              className="btn btn-login"
            >
              {loading ? 'Registrando...' : loadingRegions ? 'Cargando regiones...' : 'Crear Cuenta'}
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
            <h2>QamarPerfumes</h2>
            <p>Descubre nuestros aromas exclusivos</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
