const nodemailer = require("nodemailer");

async function main() {
  // fake account maken (Ethereal)
  let testAccount = await nodemailer.createTestAccount();

  // transporter maken
  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  // mail sturen
  let info = await transporter.sendMail({
    from: '"AnimalCare" <no-reply@animalcare.com>',
    to: "test@mail.com", // maakt niet uit (fake)
    subject: "Test mail",
    text: "Dit is een test email vanuit Node.js",
  });

  console.log("Message sent:", info.messageId);

  // BELANGRIJK: preview link
  console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
}

main();