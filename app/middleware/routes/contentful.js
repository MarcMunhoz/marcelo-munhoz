import express from "express";
import { createClient } from "contentful";

const router = express.Router();

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_DELIVERY,
  environment: "master", // ou outro, se usar múltiplos ambientes
});

router.get("/entries", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = page > 1 ? (page - 1) * limit : 0;

    const entries = await client.getEntries({
      content_type: "article",
      order: "-sys.createdAt,-fields.createAt",
      limit,
      skip,
    });

    res.json(entries);
  } catch (err) {
    console.error("Erro no Contentful:", err.message);
    res.status(500).json({ error: "Erro ao buscar conteúdo" });
  }
});

router.get("/tags", async (req, res) => {
  try {
    const tags = await client.getTags();
    res.json(tags);
  } catch (err) {
    console.error("Erro ao buscar tags:", err.message);
    res.status(500).json({ error: "Erro ao buscar tags" });
  }
});

router.get("/tagged", async (req, res) => {
  try {
    const tag = req.query.tag;
    const page = parseInt(req.query.page) || 1;
    const limit = 3;
    const skip = page > 1 ? (page - 1) * limit : 0;

    const entries = await client.getEntries({
      "metadata.tags.sys.id[all]": tag,
      content_type: "article",
      order: "-fields.createAt",
      limit,
      skip,
    });

    res.json(entries);
  } catch (err) {
    console.error("Erro ao buscar artigos por tag:", err.message);
    res.status(500).json({ error: "Erro ao buscar artigos por tag" });
  }
});

export default router;
