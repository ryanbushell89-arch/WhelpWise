import { Router } from "express";
import { db } from "@workspace/db";
import { contractTemplatesTable } from "@workspace/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { type AuthenticatedRequest } from "../middlewares/requireAuth";
import type { Request } from "express";

const router = Router();

function uid(req: Request): string {
  return (req as AuthenticatedRequest).userId;
}

function formatTemplate(t: typeof contractTemplatesTable.$inferSelect) {
  return { ...t, isActive: t.isActive === "true" };
}

// ── List ───────────────────────────────────────────────────────────────────────
router.get("/contract-templates", async (req, res): Promise<void> => {
  const userId = uid(req);
  const templates = await db
    .select()
    .from(contractTemplatesTable)
    .where(and(eq(contractTemplatesTable.userId, userId), eq(contractTemplatesTable.isActive, "true")))
    .orderBy(asc(contractTemplatesTable.createdAt));
  res.json(templates.map(formatTemplate));
});

// ── Create ─────────────────────────────────────────────────────────────────────
router.post("/contract-templates", async (req, res): Promise<void> => {
  const userId = uid(req);
  const { name, category, description, fileUrl, fileSize } = req.body;

  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  if (!fileUrl?.trim()) { res.status(400).json({ error: "fileUrl is required" }); return; }

  const [template] = await db
    .insert(contractTemplatesTable)
    .values({
      userId,
      name: name.trim(),
      category: category ?? "custom",
      description: description?.trim() ?? null,
      fileUrl: fileUrl.trim(),
      fileSize: fileSize ? parseInt(fileSize) : null,
      isActive: "true",
    })
    .returning();

  res.status(201).json(formatTemplate(template));
});

// ── Get one ────────────────────────────────────────────────────────────────────
router.get("/contract-templates/:id", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [template] = await db
    .select()
    .from(contractTemplatesTable)
    .where(and(eq(contractTemplatesTable.id, id), eq(contractTemplatesTable.userId, userId)));

  if (!template) { res.status(404).json({ error: "not found" }); return; }
  res.json(formatTemplate(template));
});

// ── Update metadata (name / category / description) ───────────────────────────
router.put("/contract-templates/:id", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const { name, category, description } = req.body;
  if (name !== undefined && !name?.trim()) {
    res.status(400).json({ error: "name cannot be empty" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (category !== undefined) updates.category = category;
  if (description !== undefined) updates.description = description?.trim() ?? null;

  const [template] = await db
    .update(contractTemplatesTable)
    .set(updates)
    .where(and(eq(contractTemplatesTable.id, id), eq(contractTemplatesTable.userId, userId)))
    .returning();

  if (!template) { res.status(404).json({ error: "not found" }); return; }
  res.json(formatTemplate(template));
});

// ── Soft delete ────────────────────────────────────────────────────────────────
router.delete("/contract-templates/:id", async (req, res): Promise<void> => {
  const userId = uid(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [template] = await db
    .update(contractTemplatesTable)
    .set({ isActive: "false" })
    .where(and(eq(contractTemplatesTable.id, id), eq(contractTemplatesTable.userId, userId)))
    .returning();

  if (!template) { res.status(404).json({ error: "not found" }); return; }
  res.status(204).send();
});

export default router;
