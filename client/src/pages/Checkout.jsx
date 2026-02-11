import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendOrder } from "../lib/api.js";
import { useToast } from "../components/Toaster.jsx";

export default function Checkout({ cart, cartSum, clearCart }) {
  const toast = useToast();
  const nav = useNavigate();

  const [cust, setCust] = useState({
    name: "",
    phone: "",
    city: "",
    npBranch: "",
    payment: "cod",
    comment: ""
  });

  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  const requiredOk = useMemo(() => {
    return cust.name.trim() && cust.phone.trim() && cust.city.trim() && cust.npBranch.trim();
  }, [cust]);

  function validate() {
    const e = {};
    if (!cust.name.trim()) e.name = "Вкажи імʼя";
    if (!cust.phone.trim()) e.phone = "Вкажи телефон";
    if (!cust.city.trim()) e.city = "Вкажи місто";
    if (!cust.npBranch.trim()) e.npBranch = "Вкажи відділення/поштомат НП";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!cart.length) {
      toast.push({ type:"info", title:"Кошик порожній", message:"Додай товари з колекції.", timeout: 2200 });
      return;
    }
    if (!validate()) {
      toast.push({ type:"error", title:"Заповни обовʼязкові поля", message:"Імʼя, телефон, місто та НП — обовʼязково.", timeout: 2600 });
      return;
    }

    setSending(true);
    try {
      const payload = {
        customer: cust,
        items: cart.map(x => ({
          id: x.productId,
          name: x.name,
          size: x.size,
          color: x.color,
          material: x.material,
          availability: x.availability,
          price: Number(x.price || 0),
          qty: Number(x.qty || 1)
        })),
        siteUrl: window.location.href
      };

      const res = await sendOrder(payload);
      if (!res?.ok) throw new Error(res?.message || "send_failed");

      clearCart?.();

      toast.push({
        type: "success",
        title: "Замовлення прийняте",
        message: "Ми отримали заявку та зв’яжемось з вами найближчим часом.",
        timeout: 2600
      });

      nav("/collection");
    } catch (e) {
      toast.push({
        type: "error",
        title: "Помилка",
        message: "Не вдалося відправити замовлення. Спробуй ще раз або перевір сервер.",
        timeout: 3000
      });
    } finally {
      setSending(false);
    }
  }

  const errStyle = (k) =>
    errors[k]
      ? { borderColor: "rgba(251,113,133,.55)", background: "rgba(251,113,133,.10)" }
      : null;

  if (!cart.length) {
    return (
      <div className="panel">
        <h2 style={{ marginTop:0 }}>Оформлення</h2>
        <p style={{ color:"var(--muted)" }}>Кошик порожній.</p>
        <Link className="btn btnPrimary" to="/collection">До колекції</Link>
      </div>
    );
  }

  return (
    <div className="pageGrid">
      <div className="panel">
        <h2 style={{ marginTop:0 }}>Оформлення</h2>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
          <div className="field" style={errStyle("name")}>
            <div className="label">Імʼя *</div>
            <input value={cust.name} onChange={(e)=>setCust(v=>({...v, name:e.target.value}))} placeholder="Олександр" />
            {errors.name ? <div style={{ color:"rgba(251,113,133,.95)", fontSize:12, marginTop:6 }}>{errors.name}</div> : null}
          </div>

          <div className="field" style={errStyle("phone")}>
            <div className="label">Телефон *</div>
            <input value={cust.phone} onChange={(e)=>setCust(v=>({...v, phone:e.target.value}))} placeholder="+380..." />
            {errors.phone ? <div style={{ color:"rgba(251,113,133,.95)", fontSize:12, marginTop:6 }}>{errors.phone}</div> : null}
          </div>

          <div className="field" style={errStyle("city")}>
            <div className="label">Місто *</div>
            <input value={cust.city} onChange={(e)=>setCust(v=>({...v, city:e.target.value}))} placeholder="Київ" />
            {errors.city ? <div style={{ color:"rgba(251,113,133,.95)", fontSize:12, marginTop:6 }}>{errors.city}</div> : null}
          </div>

          <div className="field" style={errStyle("npBranch")}>
            <div className="label">НП (відділення/поштомат) *</div>
            <input value={cust.npBranch} onChange={(e)=>setCust(v=>({...v, npBranch:e.target.value}))} placeholder="Відділення №..." />
            {errors.npBranch ? <div style={{ color:"rgba(251,113,133,.95)", fontSize:12, marginTop:6 }}>{errors.npBranch}</div> : null}
          </div>

          <div className="field">
            <div className="label">Оплата</div>
            <select value={cust.payment} onChange={(e)=>setCust(v=>({...v, payment:e.target.value}))}>
              <option value="cod">Накладений платіж</option>
              <option value="card">Картка</option>
            </select>
          </div>

          <div className="field">
            <div className="label">Коментар</div>
            <input value={cust.comment} onChange={(e)=>setCust(v=>({...v, comment:e.target.value}))} placeholder="Підйом / час доставки" />
          </div>
        </div>

        <div style={{ marginTop: 12, display:"flex", gap:10, flexWrap:"wrap" }}>
          <button className="btn btnPrimary" disabled={sending || !requiredOk} onClick={submit}>
            {sending ? "Відправка…" : "Підтвердити замовлення"}
          </button>
          <Link className="btn" to="/cart">Назад у кошик</Link>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop:0 }}>Ваше замовлення</h3>

        <div style={{ display:"grid", gap:10 }}>
          {cart.map(x => (
            <div key={x.key} className="panel" style={{ background:"rgba(0,0,0,.12)", padding:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:10 }}>
                <div style={{ fontWeight:950 }}>{x.name}</div>
                <div style={{ fontWeight:950 }}>{(Number(x.price)||0) * (Number(x.qty)||0)} грн</div>
              </div>
              <div style={{ color:"var(--muted2)", fontSize:12, marginTop:6 }}>
                {x.size} / {x.color} / {x.material} • {x.availability}
              </div>
              <div style={{ color:"var(--muted2)", fontSize:12, marginTop:6 }}>
                {x.price} грн × {x.qty}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, color:"var(--muted2)" }}>
          Разом: <span style={{ fontWeight:950, color:"var(--text)" }}>{cartSum} грн</span>
        </div>
      </div>
    </div>
  );
}