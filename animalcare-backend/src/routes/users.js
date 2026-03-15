const express = require("express");
const bcrypt = require("bcrypt");
const prisma = require("../prisma");
const requireAuth = require("../middleware/requireAuth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

router.get("/", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, requireRole(["ADMIN", "SUPERVISOR"]), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, password are required" });
    }

    const allowedRoles =
      req.user.role === "ADMIN"
        ? ["ADMIN", "SUPERVISOR", "FARMER", "VOLUNTEER"]
        : ["FARMER", "VOLUNTEER"];

    const finalRole = role || "VOLUNTEER";

    if (!allowedRoles.includes(finalRole)) {
      return res.status(403).json({ error: "You cannot create this role" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: finalRole,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/role", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const allowedRoles = ["ADMIN", "SUPERVISOR", "FARMER", "VOLUNTEER"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/active", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { active } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { active: Boolean(active) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

router.get(
  "/users",
  requireAuth,
  requireRole(["ADMIN","SUPERVISOR"]),
  async (req,res)=>{
    const users = await prisma.user.findMany({
      select:{
        id:true,
        name:true,
        email:true,
        role:true,
        active:true,
        createdAt:true
      },
      orderBy:{createdAt:"desc"}
    })

    res.json(users)
  }
)

router.post(
  "/users",
  requireAuth,
  requireRole("ADMIN"),
  async (req,res)=>{

    const {name,email,password,role} = req.body

    if(!name || !email || !password){
      return res.status(400).json({error:"Missing fields"})
    }

    const existing = await prisma.user.findUnique({where:{email}})
    if(existing){
      return res.status(409).json({error:"Email already exists"})
    }

    const passwordHash = await bcrypt.hash(password,12)

    const user = await prisma.user.create({
      data:{
        name,
        email,
        passwordHash,
        role:role || "VOLUNTEER"
      },
      select:{
        id:true,
        name:true,
        email:true,
        role:true,
        active:true
      }
    })

    res.status(201).json(user)
  }
)

router.patch(
  "/users/:id/role",
  requireAuth,
  requireRole("ADMIN"),
  async (req,res)=>{

    const {role} = req.body

    const user = await prisma.user.update({
      where:{id:Number(req.params.id)},
      data:{role},
      select:{
        id:true,
        name:true,
        email:true,
        role:true
      }
    })

    res.json(user)
  }
)

router.patch(
  "/users/:id/active",
  requireAuth,
  requireRole("ADMIN"),
  async (req,res)=>{

    const {active} = req.body

    const user = await prisma.user.update({
      where:{id:Number(req.params.id)},
      data:{active}
    })

    res.json(user)
  }
)

router.patch("/:id/active", requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { active } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { active: Boolean(active) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

