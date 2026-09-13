import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createApp } from "./createApp.js";

export const loadEnvironment = () => dotenv.config();

const allowedOriginsFrom = (env) =>
  (env.ALLOWED_ORIGINS?.split(",") || []).map((origin) => origin.trim()).filter(Boolean);

export const startServer = ({ appFactory = createApp, env = process.env, loadEnv = loadEnvironment, onListen, port } = {}) => {
  loadEnv();

  const resolvedPort = port ?? (env.PORT || 3000);
  const app = appFactory({ nodeEnv: env.NODE_ENV, allowedOrigins: allowedOriginsFrom(env) });
  const logListening = onListen ?? (() => console.log(`🚀 Server running on port ${resolvedPort}`));

  return app.listen(resolvedPort, logListening);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
