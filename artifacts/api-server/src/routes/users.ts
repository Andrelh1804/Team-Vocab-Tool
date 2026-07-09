import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetUserParams,
  ListUsersResponse,
  GetUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  res.json(ListUsersResponse.parse(users.map(u => ({ ...u, avatar: u.avatar ?? null }))));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetUserResponse.parse({ ...user, avatar: user.avatar ?? null }));
});

export default router;
