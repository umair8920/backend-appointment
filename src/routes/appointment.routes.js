import express from "express";
import AppointmentController from "../controllers/appointments/appointment.controller.js";
import authenticate from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/book", authenticate, AppointmentController.book);
router.put("/:id/cancel", authenticate, AppointmentController.cancel);
router.get("/mine", authenticate, AppointmentController.getMine);

export default router;