import { PrismaClient } from "@prisma/client";

// Singleton instance of PrismaClient configured for serverless PostgreSQL resilience
const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

function isConnectionDropError(error) {
  if (!error) return false;
  const message = error.message || "";
  return (
    error.code === "P1017" || // Server closed the connection
    error.code === "P1001" || // Can't reach database server
    message.includes("Closed") ||
    message.includes("connection closed") ||
    message.includes("Connection reset") ||
    message.includes("ECONNRESET") ||
    message.includes("kind: Closed")
  );
}

// Extended client with automatic transparent retry on idle connection drops (e.g. Neon scale-to-zero)
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (isConnectionDropError(error)) {
            console.warn(
              `[prisma:resilience] Retrying ${model}.${operation} after transient connection drop...`
            );
            return await query(args);
          }
          throw error;
        }
      },
    },
  },
});

export default prisma;

