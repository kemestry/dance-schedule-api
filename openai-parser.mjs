import OpenAI from "openai";
import pdfParse from "pdf-parse";

import { competitionScheduleSchema } from "./schema.mjs";
import { buildDeveloperPrompt, buildUserInstructions } from "./prompt.mjs";

const LINK_FETCH_TIMEOUT_MS = 12000;
const MAX_LINK_CONTEXT_CHARS = 15000;
const PDF_FETCH_TIMEOUT_MS = 20000;
const MAX_PDF_CHUNK_CHARS = 8000;
const MAX_PDF_CHUNKS = 6;
const DANCER_COLOR_TOKENS = ["sage", "gold", "coral", "sky", "lavender", "mint"];

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePdfText(text) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(text, chunkSize = MAX_PDF_CHUNK_CHARS, maxChunks = MAX_PDF_CHUNKS) {
  const chunks = [];
  let index = 0;

  while (index < text.length && chunks.length < maxChunks) {
    let end = Math.min(index + chunkSize, text.length);

    if (end < text.length) {
      const nextBreak = text.lastIndexOf("\n", end);
      if (nextBreak > index + chunkSize * 0.6) {
        end = nextBreak;
      }
    }

    chunks.push(text.slice(index, end).trim());
    index = end;
  }

  return chunks.filter(Boolean);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesTargetDancer(dancerName, targetDancerNames = []) {
  if (!targetDancerNames.length) {
    return true;
  }

  const normalizedDancerName = normalizeName(dancerName);

  return targetDancerNames.some((targetName) => {
    const normalizedTargetName = normalizeName(targetName);

    return (
      normalizedDancerName === normalizedTargetName ||
      normalizedDancerName.includes(normalizedTargetName) ||
      normalizedTargetName.includes(normalizedDancerName)
    );
  });
}

function normalizePerformanceType(value) {
  const raw = String(value || "").toLowerCase();

  if (raw.includes("duo") || raw.includes("trio")) {
    return "Duo/Trio";
  }

  if (raw.includes("line")) {
    return "Line";
  }

  if (raw.includes("production")) {
    return "Production";
  }

  if (raw.includes("group")) {
    return "Group";
  }

  return "Solo";
}

function deriveCompetitionName(assetName, sourceUrl) {
  if (assetName) {
    return assetName
      .replace(/\.pdf$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (sourceUrl) {
    const lastSegment = sourceUrl.split("/").pop() || "competition-schedule";
    return lastSegment.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
  }

  return "Competition Schedule";
}

function mergeChunkRows({ sourceType, sourceUrl, assetName, chunkResults, targetDancerNames }) {
  const rows = chunkResults.flatMap((result) => result.rows || []);
  const filteredRows = rows.filter(
    (row) =>
      row?.dancerName &&
      row?.title &&
      row?.eventDate &&
      row?.eventTime &&
      matchesTargetDancer(row.dancerName, targetDancerNames)
  );

  if (!filteredRows.length) {
    throw new Error(
      targetDancerNames?.length
        ? `Parser found no schedule rows for the selected dancer names: ${targetDancerNames.join(", ")}.`
        : "Parser returned no schedule rows from the PDF text chunks."
    );
  }

  const competitionName = deriveCompetitionName(assetName, sourceUrl);

  const competitionId = slugify(competitionName) || `competition-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const uniqueDancerNames = [...new Set(filteredRows.map((row) => row.dancerName.trim()))];
  const dancerIdByName = new Map();

  const dancers = uniqueDancerNames.map((name, index) => {
    const dancerId = `${competitionId}-${slugify(name) || `dancer-${index + 1}`}`;
    dancerIdByName.set(name, dancerId);

    return {
      id: dancerId,
      competitionId,
      name,
      colorToken: DANCER_COLOR_TOKENS[index % DANCER_COLOR_TOKENS.length]
    };
  });

  const normalizedRows = filteredRows
    .map((row, index) => {
      const dancerName = row.dancerName.trim();
      const dancerId = dancerIdByName.get(dancerName);

      if (!dancerId) {
        return null;
      }

      return {
        id: `${competitionId}-entry-${index + 1}`,
        competitionId,
        dancerId,
        eventDate: row.eventDate,
        eventTime: row.eventTime,
        datetimeStart: row.datetimeStart,
        title: row.title.trim(),
        category: row.category?.trim() || "Unknown",
        performanceType: normalizePerformanceType(row.performanceType),
        notes: row.notes || null
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.datetimeStart.localeCompare(right.datetimeStart));

  const selectedDancers = dancers.map((dancer) => ({
    id: `${competitionId}-${dancer.id}-selected`,
    competitionId,
    dancerId: dancer.id
  }));

  return {
    competition: {
      id: competitionId,
      name: competitionName,
      startDate: normalizedRows[0].eventDate,
      endDate: normalizedRows[normalizedRows.length - 1].eventDate,
      sourceType,
      sourceUrl: sourceUrl || null,
      createdAt
    },
    dancers,
    entries: normalizedRows,
    selectedDancers
  };
}

function buildChunkSchema() {
  return {
    name: "competition_schedule_rows",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["rows"],
      properties: {
        rows: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "dancerName",
              "eventDate",
              "eventTime",
              "datetimeStart",
              "title",
              "category",
              "performanceType",
              "notes"
            ],
            properties: {
              dancerName: { type: "string" },
              eventDate: { type: "string" },
              eventTime: { type: "string" },
              datetimeStart: { type: "string" },
              title: { type: "string" },
              category: { type: "string" },
              performanceType: { type: "string" },
              notes: {
                anyOf: [{ type: "string" }, { type: "null" }]
              }
            }
          }
        }
      }
    }
  };
}

async function parsePdfChunks(openai, body, pdfChunks) {
  const chunkPromises = pdfChunks.map(async (chunk, index) => {
    const response = await openai.responses.create({
      model: process.env.OPENAI_PDF_MODEL || "gpt-5-mini",
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: [
                "Extract only real dance competition performance rows from this PDF text chunk.",
                "Return raw schedule rows only.",
                "Exclude headers, banners, overall blocks, division labels, awards, studio ads, and blank lines.",
                "Each row should represent one actual performance entry.",
                "Use ISO YYYY-MM-DD for eventDate and ISO 8601 for datetimeStart.",
                "Use a concise human-readable local time like 5:39 PM for eventTime.",
                "Use one of: Solo, Duo/Trio, Group, Line, Production.",
                "If category is unclear, use the closest visible category text.",
                "If a field is uncertain, omit the row rather than inventing it.",
                body.targetDancerNames?.length
                  ? `Return rows only for these dancer names: ${body.targetDancerNames.join(", ")}.`
                  : "If no target dancer names are provided, include all dancers you can confidently identify."
              ].join(" ")
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                buildUserInstructions({
                  sourceType: "pdf",
                  asset: body.asset,
                  targetDancerNames: body.targetDancerNames
                }),
                `This is PDF text chunk ${index + 1} of ${pdfChunks.length}.`,
                "Focus on extracting schedule rows, not metadata."
              ].join("\n\n")
            },
            {
              type: "input_text",
              text: chunk
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          ...buildChunkSchema()
        }
      }
    });

    const jsonText = response.output_text;

    if (!jsonText) {
      throw new Error(`Parser returned no JSON output for PDF chunk ${index + 1}.`);
    }

    return JSON.parse(jsonText);
  });

  const results = await Promise.all(chunkPromises);

  return mergeChunkRows({
    sourceType: "pdf",
    sourceUrl: body.asset?.downloadUrl,
    assetName: body.asset?.name,
    chunkResults: results,
    targetDancerNames: body.targetDancerNames || []
  });
}

async function fetchPdfText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "CompCoachParser/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Unable to download PDF. Upstream status ${response.status}.`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const parsed = await pdfParse(Buffer.from(arrayBuffer));
    const text = normalizePdfText(parsed.text || "");

    if (!text) {
      throw new Error("Downloaded PDF but extracted no readable text.");
    }

    return chunkText(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLinkContext(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LINK_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "CompCoachParser/1.0"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Unable to fetch source URL. Upstream status ${response.status}.`);
    }

    const html = await response.text();
    const text = stripHtml(html);

    if (!text) {
      throw new Error("Fetched source URL but extracted no readable text.");
    }

    return text.slice(0, MAX_LINK_CONTEXT_CHARS);
  } finally {
    clearTimeout(timeout);
  }
}

function buildInputFromRequest(body, { linkContext, pdfChunks }) {
  const { sourceType, asset, link } = body;
  const content = [
    {
      type: "input_text",
      text: buildUserInstructions({ sourceType, asset, link, targetDancerNames: body.targetDancerNames })
    }
  ];

  if (sourceType === "link" && link?.url && linkContext) {
    content.push({
      type: "input_text",
      text: `Fetched source URL: ${link.url}\n\nPage text:\n${linkContext}`
    });
  }

  if (sourceType === "pdf" && asset?.downloadUrl && pdfChunks?.length) {
    content.push({
      type: "input_text",
      text: `Fetched PDF source: ${asset.downloadUrl}\nExtracted PDF text follows in ${pdfChunks.length} chunk(s).`
    });
    pdfChunks.forEach((chunk, index) => {
      content.push({
        type: "input_text",
        text: `PDF text chunk ${index + 1} of ${pdfChunks.length}:\n${chunk}`
      });
    });
  }

  if (sourceType === "screenshot" && asset?.downloadUrl) {
    content.push({
      type: "input_image",
      image_url: asset.downloadUrl
    });
  }

  return [
    {
      role: "developer",
      content: [{ type: "input_text", text: buildDeveloperPrompt() }]
    },
    {
      role: "user",
      content
    }
  ];
}

function validateBody(body) {
  if (!body?.sourceType || !["pdf", "screenshot", "link"].includes(body.sourceType)) {
    throw new Error("sourceType must be one of: pdf, screenshot, link.");
  }

  if (body.sourceType === "link" && !body.link?.url) {
    throw new Error("Link imports require link.url.");
  }

  if ((body.sourceType === "pdf" || body.sourceType === "screenshot") && !body.asset?.downloadUrl) {
    throw new Error(`${body.sourceType} imports require asset.downloadUrl.`);
  }
}

export async function parseCompetition(body) {
  validateBody(body);
  const openai = getClient();
  const linkContext = body.sourceType === "link" ? await fetchLinkContext(body.link.url) : undefined;
  const pdfChunks = body.sourceType === "pdf" ? await fetchPdfText(body.asset.downloadUrl) : undefined;

  if (body.sourceType === "pdf" && pdfChunks?.length) {
    return parsePdfChunks(openai, body, pdfChunks);
  }

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5",
    input: buildInputFromRequest(body, { linkContext, pdfChunks }),
    text: {
      format: {
        type: "json_schema",
        ...competitionScheduleSchema
      }
    }
  });

  const jsonText = response.output_text;

  if (!jsonText) {
    throw new Error("Parser returned no JSON output.");
  }

  return JSON.parse(jsonText);
}
