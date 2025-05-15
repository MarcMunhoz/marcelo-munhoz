import express from "express";
import contentfulRoutes from "./routes/contentful.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

app.use("/api/contentful", contentfulRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Express rodando na porta ${PORT}`);
});
