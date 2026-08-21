import express from "express";
import { contentfulHandler } from "../contentfulProxy.js";

const router = express.Router();

router.get(["/entries", "/blog-index", "/blog-years", "/tags", "/tagged", "/article/:slug", "/article-navigation/:slug", "/author/:slug"], async (req, res) => {
  const response = await contentfulHandler({
    path: req.path,
    query: req.query,
  });

  res.status(response.statusCode).type("json").send(response.body);
});

export default router;
