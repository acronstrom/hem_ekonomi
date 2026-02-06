import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

authRouter.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("name").optional().trim().escape(),
  ],
  async (req, res, next) => {
    try {
      if (!JWT_SECRET) {
        return res.status(500).json({ error: "Server misconfiguration (JWT_SECRET)" });
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashed = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { email, password: hashed, name: name || null },
        select: { id: true, email: true, name: true },
      });

      const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      res.cookie("token", token, COOKIE_OPTIONS);
      res.status(201).json({ user, token });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty().withMessage("Password required"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      res.cookie("token", token, COOKIE_OPTIONS);
      res.json({
        user: { id: user.id, email: user.email, name: user.name },
        token,
      });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ ok: true });
});

authRouter.post(
  "/add-user",
  authMiddleware,
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("name").optional().trim().escape(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: "E-postadressen används redan" });
      }

      const hashed = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { email, password: hashed, name: name || null },
        select: { id: true, email: true, name: true },
      });

      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.get("/me", async (req, res, next) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({ error: "Server misconfiguration (JWT_SECRET)" });
    }
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace("Bearer ", "") ||
      null;
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) return res.status(401).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    if (err.code === "P1013" || err.message?.includes("Invalid `prisma")) {
      return res.status(503).json({ error: "Database unavailable" });
    }
    next(err);
  }
});
