import { PrismaClient } from "@prisma/client";

const prisma = global.__db ?? new PrismaClient();

if (process.env.NODE_ENV === "development") {
  global.__db = prisma;
}

export default prisma;