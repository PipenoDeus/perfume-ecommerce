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
  const [activeImage, setActiveImage] = useState('');

  const formatCLP = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    }).format(amount);
  };

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

  const imageList = perfume?.image_urls?.length
    ? perfume.image_urls
    : (perfume?.image_url ? [perfume.image_url] : []);

  useEffect(() => {
    if (imageList.length > 0) {
      setActiveImage(imageList[0]);
    }
  }, [perfume?.id]);

  const genderLabel = {
    hombre: t('productDetail.hombre'),
    mujer: t('productDetail.mujer'),
    unisex: t('productDetail.unisex')
  }[perfume?.gender] || t('productDetail.unisex');

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
        <div className="product-detail-media">
          <div className="product-detail-image">
            <img
              src={activeImage || 'https://via.placeholder.com/400'}
              alt={perfume.name}
            />
          </div>
          {imageList.length > 1 && (
            <div className="product-detail-thumbs">
              {imageList.map((imageUrl) => (
                <button
                  key={imageUrl}
                  type="button"
                  className={`thumb-button ${activeImage === imageUrl ? 'active' : ''}`}
                  onClick={() => setActiveImage(imageUrl)}
                >
                  <img src={imageUrl} alt={perfume.name} />
                </button>
              ))}
            </div>
          )}
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
            <span className="price">{formatCLP(perfume.price)}</span>
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
              <span className="label">{t('productDetail.genero')}:</span>
              <span className="value">{genderLabel}</span>
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
            <div className="product-detail-quantity">
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
