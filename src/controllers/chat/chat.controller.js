import ChatService from "../../services/chat.service.js";
import AIService from "../../services/ai.service.js";
import AppointmentService from "../../services/appointment.service.js";

class ChatController {

  // --------------------------------------------------
  // START SESSION
  // --------------------------------------------------
  static async startSession(req, res, next) {
    try {
      const session = await ChatService.createSession(req.user.id);

      const welcomeMessage = `
        Welcome, ${req.user.email}.

        Thank you for using our Appointment Scheduling Assistant.

        You can use the action buttons below the chat to:

        • Check availability for a specific date and time  
        • Book an appointment for your preferred day  
        • Cancel an existing appointment  

        Select an option from below to get started or using conversation you can check the next avaliable slot.
        `;

      await ChatService.saveMessage(session.id, "ai", welcomeMessage);

      res.status(201).json({
        success: true,
        data: session
      });

    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------
  // GET SESSIONS
  // --------------------------------------------------
  static async getSessions(req, res, next) {
    try {
      const sessions = await ChatService.getUserSessions(req.user.id);

      res.status(200).json({
        success: true,
        data: sessions
      });
    } catch (error) {
      next(error);
    }
  }

  // --------------------------------------------------
  // SEND MESSAGE
  // --------------------------------------------------
  static async sendMessage(req, res, next) {
  try {
    console.log("🔹 SEND MESSAGE START");

    const { session_id, message } = req.body;

    if (!session_id || !message) {
      return res.status(400).json({
        success: false,
        message: "Session ID and message are required."
      });
    }

    console.log("Incoming payload:", {
      session_id,
      message,
      hasAppointmentDate: !!req.body.appointment_date,
      hasBackendResult: !!req.body.backend_result,
      hasError: !!req.body.error
    });

    // --------------------------------------------------
    // 1️⃣ Validate session ownership
    // --------------------------------------------------
    const session = await ChatService.getSession(
      session_id,
      req.user.id
    );

    console.log("✅ Session validated:", session.id);

    // --------------------------------------------------
    // 2️⃣ Save user message
    // --------------------------------------------------
    await ChatService.saveMessage(session_id, "user", message);
    console.log("✅ User message saved");

    // --------------------------------------------------
    // 3️⃣ STRUCTURED FORM HANDLING (Highest Priority)
    // --------------------------------------------------

    // 🔹 A) Specific date availability check
    if (req.body.appointment_date) {

      console.log("📌 Structured availability check");

      const result =
        await AppointmentService.checkAvailability(
          req.body.appointment_date
        );

      const reply =
        await AIService.generateFriendlyMessage({
          type: "specific_date_check",
          data: result
        });

      await ChatService.saveMessage(session_id, "ai", reply);

      const updatedConversation =
        await ChatService.getMessages(session_id);

      console.log("✅ Structured availability handled");

      return res.status(200).json({
        success: true,
        data: updatedConversation
      });
    }

    // 🔹 B) Backend result formatting (booking/cancel success)
    if (req.body.backend_result) {

      console.log("📌 Structured backend result received");

      const reply =
        await AIService.generateFriendlyMessage({
          type: "backend_result",
          data: req.body.backend_result
        });

      await ChatService.saveMessage(session_id, "ai", reply);

      const updatedConversation =
        await ChatService.getMessages(session_id);

      console.log("✅ Backend result formatted");

      return res.status(200).json({
        success: true,
        data: updatedConversation
      });
    }

    // 🔹 C) Structured error formatting
    if (req.body.error) {

      console.log("📌 Structured error received");

      const reply =
        await AIService.generateFriendlyMessage({
          type: "error",
          message: req.body.error
        });

      await ChatService.saveMessage(session_id, "ai", reply);

      const updatedConversation =
        await ChatService.getMessages(session_id);

      console.log("✅ Error formatted");

      return res.status(200).json({
        success: true,
        data: updatedConversation
      });
    }

    // --------------------------------------------------
    // 4️⃣ Conversational Flow (Intent-Based)
    // --------------------------------------------------

    console.log("📌 Conversational flow");

    const conversation =
      await ChatService.getMessages(session_id);

    const { intent } =
      await AIService.detectIntent(conversation);

    console.log("✅ Intent detected:", intent);

    let reply;

    // 🔹 Next available slot only (chat-based)
    if (intent === "check_availability") {

      console.log("Fetching next available slot...");

      const nextSlot =
        await AppointmentService.findNextAvailableSlot();

      reply =
        await AIService.generateFriendlyMessage({
          type: "next_available",
          data: nextSlot
        });
    }

    // 🔹 Redirect booking to form
    else if (intent === "book_appointment") {

      reply =
        "To book an appointment, please use the booking form below.";
    }

    // 🔹 Redirect cancellation to form
    else if (intent === "cancel_appointment") {

      reply =
        "To cancel an appointment, please use the cancellation form below.";
    }

    // 🔹 Greeting
    else if (intent === "greeting") {

      reply =
        "You can use the action buttons below to manage your appointments.";
    }

    // 🔹 Fallback
    else {

      reply =
        await AIService.generateFallbackReply(message);
    }

    // --------------------------------------------------
    // 5️⃣ Safety Guard
    // --------------------------------------------------
    if (!reply || typeof reply !== "string") {
      console.warn("⚠️ Empty AI reply detected");
      reply =
        "I'm sorry, something went wrong. Please try again.";
    }

    // --------------------------------------------------
    // 6️⃣ Save AI reply
    // --------------------------------------------------
    await ChatService.saveMessage(session_id, "ai", reply);
    console.log("✅ AI reply saved");

    const updatedConversation =
      await ChatService.getMessages(session_id);

    console.log("✅ SEND MESSAGE COMPLETE");

    return res.status(200).json({
      success: true,
      data: updatedConversation
    });

  } catch (error) {
    console.error("❌ SEND MESSAGE ERROR:", error);
    next(error);
  }
}

  // --------------------------------------------------
  // GET CONVERSATION
  // --------------------------------------------------
  static async getConversation(req, res, next) {
    try {
      const { sessionId } = req.params;

      await ChatService.getSession(
        sessionId,
        req.user.id
      );

      const messages =
        await ChatService.getMessages(sessionId);

      res.status(200).json({
        success: true,
        data: messages
      });

    } catch (error) {
      next(error);
    }
  }
}

export default ChatController;