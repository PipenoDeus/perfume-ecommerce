import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import './About.css';

const About = () => {
  const { t } = useContext(LanguageContext);

  return (
    <div className="about-page">
      <section className="about-page-hero">
        <span className="about-page-badge">{t('aboutPage.badge')}</span>
        <h1>{t('aboutPage.title')}</h1>
        <p>{t('aboutPage.description')}</p>
      </section>

      <section className="about-page-content">
        <article className="about-page-card">
          <h2>{t('aboutPage.missionTitle')}</h2>
          <p>{t('aboutPage.missionText')}</p>
        </article>

        <article className="about-page-card">
          <h2>{t('aboutPage.shippingTitle')}</h2>
          <p>{t('aboutPage.shippingText')}</p>
        </article>
      </section>

      <div className="about-page-actions">
        <Link to="/products" className="about-page-btn">
          {t('aboutPage.cta')}
        </Link>
      </div>
    </div>
  );
};

export default About;
