import pkg from "contentful";
const { createClient } = pkg;
import express from "express";

const router = express.Router();

// 👉 Initialize Contentful client
const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_DELIVERY_KEY,
  environment: "master",
});

// 👉 Get paginated list of articles
router.get("/entries", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 3;
    const skip = (page - 1) * limit;

    const entries = await client.getEntries({
      content_type: "article",
      order: "-sys.createdAt,-fields.createAt",
      limit,
      skip,
    });

    res.json(entries);
  } catch (err) {
    console.error("Contentful error:", err.message);
    res.status(500).json({ error: "Failed to fetch content" });
  }
});

// 👉 Get all tags
router.get("/tags", async (req, res) => {
  try {
    const tags = await client.getTags();
    res.json(tags);
  } catch (err) {
    console.error("Error fetching tags:", err.message);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

// 👉 Get articles by tag
router.get("/tagged", async (req, res) => {
  try {
    const tag = req.query.tag;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = 3;
    const skip = (page - 1) * limit;

    const entries = await client.getEntries({
      "metadata.tags.sys.id[all]": tag,
      content_type: "article",
      order: "-fields.createAt",
      limit,
      skip,
    });

    res.json(entries);
  } catch (err) {
    console.error("Error fetching articles by tag:", err.message);
    res.status(500).json({ error: "Failed to fetch articles by tag" });
  }
});

// 👉 Get article by slug
router.get("/article/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const entries = await client.getEntries({
      content_type: "article",
      "fields.slug": slug,
      limit: 1,
    });

    if (entries.items.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json(entries.items[0]);
  } catch (err) {
    console.error("Error fetching article by slug:", err.message);
    res.status(500).json({ error: "Failed to fetch article" });
  }
});

export default router;
