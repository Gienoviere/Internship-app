export const $ = (id) => document.getElementById(id);

export function on(id, ev, fn) {
  const el = $(id);
  if (!el) return;
  el.addEventListener(ev, fn);
}

export function setText(id, text) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
}

export function setHTML(id, html) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = html;
}

export function show(id) {
  const el = $(id);
  if (!el) return;
  el.classList.remove("d-none");
}

export function hide(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add("d-none");
}