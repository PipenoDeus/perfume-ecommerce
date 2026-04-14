import { useContext, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { CartContext } from './context/CartContext';
import { initializeCSRF } from './services/csrfService';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppContact from './components/WhatsAppContact';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import ProtectedDuenoRoute from './components/ProtectedDuenoRoute';
import ProtectedUserRoute from './components/ProtectedUserRoute';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';
import AdminPanel from './pages/AdminPanel';
import AdminsPanel from './pages/AdminsPanel';
import About from './pages/About';
import FAQ from './pages/FAQ';
import ShippingInfo from './pages/ShippingInfo';
import ReturnsPolicy from './pages/ReturnsPolicy';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import './App.css';

function AppContent() {
  const { user } = useContext(AuthContext);
  const { cart } = useContext(CartContext);

  // Initialize CSRF token on app load
  useEffect(() => {
    initializeCSRF();
  }, []);

  return (
    <>
      <Navbar user={user} cartCount={cart.length} />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/shipping-info" element={<ShippingInfo />} />
          <Route path="/returns" element={<ReturnsPolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancelled" element={<PaymentCancelled />} />
          <Route
            path="/profile"
            element={
              <ProtectedUserRoute>
                <Profile />
              </ProtectedUserRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminPanel />
              </ProtectedAdminRoute>
            }
          />
          <Route
            path="/admin-users"
            element={
              <ProtectedDuenoRoute>
                <AdminsPanel />
              </ProtectedDuenoRoute>
            }
          />
        </Routes>
      </main>
      <WhatsAppContact />
      <Footer />
    </>
  );
}

export default AppContent;
