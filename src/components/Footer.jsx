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
            <li><Link to="/about">{t('footer.sobreNosotros')}</Link></li>
            <li><Link to="/faq">{t('footer.preguntas')}</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>{t('footer.servicio')}</h3>
          <ul>
            <li><Link to="/shipping-info">{t('footer.infoEnvio')}</Link></li>
            <li><Link to="/returns">{t('footer.devoluciones')}</Link></li>
            <li><Link to="/privacy-policy">{t('footer.privacidad')}</Link></li>
            <li><Link to="/terms-and-conditions">{t('footer.terminos')}</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>{t('footer.contactanos')}</h3>
          <p>{t('footer.email')}</p>
          <p>{t('footer.whatsapp')}</p>
          <p>{t('footer.direccion')}</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} QamarPerfumes. {t('footer.derechosReservados')}</p>
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
