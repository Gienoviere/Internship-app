const { google } = require("googleapis");
const prisma = require("../prisma");

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getCalendarClient(tokens) {
  const auth = createOAuthClient();
  auth.setCredentials(tokens);

  return google.calendar({
    version: "v3",
    auth,
  });
}

async function createRestockEventForUser(userId, itemName, currentStock, threshold) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
    },
  });

  if (!user?.googleAccessToken && !user?.googleRefreshToken) {
    return null;
  }

  const calendar = getCalendarClient({
    access_token: user.googleAccessToken || undefined,
    refresh_token: user.googleRefreshToken || undefined,
  });

  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 30);

  const result = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    requestBody: {
      summary: `Restock needed: ${itemName}`,
      description: `Current stock: ${currentStock}g\nThreshold: ${threshold}g`,
      start: {
        dateTime: start.toISOString(),
      },
      end: {
        dateTime: end.toISOString(),
      },
    },
  });

  return result.data;
}

module.exports = {
  createOAuthClient,
  getCalendarClient,
  createRestockEventForUser,
};