import express from "express";
import cors from "cors";
import "dotenv/config";
import simpleAuthRoutes from "./routes/simpleAuthRoutes.js";
import exampleRoutes from "./routes/exampleRoutes.js";
import foodRoutes from "./routes/foodRoutes.js";
import elevenlabsRoutes from "./routes/elevenlabsRoutes.js";

const app = express();

// CORS configuration
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api', simpleAuthRoutes);
app.use('/api', exampleRoutes);
app.use('/api', foodRoutes);
app.use('/api', elevenlabsRoutes);

app.get("/", (req, res) => {
    res.json({ message: "Food Track API is running!" });
});

export default app;
