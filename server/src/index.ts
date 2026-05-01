import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.js";
import projectsRouter from "./routes/projects.js";
import tasksByProjectRouter from "./routes/tasks.js";
import { taskRouter } from "./routes/tasks.js";
import dashboardRouter from "./routes/dashboard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/projects/:projectId/tasks", tasksByProjectRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/dashboard", dashboardRouter);

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
});

const clientDist =
  process.env.CLIENT_DIST ||
  path.resolve(__dirname, "../../client/dist");

if (process.env.NODE_ENV === "production" && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
} else if (process.env.NODE_ENV === "production") {
  console.warn("CLIENT_DIST not found; skipping static SPA:", clientDist);
}

app.use((_req, res) => {
  if (!res.headersSent) {
    res.status(404).json({ error: "Not found" });
  }
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
