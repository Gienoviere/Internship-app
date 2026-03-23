document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("btnConnectGoogleCalendar");
    if (!btn) {
      console.error("Google button not found");
      return;
    }

    btn.addEventListener("click", async function () {
      alert("Google button clicked");

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          alert("No login token found. Please log in again.");
          return;
        }

        const res = await fetch("http://192.168.20.40:3001/google-calendar/connect", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        alert("Response status: " + res.status);

        if (!res.ok) {
          const text = await res.text();
          console.error("Connect failed:", text);
          alert("Connect failed");
          return;
        }

        const data = await res.json();
        console.log("Google connect response:", data);

        if (data.url) {
          window.open(data.url, "googleAuth", "width=520,height=700");
        } else {
          alert("No URL returned by backend");
        }
      } catch (err) {
        console.error("Google Calendar connect error:", err);
        alert("Google Calendar crashed");
      }
    });
});