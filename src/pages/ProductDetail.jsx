import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { perfumeService } from '../services/supabase';
import { CartContext } from '../context/CartContext';
import { LanguageContext } from '../context/LanguageContext';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const { t } = useContext(LanguageContext);
  const { addToCart } = useContext(CartContext);
  const [perfume, setPerfume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    fetchPerfume();
  }, [id]);

  const fetchPerfume = async () => {
    try {
      setLoading(true);
      const data = await perfumeService.getPerfumeById(id);
      setPerfume(data);
    } catch (err) {
      setError(t('productDetail.productoNoEncontrado'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (perfume) {
      addToCart(perfume, quantity);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  if (loading) {
    return <div className="product-detail-loading">{t('products.cargando')}</div>;
  }

  if (error || !perfume) {
    return (
      <div className="product-detail-error">
        <h2>{error || t('productDetail.productoNoEncontrado')}</h2>
        <Link to="/products" className="back-link">{t('productDetail.volver')}</Link>
      </div>
    );
  }

  return (
    <div className="product-detail">
      <Link to="/products" className="back-link">← {t('productDetail.volver')}</Link>

      <div className="product-detail-container">
        <div className="product-detail-image">
          <img
            src={perfume.image_url || 'https://via.placeholder.com/400'}
            alt={perfume.name}
          />
        </div>

        <div className="product-detail-info">
          <div className="product-detail-header">
            <h1>{perfume.name}</h1>
            <p className="product-detail-brand">{perfume.brand}</p>
          </div>

          <div className="product-detail-rating">
            <span className="stars">
              {'⭐'.repeat(Math.round(perfume.rating || 5))}
            </span>
            <span className="reviews">({perfume.reviews_count || 0} reviews)</span>
          </div>

          <div className="product-detail-price">
            <span className="price">${perfume.price}</span>
            {perfume.stock > 0 ? (
              <span className="stock">{t('productDetail.enStock')} ({perfume.stock} {t('productDetail.disponibles')})</span>
            ) : (
              <span className="out-of-stock">{t('productDetail.agotado')}</span>
            )}
          </div>

          <div className="product-detail-description">
            <h3>{t('productDetail.descripcion')}</h3>
            <p>{perfume.description}</p>
          </div>

          <div className="product-detail-details">
            <div className="detail-item">
              <span className="label">{t('productDetail.categoria')}:</span>
              <span className="value">{perfume.category || 'General'}</span>
            </div>
            <div className="detail-item">
              <span className="label">{t('productDetail.tipo')}:</span>
              <span className="value">{t('productDetail.eauDeParfum')}</span>
            </div>
            <div className="detail-item">
              <span className="label">{t('productDetail.tamanio')}:</span>
              <span className="value">50ml / 1.7 oz</span>
            </div>
          </div>

          <div className="product-detail-actions">
            <div className="quantity-selector">
              <label htmlFor="quantity">{t('productDetail.cantidad')}:</label>
              <input
                id="quantity"
                type="number"
                min="1"
                max={perfume.stock}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                disabled={perfume.stock === 0}
              />
            </div>
            <button
              className={`add-to-cart-btn ${addedToCart ? 'added' : ''}`}
              onClick={handleAddToCart}
              disabled={perfume.stock === 0}
            >
              {addedToCart ? t('productDetail.agregadoCarrito') : t('productDetail.agregarCarrito')}
            </button>
          </div>

          <div className="product-detail-features">
            <h3>{t('productDetail.caracteristicas')}</h3>
            <ul>
              <li>{t('productDetail.autenticoDesc')}</li>
              <li>{t('productDetail.calidadPremium')}</li>
              <li>{t('productDetail.duradera')}</li>
              <li>{t('productDetail.envioGratisDesc')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
