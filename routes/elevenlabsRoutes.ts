import { Router } from "express";
import type { Request, Response } from "express";
import { ElevenLabsClient } from "elevenlabs";
import { db } from "../db/index.js";
import { foodLog } from "../db/schema.js";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

const router = Router();

// Get signed URL for ElevenLabs Conversational AI
router.post("/elevenlabs/signed-url", async (req: Request, res: Response) => {
    try {
        const agentId = process.env.ELEVENLABS_AGENT_ID;

        if (!agentId) {
            return res.status(500).json({ error: "ElevenLabs Agent ID not configured" });
        }

        const client = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });

        // Get signed URL for conversation
        const response = await client.conversationalAi.getSignedUrl({
            agent_id: agentId,
        });

        res.json({ signedUrl: response.signed_url });
    } catch (error) {
        console.error("Error getting signed URL:", error);
        res.status(500).json({ error: "Failed to get signed URL" });
    }
});

// Webhook handler for ElevenLabs Agent function calls
router.post("/elevenlabs/webhook", async (req: Request, res: Response) => {
    try {
        console.log("ElevenLabs webhook received:", JSON.stringify(req.body, null, 2));

        const body = req.body;

        // ElevenLabs sends parameters directly at root level, not nested
        // Extract meal_type and food_items
        const meal_type = body.meal_type;
        const food_items = body.food_items;

        // If we have meal_type and food_items, it's a log_food request
        if (meal_type && food_items) {
            // Prioritize user_id from webhook, but ignore "test_user" placeholder
            let userId = body.user_id;

            // If still no user, use default for safety (or error out)
            if (!userId) {
                res.status(400).json({ error: "No user ID found" });
                return;
            }

            // Normalize meal_type
            const normalizedMealType = meal_type.toLowerCase();

            // Check if entry exists for this meal type today
            // Calculate IST Date for "today" check (UTC + 5.5 hours)
            const now = new Date();
            const istOffset = 5.5 * 60 * 60 * 1000;
            const istDate = new Date(now.getTime() + istOffset);

            console.log("Current Server Time (UTC):", now.toISOString());
            console.log("Calculated IST Date:", istDate.toISOString());

            const startOfDayIST = new Date(istDate);
            startOfDayIST.setUTCHours(0, 0, 0, 0);
            startOfDayIST.setTime(startOfDayIST.getTime() - istOffset); // Convert back to server time for query

            const endOfDayIST = new Date(istDate);
            endOfDayIST.setUTCHours(23, 59, 59, 999);
            endOfDayIST.setTime(endOfDayIST.getTime() - istOffset); // Convert back to server time for query

            console.log("Query Range (UTC):", startOfDayIST.toISOString(), "to", endOfDayIST.toISOString());

            const existingLog = await db.select().from(foodLog).where(
                and(
                    eq(foodLog.userId, userId),
                    eq(foodLog.mealType, normalizedMealType),
                    gte(foodLog.loggedAt, startOfDayIST),
                    lte(foodLog.loggedAt, endOfDayIST)
                )
            ).limit(1);

            let resultLog;

            // Helper to clean and validate food items
            const isInvalidFoodItem = (item: string) => {
                const lower = item.toLowerCase();
                return lower.startsWith("got it") ||
                    lower.startsWith("i've logged") ||
                    lower.startsWith("i have logged") ||
                    lower.startsWith("logging") ||
                    lower.startsWith("sure")
            };

            if (isInvalidFoodItem(food_items)) {
                console.log("Ignored invalid food item:", food_items);
                return res.json({ success: true, result: "Ignored invalid text" });
            }

            if (existingLog.length > 0 && existingLog[0]) {
                const logToUpdate = existingLog[0];

                // You requested to REPLACE existing items if updating
                // So we just use the new food_items
                const updatedItems = [food_items];

                resultLog = await db.update(foodLog)
                    .set({ foodItems: JSON.stringify(updatedItems), loggedAt: new Date() })
                    .where(eq(foodLog.id, logToUpdate.id))
                    .returning();

                console.log("Updated existing food log:", resultLog[0]);
            } else {
                // Create new log
                resultLog = await db.insert(foodLog).values({
                    id: nanoid(),
                    userId,
                    mealType: normalizedMealType,
                    foodItems: JSON.stringify([food_items]),
                    notes: null,
                    loggedAt: new Date(),
                    createdAt: new Date(),
                }).returning();

                console.log("Created new food log:", resultLog[0]);
            }

            return res.json({
                success: true,
                result: `Successfully logged ${meal_type}: ${food_items}`
            });
        }

        // Handle get_food_history
        const days = body.days;
        if (days !== undefined) {
            const historyUserId = body.user_id;

            if (!historyUserId) {
                return res.status(400).json({ error: "No user ID found for history" });
            }

            const numDays = parseInt(days) || 7;

            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - numDays);

            const logs = await db
                .select()
                .from(foodLog)
                .where(
                    and(
                        eq(foodLog.userId, historyUserId),
                        gte(foodLog.loggedAt, daysAgo)
                    )
                )
                .orderBy(desc(foodLog.loggedAt));

            // Format for AI to understand
            const formattedLogs = logs.map(log => ({
                date: log.loggedAt?.toISOString().split('T')[0],
                time: log.loggedAt?.toISOString().split('T')[1]?.substring(0, 5),
                meal: log.mealType,
                food: log.foodItems
            }));

            console.log("Food history retrieved:", formattedLogs.length, "entries");

            return res.json({
                success: true,
                result: JSON.stringify(formattedLogs)
            });
        }

        // Unknown function - return success anyway
        console.log("Unknown webhook format");
        res.json({ success: true, result: "Received" });
    } catch (error) {
        console.error("Webhook error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
    }
});

// Text-to-speech endpoint
router.post("/elevenlabs/tts", async (req: Request, res: Response) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        const client = new ElevenLabsClient({
            apiKey: process.env.ELEVENLABS_API_KEY,
        });

        const audioStream = await client.textToSpeech.convert(
            process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
            {
                text,
                model_id: "eleven_turbo_v2_5",
            }
        );

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Transfer-Encoding", "chunked");

        for await (const chunk of audioStream) {
            res.write(chunk);
        }
        res.end();
    } catch (error) {
        console.error("Error generating TTS:", error);
        res.status(500).json({ error: "Failed to generate speech" });
    }
});

export default router;
