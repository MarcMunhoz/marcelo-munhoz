import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";
import contentfulRoutes from "./routes/contentful.js";

dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;

app.use(cors());

// Keeps banckend alive
app.get("/healthz", (_, res) => {
  res.status(200).send("OK");
});

// 👉 API
app.use("/api/contentful", contentfulRoutes);

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
