import fetch from "node-fetch";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MODEL = process.env.MISTRAL_MODEL || "mistral-small-latest";

class AIService {

  // --------------------------------------------------
  // CORE LLM CALL (WITH TIMEOUT PROTECTION)
  // --------------------------------------------------
  static async callLLM(messages, temperature = 0.2) {

    if (!MISTRAL_API_KEY) {
      console.error("❌ Missing MISTRAL_API_KEY");
      return "";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${MISTRAL_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: MODEL,
            messages,
            temperature
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      const json = await response.json();
      return json.choices?.[0]?.message?.content?.trim() || "";

    } catch (error) {
      clearTimeout(timeout);
      console.error("LLM ERROR:", error.message);
      return "";
    }
  }

  // --------------------------------------------------
  // SAFE JSON PARSER
  // --------------------------------------------------
  static safeParseJSON(text) {
    try {
      if (!text) return {};
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return {};
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }

  // --------------------------------------------------
  // STRICT INTENT DETECTION (LIMITED SCOPE)
  // --------------------------------------------------
  static async detectIntent(conversation) {

    const prompt = [
      {
        role: "system",
        content: `
You are a strict intent classifier.

Return ONLY valid JSON:
{"intent":"intent_name"}

Allowed intents:
- check_availability
- book_appointment
- cancel_appointment
- greeting
- fallback

If uncertain, return:
{"intent":"fallback"}

Do not explain.
Do not include markdown.
`
      },
      ...conversation.map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.message
      }))
    ];

    const raw = await this.callLLM(prompt, 0);
    const parsed = this.safeParseJSON(raw);

    const validIntents = [
      "check_availability",
      "book_appointment",
      "cancel_appointment",
      "greeting",
      "fallback"
    ];

    if (!validIntents.includes(parsed.intent)) {
      return { intent: "fallback" };
    }

    return { intent: parsed.intent };
  }

  // --------------------------------------------------
  // FRIENDLY MESSAGE GENERATOR (STRICT FORMATTING ONLY)
  // --------------------------------------------------
  static async generateFriendlyMessage(context) {

    const prompt = [
      {
        role: "system",
        content: `
You are a professional appointment scheduling assistant.

STRICT SYSTEM RULES:
- You DO NOT ask the user for additional information.
- You DO NOT request date, time, or appointment ID.
- You DO NOT make booking or cancellation decisions.
- You DO NOT invent availability.
- You ONLY rewrite backend responses clearly and professionally.
- Keep responses concise.
- Use US English.
- If user action is required, instruct them to use the appropriate form below.
`
      },
      {
        role: "user",
        content: `
Context Type: ${context.type}

Backend Data:
${JSON.stringify(context.data || context.message, null, 2)}
`
      }
    ];

    const response = await this.callLLM(prompt, 0.2);

    return response || this.defaultFallback(context);
  }

  // --------------------------------------------------
  // DEFAULT SAFE RESPONSES (NO LLM FALLBACK)
  // --------------------------------------------------
  static defaultFallback(context) {

    switch (context.type) {

      case "next_available":
        return "The next available appointment slot has been identified. You may use the booking form below to proceed.";

      case "specific_date_check":
        return "The requested date and time have been evaluated. Please use the booking form below if you would like to proceed.";

      case "backend_result":
        return "Your request has been processed successfully.";

      case "error":
        return "There was an issue processing your request. Please review the form and try again.";

      default:
        return "Please use the action buttons below to manage your appointment.";
    }
  }

  // --------------------------------------------------
  // FALLBACK FOR IRRELEVANT CHAT (NO DATA REQUESTS)
  // --------------------------------------------------
  static async generateFallbackReply(userMessage) {

    const prompt = [
      {
        role: "system",
        content: `
You are an appointment assistant.

IMPORTANT:
- Do NOT ask for date, time, or appointment ID.
- Do NOT request additional details.
- Direct the user to use the available action buttons.

Supported actions:
- Check availability
- Book an appointment
- Cancel an appointment

Respond briefly and professionally.
`
      },
      { role: "user", content: userMessage }
    ];

    const response = await this.callLLM(prompt, 0.2);

    return response ||
      "Please use the action buttons below to manage your appointment.";
  }
}

export default AIService;