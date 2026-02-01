import crypto from 'crypto';
import axios from 'axios';

const PAYPAL_API = process.env.PAYPAL_MODE === 'live' 
  ? 'https://api.paypal.com'
  : 'https://api.sandbox.paypal.com';

// Verify PayPal signature
export const verifyPayPalSignature = async (webhookEvent, webhookId, headers) => {
  try {
    const transmissionId = headers['paypal-transmission-id'];
    const transmissionTime = headers['paypal-transmission-time'];
    const certUrl = headers['paypal-cert-url'];
    const authAlgo = headers['paypal-auth-algo'];
    const transmissionSig = headers['paypal-transmission-sig'];

    if (!transmissionId || !transmissionTime || !transmissionSig) {
      return false;
    }

    // Get certificate from PayPal
    const certResponse = await axios.get(certUrl);
    const cert = certResponse.data;

    // Reconstruct signed content
    const signedContent = `${transmissionId}|${transmissionTime}|${webhookId}|${JSON.stringify(webhookEvent)}`;

    // Verify signature
    const verifier = crypto.createVerify(authAlgo.replace('SHA', 'RSA-SHA'));
    verifier.update(signedContent);
    
    return verifier.verify(cert, transmissionSig, 'base64');
  } catch (error) {
    console.error('PayPal signature verification error:', error);
    return false;
  }
};

// Verify IPN (Instant Payment Notification) for bank transfers
export const verifyPayPalIPN = async (ipnData) => {
  try {
    const verifyData = { cmd: '_notify-validate', ...ipnData };

    const response = await axios.post(`${PAYPAL_API}/cgi-bin/webscr`, verifyData);
    
    return response.data === 'VERIFIED';
  } catch (error) {
    console.error('PayPal IPN verification error:', error);
    return false;
  }
};

// Validate payment amount matches order
export const validatePaymentAmount = (orderTotal, paymentAmount) => {
  // Allow $0.01 difference for rounding
  return Math.abs(orderTotal - paymentAmount) < 0.01;
};

// Validate payment status
export const isValidPaymentStatus = (status) => {
  const validStatuses = ['COMPLETED', 'APPROVED', 'SUCCESS', 'PAID'];
  return validStatuses.includes(status?.toUpperCase());
};
