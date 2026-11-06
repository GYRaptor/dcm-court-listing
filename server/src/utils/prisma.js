import { PrismaClient } from "@prisma/client";

// Singleton instance of PrismaClient to prevent exhausting database connection pools
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export default prisma;

