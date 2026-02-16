import express from "express";
import AuthController from "../controllers/auth/auth.controller.js";
import authenticate from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

router.get("/me", authenticate, AuthController.getProfile);
router.put("/profile", authenticate, AuthController.updateProfile);

export default router;