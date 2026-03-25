import { api, API_BASE_URL } from "./api.js";
import { state } from "./state.js";
import { $ } from "./dom.js";
import { setAlert } from "./ui.js";

function sevBadge(sev) {
  if (sev === "CRITICAL") return "bg-danger";
  if (sev === "WARN") return "bg-warning text-dark";
  return "bg-info";
}

function canManageObservation(obs) {
  const role = String(state.currentUser?.role || "").toUpperCase();
  return role === "ADMIN" || role === "SUPERVISOR" || obs.createdById === state.currentUser?.id;
}

export async function loadObservations(date) {
  const wrap = $("obsList3");
  if (!wrap) return;

  const obs = await api(`/observations?date=${date}`);
  state.last.observations = obs;

  wrap.innerHTML = obs.length ? obs.map(o => `
    <div class="card mb-2">
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-start gap-2">
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

        <div class="mt-3 d-flex flex-wrap gap-2">
          <input type="file" class="form-control form-control-sm" multiple accept="image/*" id="obsFiles_${o.id}" style="max-width:280px;">
          <button class="btn btn-sm btn-outline-primary" data-upload="${o.id}">
            <i class="bi bi-upload me-1"></i>Upload photo
          </button>

          ${canManageObservation(o) ? `
            <button class="btn btn-sm btn-outline-secondary" data-edit="${o.id}">
              <i class="bi bi-pencil-square me-1"></i>Edit
            </button>
            <button class="btn btn-sm btn-outline-danger" data-delete="${o.id}">
              <i class="bi bi-trash me-1"></i>Delete
            </button>
          ` : ""}
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

  wrap.querySelectorAll("button[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.edit);
      openEditObservationModal(id);
    });
  });

  wrap.querySelectorAll("button[data-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.delete);
      await deleteObservation(id, date);
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

export function openEditObservationModal(id) {
  const obs = (state.last.observations || []).find(o => o.id === id);
  if (!obs) return;

  $("editObsId3").value = obs.id;
  $("editObsTitle3").value = obs.title || "";
  $("editObsAnimal3").value = obs.animalTag || "";
  $("editObsSeverity3").value = obs.severity || "INFO";
  $("editObsDesc3").value = obs.description || "";

  bootstrap.Modal.getOrCreateInstance(document.getElementById("editObservationModal")).show();
}

export async function updateObservation(date) {
  const id = Number($("editObsId3")?.value);
  if (!id) return setAlert("danger", "Observation id missing.");

  const title = $("editObsTitle3")?.value?.trim();
  const description = $("editObsDesc3")?.value?.trim();
  const severity = $("editObsSeverity3")?.value || "INFO";
  const animalTag = $("editObsAnimal3")?.value?.trim();

  if (!title) return setAlert("danger", "Title required.");

  await api(`/observations/${id}`, {
    method: "PATCH",
    json: { title, description, severity, animalTag },
  });

  bootstrap.Modal.getOrCreateInstance(document.getElementById("editObservationModal")).hide();
  setAlert("success", "Observation updated.");
  await loadObservations(date);
}

export async function deleteObservation(id, date) {
  const ok = window.confirm("Delete this observation?");
  if (!ok) return;

  await api(`/observations/${id}`, {
    method: "DELETE",
  });

  setAlert("success", "Observation deleted.");
  await loadObservations(date);
}