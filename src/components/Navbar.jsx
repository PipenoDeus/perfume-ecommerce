import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { perfumeService } from '../services/supabase';
import './Navbar.css';

const Navbar = ({ cartCount }) => {
  const navigate = useNavigate();
  const { user, userRole, logout, isLoggingOut } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [perfumes, setPerfumes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadPerfumes = async () => {
      try {
        const data = await perfumeService.getAllPerfumes();
        if (isMounted) {
          setPerfumes(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isMounted) {
          setPerfumes([]);
        }
      }
    };

    loadPerfumes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setShowUserMenu(false);
    navigate('/');
    logout();
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredPerfumes = normalizedSearch
    ? perfumes
        .filter((perfume) => perfume.name?.toLowerCase().includes(normalizedSearch))
        .slice(0, 6)
    : [];

  const formatTitleCase = (value) =>
    String(value || '')
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const handleSelectPerfume = (perfumeId) => {
    setSearchTerm('');
    setShowResults(false);
    navigate(`/product/${perfumeId}`);
  };


  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          QamarPerfumes
        </Link>
        <div className="nav-search" ref={searchRef}>
          <input
            type="text"
            className="search-input"
            placeholder={t('nav.buscarPlaceholder')}
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
          />
          {showResults && searchTerm.trim().length > 0 && (
            <div className="search-dropdown">
              {filteredPerfumes.length === 0 && (
                <div className="search-empty">{t('nav.sinResultados')}</div>
              )}
              {filteredPerfumes.map((perfume) => (
                <button
                  type="button"
                  key={perfume.id}
                  className="search-item"
                  onClick={() => handleSelectPerfume(perfume.id)}
                >
                  <img
                    src={perfume.image_url || 'https://via.placeholder.com/40'}
                    alt={perfume.name}
                  />
                    <span>{formatTitleCase(perfume.name)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
                  Admin
                </Link>
              </li>
            )}
          {userRole === 'dueño' && (
            <>
              <li className="nav-item">
                <Link to="/admin" className="nav-link nav-admin">
                  Productos
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/admin-users" className="nav-link nav-admin">
                  Administradores
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
                  <Link to="/profile" className="user-menu-item">
                    {t('nav.perfil')}
                  </Link>
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
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
