import express from "express";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(express.json({ limit: "15mb" }));

const PORT = Number(process.env.PORT || 3000);
const TOKEN = (process.env.BOT_TOKEN || "").trim();
const CHAT = (process.env.CHAT_ID || "").trim();
const ADMIN_PASS = (process.env.ADMIN_PASS || "").trim();

const ROOT = process.cwd();                   // .../server (на Render буде так, якщо старт: node server/server.js)
const PROJECT_ROOT = path.resolve(ROOT, ".."); // корінь репо

const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "catalog.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");

// ✅ Папка з білдом фронта (створюється командою: npm run build --prefix client)
const CLIENT_DIST = path.join(PROJECT_ROOT, "client", "dist");

app.use("/uploads", express.static(UPLOAD_DIR));

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // якщо нема каталогу — створимо мінімальний
  try {
    await fs.access(DB_PATH);
  } catch {
    const seed = { brand: { currency: "грн", globalMarkupPercent: 0 }, products: [] };
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
      // ❗ не ставимо parse_mode, щоб не ламалось на символах
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
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    hasTelegram: Boolean(TOKEN && CHAT),
    botTokenStarts: TOKEN ? TOKEN.slice(0, 12) : "",
    chatId: CHAT || "",
    hasAdminPass: Boolean(ADMIN_PASS),
    hasClientDist: false // оновимо нижче після перевірки
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
    products: (db.products || []).map(p => {
      const priceFinal = calcFinal(p.basePrice, p.discountPercent, markup);

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