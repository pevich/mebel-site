import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Layout({ children, cartCount = 0, cartSum = 0, q, setQ, adminPath }) {
  const nav = useNavigate();

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
        nav(adminPath);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adminPath, nav]);

  return (
    <>
      <div className="topbar">
        <div className="topbarInner">
          <Link className="brand" to="/">
            <div className="logo" />
            <div>
              <div className="brandName">ATELIER</div>
              <div className="brandTag">Premium Furniture Studio</div>
            </div>
          </Link>

          <div className="grow" />

          <div className="search" title="Пошук">
            <span style={{ opacity: .85 }}>⌕</span>
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Пошук: диван, стіл, ліжко..." />
          </div>

          <Link className="pill" to="/cart" title="Перейти в кошик">
            <span className="dot" />
            <div>
              <div className="kpi">{cartCount} позицій</div>
              <div className="sub">{cartSum} грн</div>
            </div>
          </Link>
        </div>
      </div>

      <div className="container">
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:14 }}>
          <NavLink className="btn" to="/collection">Колекція</NavLink>
          <NavLink className="btn" to="/cart">Кошик</NavLink>
          <NavLink className="btn" to="/about">Про нас</NavLink>
          <NavLink className="btn" to="/delivery">Гарантія / Доставка</NavLink>
        </div>

        <div className="page" style={{ marginTop:16 }}>
          {children}
        </div>
      </div>

      <div className="footer">
        <div className="footerInner">
          <div>
            <div style={{ fontWeight:900, letterSpacing:".12em" }}>ATELIER</div>
            <div className="small">© {new Date().getFullYear()} Premium Furniture Studio</div>
          </div>
          <div className="small">Оформлення йде в Telegram. Адмінка прихована (Ctrl+Shift+A).</div>
        </div>
      </div>
    </>
  );
}