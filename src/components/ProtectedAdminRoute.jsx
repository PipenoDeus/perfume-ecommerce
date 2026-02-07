import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './ProtectedAdminRoute.css';

const ProtectedAdminRoute = ({ children }) => {
  const { user, userRole, loading } = useContext(AuthContext);

  console.log('ProtectedAdminRoute - user:', user?.email, 'role:', userRole, 'loading:', loading);

  // Mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="protected-route-container">
        <div className="protected-route-message">
          <h2>Verificando permisos...</h2>
        </div>
      </div>
    );
  }

  // Si no hay usuario, redirigir a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si el rol está cargando (null pero hay usuario), esperar
  if (userRole === null) {
    return (
      <div className="protected-route-container">
        <div className="protected-route-message">
          <h2>Cargando permisos...</h2>
        </div>
      </div>
    );
  }

  // Si el rol no es admin ni dueño, mostrar acceso denegado
  if (userRole !== 'admin' && userRole !== 'dueño') {
    return (
      <div className="protected-route-container">
        <div className="protected-route-message access-denied">
          <h2>⛔ Acceso Denegado</h2>
          <p>No tienes permisos para acceder a esta sección.</p>
          <p>Solo administradores y propietarios pueden acceder al panel de administración.</p>
          <a href="/" className="btn btn-primary">Volver al Inicio</a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedAdminRoute;
