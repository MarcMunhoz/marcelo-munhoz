import express from "express";
import { createContentfulAdminHandler, devPreviewSessionFromHeaders } from "../contentfulAdmin.js";

const router = express.Router();
const localAdminHandler = createContentfulAdminHandler({
  getSession({ headers }) {
    return devPreviewSessionFromHeaders(headers);
  },
});

router.use(express.json({ limit: "1mb" }));

router.use(async (req, res) => {
  const response = await localAdminHandler({
    method: req.method,
    path: req.path,
    query: req.query,
    headers: req.headers,
    body: req.body,
  });

  res.status(response.statusCode).type("json").send(response.body);
});

export default router;
