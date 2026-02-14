import express from "express";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

dotenv.config();

// ---- Crash diagnostics (Render)
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT_EXCEPTION:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED_REJECTION:", reason);
});

const app = express();
app.use(express.json({ limit: "15mb" }));

const PORT = Number(process.env.PORT || 3000);
console.log("BOOT:", { PORT });

const TOKEN = (process.env.BOT_TOKEN || "").trim();
const CHAT = (process.env.CHAT_ID || "").trim();
const ADMIN_PASS = (process.env.ADMIN_PASS || "").trim();

const ROOT = process.cwd();                    // якщо старт: node server/server.js → ROOT = .../server
const PROJECT_ROOT = path.resolve(ROOT, ".."); // корінь репо

const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "catalog.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");

// client build output
const CLIENT_DIST = path.join(PROJECT_ROOT, "client", "dist");

app.use("/uploads", express.static(UPLOAD_DIR));

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // якщо нема каталогу — створимо мінімальний
  try {
    await fs.access(DB_PATH);
  } catch {
    const seed = {
      brand: { currency: "грн", globalMarkupPercent: 0 },
      products: []
    };
    await fs.writeFile(DB_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readDB() {
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeDB(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function adminGuard(req, res) {
  const pass = String(req.headers["x-admin-pass"] || "");
  if (!ADMIN_PASS) return res.status(500).json({ ok: false, error: "ADMIN_PASS_not_set" });
  if (pass !== ADMIN_PASS) return res.status(403).json({ ok: false, error: "forbidden" });
  return null;
}

function safe(s) {
  return String(s ?? "").replace(/[<>]/g, "");
}

async function tgSend(text) {
  if (!TOKEN || !CHAT) throw new Error("Missing BOT_TOKEN or CHAT_ID");

  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT,
      text,
      disable_web_page_preview: true
      // parse_mode НЕ ставимо (щоб не ламалось на спецсимволах)
    })
  });

  const data = await r.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram error: ${data.description || "unknown"}`);
  return data;
}

function calcFinal(base, discountPercent, markupPercent) {
  const b = Math.max(0, Number(base || 0));
  const d = Math.max(0, Math.min(90, Number(discountPercent || 0)));
  const m = Math.max(0, Number(markupPercent || 0));
  const afterDisc = Math.round(b * (1 - d / 100));
  return Math.round(afterDisc * (1 + m / 100));
}

// -------------------- API --------------------
app.get("/api/health", async (req, res) => {
  let hasClientDist = false;
  try {
    await fs.access(path.join(CLIENT_DIST, "index.html"));
    hasClientDist = true;
  } catch {}

  res.json({
    ok: true,
    port: PORT,
    hasTelegram: Boolean(TOKEN && CHAT),
    botTokenStarts: TOKEN ? TOKEN.slice(0, 12) : "",
    chatId: CHAT || "",
    hasAdminPass: Boolean(ADMIN_PASS),
    hasClientDist
  });
});

app.post("/api/test-telegram", async (req, res) => {
  try {
    await tgSend(String(req.body?.text || "✅ TEST OK"));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: "send_failed", message: String(e.message || e) });
  }
});

// -------- Catalog (public) ----------
app.get("/api/catalog", async (req, res) => {
  const db = await readDB();
  const markup = db?.brand?.globalMarkupPercent || 0;

  const out = {
    ...db,
    products: (db.products || []).map((p) => {
      const priceFinal = calcFinal(p.basePrice, p.discountPercent, markup);

      // ціна по розмірах (basePriceBySize)
      const basePriceBySize =
        (p.basePriceBySize && typeof p.basePriceBySize === "object")
          ? p.basePriceBySize
          : null;

      let priceBySizeFinal = null;
      let minPriceFinal = priceFinal;
      let maxPriceFinal = priceFinal;

      if (basePriceBySize) {
        priceBySizeFinal = {};
        const vals = [];

        for (const [size, base] of Object.entries(basePriceBySize)) {
          const pf = calcFinal(base, p.discountPercent, markup);
          priceBySizeFinal[size] = pf;
          vals.push(pf);
        }

        if (vals.length) {
          minPriceFinal = Math.min(...vals);
          maxPriceFinal = Math.max(...vals);
        }
      }

      return {
        ...p,
        priceFinal,
        priceBySizeFinal,
        minPriceFinal,
        maxPriceFinal
      };
    })
  };

  res.json(out);
});

// -------- Admin (protected) ----------
app.get("/api/admin/catalog", async (req, res) => {
  const guard = adminGuard(req, res);
  if (guard) return;
  const db = await readDB();
  res.json(db);
});

app.post("/api/admin/catalog", async (req, res) => {
  const guard = adminGuard(req, res);
  if (guard) return;

  const db = req.body;
  if (!db || typeof db !== "object") return res.status(400).json({ ok: false, error: "bad_body" });
  if (!Array.isArray(db.products)) return res.status(400).json({ ok: false, error: "products_required" });

  await writeDB(db);
  res.json({ ok: true });
});

// Upload base64 dataURL -> file in /public/uploads -> returns url
app.post("/api/admin/upload", async (req, res) => {
  const guard = adminGuard(req, res);
  if (guard) return;

  const dataUrl = String(req.body?.dataUrl || "");
  if (!dataUrl.startsWith("data:image/")) return res.status(400).json({ ok: false, error: "invalid_dataUrl" });

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ ok: false, error: "bad_dataUrl" });

  const mime = match[1];
  const b64 = match[2];

  const ext = mime.includes("png") ? "png" : "jpg";
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, name);

  const buf = Buffer.from(b64, "base64");
  await fs.writeFile(filePath, buf);

  res.json({ ok: true, url: `/uploads/${name}` });
});

// -------- Orders -> Telegram ----------
app.post("/api/order", async (req, res) => {
  try {
    const body = req.body || {};
    const customer = body.customer || {};
    const items = Array.isArray(body.items) ? body.items : [];

    const lines = [];
    lines.push("🧾 Нове замовлення");
    lines.push("");
    lines.push(`👤 Імʼя: ${safe(customer.name || "-")}`);
    lines.push(`📞 Телефон: ${safe(customer.phone || "-")}`);
    lines.push(`🏙 Місто: ${safe(customer.city || "-")}`);
    lines.push(`📦 НП: ${safe(customer.npBranch || "-")}`);
    lines.push(`💳 Оплата: ${safe(customer.payment === "cod" ? "Накладений платіж" : "Картка")}`);
    if (customer.comment) lines.push(`📝 Коментар: ${safe(customer.comment)}`);
    lines.push("");
    lines.push("🛒 Товари:");

    let total = 0;
    items.forEach((it, idx) => {
      const qty = Math.max(1, Number(it.qty || 1));
      const price = Number(it.price || 0);
      const sum = qty * price;
      total += sum;

      lines.push(`${idx + 1}) ${safe(it.name || "Товар")}`);
      lines.push(`   • Опції: ${safe(it.size)} / ${safe(it.color)} / ${safe(it.material)}`);
      lines.push(`   • Наявність: ${safe(it.availability)}`);
      lines.push(`   • ${price} грн × ${qty} = ${sum} грн`);
    });

    lines.push("");
    lines.push(`💰 Разом: ${total} грн`);
    if (body.siteUrl) {
      lines.push("");
      lines.push(`🔗 ${safe(body.siteUrl)}`);
    }

    await tgSend(lines.join("\n"));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: "send_failed", message: String(e.message || e) });
  }
});

// -------------------- Serve Frontend (client/dist) --------------------
async function mountClient() {
  try {
    await fs.access(path.join(CLIENT_DIST, "index.html"));
    console.log("✅ Serving client from:", CLIENT_DIST);

    app.use(express.static(CLIENT_DIST));

    // SPA fallback
    app.get("*", async (req, res) => {
      const html = await fs.readFile(path.join(CLIENT_DIST, "index.html"), "utf8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    });
  } catch (e) {
    console.log("⚠️ client/dist not found:", String(e?.message || e));
    app.get("/", (req, res) => res.status(200).send("Client build not found. API is OK: /api/health"));
  }
}

// -------------------- BOOT --------------------
(async () => {
  try {
    await ensureDirs();
    await mountClient();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Listening on ${PORT}`);
    });
  } catch (e) {
    console.error("BOOT_FATAL:", e);
    process.exit(1);
  }
})();