import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import './Footer.css';

const Footer = () => {
  const { t } = useContext(LanguageContext);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>{t('footer.acercaDe')}</h3>
          <p>{t('footer.acercaDeDesc')}</p>
        </div>

        <div className="footer-section">
          <h3>{t('footer.enlaces')}</h3>
          <ul>
            <li><Link to="/products">{t('footer.tienda')}</Link></li>
            <li><Link to="/">{t('footer.inicio')}</Link></li>
            <li><a href="#contact">{t('footer.contacto')}</a></li>
            <li><a href="#faq">{t('footer.preguntas')}</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>{t('footer.servicio')}</h3>
          <ul>
            <li><a href="#shipping">{t('footer.infoEnvio')}</a></li>
            <li><a href="#returns">{t('footer.devoluciones')}</a></li>
            <li><a href="#privacy">{t('footer.privacidad')}</a></li>
            <li><a href="#terms">{t('footer.terminos')}</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>{t('footer.contactanos')}</h3>
          <p>{t('footer.email')}</p>
          <p>{t('footer.telefono')}</p>
          <p>{t('footer.direccion')}</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} PerfumeShop. {t('footer.derechosReservados')}</p>
        <div className="social-links">
          <a href="#facebook" className="social-icon">f</a>
          <a href="#instagram" className="social-icon">📷</a>
          <a href="#twitter" className="social-icon">𝕏</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
