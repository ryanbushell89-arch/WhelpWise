import { db, usersTable, puppyOwnerAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./requireAuth";

export interface PuppyOwnerRequest extends AuthenticatedRequest {
  puppyOwnerAccount: typeof puppyOwnerAccountsTable.$inferSelect;
}

export async function requirePuppyOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req as AuthenticatedRequest).userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.role !== "puppy_owner") {
    res.status(403).json({ error: "Puppy owner account required", code: "NOT_PUPPY_OWNER" });
    return;
  }

  const [account] = await db.select().from(puppyOwnerAccountsTable)
    .where(eq(puppyOwnerAccountsTable.userId, userId));
  if (!account) {
    res.status(403).json({ error: "No puppy linked to this account", code: "NO_PUPPY_LINKED" });
    return;
  }

  (req as PuppyOwnerRequest).puppyOwnerAccount = account;
  next();
}
