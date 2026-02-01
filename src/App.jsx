import { useContext, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { CartContext } from './context/CartContext';
import { initializeCSRF } from './services/csrfService';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import ProtectedDuenoRoute from './components/ProtectedDuenoRoute';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminPanel from './pages/AdminPanel';
import AdminsPanel from './pages/AdminsPanel';
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
      <Footer />
    </>
  );
}

export default AppContent;
