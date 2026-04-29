import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, authService } from '../services/supabase';
import './Auth.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkRecoverySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setIsRecoverySession(Boolean(session));
    };

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoverySession(true);
        return;
      }

      setIsRecoverySession(Boolean(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (!isRecoverySession) {
        throw new Error('El enlace de recuperación es inválido o expiró. Solicita uno nuevo.');
      }

      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      if (password !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      setLoading(true);
      await authService.updatePassword(password);
      setSuccess('Contraseña actualizada correctamente. Redirigiendo a iniciar sesión...');

      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      setError(err?.message || 'No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">Nueva contraseña</h1>
          <p className="auth-subtitle">Ingresa tu nueva contraseña para recuperar el acceso</p>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="password">Nueva contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" disabled={loading || !isRecoverySession} className="btn btn-login">
              {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              ¿Quieres volver?{' '}
              <Link to="/login" className="auth-link">
                Ir a iniciar sesión
              </Link>
            </p>
          </div>
        </div>

        <div className="auth-banner">
          <div className="banner-content">
            <h2>Bego Qamar</h2>
            <p>Protege tu cuenta con una nueva contraseña</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
