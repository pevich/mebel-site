import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Collection from "./pages/Collection.jsx";
import Product from "./pages/Product.jsx";
import About from "./pages/About.jsx";
import Delivery from "./pages/Delivery.jsx";
import Admin from "./pages/Admin.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import NotFound from "./pages/NotFound.jsx";

const CART_KEY = "atelier_cart_v1";

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export default function App() {
  const loc = useLocation();
  const [q, setQ] = useState("");

  const ADMIN_PATH = useMemo(() => {
    const p = import.meta.env.VITE_ADMIN_PATH;
    return (p && String(p).trim()) ? `/${String(p).trim()}` : "/studio-8f3k2p";
  }, []);

  const [cart, setCart] = useState(() => loadCart());
  useEffect(() => saveCart(cart), [cart]);

  // KPI для хедера
  const cartCount = useMemo(() => cart.reduce((s, x) => s + (Number(x.qty) || 0), 0), [cart]);
  const cartSum = useMemo(() => cart.reduce((s, x) => s + (Number(x.qty) || 0) * (Number(x.price) || 0), 0), [cart]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [loc.pathname]);

  // API кошика
  function addToCart(item) {
    // item key: productId + size + color + material
    const key = `${item.productId}__${item.size}__${item.color}__${item.material}`;
    setCart(prev => {
      const next = [...prev];
      const i = next.findIndex(x => x.key === key);
      if (i >= 0) next[i] = { ...next[i], qty: Math.min(99, (Number(next[i].qty) || 1) + (Number(item.qty) || 1)) };
      else next.push({ ...item, key, qty: Math.max(1, Number(item.qty) || 1) });
      return next;
    });
  }

  function updateQty(key, qty) {
    const q = Math.max(1, Math.min(99, Number(qty) || 1));
    setCart(prev => prev.map(x => x.key === key ? { ...x, qty: q } : x));
  }

  function removeItem(key) {
    setCart(prev => prev.filter(x => x.key !== key));
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <Layout
      cartCount={cartCount}
      cartSum={cartSum}
      q={q}
      setQ={setQ}
      adminPath={ADMIN_PATH}
    >
      <Routes location={loc} key={loc.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/collection" element={<Collection q={q} addToCart={addToCart} />} />
        <Route path="/product/:slug" element={<Product addToCart={addToCart} />} />
        <Route path="/cart" element={<Cart cart={cart} updateQty={updateQty} removeItem={removeItem} />} />
        <Route path="/checkout" element={<Checkout cart={cart} cartSum={cartSum} clearCart={clearCart} />} />
        <Route path="/about" element={<About />} />
        <Route path="/delivery" element={<Delivery />} />

        <Route path="/admin" element={<Navigate to="/404" replace />} />
        <Route path={ADMIN_PATH} element={<Admin />} />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}