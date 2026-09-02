import express from "express";
import { contentfulHandler } from "../contentfulProxy.js";

const router = express.Router();

export const PUBLIC_CONTENTFUL_ROUTE_PATHS = [
  "/entries",
  "/blog-index",
  "/blog-years",
  "/tags",
  "/tagged",
  "/article/:slug",
  "/article-navigation/:slug",
  "/author/:slug",
];

router.get(PUBLIC_CONTENTFUL_ROUTE_PATHS, async (req, res) => {
  const response = await contentfulHandler({
    path: req.path,
    query: req.query,
  });

  res.status(response.statusCode).type("json").send(response.body);
});

export default router;
