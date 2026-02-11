export async function getCatalog() {
  const r = await fetch("/api/catalog");
  return r.json();
}

export async function adminGetCatalog(pass) {
  const r = await fetch("/api/admin/catalog", { headers: { "x-admin-pass": pass } });
  return r.json();
}

export async function adminSaveCatalog(pass, db) {
  const r = await fetch("/api/admin/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-pass": pass },
    body: JSON.stringify(db)
  });
  return r.json();
}

export async function adminUpload(pass, dataUrl) {
  const r = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-pass": pass },
    body: JSON.stringify({ dataUrl })
  });
  return r.json();
}

export async function sendOrder(payload) {
  const r = await fetch("/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return r.json();
}