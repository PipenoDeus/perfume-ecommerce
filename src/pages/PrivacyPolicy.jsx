import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import './InfoPage.css';

const PrivacyPolicy = () => {
  const { t } = useContext(LanguageContext);

  return (
    <div className="info-page">
      <section className="info-page-card">
        <h1>{t('privacyPage.title')}</h1>
        <p>{t('privacyPage.intro')}</p>
        <ul className="info-page-list">
          <li>{t('privacyPage.point1')}</li>
          <li>{t('privacyPage.point2')}</li>
          <li>{t('privacyPage.point3')}</li>
        </ul>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
