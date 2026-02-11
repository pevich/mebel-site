import { Link } from "react-router-dom";

export default function ProductCard({ p, currency }) {
  const sale = Number(p.discountPercent || 0) > 0;
  const av = p.availability === "pre" ? "Під замовлення" : "В наявності";
  const avCls = p.availability === "pre" ? "pillWarn" : "pillOk";
  const img = (p.photos && p.photos[0]) ? p.photos[0] : "";

  return (
    <Link className="card" to={`/product/${p.slug}`}>
      <div className="media">
        {img ? <img loading="lazy" src={img} alt={p.name} /> : null}
        <div className="shine" />
        <div className="tagline">
          {sale ? <span className={"pillSm pillSale"}>-{p.discountPercent}%</span> : null}
          <span className={`pillSm ${avCls}`}>{av}</span>
        </div>
      </div>

      <div className="cardBody">
        <h3 className="title">{p.name}</h3>
        <div className="subtle">{p.category?.toUpperCase?.() || "PREMIUM"} • {(p.materials?.[0] || "Premium")}</div>

        <div className="priceRow">
          <div className="price">
            {p.priceFinal} {currency}
            {sale ? <span className="strike">{p.basePrice} {currency}</span> : null}
          </div>
          <div className="cta">Деталі →</div>
        </div>
      </div>
    </Link>
  );
}