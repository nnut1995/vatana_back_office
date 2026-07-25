import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import type { User } from "@/types/user";

async function usersCollection() {
  const db = await getDb();
  return db.collection<User>("users");
}

/**
 * Verify an email/password pair against the users collection.
 * Returns a minimal user object on success, or null on failure.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const collection = await usersCollection();
  const user = await collection.findOne({ email: email.toLowerCase() });
  if (!user) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
