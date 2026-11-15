import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config";
import { attachUser } from "./middleware/auth";
import { errorHandler, notFoundApi, originCheck } from "./middleware/errors";
import api from "./routes";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: config.frontendUrls, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api", originCheck, attachUser, api);
  app.use("/api", notFoundApi);
  app.use(errorHandler);
  return app;
}
