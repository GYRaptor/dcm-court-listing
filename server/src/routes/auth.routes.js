import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-jwt-secret-dcm-major-project-2026";
const JWT_EXPIRES_IN = "7d";

// POST /auth/register
// Public endpoint: creates new user strictly with LAWYER role, ignoring any requested role
router.post("/register", async (req, res, next) => {
  try {
    // 1. Validate request body against Zod schema (name, email, password min 8)
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message,
      });
    }

    const { name, email, password } = parseResult.data;

    // 2. Reject duplicate email with 409 Conflict
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists",
      });
    }

    // 3. Hash password using bcrypt (10 salt rounds)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Create new User: role is strictly hardcoded to LAWYER by the server
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "LAWYER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // 5. Generate signed JWT token holding user id and role (valid for 7 days)
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.status(201).json({
      message: "Advocate registration successful",
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
// Public endpoint: authenticates CLERK, JUDGE, or LAWYER
router.post("/login", async (req, res, next) => {
  try {
    // 1. Validate credentials payload
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message,
      });
    }

    const { email, password } = parseResult.data;

    // 2. Find user by email including Judge courtroom profile if applicable
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        judge: {
          select: {
            id: true,
            courtroom: true,
            dailyCapacity: true,
          },
        },
      },
    });

    // Return identical error message for missing user or bad password to prevent account enumeration
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 3. Verify password hash using constant-time bcrypt comparison
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // 4. Sign JWT containing user id and role (7-day validity)
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // 5. Return sanitized user payload without passwordHash
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      judge: user.judge,
    };

    return res.status(200).json({
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
// Protected endpoint: returns profile of currently authenticated user (without passwordHash)
router.get("/me", requireAuth, (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

// GET /auth/clerk-only
// Test endpoint for role-based authorization: accessible strictly by CLERK
router.get("/clerk-only", requireAuth, requireRole("CLERK"), (req, res) => {
  res.json({ message: "Access granted: Verified Court Clerk privileges." });
});

// GET /auth/judge-only
// Test endpoint for role-based authorization: accessible strictly by JUDGE
router.get("/judge-only", requireAuth, requireRole("JUDGE"), (req, res) => {
  res.json({ message: "Access granted: Verified Judicial Officer privileges." });
});

export default router;
