import "dotenv/config.js";

import cors from "cors";
import express from "express";

import { parseCompetition } from "./openai-parser.mjs";

const app = express();
const port = Number(process.env.PORT || 8787);
const parsingJobs = new Map();
const PARSING_JOB_TIMEOUT_MS = Number(process.env.PARSING_JOB_TIMEOUT_MS || 180000);

function updateJob(jobId, changes) {
  const current = parsingJobs.get(jobId);
  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...changes,
    updatedAt: new Date().toISOString()
  };
  parsingJobs.set(jobId, next);
  return next;
}

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
    stage: "queued",
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

  updateJob(jobId, {
    status: "processing",
    stage:
      body.sourceType === "pdf"
        ? "extracting-pdf-text"
        : body.sourceType === "link"
          ? "fetching-link"
          : "processing-image",
    targetDancerNames: body.targetDancerNames || []
  });

  try {
    const payload = await Promise.race([
      parseCompetition(body, {
        onStage: (stage) => {
          updateJob(jobId, { stage });
        }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Parser timed out before it could finish this import.")), PARSING_JOB_TIMEOUT_MS)
      )
    ]);
    const completed = updateJob(jobId, {
      status: "completed",
      stage: "completed",
      payload
    });

    if (!completed) {
      return;
    }
  } catch (error) {
    const failed = updateJob(jobId, {
      status: "failed",
      stage: "failed",
      error: error instanceof Error ? error.message : "Unknown parser error."
    });

    if (!failed) {
      return;
    }
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
