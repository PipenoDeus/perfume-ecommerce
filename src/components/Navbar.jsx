import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import './Navbar.css';

const Navbar = ({ user, cartCount }) => {
  const { t, toggleLanguage, language } = useContext(LanguageContext);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          PerfumeShop
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
          {user ? (
            <>
              <li className="nav-item">
                <Link to="/orders" className="nav-link">
                  {t('nav.misOrdenes')}
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/profile" className="nav-link">
                  {t('nav.perfil')}
                </Link>
              </li>
            </>
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
