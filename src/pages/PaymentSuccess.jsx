import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { LanguageContext } from '../context/LanguageContext';
import { paymentService } from '../services/paymentService';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const { clearCart } = useContext(CartContext);
  const { t } = useContext(LanguageContext);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const tokenWs = searchParams.get('token_ws');
  const provider = searchParams.get('provider');
  const orderId = searchParams.get('orderId');
  const paymentStatus = searchParams.get('status');
  const isWebpay = provider === 'webpay' || Boolean(tokenWs);

  const initialStatus = paymentStatus === 'paid'
    ? 'success'
    : (!token && !tokenWs ? 'error' : 'loading');

  const initialMessage = paymentStatus === 'paid'
    ? t('payment.successGeneric')
    : (!token && !tokenWs ? t('payment.missingToken') : t('payment.confirming'));

  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState(initialMessage);
  const requestPromiseRef = useRef(null);
  const finalizedRef = useRef(initialStatus === 'success' || initialStatus === 'error');

  useEffect(() => {
    let cancelled = false;

    const capturePayment = async () => {
      if (finalizedRef.current) {
        return;
      }

      if (paymentStatus === 'paid') {
        finalizedRef.current = true;
        clearCart();
        setStatus('success');
        setMessage(t('payment.successGeneric'));
        return;
      }

      if (!token && !tokenWs) {
        finalizedRef.current = true;
        setStatus('error');
        setMessage(t('payment.missingToken'));
        return;
      }

      try {
        setStatus('loading');
        setMessage(t('payment.confirming'));

        if (!requestPromiseRef.current) {
          requestPromiseRef.current = isWebpay
            ? paymentService.commitWebpayTransaction(tokenWs)
            : paymentService.capturePayPalOrder(token, orderId);
        }

        const response = await requestPromiseRef.current;
        const normalizedStatus = String(response?.status || '').toLowerCase();
        const paymentSucceeded = response && (!response?.status || normalizedStatus === 'paid' || normalizedStatus === 'success');

        if (!paymentSucceeded) {
          throw new Error(t('payment.error'));
        }

        if (!cancelled) {
          finalizedRef.current = true;
          clearCart();
          setStatus('success');
          setMessage(t('payment.successGeneric'));
        }
      } catch (error) {
        if (!cancelled) {
          finalizedRef.current = true;
          setStatus('error');
          setMessage(error.message || t('payment.error'));
        }
      }
    };

    capturePayment();

    return () => {
      cancelled = true;
    };
  }, [clearCart, isWebpay, orderId, paymentStatus, t, token, tokenWs]);

  return (
    <div className="payment-success-page">
      <div className={`payment-card ${status}`}>
        <h1>{isWebpay ? t('payment.webpayTitle') : t('payment.title')}</h1>
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
