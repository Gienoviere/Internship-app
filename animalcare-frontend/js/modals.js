document.addEventListener("DOMContentLoaded", () => {
  const wire = (id, msg) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", () => alert(msg));
  };

  wire("btnQuickLogSubmit", "Log added!");
  wire("btnPhotoUploadSubmit", "Photo uploaded!");
  wire("btnSendSummarySubmit", "Summary sent!");
  wire("btnSystemReportSubmit", "Report generated!");
});
