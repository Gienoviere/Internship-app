const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendInventoryWarningEmail(items) {
  const critical = items.filter(i => i.status === "CRITICAL");
  const warn = items.filter(i => i.status === "WARN");

  if (!critical.length && !warn.length) return;

  let text = "Inventory warnings:\n\n";

  for (const i of [...critical, ...warn]) {
    text += `- ${i.name}: ${i.status}
  Stock: ${i.stockGrams}g
  Suggested order: ${i.suggestedOrderKg ?? "n/a"} kg
  Rule: ${i.reorderRule ?? "—"}
\n`;
  }

  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: "Animal Care – Inventory Warning",
    text,
  });
}

module.exports = { sendInventoryWarningEmail };

//Connection to outlook, gmail
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getTransport() {
  const user = requireEnv("MAIL_USER");
  const pass = requireEnv("MAIL_PASS");

  // Works for Gmail app password; adjust if you use another provider
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

async function sendMail({ to, subject, text, html }) {
  const transporter = getTransport();
  const from = process.env.MAIL_USER;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail };