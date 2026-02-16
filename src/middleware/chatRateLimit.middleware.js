import rateLimit from "express-rate-limit";

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many requests. Please try again later."
});

export default chatLimiter;