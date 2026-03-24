import { api, API_BASE_URL } from "./api.js";
import { state } from "./state.js";
import { $, setHTML } from "./dom.js";
import { setAlert } from "./ui.js";

function sevBadge(sev) {
  if (sev === "CRITICAL") return "bg-danger";
  if (sev === "WARN") return "bg-warning text-dark";
  return "bg-info";
}

export async function loadObservations(date) {
  const wrap = $("obsList3");
  if (!wrap) return;

  const obs = await api(`/observations?date=${date}`);
  state.last.observations = obs;

  wrap.innerHTML = obs.length ? obs.map(o => `
    <div class="card mb-2">
      <div class="card-body p-2">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <div class="fw-semibold">${o.title}</div>
            <div class="small text-muted">${o.animalTag ?? "—"} · ${o.createdBy?.name ?? "—"}</div>
          </div>
          <span class="badge ${sevBadge(o.severity)}">${o.severity}</span>
        </div>

        ${o.description ? `<div class="small mt-2">${o.description}</div>` : ""}

        <div class="d-flex flex-wrap gap-2 mt-2">
          ${(o.photos || []).map(p => `
            <a href="${p.filePath}" target="_blank">
              <img src="${p.filePath}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid #3333;">
            </a>
          `).join("")}
        </div>

        <div class="mt-2 d-flex gap-2">
          <input type="file" class="form-control form-control-sm" multiple accept="image/*" id="obsFiles_${o.id}">
          <button class="btn btn-sm btn-outline-primary" data-upload="${o.id}">
            <i class="bi bi-upload me-1"></i>Upload
          </button>
        </div>
      </div>
    </div>
  `).join("") : `<div class="text-muted small fst-italic">No observations for this date.</div>`;

  wrap.querySelectorAll("button[data-upload]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.upload);
      const input = $(`obsFiles_${id}`);
      const files = input?.files;
      if (!files || !files.length) return setAlert("danger", "Choose photo(s) first.");

      const fd = new FormData();
      for (const f of files) fd.append("photos", f);

      try {
        await fetch(`${API_BASE_URL}/observations/${id}/photos`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: fd,
        }).then(async r => {
          if (!r.ok) {
            const t = await r.text();
            throw new Error(t);
          }
        });

        setAlert("success", "Uploaded.");
        await loadObservations(date);
      } catch (e) {
        setAlert("danger", "Upload failed: " + e.message);
      }
    });
  });
}

export async function createObservation(date) {
  const title = $("obsTitle3")?.value?.trim();
  const description = $("obsDesc3")?.value?.trim();
  const severity = $("obsSeverity3")?.value || "INFO";
  const animalTag = $("obsAnimal3")?.value?.trim();

  if (!title) return setAlert("danger", "Title required.");

  await api("/observations", {
    method: "POST",
    json: { date, title, description, severity, animalTag },
  });

  if ($("obsTitle3")) $("obsTitle3").value = "";
  if ($("obsDesc3")) $("obsDesc3").value = "";
  if ($("obsAnimal3")) $("obsAnimal3").value = "";

  setAlert("success", "Observation created.");
}
