import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import contentfulRoutes from "./routes/contentful.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;

// 👉 Serve frontend if a build exists (production)
const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));

// 👉 API
app.use("/api/contentful", contentfulRoutes);

// 👉 SPA fallback
app.get("/{*any}", (_, res) => {
  res.sendFile(path.resolve(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
