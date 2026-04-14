import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import './InfoPage.css';

const ShippingInfo = () => {
  const { t } = useContext(LanguageContext);

  return (
    <div className="info-page">
      <section className="info-page-card">
        <h1>{t('shippingPage.title')}</h1>
        <p>{t('shippingPage.intro')}</p>
        <ul className="info-page-list">
          <li>{t('shippingPage.point1')}</li>
          <li>{t('shippingPage.point2')}</li>
          <li>{t('shippingPage.point3')}</li>
        </ul>
      </section>
    </div>
  );
};

export default ShippingInfo;
