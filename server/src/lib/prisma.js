import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient in serverless to avoid exhausting DB connections
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;
