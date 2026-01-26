const cron = require("node-cron");
const { getInventoryWarnings } = require("../services/inventoryWarningsService");
const { sendInventoryWarningEmail } = require("../services/mailService");

cron.schedule("0 7 * * *", async () => {
  console.log("Running daily inventory warning check");
  const items = await getInventoryWarnings({});
  await sendInventoryWarningEmail(items);
});