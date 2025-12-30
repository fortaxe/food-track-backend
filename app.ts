import express from "express";
import cors from "cors";
import "dotenv/config";
import authRoutes from "./routes/authRoutes";
import exampleRoutes from "./routes/exampleRoutes";
import foodRoutes from "./routes/foodRoutes";
import elevenlabsRoutes from "./routes/elevenlabsRoutes";

const app = express();

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:3000',
            'https://food-track-web.vercel.app', // Add your frontend URL here
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all for now
        }
    },
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
app.use('/api', authRoutes);
app.use('/api', exampleRoutes);
app.use('/api', foodRoutes);
app.use('/api', elevenlabsRoutes);

app.get("/", (req, res) => {
    res.json({ message: "Food Track API is running!" });
});

export default app;
