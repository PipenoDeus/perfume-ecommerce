import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { LanguageContext } from '../context/LanguageContext';
import './ProductCard.css';

const ProductCard = ({ perfume }) => {
  const { addToCart } = useContext(CartContext);
  const { t } = useContext(LanguageContext);
  const stock = Number(perfume.stock || 0);
  const isOutOfStock = stock <= 0;

  const formatCLP = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (isOutOfStock) return;
    addToCart(perfume, 1);
  };

  return (
    <Link to={`/product/${perfume.id}`} className="product-card-link">
      <div className="product-card">
        <div className="product-image">
          <img
            src={perfume.image_urls?.[0] || perfume.image_url || 'https://via.placeholder.com/250'}
            alt={perfume.name}
          />
        </div>
        <div className="product-info">
          <h3 className="product-name">
            {perfume.name} - stock {stock}
          </h3>
          <p className="product-brand">{perfume.brand}</p>
          <p className="product-description">{perfume.description}</p>
          <div className="product-footer">
            <span className="product-price">{formatCLP(perfume.price)}</span>
            <div className="product-actions" onClick={(e) => e.preventDefault()}>
              <button className="add-to-cart-btn" onClick={handleAddToCart} disabled={isOutOfStock}>
                {isOutOfStock ? 'Agotado' : t('productCard.agregarCarrito')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
