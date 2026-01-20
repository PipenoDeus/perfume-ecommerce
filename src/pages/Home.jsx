import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import './Home.css';

const Home = () => {
  const { t } = useContext(LanguageContext);

  const bannerUrl = 'https://irkioorwigmlvzkmopfp.supabase.co/storage/v1/object/public/images/paris_hilton_banner_0dd9e5b2-c79b-4eb0-90bc-0b92de373dac.webp';

  return (
    <div className="home-page">
      <section className="hero" style={{ backgroundImage: `url(${bannerUrl})` }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>{t('home.titulo')}</h1>
          <p>{t('home.subtitulo')}</p>
          <Link to="/products" className="cta-button">
            {t('home.botonComprar')}
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="feature-item">
          <div className="feature-icon">🚚</div>
          <h3>{t('home.envioGratis')}</h3>
          <p>{t('home.envioGratisDesc')}</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon">🔒</div>
          <h3>{t('home.pagoSeguro')}</h3>
          <p>{t('home.pagoSeguroDesc')}</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon">💯</div>
          <h3>{t('home.productosAutenticos')}</h3>
          <p>{t('home.productosAutenticosDesc')}</p>
        </div>
        <div className="feature-item">
          <div className="feature-icon">📞</div>
          <h3>{t('home.soporte24')}</h3>
          <p>{t('home.soporte24Desc')}</p>
        </div>
      </section>

      <section className="about">
        <h2>{t('home.acercaDe')}</h2>
        <p>
          {t('home.acercaDeDesc')}
        </p>
      </section>
    </div>
  );
};

export default Home;
