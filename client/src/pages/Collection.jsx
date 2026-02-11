import { useEffect, useMemo, useState } from "react";
import { getCatalog } from "../lib/api.js";
import ProductCard from "../components/ProductCard.jsx";
import SkeletonCard from "../components/SkeletonCard.jsx";
import { useToast } from "../components/Toaster.jsx";

const CATS = [
  { key: "all", label: "Усі" },
  { key: "sofa", label: "Дивани" },
  { key: "table", label: "Столи" },
  { key: "bed", label: "Ліжка" },
  { key: "chair", label: "Крісла" }
];

export default function Collection({ q, addToCart }) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState(null);
  const [cat, setCat] = useState("all");

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

  const currency = db?.brand?.currency || "грн";

  const filtered = useMemo(() => {
    const list = db?.products || [];
    const qq = (q || "").trim().toLowerCase();
    return list.filter(p => {
      const okCat = cat === "all" ? true : p.category === cat;
      const okQ = !qq ? true :
        (p.name || "").toLowerCase().includes(qq) ||
        (p.description || "").toLowerCase().includes(qq);
      return okCat && okQ;
    });
  }, [db, cat, q]);

  function quickAdd(p) {
    const size = p.sizes?.[0] || "Стандарт";
    const color = p.colors?.[0] || "Стандарт";
    const material = p.materials?.[0] || "Стандарт";

    const unitPrice =
      (p.priceBySizeFinal && size && p.priceBySizeFinal[size] != null)
        ? Number(p.priceBySizeFinal[size])
        : Number(p.priceFinal || 0);

    addToCart?.({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      size,
      color,
      material,
      availability: p.availability === "pre" ? "Під замовлення" : "В наявності",
      price: unitPrice,
      qty: 1,
      photo: p.photos?.[0] || ""
    });

    toast.push({
      type: "success",
      title: "Додано в кошик",
      message: `1 × ${p.name} (${unitPrice} ${currency})`,
      timeout: 1800
    });
  }

  return (
    <>
      <div className="sectionHead">
        <div>
          <h2>Колекція</h2>
          <p>{loading ? "Завантаження…" : `${filtered.length} товарів`}</p>
        </div>
        <div className="chips">
          {CATS.map(x => (
            <div
              key={x.key}
              className={`chip ${cat === x.key ? "chipOn" : ""}`}
              onClick={() => setCat(x.key)}
              role="button"
            >
              {x.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.map(p => (
              <div key={p.id} style={{ gridColumn: "span 4" }}>
                <ProductCard p={p} currency={currency} />
                <div style={{ marginTop: 10, display:"flex", gap:10 }}>
                  <button
                    className="btn btnPrimary"
                    style={{ width:"100%", justifyContent:"center" }}
                    onClick={() => quickAdd(p)}
                  >
                    Додати в кошик
                  </button>
                </div>
              </div>
            ))
        }
      </div>
    </>
  );
}