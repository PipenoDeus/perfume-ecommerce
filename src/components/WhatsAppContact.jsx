import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import './WhatsAppContact.css';

const WHATSAPP_NUMBER = '56972945310';

const WhatsAppContact = () => {
  const { t } = useContext(LanguageContext);
  const message = encodeURIComponent(t('whatsapp.mensajeInicial'));
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      className="whatsapp-contact"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('whatsapp.ariaLabel')}
      title={t('whatsapp.cta')}
    >
      <span className="whatsapp-contact-icon" aria-hidden="true">WA</span>
      <span className="whatsapp-contact-text">{t('whatsapp.cta')}</span>
    </a>
  );
};

export default WhatsAppContact;
