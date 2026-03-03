// app.js — Reviews (GitHub Pages) + Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycby24Z_JSq9WoWOppwy8RyqmMAkPTdwWlcOpL1XLccm0H_jVd25YOQr8wovnyfuPQqxk/exec";

const $ = (s) => document.querySelector(s);

const starsText = $("#starsText");
const avgStarsEl = $("#avgStars");
const avgNpsEl = $("#avgNps");
const countEl = $("#countReviews");

const listEl = $("#list");
const form = $("#reviewForm");
const submitBtn = $("#submitBtn");
const refreshBtn = $("#refreshBtn");

const starPicker = $("#starPicker");
const starsHidden = $("#stars");
const pickedStars = $("#pickedStars");

const nps = $("#nps");
const npsVal = $("#npsVal");

let picked = 0;

// ---------- helpers ----------
function escapeHtml(str){
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function clamp(n, a, b){
  return Math.max(a, Math.min(b, n));
}

function renderPickerUI(value){
  const btns = [...starPicker.querySelectorAll(".starBtn")];
  btns.forEach(b => {
    const v = Number(b.dataset.value);
    b.classList.toggle("on", v <= value);
  });
  pickedStars.textContent = `Elegiste ${value}/5`;
}

// ---------- estrellas: click + hover preview ----------
starPicker.addEventListener("click", (e) => {
  const btn = e.target.closest(".starBtn");
  if (!btn) return;
  picked = Number(btn.dataset.value) || 0;
  starsHidden.value = String(picked);
  renderPickerUI(picked);
});

starPicker.addEventListener("mouseover", (e) => {
  const btn = e.target.closest(".starBtn");
  if (!btn) return;
  const hover = Number(btn.dataset.value) || 0;
  renderPickerUI(hover);
});

starPicker.addEventListener("mouseleave", () => {
  renderPickerUI(picked);
});

renderPickerUI(0);

// ---------- NPS ----------
nps.addEventListener("input", () => {
  npsVal.textContent = nps.value;
});

// ---------- loading skeleton ----------
function renderLoading(){
  listEl.innerHTML = `
    <div class="skItem"><div class="skLine w60"></div><div class="skLine"></div><div class="skLine w40"></div></div>
    <div class="skItem"><div class="skLine w55"></div><div class="skLine"></div><div class="skLine w35"></div></div>
  `;
}

// ---------- load list ----------
async function load(){
  renderLoading();

  let json;
  try{
    const res = await fetch(`${API_URL}?mode=list&approved=1&limit=50`, { method:"GET" });
    json = await res.json();
  } catch {
    listEl.innerHTML = `<p class="muted">No se pudo cargar. Probá de nuevo.</p>`;
    return;
  }

  if (!json?.ok){
    listEl.innerHTML = `<p class="muted">Error: ${escapeHtml(json?.error || "No se pudo cargar")}</p>`;
    return;
  }

  const s = json.summary || { count:0, avg_stars:0, avg_nps:0 };
  starsText.textContent = "★★★★★";
  avgStarsEl.textContent = Number(s.avg_stars || 0).toFixed(1);
  avgNpsEl.textContent = Number(s.avg_nps || 0).toFixed(1);
  countEl.textContent = String(s.count || 0);

  const items = json.items || [];
  if (!items.length){
    listEl.innerHTML = `<p class="muted">Todavía no hay testimonios publicados.</p>`;
    return;
  }

  listEl.innerHTML = items.map(it => {
    const name = (it.name || "Anónimo").trim() || "Anónimo";
    const stars = clamp(Number(it.stars || 0), 0, 5);
    const comment = (it.comment || "").trim();

    return `
      <article class="item">
        <div class="itemLeft">
          <div class="itemTop">
            <h3 class="itemName">${escapeHtml(name)}</h3>
            <div class="itemStars" aria-label="${stars} de 5">
              ${"★".repeat(stars)}${"☆".repeat(5 - stars)}
              <span class="itemScore">${stars}</span>
            </div>
          </div>
          <p class="itemComment">${escapeHtml(comment)}</p>
        </div>
      </article>
    `;
  }).join("");
}

// ---------- submit ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = ($("#name").value || "").trim();
  const stars = Number(starsHidden.value || 0);
  const npsValNum = Number(nps.value || 0);
  const comment = ($("#comment").value || "").trim();

  if (!(stars >= 1 && stars <= 5)){
    alert("Elegí una calificación de 1 a 5 estrellas.");
    return;
  }
  if (!(npsValNum >= 0 && npsValNum <= 10)){
    alert("NPS inválido (0 a 10).");
    return;
  }
  if (!comment){
    alert("Escribí un comentario.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando…";

  const payload = {
    page: location.pathname,
    lead_id: `rev_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
    name,
    stars,
    nps: npsValNum,
    comment,
    approved: false, // moderación
    user_agent: navigator.userAgent
  };

  try{
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Error desconocido");

    $("#name").value = "";
    $("#comment").value = "";
    starsHidden.value = "0";
    picked = 0;
    renderPickerUI(0);

    nps.value = "8";
    npsVal.textContent = "8";

    alert("¡Gracias! Tu reseña fue enviada ✅");
    await load();
  } catch(err){
    console.error(err);
    alert("No se pudo enviar. Probá de nuevo.");
  } finally{
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar reseña";
  }
});

refreshBtn?.addEventListener("click", load);

// init
load();


