import "dotenv/config.js";

import cors from "cors";
import express from "express";

import { parseCompetition } from "./openai-parser.mjs";

const app = express();
const port = Number(process.env.PORT || 8787);
const parsingJobs = new Map();
const PARSING_JOB_TIMEOUT_MS = Number(process.env.PARSING_JOB_TIMEOUT_MS || 180000);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*"
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    parserConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-5",
    now: new Date().toISOString()
  });
});

function buildJob(body) {
  const now = new Date().toISOString();
  return {
    id: `parse-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "queued",
    sourceType: body.sourceType,
    targetDancerNames: body.targetDancerNames || [],
    createdAt: now,
    updatedAt: now
  };
}

async function runParsingJob(jobId, body) {
  const current = parsingJobs.get(jobId);
  if (!current) {
    return;
  }

  parsingJobs.set(jobId, {
    ...current,
    status: "processing",
    targetDancerNames: body.targetDancerNames || [],
    updatedAt: new Date().toISOString()
  });

  try {
    const payload = await Promise.race([
      parseCompetition(body),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Parser timed out before it could finish this import.")), PARSING_JOB_TIMEOUT_MS)
      )
    ]);
    const completed = parsingJobs.get(jobId);

    if (!completed) {
      return;
    }

    parsingJobs.set(jobId, {
      ...completed,
      status: "completed",
      payload,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    const failed = parsingJobs.get(jobId);

    if (!failed) {
      return;
    }

    parsingJobs.set(jobId, {
      ...failed,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown parser error.",
      updatedAt: new Date().toISOString()
    });
  }
}

app.post("/parse-competition", async (request, response) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      response.status(500).json({
        error: "OPENAI_API_KEY is not configured."
      });
      return;
    }

    const payload = await parseCompetition(request.body);
    response.json(payload);
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Unknown parser error."
    });
  }
});

app.post("/parse-competition/jobs", async (request, response) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      response.status(500).json({
        error: "OPENAI_API_KEY is not configured."
      });
      return;
    }

    const job = buildJob(request.body);
    parsingJobs.set(job.id, job);
    response.status(202).json(job);

    runParsingJob(job.id, request.body);
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Unable to create parser job."
    });
  }
});

app.get("/parse-competition/jobs/:jobId", (request, response) => {
  const job = parsingJobs.get(request.params.jobId);

  if (!job) {
    response.status(404).json({
      error: "Parser job not found."
    });
    return;
  }

  response.json(job);
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`CompCoach parser backend listening on http://localhost:${port}`);
});
