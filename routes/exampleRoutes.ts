
import { Router } from "express";
import { helloController } from "../controllers/exampleController";

const router = Router();

router.get("/hello", helloController);

export default router;
