const express = require('express');
const router = express.Router();
const prisma = require("../prisma");

router.get('/', async (req, res) => {
  try {
    const sections = await prisma.manualSection.findMany({
      select: { section_key: true, content: true }
    });
    const result = {};
    sections.forEach(s => result[s.section_key] = s.content);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Databasefout' });
  }
});

router.post('/', async (req, res) => {
  const updates = req.body;
  try {
    await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.manualSection.upsert({
          where: { section_key: key },
          update: { content: value },
          create: { section_key: key, content: value }
        })
      )
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Databasefout' });
  }
});

module.exports = router;