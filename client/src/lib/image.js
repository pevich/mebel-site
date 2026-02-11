export async function compressToDataUrl(file, maxSide = 1600, quality = 0.82) {
  const img = await fileToImage(file);
  const { w, h } = fitSize(img.width, img.height, maxSide);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(img, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", quality);
}

function fitSize(w, h, maxSide) {
  const m = Math.max(w, h);
  if (m <= maxSide) return { w, h };
  const k = maxSide / m;
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}