import React, { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';
import './InfoPage.css';

const ReturnsPolicy = () => {
  const { t } = useContext(LanguageContext);

  return (
    <div className="info-page">
      <section className="info-page-card">
        <h1>{t('returnsPage.title')}</h1>
        <p>{t('returnsPage.intro')}</p>
        <ul className="info-page-list">
          <li>{t('returnsPage.point1')}</li>
          <li>{t('returnsPage.point2')}</li>
          <li>{t('returnsPage.point3')}</li>
        </ul>
      </section>
    </div>
  );
};

export default ReturnsPolicy;
