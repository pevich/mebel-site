import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <div className="hero">
      <div className="heroRow">
        <div>
          <h1 className="h1"><span>Меблі</span>, які виглядають дорого — і відчуваються ще дорожче.</h1>
          <p className="lead">
            Преміум каталог з окремими сторінками товарів, швидким оформленням та Telegram-підтвердженням.
            Фото з ПК стискаються і зберігаються на сервері.
          </p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:16 }}>
            <Link className="btn btnPrimary" to="/collection">Дивитись колекцію <span className="kbd">Enter</span></Link>
            <Link className="btn" to="/delivery">Гарантія / Доставка</Link>
          </div>
          <div style={{ marginTop:10, color:"var(--muted2)", fontSize:12 }}>
            Підказка: сторінки плавно переходять без модалок.
          </div>
        </div>

        <div className="heroCard">
          <div className="mini">
            <div>
              <div style={{ fontWeight:900 }}>Оформлення</div>
              <div style={{ color:"var(--muted2)", fontSize:12, marginTop:2 }}>Форма + Telegram</div>
            </div>
            <span className="badge badgeOk">LIVE</span>
          </div>

          <div className="mini">
            <div>
              <div style={{ fontWeight:900 }}>Фото з ПК</div>
              <div style={{ color:"var(--muted2)", fontSize:12, marginTop:2 }}>Компресія + Upload</div>
            </div>
            <span className="badge">SMART</span>
          </div>

          <div className="mini">
            <div>
              <div style={{ fontWeight:900 }}>Преміум UI</div>
              <div style={{ color:"var(--muted2)", fontSize:12, marginTop:2 }}>Glass / Typography / Grid</div>
            </div>
            <span className="badge">DTC</span>
          </div>

          <div className="mini">
            <div>
              <div style={{ fontWeight:900 }}>Каталог на сервері</div>
              <div style={{ color:"var(--muted2)", fontSize:12, marginTop:2 }}>JSON база</div>
            </div>
            <span className="badge">JSON</span>
          </div>
        </div>
      </div>
    </div>
  );
}