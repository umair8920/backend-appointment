import express from "express";
import ChatController from "../controllers/chat/chat.controller.js";
import authenticate from "../middleware/auth.middleware.js";
import chatLimiter from "../middleware/chatRateLimit.middleware.js";

const router = express.Router();

router.post("/start", authenticate, ChatController.startSession);
router.post("/message", authenticate, chatLimiter, ChatController.sendMessage);
router.get("/sessions", authenticate, ChatController.getSessions);
router.get("/:sessionId", authenticate, ChatController.getConversation);

export default router;