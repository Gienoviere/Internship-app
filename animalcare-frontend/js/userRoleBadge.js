async function syncNavbarUserShared() {
  const badge =
    document.getElementById("userRoleBadge3") ||
    document.getElementById("userRoleBadge") ||
    document.getElementById("userRoleBadgeObs");

  const logoutBtn =
    document.getElementById("btnLogout3") ||
    document.getElementById("btnLogoutObs");

  const token = localStorage.getItem("token");

  if (!token) {
    if (badge) badge.textContent = "Not logged in";
    if (logoutBtn) logoutBtn.classList.add("d-none");
    return;
  }

  try {
    const res = await fetch("http://localhost:3001/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Failed to load current user");

    const me = await res.json();
    const currentUser = me.user || me;

    if (badge) {
      badge.textContent =
        currentUser?.role || currentUser?.username || "Logged in";
    }

    if (logoutBtn) {
      logoutBtn.classList.remove("d-none");
      logoutBtn.onclick = () => {
        localStorage.removeItem("token");
        window.location.href = "/index.html";
      };
    }
  } catch (err) {
    console.error("Navbar auth sync failed:", err);
    if (badge) badge.textContent = "Not logged in";
    if (logoutBtn) logoutBtn.classList.add("d-none");
  }
}

function setActiveSidebarLink() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const links = document.querySelectorAll("#sidebarNav .nav-link");

  links.forEach(link => {
    const page = link.getAttribute("data-page");
    if (page === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  syncNavbarUserShared();
  setActiveSidebarLink();
});