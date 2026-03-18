async function loadPartial(elementId, filePath) {
  const element = document.getElementById(elementId);
  if (!element) return;
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Fout bij laden van ${filePath}`);
    const html = await response.text();
    element.innerHTML = html;
  } catch (err) {
    console.error(err);
    element.innerHTML = `<div class="alert alert-danger">Kan ${filePath} niet laden.</div>`;
  }
}

// Na het laden van alle partials, markeer de actieve link in de sidebar
async function loadAllPartials() {
  await Promise.all([
    loadPartial('navbar-placeholder', '/partials/navbar.html'),
    loadPartial('sidebar-placeholder', '/partials/sidebar.html'),
    loadPartial('footer-placeholder', '/partials/footer.html')
  ]);

  // Markeer de actieve link op basis van de huidige URL
  const currentPath = window.location.pathname;
  document.querySelectorAll('#sidebar-placeholder a.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

loadAllPartials();