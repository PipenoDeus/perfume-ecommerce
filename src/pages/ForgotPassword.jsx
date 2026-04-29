import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/supabase';
import './Auth.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!email.trim()) {
        throw new Error('Ingresa tu correo para recuperar la cuenta');
      }

      const redirectTo = `${window.location.origin}/reset-password`;
      setLoading(true);
      await authService.resetPasswordForEmail(email.trim(), redirectTo);
      setSuccess('Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja de entrada y spam.');
    } catch (err) {
      setError(err?.message || 'No se pudo enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Recuperar cuenta</h1>
          <p className="auth-subtitle">Te enviaremos un enlace para cambiar tu contraseña</p>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
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

            <button type="submit" disabled={loading} className="btn btn-login">
              {loading ? 'Enviando...' : 'Enviar correo de recuperación'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              ¿Recordaste tu contraseña?{' '}
              <Link to="/login" className="auth-link">
                Volver a iniciar sesión
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-banner">
          <div className="banner-content">
            <h2>Bego Qamar</h2>
            <p>Recupera tu acceso en minutos</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
