import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import './InfoPage.css';

const TermsAndConditions = () => {
  const { t } = useContext(LanguageContext);

  return (
    <div className="info-page">
      <section className="info-page-card">
        <h1>{t('termsPage.title')}</h1>
        <p>{t('termsPage.intro')}</p>
        <ul className="info-page-list">
          <li>{t('termsPage.point1')}</li>
          <li>{t('termsPage.point2')}</li>
          <li>{t('termsPage.point3')}</li>
        </ul>
      </section>
    </div>
  );
};

export default TermsAndConditions;
