import cors from "cors";
import express from "express";
import { isAllowedCorsOrigin } from "./corsPolicy.js";
import contentfulAdminRoutes from "./routes/contentfulAdmin.js";
import contentfulRoutes from "./routes/contentful.js";

export const createApp = ({ nodeEnv = process.env.NODE_ENV, allowedOrigins = [], adminRoutes = contentfulAdminRoutes, publicRoutes = contentfulRoutes } = {}) => {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedCorsOrigin(origin, { nodeEnv, allowedOrigins })) {
          return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
      },
    })
  );

  app.get("/healthz", (_, response) => {
    response.status(200).send("OK");
  });

  app.use("/api/admin/contentful", adminRoutes);
  app.use("/api/contentful", publicRoutes);

  return app;
};
