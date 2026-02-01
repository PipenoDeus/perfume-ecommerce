import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import './Navbar.css';

const Navbar = ({ cartCount }) => {
  const navigate = useNavigate();
  const { user, userRole, logout, isLoggingOut } = useContext(AuthContext);
  const { t, toggleLanguage, language } = useContext(LanguageContext);
  const [showUserMenu, setShowUserMenu] = useState(false);

  console.log('[Navbar] Current userRole:', userRole);

  const handleLogout = async () => {
    try {
      console.log('[Navbar] Logout clicked');
      if (isLoggingOut) return;
      setShowUserMenu(false);
      navigate('/');
      logout();
      console.log('[Navbar] Logout completed');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };


  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          PerfumesDemo
        </Link>
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/products" className="nav-link">
              {t('nav.productos')}
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/cart" className="nav-link">
              {t('nav.carrito')} ({cartCount})
            </Link>
          </li>
          {userRole === 'admin' && (
              <li className="nav-item">
                <Link to="/admin" className="nav-link nav-admin">
                  📊 Admin
                </Link>
              </li>
            )}
          {userRole === 'dueño' && (
            <>
              <li className="nav-item">
                <Link to="/admin" className="nav-link nav-admin">
                  📊 Productos
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/admin-users" className="nav-link nav-admin">
                  👥 Administradores
                </Link>
              </li>
            </>
          )}
          {user ? (
            <li className="nav-item user-menu-container">
              <button
                className="nav-link user-menu-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                👤 {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </button>
              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <button onClick={handleLogout} className="user-menu-item">
                    {isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}
                  </button>
                </div>
              )}
            </li>
          ) : (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link">
                  {t('nav.iniciarSesion')}
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/signup" className="nav-link nav-link-btn">
                  {t('nav.registrarse')}
                </Link>
              </li>
            </>
          )}
          <li className="nav-item">
            <button className="language-toggle" onClick={toggleLanguage}>
              {language === 'es' ? '🇬🇧 EN' : '🇪🇸 ES'}
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
