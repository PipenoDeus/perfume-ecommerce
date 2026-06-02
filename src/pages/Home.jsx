import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LanguageContext } from '../context/LanguageContext';
import { perfumeService } from '../services/supabase';
import ProductCard from '../components/ProductCard';
import './Home.css';

const Home = () => {
  const { t } = useContext(LanguageContext);
  const [featuredPerfumes, setFeaturedPerfumes] = useState([]);
  const [loadingPerfumes, setLoadingPerfumes] = useState(true);

  const bannerUrl = 'https://irkioorwigmlvzkmopfp.supabase.co/storage/v1/object/public/images/descarga.png';

  useEffect(() => {
    let isMounted = true;

    const loadPerfumes = async () => {
      try {
        setLoadingPerfumes(true);
        const data = await perfumeService.getAllPerfumes();
        const sorted = [...(data || [])].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
        if (isMounted) {
          setFeaturedPerfumes(sorted.slice(0, 8));
        }
      } catch (error) {
        if (isMounted) {
          setFeaturedPerfumes([]);
        }
      } finally {
        if (isMounted) {
          setLoadingPerfumes(false);
        }
      }
    };

    loadPerfumes();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="home-page">
      <section className="hero" style={{ backgroundImage: `url(${bannerUrl})` }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>{t('home.titulo')}</h1>
          <p>{t('home.subtitulo')}</p>
        </div>
      </section>

      <section className="home-products">
        <div className="home-products-header">
          <div>
            <h2>{t('home.destacadosTitulo')}</h2>
            <p>{t('home.destacadosSubtitulo')}</p>
          </div>
        </div>
        {loadingPerfumes ? (
          <div className="home-products-state">{t('home.cargandoProductos')}</div>
        ) : featuredPerfumes.length === 0 ? (
          <div className="home-products-state">{t('home.sinProductos')}</div>
        ) : (
          <div className="home-products-grid">
            {featuredPerfumes.map((perfume) => (
              <ProductCard key={perfume.id} perfume={perfume} />
            ))}
          </div>
        )}
        <div className="home-products-footer">
          <Link to="/products" className="home-store-btn">
            Ver tienda
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Home;
