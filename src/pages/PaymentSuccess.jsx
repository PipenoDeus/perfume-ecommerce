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
  const provider = searchParams.get('provider');
  const orderId = searchParams.get('orderId');
  const paymentStatus = searchParams.get('status');
  const isFlow = provider === 'flow';
  const flowToken = isFlow ? token : null;
  const paypalOrderToken = !isFlow ? token : null;

  const initialStatus = paymentStatus === 'paid'
    ? 'success'
    : (!paypalOrderToken && !flowToken ? 'error' : 'loading');

  const initialMessage = paymentStatus === 'paid'
    ? t('payment.successGeneric')
    : (!paypalOrderToken && !flowToken ? t('payment.missingToken') : t('payment.confirming'));

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

      if (!paypalOrderToken && !flowToken) {
        finalizedRef.current = true;
        setStatus('error');
        setMessage(t('payment.missingToken'));
        return;
      }

      try {
        setStatus('loading');
        setMessage(t('payment.confirming'));

        if (!requestPromiseRef.current) {
          if (isFlow) {
            requestPromiseRef.current = paymentService.confirmFlowPayment(flowToken, orderId);
          } else {
            requestPromiseRef.current = paymentService.capturePayPalOrder(paypalOrderToken, orderId);
          }
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
  }, [clearCart, flowToken, isFlow, orderId, paymentStatus, paypalOrderToken, t]);

  return (
    <div className="payment-success-page">
      <div className={`payment-card ${status}`}>
        <h1>{isFlow ? t('payment.flowTitle') : t('payment.title')}</h1>
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
