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