import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { isAllowedCorsOrigin } from "./corsPolicy.js";
import contentfulAdminRoutes from "./routes/contentfulAdmin.js";
import contentfulRoutes from "./routes/contentful.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS?.split(",") || []).map((origin) => origin.trim()).filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (isAllowedCorsOrigin(origin, { nodeEnv: process.env.NODE_ENV, allowedOrigins })) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
  })
);

// Keeps banckend alive
app.get("/healthz", (_, res) => {
  res.status(200).send("OK");
});

// 👉 API
app.use("/api/admin/contentful", contentfulAdminRoutes);
app.use("/api/contentful", contentfulRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
