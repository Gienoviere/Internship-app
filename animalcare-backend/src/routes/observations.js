const express = require("express");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

function isValidISODateOnly(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function toDateOnlyUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

// Ensure upload dir exists
const uploadDir = path.join(__dirname, "..", "..", "uploads", "obs");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}_${Math.random().toString(16).slice(2)}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"];
    if (!ok.includes(file.mimetype)) return cb(new Error("Only JPG/PNG/WEBP allowed"));
    cb(null, true);
  },
});

/**
 * GET /observations?date=YYYY-MM-DD
 * - USER: only their observations
 * - SUPERVISOR/ADMIN: all observations
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!isValidISODateOnly(date)) {
      return res.status(400).json({ error: "date query param required: YYYY-MM-DD" });
    }

    const day = toDateOnlyUTC(date);
    const isPrivileged = req.user.role === "ADMIN" || req.user.role === "SUPERVISOR";

    const obs = await prisma.observation.findMany({
      where: {
        date: day,
        ...(isPrivileged ? {} : { createdById: req.user.userId }),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        photos: true,
      },
      orderBy: [{ id: "desc" }],
    });

    res.json(obs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /observations
 * Body: { date, title, description?, severity?, animalTag? }
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { date, title, description, severity, animalTag } = req.body || {};

    if (!isValidISODateOnly(date)) return res.status(400).json({ error: "date required: YYYY-MM-DD" });
    if (!title || String(title).trim().length < 2) return res.status(400).json({ error: "title required" });

    const day = toDateOnlyUTC(date);
    const sev = ["INFO", "WARN", "CRITICAL"].includes(String(severity))
      ? String(severity)
      : "INFO";

    const created = await prisma.observation.create({
      data: {
        date: day,
        title: String(title).trim(),
        description: description ? String(description) : null,
        severity: sev,
        animalTag: animalTag ? String(animalTag) : null,
        createdById: req.user.userId,
      },
      include: { createdBy: { select: { id: true, name: true, email: true, role: true } }, photos: true },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /observations/:id/photos
 * multipart/form-data field name: "photos"
 */
router.post(
  "/:id/photos",
  requireAuth,
  upload.array("photos", 5),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

      const obs = await prisma.observation.findUnique({ where: { id } });
      if (!obs) return res.status(404).json({ error: "Observation not found" });

      // Only creator or privileged roles can add photos
      const isPrivileged = req.user.role === "ADMIN" || req.user.role === "SUPERVISOR";
      if (!isPrivileged && obs.createdById !== req.user.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const files = req.files || [];
      if (!files.length) return res.status(400).json({ error: "No files uploaded" });

      const created = await prisma.observationPhoto.createMany({
        data: files.map((f) => ({
          observationId: id,
          filePath: `/uploads/obs/${f.filename}`,
          fileName: f.originalname,
          mimeType: f.mimetype,
          sizeBytes: f.size,
        })),
      });

      res.status(201).json({ added: created.count });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  }
);

/**
 * PATCH /observations/:id (optional)
 * - creator can edit their observation
 * - supervisor/admin can edit any
 */
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid id" });

    const obs = await prisma.observation.findUnique({ where: { id } });
    if (!obs) return res.status(404).json({ error: "Observation not found" });

    const isPrivileged = req.user.role === "ADMIN" || req.user.role === "SUPERVISOR";
    if (!isPrivileged && obs.createdById !== req.user.userId) return res.status(403).json({ error: "Forbidden" });

    const { title, description, severity, animalTag } = req.body || {};
    const sev = severity && ["INFO", "WARN", "CRITICAL"].includes(String(severity)) ? String(severity) : undefined;

    const updated = await prisma.observation.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description) : null } : {}),
        ...(sev !== undefined ? { severity: sev } : {}),
        ...(animalTag !== undefined ? { animalTag: animalTag ? String(animalTag) : null } : {}),
      },
      include: { createdBy: { select: { id: true, name: true, email: true, role: true } }, photos: true },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;