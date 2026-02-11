import { useEffect, useMemo, useState } from "react";
import { adminGetCatalog, adminSaveCatalog, adminUpload } from "../lib/api.js";
import { compressToDataUrl } from "../lib/image.js";

const emptyProduct = () => ({
  id: "",
  slug: "",
  category: "sofa",
  name: "",
  description: "",
  basePrice: 0,
  // ✅ нове: ціна по розмірах (база до знижки/націнки)
  basePriceBySize: {},
  discountPercent: 0,
  availability: "in",
  sizes: ["S","M","L"],
  colors: ["Графіт","Беж"],
  materials: ["Bouclé"],
  photos: [],
  featured: false
});

export default function Admin() {
  const [pass, setPass] = useState(sessionStorage.getItem("adminPass") || "");
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyProduct());
  const [photoUrls, setPhotoUrls] = useState("");

  // ✅ raw текст для нормального вводу з пробілами/комами
  const [sizesText, setSizesText] = useState("");
  const [colorsText, setColorsText] = useState("");
  const [materialsText, setMaterialsText] = useState("");

  const authed = useMemo(() => Boolean(pass), [pass]);

  async function load() {
    if (!pass) return;
    setLoading(true);
    const data = await adminGetCatalog(pass);
    setLoading(false);
    if (data?.ok === false) {
      alert("❌ Невірний пароль або ADMIN_PASS не заданий на сервері");
      return;
    }
    setDb(data);
  }

  useEffect(() => { if (pass) load(); }, []);

  function setPassAndRemember(v) {
    setPass(v);
    sessionStorage.setItem("adminPass", v);
  }

  function slugify(s){
    return String(s||"")
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/(^-|-$)/g, "");
  }

  function syncRawTexts(nextForm) {
    setSizesText((nextForm.sizes || []).join(", "));
    setColorsText((nextForm.colors || []).join(", "));
    setMaterialsText((nextForm.materials || []).join(", "));
  }

  function pickEdit(p) {
    setEditingId(p.id);
    const next = structuredClone(p);
    if (!next.basePriceBySize) next.basePriceBySize = {};
    setForm(next);
    setPhotoUrls("");
    syncRawTexts(next);
  }

  function reset() {
    setEditingId("");
    const next = emptyProduct();
    setForm(next);
    setPhotoUrls("");
    syncRawTexts(next);
  }

  useEffect(() => { syncRawTexts(form); }, []); // init

  function parseCommaList(text) {
    return String(text || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);
  }

  function applyListsFromRaw() {
    const sizes = parseCommaList(sizesText);
    const colors = parseCommaList(colorsText);
    const materials = parseCommaList(materialsText);

    setForm(v => {
      const next = structuredClone(v);
      next.sizes = sizes.length ? sizes : ["Стандарт"];
      next.colors = colors.length ? colors : ["Стандарт"];
      next.materials = materials.length ? materials : ["Стандарт"];

      // ✅ синхронізація цін по розмірах: якщо зʼявився новий розмір — поставимо базову
      next.basePriceBySize = next.basePriceBySize && typeof next.basePriceBySize === "object"
        ? next.basePriceBySize
        : {};
      for (const s of next.sizes) {
        if (next.basePriceBySize[s] == null) next.basePriceBySize[s] = Number(next.basePrice || 0);
      }
      // якщо розмір видалили — прибрати
      for (const k of Object.keys(next.basePriceBySize)) {
        if (!next.sizes.includes(k)) delete next.basePriceBySize[k];
      }
      return next;
    });
  }

  async function addPhotoFiles(files){
    if (!files?.length) return;
    const urls = [];
    for (const f of files) {
      const dataUrl = await compressToDataUrl(f, 1600, 0.82);
      const up = await adminUpload(pass, dataUrl);
      if (up?.ok) urls.push(up.url);
      else alert("Upload error: " + (up?.error || "unknown"));
    }
    setForm(v => ({ ...v, photos: [...(v.photos||[]), ...urls] }));
  }

  function addUrlPhotos(){
    const arr = (photoUrls || "").split("\n").map(x=>x.trim()).filter(Boolean);
    if (!arr.length) return;
    setForm(v => ({ ...v, photos: [...(v.photos||[]), ...arr] }));
    setPhotoUrls("");
  }

  function removePhoto(idx){
    setForm(v => ({ ...v, photos: v.photos.filter((_,i)=>i!==idx) }));
  }

  function setSizeBasePrice(size, value) {
    setForm(v => {
      const next = structuredClone(v);
      next.basePriceBySize = next.basePriceBySize && typeof next.basePriceBySize === "object"
        ? next.basePriceBySize
        : {};
      next.basePriceBySize[size] = Math.max(0, Math.round(Number(value || 0)));
      return next;
    });
  }

  async function saveProduct(){
    if (!db) return;
    if (!form.name.trim()) return alert("Вкажи назву");
    if (!form.photos?.length) return alert("Додай хоча б 1 фото");

    // застосувати raw-поля (щоб точно збереглись списки)
    applyListsFromRaw();

    const prod = structuredClone(form);
    if (!prod.id) prod.id = "p" + Date.now();
    if (!prod.slug) prod.slug = slugify(prod.name) || prod.id;

    prod.basePrice = Math.max(0, Math.round(Number(prod.basePrice||0)));
    prod.discountPercent = Math.max(0, Math.min(90, Math.round(Number(prod.discountPercent||0))));
    prod.sizes = Array.isArray(prod.sizes) ? prod.sizes.filter(Boolean) : ["Стандарт"];
    prod.colors = Array.isArray(prod.colors) ? prod.colors.filter(Boolean) : ["Стандарт"];
    prod.materials = Array.isArray(prod.materials) ? prod.materials.filter(Boolean) : ["Стандарт"];
    prod.photos = Array.isArray(prod.photos) ? prod.photos.filter(Boolean) : [];

    // ✅ гарантуємо basePriceBySize для розмірів
    prod.basePriceBySize = prod.basePriceBySize && typeof prod.basePriceBySize === "object"
      ? prod.basePriceBySize
      : {};
    for (const s of prod.sizes) {
      if (prod.basePriceBySize[s] == null) prod.basePriceBySize[s] = prod.basePrice;
    }
    for (const k of Object.keys(prod.basePriceBySize)) {
      if (!prod.sizes.includes(k)) delete prod.basePriceBySize[k];
    }

    const next = structuredClone(db);
    next.products = Array.isArray(next.products) ? next.products : [];
    const idx = next.products.findIndex(x => x.id === prod.id);
    if (idx >= 0) next.products[idx] = prod;
    else next.products.unshift(prod);

    const res = await adminSaveCatalog(pass, next);
    if (!res?.ok) return alert("Не збереглось: " + (res?.error || res?.message || "unknown"));

    setDb(next);
    reset();
    alert("✅ Збережено");
  }

  async function deleteProduct(id){
    if (!db) return;
    if (!confirm("Видалити товар?")) return;

    const next = structuredClone(db);
    next.products = next.products.filter(x => x.id !== id);

    const res = await adminSaveCatalog(pass, next);
    if (!res?.ok) return alert("Не збереглось: " + (res?.error || "unknown"));
    setDb(next);
    if (editingId === id) reset();
  }

  function exportJson(){
    const blob = new Blob([JSON.stringify(db, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "catalog.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function importJson(file){
    const text = await file.text();
    const obj = JSON.parse(text);
    const res = await adminSaveCatalog(pass, obj);
    if (!res?.ok) return alert("Не збереглось: " + (res?.error || "unknown"));
    setDb(obj);
    alert("✅ Імпортовано");
  }

  return (
    <div className="panel">
      <h2 style={{ marginTop:0 }}>Адмінка (URL: /admin)</h2>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div className="field">
          <div className="label">Пароль</div>
          <input value={pass} onChange={(e)=>setPassAndRemember(e.target.value)} placeholder="ADMIN_PASS" />
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap" }}>
          <button className="btn btnPrimary" onClick={load} disabled={!pass || loading}>
            {loading ? "Завантаження…" : "Завантажити"}
          </button>
          <button className="btn" onClick={reset}>Очистити форму</button>
        </div>
      </div>

      {!authed ? null : (
        <>
          <div style={{ height:14 }} />

          <div className="panel">
            <h3 style={{ marginTop:0 }}>Налаштування бренду</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div className="field">
                <div className="label">Націнка % (глобальна)</div>
                <input
                  type="number"
                  value={db?.brand?.globalMarkupPercent ?? 0}
                  onChange={(e)=>setDb(v=>({ ...v, brand:{ ...(v.brand||{}), globalMarkupPercent: Number(e.target.value||0) }}))}
                />
              </div>
              <div className="field">
                <div className="label">Валюта</div>
                <input
                  value={db?.brand?.currency ?? "грн"}
                  onChange={(e)=>setDb(v=>({ ...v, brand:{ ...(v.brand||{}), currency: e.target.value }}))}
                />
              </div>
            </div>

            <div style={{ marginTop:12, display:"flex", gap:10, flexWrap:"wrap" }}>
              <button className="btn btnPrimary" onClick={async ()=>{
                const res = await adminSaveCatalog(pass, db);
                if (!res?.ok) return alert("Не збереглось");
                alert("✅ Збережено");
              }}>Зберегти налаштування</button>

              <button className="btn" onClick={exportJson}>Експорт JSON</button>

              <label className="btn" style={{ cursor:"pointer" }}>
                Імпорт JSON
                <input type="file" accept="application/json" style={{ display:"none" }}
                  onChange={(e)=>{ const f=e.target.files?.[0]; if(f) importJson(f); e.target.value=""; }}
                />
              </label>
            </div>
          </div>

          <div style={{ height:16 }} />

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div className="panel">
              <h3 style={{ marginTop:0 }}>{editingId ? "Редагування" : "Новий товар"}</h3>

              <div className="field">
                <div className="label">Назва</div>
                <input value={form.name} onChange={(e)=>setForm(v=>({ ...v, name:e.target.value }))} placeholder="Напр. Aurora Bed Frame" />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
                <div className="field">
                  <div className="label">Категорія</div>
                  <select value={form.category} onChange={(e)=>setForm(v=>({ ...v, category:e.target.value }))}>
                    <option value="sofa">Дивани</option>
                    <option value="table">Столи</option>
                    <option value="bed">Ліжка</option>
                    <option value="chair">Крісла</option>
                  </select>
                </div>
                <div className="field">
                  <div className="label">Наявність</div>
                  <select value={form.availability} onChange={(e)=>setForm(v=>({ ...v, availability:e.target.value }))}>
                    <option value="in">В наявності</option>
                    <option value="pre">Під замовлення</option>
                  </select>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
                <div className="field">
                  <div className="label">Ціна (база)</div>
                  <input type="number" value={form.basePrice} onChange={(e)=>setForm(v=>({ ...v, basePrice:e.target.value }))} />
                </div>
                <div className="field">
                  <div className="label">Знижка %</div>
                  <input type="number" value={form.discountPercent} onChange={(e)=>setForm(v=>({ ...v, discountPercent:e.target.value }))} />
                </div>
              </div>

              <div className="field" style={{ marginTop:10 }}>
                <div className="label">Опис</div>
                <textarea value={form.description} onChange={(e)=>setForm(v=>({ ...v, description:e.target.value }))} />
              </div>

              {/* ✅ FIX: ці поля тепер не ріжуть пробіли/коми */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:10 }}>
                <div className="field">
                  <div className="label">Розміри (через кому)</div>
                  <input
                    value={sizesText}
                    onChange={(e)=>setSizesText(e.target.value)}
                    onBlur={applyListsFromRaw}
                    placeholder="S, M, L"
                  />
                </div>
                <div className="field">
                  <div className="label">Кольори (через кому)</div>
                  <input
                    value={colorsText}
                    onChange={(e)=>setColorsText(e.target.value)}
                    onBlur={applyListsFromRaw}
                    placeholder="Графіт, Беж"
                  />
                </div>
                <div className="field">
                  <div className="label">Матеріали (через кому)</div>
                  <input
                    value={materialsText}
                    onChange={(e)=>setMaterialsText(e.target.value)}
                    onBlur={applyListsFromRaw}
                    placeholder="Bouclé, Велюр"
                  />
                </div>
              </div>

              {/* ✅ НОВЕ: ціна по розмірах */}
              <div className="panel" style={{ marginTop: 12, background:"rgba(0,0,0,.12)" }}>
                <h4 style={{ marginTop:0 }}>Ціна по розмірах (база)</h4>
                <div style={{ color:"var(--muted2)", fontSize:12, marginBottom:10 }}>
                  Тут задаєш базову ціну для кожного розміру. Знижка% і націнка% застосуються автоматично.
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {(form.sizes || []).map(s => (
                    <div key={s} className="field">
                      <div className="label">{s}</div>
                      <input
                        type="number"
                        value={form.basePriceBySize?.[s] ?? form.basePrice ?? 0}
                        onChange={(e)=>setSizeBasePrice(s, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div className="field">
                  <div className="label">Додати URL (кожен з нового рядка)</div>
                  <textarea value={photoUrls} onChange={(e)=>setPhotoUrls(e.target.value)} placeholder="https://...&#10;/uploads/..." />
                  <button className="btn" onClick={addUrlPhotos} style={{ marginTop:10 }}>Додати URL</button>
                </div>

                <div className="field">
                  <div className="label">Додати фото з ПК</div>
                  <input type="file" accept="image/*" multiple onChange={(e)=>{ addPhotoFiles(e.target.files); e.target.value=""; }} />
                  <div style={{ color:"var(--muted2)", fontSize:12, marginTop:8 }}>
                    Компресія 1600px / q≈0.82, потім upload у /uploads
                  </div>
                </div>
              </div>

              <div style={{ marginTop:12 }}>
                <div style={{ fontWeight:900, marginBottom:8 }}>Фото ({form.photos?.length || 0})</div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  {(form.photos||[]).map((src, i)=>(
                    <div key={src+i} style={{ width:140 }}>
                      <div style={{ border:"1px solid rgba(255,255,255,.12)", borderRadius:16, overflow:"hidden", background:"rgba(0,0,0,.18)" }}>
                        <img src={src} alt="" style={{ width:"100%", height:90, objectFit:"cover", display:"block" }} />
                      </div>
                      <button className="btn" style={{ width:"100%", marginTop:8 }} onClick={()=>removePhoto(i)}>Видалити</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop:12, display:"flex", gap:10, flexWrap:"wrap" }}>
                <button className="btn btnPrimary" onClick={saveProduct}>Зберегти</button>
                <button className="btn" onClick={reset}>Скинути</button>
              </div>
            </div>

            <div className="panel">
              <h3 style={{ marginTop:0 }}>Товари</h3>
              <div style={{ display:"grid", gap:10 }}>
                {(db?.products || []).map(p=>(
                  <div key={p.id} className="panel" style={{ padding:12, background:"rgba(0,0,0,.14)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontWeight:950 }}>{p.name}</div>
                        <div style={{ color:"var(--muted2)", fontSize:12, marginTop:6 }}>
                          {p.category} • {p.availability} • {p.basePrice} грн {p.discountPercent ? `(-${p.discountPercent}%)` : ""}
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                        <button className="btn" onClick={()=>pickEdit(p)}>Редагувати</button>
                        <button className="btn" onClick={()=>deleteProduct(p.id)} style={{ borderColor:"rgba(251,113,133,.35)", background:"rgba(251,113,133,.10)" }}>
                          Видалити
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ color:"var(--muted2)", fontSize:12, marginTop:12 }}>
                Каталог зберігається у server/data/catalog.json
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}