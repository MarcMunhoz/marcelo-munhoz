import pkg from "contentful";
const { createClient } = pkg;
import express from "express";

const router = express.Router();

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_DELIVERY_KEY,
  environment: "master",
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

router.get("/article/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const entries = await client.getEntries({
      content_type: "article",
      "fields.slug": slug,
      limit: 1,
    });

    if (entries.items.length === 0) {
      return res.status(404).json({ error: "Artigo não encontrado" });
    }

    res.json(entries.items[0]);
  } catch (err) {
    console.error("Erro ao buscar artigo pelo slug:", err.message);
    res.status(500).json({ error: "Erro ao buscar artigo" });
  }
});

export default router;
