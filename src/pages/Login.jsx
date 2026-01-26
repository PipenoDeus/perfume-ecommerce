import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { authService } from '../services/supabase';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { setUser, fetchUserRole } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Por favor completa todos los campos');
      }

      const { session } = await authService.signIn(email, password);
      
      if (session?.user) {
        setUser(session.user);
        // Obtener el rol del usuario
        await fetchUserRole(session.user.id);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Iniciar Sesión</h1>
          <p className="auth-subtitle">Bienvenido a PerfumesDemo</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-login"
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              ¿No tienes cuenta?{' '}
              <Link to="/signup" className="auth-link">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-banner">
          <div className="banner-content">
            <h2>PerfumesDemo</h2>
            <p>Los mejores perfumes en un solo lugar</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
