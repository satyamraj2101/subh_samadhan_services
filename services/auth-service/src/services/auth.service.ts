import bcrypt from "bcryptjs";
import { prisma } from "../../../../libs/prisma/client";
import { signToken } from "../utils/jwt";

export async function register(email: string, password: string, fullName: string) {
  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("User already exists");

  // Hash password
  const hashed = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashed,
      fullName,
      status: "ACTIVE"
    }
  });

  return { id: user.id, email: user.email, fullName: user.fullName };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error("Invalid credentials");

  return signToken({ id: user.id, email: user.email, role: "CUSTOMER" });
}
