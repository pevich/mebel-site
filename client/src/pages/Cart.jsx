import { Link } from "react-router-dom";

export default function Cart({ cart, updateQty, removeItem }) {
  const sum = cart.reduce((s, x) => s + (Number(x.qty)||0) * (Number(x.price)||0), 0);

  if (!cart.length) {
    return (
      <div className="panel">
        <h2 style={{ marginTop:0 }}>Кошик порожній</h2>
        <p style={{ color:"var(--muted)" }}>Додай товари з колекції або зі сторінки товару.</p>
        <Link className="btn btnPrimary" to="/collection">До колекції</Link>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop:0 }}>Кошик</h2>

      <div style={{ display:"grid", gap:12, marginTop:12 }}>
        {cart.map(it => (
          <div key={it.key} className="panel" style={{ background:"rgba(0,0,0,.12)", padding:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"100px 1fr", gap:12, alignItems:"center" }}>
              <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,.12)", background:"rgba(0,0,0,.2)" }}>
                {it.photo ? <img src={it.photo} alt="" style={{ width:"100%", height:76, objectFit:"cover", display:"block" }} /> : null}
              </div>

              <div>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
                  <div style={{ fontWeight:950 }}>{it.name}</div>
                  <div style={{ fontWeight:950 }}>{it.price} грн</div>
                </div>

                <div style={{ color:"var(--muted2)", fontSize:12, marginTop:4 }}>
                  {it.size} / {it.color} / {it.material} • {it.availability}
                </div>

                <div style={{ display:"flex", gap:10, marginTop:10, flexWrap:"wrap", alignItems:"center" }}>
                  <div className="field" style={{ width:160 }}>
                    <div className="label">Кількість</div>
                    <select value={it.qty} onChange={(e)=>updateQty(it.key, e.target.value)}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>

                  <button
                    className="btn"
                    onClick={() => removeItem(it.key)}
                    style={{ borderColor:"rgba(251,113,133,.35)", background:"rgba(251,113,133,.10)" }}
                  >
                    Видалити
                  </button>

                  <Link className="btn" to={`/product/${it.slug}`}>Відкрити товар</Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <div style={{ color:"var(--muted2)" }}>
          Разом: <span style={{ fontWeight:950, color:"var(--text)" }}>{sum} грн</span>
        </div>
        <Link className="btn btnPrimary" to="/checkout">Оформити замовлення</Link>
      </div>
    </div>
  );
}