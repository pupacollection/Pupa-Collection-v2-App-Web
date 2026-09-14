import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RootLayout from './components/layout/RootLayout';
import { AuthProvider } from './components/auth/AuthProvider';
import Home from './pages/Home';
import Store from './pages/Store';
import Product from './pages/Product';
import Account from './pages/Account';
import PupaVerso from './pages/PupaVerso';
import Community from './pages/Community';
import PupaAI from './pages/PupaAI';
import AdminOrders from "./pages/AdminOrders";
import AdminDrops from "./pages/AdminDrops";
import AdminRewards from './pages/AdminRewards';
import Admin from './pages/Admin';
import AdminCommunity from './pages/AdminCommunity';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import DropPage from "./pages/DropPage";
import PublicIdentity from './pages/PublicIdentity';
import Ranking from './pages/Ranking';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/store" element={<Store />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/orders" element={<Orders />} />
            <Route path="/account/orders/:id" element={<OrderDetails />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/pupaverso" element={<PupaVerso />} />
            <Route path="/community" element={<Community />} />
            <Route path="/u/:username" element={<PublicIdentity />} />
            <Route path="/drop/:slug" element={<DropPage />} />
            <Route path="/pupa-ai" element={<PupaAI />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/community" element={<AdminCommunity />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/success" element={<Success />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
