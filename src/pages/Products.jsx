import React, { useState, useEffect, useContext } from 'react';
import { perfumeService } from '../services/supabase';
import { LanguageContext } from '../context/LanguageContext';
import ProductCard from '../components/ProductCard';
import './Products.css';

const Products = () => {
  const { t } = useContext(LanguageContext);
  const [perfumes, setPerfumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchPerfumes();
  }, []);

  const fetchPerfumes = async () => {
    try {
      setLoading(true);
      const data = await perfumeService.getAllPerfumes();
      setPerfumes(data);
      
      // Extract unique categories
      const uniqueCategories = ['all', ...new Set(data.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
    } catch (err) {
      setError(t('products.error'));
      console.error('Error fetching perfumes:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPerfumes = selectedCategory === 'all'
    ? perfumes
    : perfumes.filter((p) => p.category === selectedCategory);

  if (loading) return <div className="products-loading">{t('products.cargando')}</div>;
  if (error) return <div className="products-error">{error}</div>;

  return (
    <div className="products-page">
      <div className="products-header">
        <h1>{t('products.titulo')}</h1>
        <p>{t('products.subtitulo')}</p>
      </div>

      <div className="products-container">
        {/* Category Filter */}
        <div className="category-filter">
          <h3>{t('products.categorias')}</h3>
          <div className="category-buttons">
            {categories.map((category) => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="products-main">
          <div className="products-count">
            {t('products.mostrando')} {filteredPerfumes.length} {t('products.productos')}
          </div>
          
          <div className="products-grid">
            {filteredPerfumes.length > 0 ? (
              filteredPerfumes.map((perfume) => (
                <ProductCard key={perfume.id} perfume={perfume} />
              ))
            ) : (
              <p className="no-products">{t('products.noPerfumesEncontrados')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
