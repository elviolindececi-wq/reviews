// ======================
// CONFIG
// ======================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby24Z_JSq9WoWOppwy8RyqmMAkPTdwWlcOpL1XLccm0H_jVd25YOQr8wovnyfuPQqxk/exec";

// Page tag para separar reseñas por landing (opcional)
// Ej: si la web es /reviews/?page=landing-ceci => guarda y lee esas reseñas
const qs = new URLSearchParams(location.search);
const PAGE = qs.get("page") || "default";

const $ = (s) => document.querySelector(s);

function uuid() {
  try { if (crypto?.randomUUID) return crypto.randomUUID(); } catch {}
  return "lead_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function starsText(n) {
  const full = "★★★★★";
  const empty = "☆☆☆☆☆";
  const k = Math.max(0, Math.min(5, Number(n) || 0));
  return full.slice(0, k) + empty.slice(0, 5 - k);
}

// ======================
// STATE
// ======================
let selectedStars = 0;
const lead_id = uuid();

// ======================
// UI init
// ======================
function initStarsPicker() {
  const wrap = $("#starsPick");
  wrap.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "starBtn";
    b.textContent = "★";
    b.setAttribute("aria-label", `${i} estrellas`);
    b.addEventListener("click", () => {
      selectedStars = i;
      renderStarsPicker();
      $("#starsHint").textContent = `Elegiste ${i}/5`;
    });
    wrap.appendChild(b);
  }

  renderStarsPicker();
}

function renderStarsPicker() {
  const btns = Array.from(document.querySelectorAll(".starBtn"));
  btns.forEach((b, idx) => {
    const i = idx + 1;
    b.classList.toggle("on", i <= selectedStars);
    b.style.opacity = (i <= selectedStars) ? "1" : "0.35";
  });
}

// NPS bubble
function initNps() {
  const r = $("#nps");
  const b = $("#npsBubble");
  b.textContent = r.value;
  r.addEventListener("input", () => (b.textContent = r.value));
}

// ======================
// LOAD summary + items
// ======================
async function load() {
  const url = `${SCRIPT_URL}?page=${encodeURIComponent(PAGE)}`;
  const res = await fetch(url, { method: "GET" });
  const data = await res.json();

  if (!data.ok) {
    $("#countDisplay").textContent = "Error cargando reseñas";
    $("#starsDisplay").textContent = "★★★★★ 0.0";
    $("#npsAvg").textContent = "0.0";
    $("#listEmpty").textContent = data.error || "Error";
    return;
  }

  const summary = data.summary || { count: 0, avg_stars: 0, avg_nps: 0, stars_display: "★★★★★ 0.0" };
  $("#starsDisplay").textContent = summary.stars_display || "★★★★★ 0.0";
  $("#countDisplay").textContent = `${summary.count || 0} reseñas`;
  $("#npsAvg").textContent = (summary.avg_nps ?? 0).toFixed(1);

  renderList(data.items || []);
}

function renderList(items) {
  const list = $("#list");
  const empty = $("#listEmpty");

  list.innerHTML = "";
  if (!items.length) {
    empty.textContent = "Aún no hay testimonios aprobados para mostrar.";
    return;
  }
  empty.textContent = "";

  items.forEach((x) => {
    const div = document.createElement("div");
    div.className = "item";

    const name = (x.name || "").trim() || "Anónimo";
    const st = starsText(x.stars);

    div.innerHTML = `
      <div class="itemTop">
        <div class="itemName">${escapeHtml(name)}</div>
        <div class="itemStars">${escapeHtml(st)} ${(Number(x.stars)||0).toFixed(1).replace(".0","")}</div>
      </div>
      <div class="itemComment">${escapeHtml(x.comment || "")}</div>
    `;
    list.appendChild(div);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

// ======================
// SUBMIT
// ======================
async function submitReview(e) {
  e.preventDefault();

  const status = $("#status");
  const btn = $("#submitBtn");

  const payload = {
    page: PAGE,
    lead_id,
    name: ($("#name").value || "").trim(),
    stars: selectedStars,
    nps: Number($("#nps").value || 0),
    comment: ($("#comment").value || "").trim()
  };

  if (!payload.stars || payload.stars < 1 || payload.stars > 5) {
    status.textContent = "Elegí una calificación de 1 a 5 estrellas.";
    return;
  }
  if (!payload.comment) {
    status.textContent = "Escribí un comentario (obligatorio).";
    return;
  }

  status.textContent = "Enviando…";
  btn.disabled = true;

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Error");

    status.textContent = "¡Gracias! Tu reseña quedará visible cuando sea aprobada ✅";
    $("#comment").value = "";
    $("#name").value = "";
    selectedStars = 0;
    renderStarsPicker();

    // Recargar lista/promedio (solo mostrará aprobadas)
    await load();

  } catch (err) {
    status.textContent = "Error enviando. Probá de nuevo.";
    console.error(err);
  } finally {
    btn.disabled = false;
  }
}

// ======================
// INIT
// ======================
initStarsPicker();
initNps();
$("#reviewForm").addEventListener("submit", submitReview);
load();
