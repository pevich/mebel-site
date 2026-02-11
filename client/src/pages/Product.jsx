import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getCatalog } from "../lib/api.js";
import { useToast } from "../components/Toaster.jsx";

export default function Product({ addToCart }) {
  const toast = useToast();
  const { slug } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [opts, setOpts] = useState({ size:"", color:"", material:"", qty:1 });

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await getCatalog();
      if (!alive) return;
      setDb(data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const p = useMemo(() => (db?.products || []).find(x => x.slug === slug), [db, slug]);
  const currency = db?.brand?.currency || "грн";

  useEffect(() => {
    if (!p) return;
    setImgIdx(0);
    setOpts({
      size: p.sizes?.[0] || "Стандарт",
      color: p.colors?.[0] || "Стандарт",
      material: p.materials?.[0] || "Стандарт",
      qty: 1
    });
  }, [p?.id]);

  if (loading) {
    return (
      <div className="panel">
        <div style={{ height: 14, width: 260 }} className="skelLine w80" />
        <div style={{ height: 12, width: 360, marginTop: 10 }} className="skelLine w80" />
        <div style={{ height: 280, borderRadius: 20, marginTop: 14 }} className="skel" />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="panel">
        <h2 style={{ marginTop:0 }}>Товар не знайдено</h2>
        <button className="btn btnPrimary" onClick={() => nav("/collection")}>Повернутись до колекції</button>
      </div>
    );
  }

  const sale = Number(p.discountPercent || 0) > 0;
  const av = p.availability === "pre" ? "Під замовлення" : "В наявності";
  const avColor = p.availability === "pre" ? "var(--warn)" : "var(--ok)";
  const photos = p.photos || [];
  const main = photos[imgIdx] || photos[0] || "";

  const unitPrice =
    (p.priceBySizeFinal && opts.size && p.priceBySizeFinal[opts.size] != null)
      ? Number(p.priceBySizeFinal[opts.size])
      : Number(p.priceFinal || 0);

  const qty = Math.max(1, Number(opts.qty || 1));
  const total = unitPrice * qty;

  function add() {
    addToCart?.({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      size: opts.size,
      color: opts.color,
      material: opts.material,
      availability: av,
      price: unitPrice,
      qty,
      photo: photos?.[0] || ""
    });

    toast.push({
      type: "success",
      title: "Додано в кошик",
      message: `${qty} × ${p.name} — ${total} ${currency}`,
      timeout: 1900
    });
  }

  return (
    <div className="pageGrid">
      <div className="panel">
        <div className="gallery">
          <div className="mainImg">
            {main ? <img loading="eager" src={main} alt={p.name} /> : null}
          </div>
          <div className="thumbs">
            {photos.map((src, i) => (
              <div
                key={src + i}
                className={`thumbBtn ${i === imgIdx ? "thumbOn" : ""}`}
                onClick={() => setImgIdx(i)}
                role="button"
              >
                <img loading="lazy" src={src} alt="" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <h1 style={{ marginTop:0, marginBottom:10, letterSpacing:"-.01em" }}>{p.name}</h1>
        <div style={{ color:"var(--muted)", lineHeight:1.65 }}>{p.description}</div>

        <div style={{ marginTop: 12, display:"flex", gap:10, flexWrap:"wrap" }}>
          <span className="pillSm" style={{ borderColor:"rgba(255,255,255,.14)" }}>{p.category.toUpperCase()}</span>
          <span className="pillSm" style={{ borderColor: avColor, background:"rgba(0,0,0,.18)" }}>{av}</span>
          {sale ? <span className="pillSm pillSale">-{p.discountPercent}%</span> : null}
        </div>

        <div style={{ marginTop: 14, display:"flex", alignItems:"baseline", gap:10 }}>
          <div style={{ fontSize:26, fontWeight:950 }}>{unitPrice} {currency}</div>
          {sale ? <div style={{ textDecoration:"line-through", color:"rgba(234,240,255,.42)" }}>{p.basePrice} {currency}</div> : null}
        </div>

        <div style={{ marginTop: 14, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div className="field">
            <div className="label">Розмір</div>
            <select value={opts.size} onChange={(e)=>setOpts(v=>({...v, size:e.target.value}))}>
              {(p.sizes||["Стандарт"]).map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <div className="label">Колір</div>
            <select value={opts.color} onChange={(e)=>setOpts(v=>({...v, color:e.target.value}))}>
              {(p.colors||["Стандарт"]).map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <div className="label">Матеріал</div>
            <select value={opts.material} onChange={(e)=>setOpts(v=>({...v, material:e.target.value}))}>
              {(p.materials||["Стандарт"]).map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <div className="label">Кількість</div>
            <select value={opts.qty} onChange={(e)=>setOpts(v=>({...v, qty:Number(e.target.value)}))}>
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14, display:"flex", gap:10, flexWrap:"wrap" }}>
          <button className="btn btnPrimary" onClick={add}>
            Додати в кошик — {total} {currency}
          </button>
          <Link className="btn" to="/cart">Кошик</Link>
          <Link className="btn" to="/checkout">Оформити</Link>
        </div>

        <div style={{ marginTop: 10, color:"var(--muted2)", fontSize:12 }}>
          Після оформлення отримаєш підтвердження “Замовлення прийняте”.
        </div>
      </div>
    </div>
  );
}