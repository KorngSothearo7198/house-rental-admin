import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import paymentRoutes from "../routes/paymentRoutes.js";

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  }),
);

app.use(express.json());

console.log("========================================");
console.log("Starting RentEase Payment Server");
console.log("========================================");

console.log("PORT:", PORT);

console.log(
  "BAKONG_ACCOUNT:",
  process.env.BAKONG_ACCOUNT || "MISSING",
);

console.log(
  "BAKONG_API_URL:",
  process.env.BAKONG_API_URL || "MISSING",
);

console.log(
  "BAKONG_API_TOKEN:",
  process.env.BAKONG_API_TOKEN
    ? "LOADED"
    : "MISSING",
);

console.log(
  "BAKONG_TEST_MODE:",
  process.env.BAKONG_TEST_MODE || "MISSING",
);

console.log(
  "BAKONG_TEST_AMOUNT_KHR:",
  process.env.BAKONG_TEST_AMOUNT_KHR || "MISSING",
);

console.log("========================================");

app.get("/", (req, res) => {
  console.log("GET /");

  res.json({
    success: true,
    message: "RentEase Payment API is running",
    port: PORT,
  });
});

app.get("/health", (req, res) => {
  console.log("GET /health");

  res.json({
    success: true,
    message: "Payment server is healthy",
  });
});

app.use("/api/payment", (req, res, next) => {
  console.log(
    `PAYMENT REQUEST: ${req.method} ${req.originalUrl}`,
  );

  next();
});

app.use("/api/payment", paymentRoutes);

app.use((req, res) => {
  console.log(
    `404: ${req.method} ${req.originalUrl}`,
  );

  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((error, req, res, next) => {
  console.error("========================================");
  console.error("UNHANDLED SERVER ERROR");
  console.error("========================================");
  console.error(error);
  console.error("========================================");

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development"
        ? error?.message
        : undefined,
  });
});

app.listen(PORT, () => {
  console.log("========================================");
  console.log("RentEase Payment API RUNNING");
  console.log("========================================");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(
    `Payment: http://localhost:${PORT}/api/payment`,
  );
  console.log("========================================");
});