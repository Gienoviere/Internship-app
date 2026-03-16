const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const { createOAuthClient, getCalendarClient } = require("../lib/googleCalendar");
const prisma = require("../prisma");

const router = express.Router();

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

router.get("/connect", requireAuth, async (req, res) => {
  const oauth2Client = createOAuthClient();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: String(req.user.userId),
  });

  res.json({ url });
});

router.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = Number(state);

    if (!code || !userId) {
      return res.status(400).send(`Missing code or invalid state. code=${!!code}, state=${state}`);
    }

    const oauth2Client = createOAuthClient();
    const tokenResponse = await oauth2Client.getToken(code);
    const tokens = tokenResponse.tokens;

    console.log("GOOGLE TOKENS RECEIVED:", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date || null
    });

    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).send(`User not found for state ${userId}`);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token || null,
        googleRefreshToken: tokens.refresh_token || null,
        googleExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });

    res.send("Google Calendar connected successfully. You can close this tab.");
  } catch (err) {
    console.error("GOOGLE CALLBACK ERROR:", err);
    res.status(500).send(`Google Calendar connection failed: ${err.message}`);
  }
});

router.post("/create-event", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
      },
    });

    if (!user?.googleAccessToken && !user?.googleRefreshToken) {
      return res.status(400).json({ error: "Google Calendar not connected" });
    }

    const calendar = getCalendarClient({
      access_token: user.googleAccessToken || undefined,
      refresh_token: user.googleRefreshToken || undefined,
    });

    const { summary, description, startDateTime, endDateTime } = req.body;

    const result = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      requestBody: {
        summary,
        description,
        start: {
          dateTime: startDateTime,
        },
        end: {
          dateTime: endDateTime,
        },
      },
    });

    res.json(result.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create calendar event" });
  }
});

module.exports = router;