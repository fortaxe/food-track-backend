
import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/authRoutes";
import exampleRoutes from "./routes/exampleRoutes";
import foodRoutes from "./routes/foodRoutes";
import elevenlabsRoutes from "./routes/elevenlabsRoutes";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: true, // Allow all origins for dev
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Routes
app.use("/api", authRoutes);
app.use("/api", exampleRoutes);
app.use("/api", foodRoutes);
app.use("/api", elevenlabsRoutes);




app.get("/", (req, res) => {
    res.send("Food Track API is running with Express!");
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});