import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";

// Validates JWT from 'Authorization: Bearer <token>' and attaches user to req.user.
// Why: Enforces authentication across private endpoints without trusting client-side claims.
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "dev-insecure-jwt-secret-dcm-major-project-2026";
    const decoded = jwt.verify(token, secret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        judge: { select: { id: true, courtroom: true, dailyCapacity: true } },
      },
    });
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Restricts route execution to designated roles.
// Why: Guarantees role-based access control (RBAC) so lawyers/clerks cannot execute judge actions.
export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: `Requires ${allowedRoles.join(" or ")} role` });
  }
  next();
};
