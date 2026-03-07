import React, { useContext, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { paymentService } from '../services/paymentService';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const { user } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    const token = searchParams.get('token');

    const capturePayment = async () => {
      if (!token) {
        setStatus('error');
        setMessage(t('payment.missingToken'));
        return;
      }

      if (!user) {
        setStatus('error');
        setMessage(t('payment.loginRequired'));
        return;
      }

      try {
        setStatus('loading');
        const response = await paymentService.capturePayPalOrder(token);
        if (isMounted) {
          setStatus('success');
          setMessage(`${t('payment.success')} ${response.orderId}`);
        }
      } catch (error) {
        if (isMounted) {
          setStatus('error');
          setMessage(error.message || t('payment.error'));
        }
      }
    };

    capturePayment();

    return () => {
      isMounted = false;
    };
  }, [searchParams, t, user]);

  return (
    <div className="payment-success-page">
      <div className={`payment-card ${status}`}>
        <h1>{t('payment.title')}</h1>
        <p>{message}</p>
        <div className="payment-actions">
          <Link to="/profile">{t('payment.goProfile')}</Link>
          <Link to="/products">{t('payment.goShop')}</Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
