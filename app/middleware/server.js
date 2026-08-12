import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import contentfulAdminRoutes from "./routes/contentfulAdmin.js";
import contentfulRoutes from "./routes/contentful.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow Postman or Allowed list
      if (!origin || allowedOrigins.includes(origin)) {
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
