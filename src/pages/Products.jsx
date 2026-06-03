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

  const [selectedBrand, setSelectedBrand] = useState('all');
  const [brands, setBrands] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const normalizeBrand = (value) =>
    String(value || '').trim().toLowerCase();

  const formatBrand = (value) =>
    normalizeBrand(value)
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  useEffect(() => {
    fetchPerfumes();
  }, []);

  const fetchPerfumes = async () => {
    try {
      setLoading(true);
      const data = await perfumeService.getAllPerfumes();
      setPerfumes(data);

      const brandMap = new Map();
      data.forEach((perfume) => {
        const normalized = normalizeBrand(perfume.brand);
        if (normalized && !brandMap.has(normalized)) {
          brandMap.set(normalized, formatBrand(perfume.brand));
        }
      });

      setBrands(['all', ...brandMap.values()]);
    } catch (err) {
      setError(t('products.error'));
    } finally {
      setLoading(false);
    }
  };

  // 🔥 RESET PAGE WHEN FILTER CHANGES
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBrand]);

  // 🔥 FILTER
  const filteredPerfumes =
    selectedBrand === 'all'
      ? perfumes
      : perfumes.filter(
          (p) =>
            normalizeBrand(p.brand) === normalizeBrand(selectedBrand)
        );

  // 🔥 PAGINATION LOGIC
  const totalPages = Math.ceil(filteredPerfumes.length / itemsPerPage);

  const paginatedPerfumes = filteredPerfumes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading)
    return <div className="products-loading">{t('products.cargando')}</div>;

  if (error)
    return <div className="products-error">{error}</div>;

  return (
    <div className="products-page">

      <div className="products-header">
        <h1>{t('products.titulo')}</h1>
        <p>{t('products.subtitulo')}</p>
      </div>

      <div className="products-container">

        {/* FILTER */}
        <div className="category-filter">
          <h3>{t('products.marcas')}</h3>

          <div className="category-buttons">
            {brands.map((brand) => (
              <button
                key={brand}
                className={`category-btn ${
                  selectedBrand === brand ? 'active' : ''
                }`}
                onClick={() => setSelectedBrand(brand)}
              >
                {brand === 'all' ? 'All' : brand}
              </button>
            ))}
          </div>
        </div>

        {/* MAIN */}
        <div className="products-main">

          <div className="products-count">
            {t('products.mostrando')} {filteredPerfumes.length}{' '}
            {t('products.productos')}
          </div>

          {/* GRID */}
          <div className="products-grid">
            {paginatedPerfumes.length > 0 ? (
              paginatedPerfumes.map((perfume) => (
                <ProductCard
                  key={perfume.id}
                  perfume={perfume}
                />
              ))
            ) : (
              <p className="no-products">
                {t('products.noPerfumesEncontrados')}
              </p>
            )}
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.max(p - 1, 1))
                }
                disabled={currentPage === 1}
              >
                ←
              </button>

              <span>
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(p + 1, totalPages)
                  )
                }
                disabled={currentPage === totalPages}
              >
                →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Products;