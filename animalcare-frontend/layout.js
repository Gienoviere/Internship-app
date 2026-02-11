// js/layout.js
import { $ } from "./api.js";

export function applyBootstrapLayout() {
  $("globalDate3")?.classList.add("form-control", "form-control-sm", "w-auto", "d-inline-block");
  $("roleView3")?.classList.add("form-select", "form-select-sm", "w-auto", "d-inline-block");
  $("btnRefresh3")?.classList.add("btn", "btn-sm", "btn-outline-primary");

  const tasksTbody = $("tasksTable3");
  if (tasksTbody) {
    const table = tasksTbody.closest("table");
    if (table && !table.closest(".card")) {
      const parent = table.parentNode;
      const card = document.createElement("div");
      card.className = "card mb-4 shadow-sm";
      const cardHeader = document.createElement("div");
      cardHeader.className = "card-header bg-light d-flex justify-content-between align-items-center";
      cardHeader.innerHTML = `<span><i class="bi bi-list-task me-2"></i><strong>Recente taken voor vandaag</strong></span>
                              <span id="tasksCount3" class="badge bg-primary rounded-pill">0 taken</span>`;
      const cardBody = document.createElement("div");
      cardBody.className = "card-body p-0";
      parent.replaceChild(card, table);
      card.appendChild(cardHeader);
      card.appendChild(cardBody);
      cardBody.appendChild(table);
      table.classList.add("table", "table-sm", "table-hover", "mb-0", "align-middle");
    }
  }

  const adminSections = [
    { id: "kpiMissed3", title: "Gemiste taken", icon: "exclamation-triangle-fill" },
    { id: "warningsTable3", title: "Voorraadwaarschuwingen", icon: "exclamation-triangle" },
    { id: "overviewTable3", title: "Dagelijks overzicht", icon: "calendar-day" },
  ];
  adminSections.forEach((section) => {
    let el = $(section.id);
    if (el && !el.closest(".card") && section.id !== "warningsTable3") {
      const parent = el.parentNode;
      const card = document.createElement("div");
      card.className = "card mb-3 h-100";
      const cardHeader = document.createElement("div");
      cardHeader.className = "card-header bg-light py-2";
      cardHeader.innerHTML = `<i class="bi bi-${section.icon} me-2"></i><strong>${section.title}</strong>`;
      const cardBody = document.createElement("div");
      cardBody.className = "card-body p-2";
      parent.replaceChild(card, el);
      card.appendChild(cardHeader);
      card.appendChild(cardBody);
      cardBody.appendChild(el);
    }
  });

  const supQueue = $("supQueue3");
  if (supQueue && !supQueue.closest(".card")) {
    const parent = supQueue.parentNode;
    const card = document.createElement("div");
    card.className = "card mb-3";
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header bg-warning bg-opacity-25 py-2";
    cardHeader.innerHTML = `<i class="bi bi-hourglass-split me-2"></i><strong>Goedkeuring wachtrij</strong>`;
    const cardBody = document.createElement("div");
    cardBody.className = "card-body p-2";
    parent.replaceChild(card, supQueue);
    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    cardBody.appendChild(supQueue);
  }
}
