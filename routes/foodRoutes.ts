import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { foodLog, chatMessage } from "../db/schema.js";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";

const router = Router();

// Get food logs for a user (optionally filtered by date)
router.get("/food-logs", async (req: Request, res: Response) => {
    try {
        const { userId, date } = req.query;

        console.log(userId, date, "userId and date")

        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        let conditions = [eq(foodLog.userId, userId as string)];

        // If date is provided, filter by that date (IST)
        if (date) {
            const istOffset = 5.5 * 60 * 60 * 1000;
            const targetDate = new Date(date as string);

            const startOfDay = new Date(targetDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            startOfDay.setTime(startOfDay.getTime() - istOffset);

            const endOfDay = new Date(targetDate);
            endOfDay.setUTCHours(23, 59, 59, 999);
            endOfDay.setTime(endOfDay.getTime() - istOffset);

            conditions.push(gte(foodLog.loggedAt, startOfDay));
            conditions.push(lte(foodLog.loggedAt, endOfDay));
        }

        const logs = await db
            .select()
            .from(foodLog)
            .where(and(...conditions))
            .orderBy(desc(foodLog.loggedAt));

        console.log(logs, "logs of food")

        res.json(logs);
    } catch (error) {
        console.error("Error fetching food logs:", error);
        res.status(500).json({ error: "Failed to fetch food logs" });
    }
});

// Create a new food log
router.post("/food-logs", async (req: Request, res: Response) => {
    try {
        const { userId, mealType, foodItems, notes } = req.body;

        const newLog = await db.insert(foodLog).values({
            id: nanoid(),
            userId,
            mealType,
            foodItems: JSON.stringify(foodItems),
            notes,
            loggedAt: new Date(),
            createdAt: new Date(),
        }).returning();

        res.json(newLog[0]);
    } catch (error) {
        console.error("Error creating food log:", error);
        res.status(500).json({ error: "Failed to create food log" });
    }
});

// Get chat history for a user
router.get("/chat/:userId", async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const messages = await db
            .select()
            .from(chatMessage)
            .where(eq(chatMessage.userId, userId as string))
            .orderBy(chatMessage.createdAt);

        res.json(messages);
    } catch (error) {
        console.error("Error fetching chat:", error);
        res.status(500).json({ error: "Failed to fetch chat" });
    }
});

// Save a chat message
router.post("/chat", async (req: Request, res: Response) => {
    try {
        const { userId, role, content } = req.body;

        const newMessage = await db.insert(chatMessage).values({
            id: nanoid(),
            userId,
            role,
            content,
            createdAt: new Date(),
        }).returning();

        res.json(newMessage[0]);
    } catch (error) {
        console.error("Error saving chat message:", error);
        res.status(500).json({ error: "Failed to save chat message" });
    }
});

export default router;
