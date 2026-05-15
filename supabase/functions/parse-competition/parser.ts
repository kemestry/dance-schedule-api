import OpenAI from "npm:openai";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.2";

import { competitionScheduleSchema } from "./schema.ts";
import { buildDeveloperPrompt, buildUserInstructions } from "./prompt.ts";

const LINK_FETCH_TIMEOUT_MS = 12000;
const MAX_LINK_CONTEXT_CHARS = 15000;
const PDF_FETCH_TIMEOUT_MS = 20000;
const MAX_PDF_CHUNK_CHARS = 7000;
const MAX_PDF_CHUNKS = 4;
const DANCER_COLOR_TOKENS = ["sage", "gold", "coral", "sky", "lavender", "mint"];

type ChunkRow = Record<string, string | null>;
type ChunkCompetitionEvent = Record<string, string | null>;

export interface RemoteParserBody {
  sourceType: "pdf" | "screenshot" | "link";
  asset?: {
    uri?: string;
    name?: string;
    mimeType?: string;
    size?: number;
    storagePath?: string;
    downloadUrl?: string;
  };
  link?: {
    url: string;
  };
  targetDancerNames?: string[];
}

function getClient() {
  if (!Deno.env.get("OPENAI_API_KEY")) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY")
  });
}

function stripHtml(html: string) {
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

function normalizePdfText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(text: string, chunkSize = MAX_PDF_CHUNK_CHARS, maxChunks = Number.POSITIVE_INFINITY) {
  const chunks: string[] = [];
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

function buildTargetTokens(targetDancerNames: string[] = []) {
  return [
    ...new Set(
      targetDancerNames
        .flatMap((name) => normalizeName(name).split(" "))
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
    )
  ];
}

function selectRelevantPdfChunks(pdfChunks: string[], targetDancerNames: string[] = []) {
  if (!pdfChunks.length) {
    return [];
  }

  if (!targetDancerNames.length) {
    return pdfChunks.slice(0, MAX_PDF_CHUNKS);
  }

  const targetTokens = buildTargetTokens(targetDancerNames);

  if (!targetTokens.length) {
    return pdfChunks.slice(0, MAX_PDF_CHUNKS);
  }

  const matchingIndexes = pdfChunks.flatMap((chunk, index) => {
    const normalizedChunk = normalizeName(chunk);
    return targetTokens.some((token) => normalizedChunk.includes(token)) ? [index] : [];
  });

  if (!matchingIndexes.length) {
    return pdfChunks.slice(0, MAX_PDF_CHUNKS);
  }

  const expandedIndexes = [
    ...new Set(
      matchingIndexes.flatMap((index) => [Math.max(0, index - 1), index, Math.min(pdfChunks.length - 1, index + 1)])
    )
  ]
    .sort((left, right) => left - right)
    .slice(0, MAX_PDF_CHUNKS);

  return expandedIndexes.map((index) => pdfChunks[index]);
}

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeName(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesTargetDancer(dancerName: string, targetDancerNames: string[] = []) {
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

function normalizePerformanceType(value: string) {
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

function normalizeCompetitionEventType(value: string) {
  const raw = String(value || "").toLowerCase();

  if (raw.includes("award")) {
    return "awards";
  }

  if (raw.includes("judge")) {
    return "judges-break";
  }

  if (raw.includes("announcement")) {
    return "announcement";
  }

  return "break";
}

function deriveCompetitionName(assetName?: string, sourceUrl?: string) {
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

function mergeChunkRows({
  sourceType,
  sourceUrl,
  assetName,
  chunkResults,
  eventResults,
  targetDancerNames
}: {
  sourceType: "pdf";
  sourceUrl?: string;
  assetName?: string;
  chunkResults: Array<{ rows?: ChunkRow[]; competitionEvents?: ChunkCompetitionEvent[] }>;
  eventResults?: Array<{ rows?: ChunkRow[]; competitionEvents?: ChunkCompetitionEvent[] }>;
  targetDancerNames: string[];
}) {
  const rows = chunkResults.flatMap((result) => result.rows || []);
  const competitionEventRows = [...(chunkResults ?? []), ...(eventResults ?? [])].flatMap(
    (result) => result.competitionEvents || []
  );
  const filteredRows = rows.filter(
    (row) =>
      row?.dancerName &&
      row?.title &&
      row?.eventDate &&
      row?.eventTime &&
      matchesTargetDancer(String(row.dancerName), targetDancerNames)
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
  const uniqueDancerNames = [...new Set(filteredRows.map((row) => String(row.dancerName).trim()))];
  const dancerIdByName = new Map<string, string>();

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
      const dancerName = String(row.dancerName).trim();
      const dancerId = dancerIdByName.get(dancerName);

      if (!dancerId) {
        return null;
      }

      return {
        id: `${competitionId}-entry-${index + 1}`,
        competitionId,
        dancerId,
        eventDate: String(row.eventDate),
        eventTime: String(row.eventTime),
        datetimeStart: String(row.datetimeStart),
        title: String(row.title).trim(),
        category: String(row.category || "Unknown").trim(),
        performanceType: normalizePerformanceType(String(row.performanceType)),
        notes: row.notes ? String(row.notes) : null
      };
    })
    .filter(Boolean)
    .sort((left, right) => String(left?.datetimeStart).localeCompare(String(right?.datetimeStart)));

  const selectedDancers = dancers.map((dancer) => ({
    id: `${competitionId}-${dancer.id}-selected`,
    competitionId,
    dancerId: dancer.id
  }));

  const competitionEvents = competitionEventRows
    .map((event, index) => ({
      id: `${competitionId}-competition-event-${index + 1}`,
      competitionId,
      eventDate: String(event.eventDate || normalizedRows[0]?.eventDate || ""),
      eventTime: String(event.eventTime || ""),
      datetimeStart: String(event.datetimeStart || ""),
      title: String(event.title || "").trim(),
      type: normalizeCompetitionEventType(String(event.type || "")),
      notes: event.notes ? String(event.notes) : undefined,
      locationLabel: event.locationLabel ? String(event.locationLabel) : undefined
    }))
    .filter((event) => event.eventDate && event.eventTime && event.datetimeStart && event.title)
    .sort((left, right) => left.datetimeStart.localeCompare(right.datetimeStart));

  return {
    competition: {
      id: competitionId,
      name: competitionName,
      startDate: normalizedRows[0]?.eventDate,
      endDate: normalizedRows[normalizedRows.length - 1]?.eventDate,
      sourceType,
      sourceUrl: sourceUrl || null,
      createdAt
    },
    dancers,
    entries: normalizedRows,
    competitionEvents,
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
        },
        competitionEvents: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["eventDate", "eventTime", "datetimeStart", "title", "type", "notes", "locationLabel"],
            properties: {
              eventDate: { type: "string" },
              eventTime: { type: "string" },
              datetimeStart: { type: "string" },
              title: { type: "string" },
              type: { type: "string" },
              notes: {
                anyOf: [{ type: "string" }, { type: "null" }]
              },
              locationLabel: {
                anyOf: [{ type: "string" }, { type: "null" }]
              }
            }
          }
        }
      }
    }
  };
}

async function parsePdfChunks(openai: OpenAI, body: RemoteParserBody, pdfChunks: string[]) {
  const chunkPromises = pdfChunks.map(async (chunk, index) => {
    const response = await openai.responses.create({
      model: Deno.env.get("OPENAI_PDF_MODEL") || "gpt-5-mini",
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: [
                "Extract real dance competition performance rows and parent-important competition-wide timing events from this PDF text chunk.",
                "Return raw schedule rows and competitionEvents only.",
                "Exclude headers, banners, overall blocks, division labels, studio ads, and blank lines.",
                "Each row should represent one actual performance entry.",
                "Each competition event should represent one awards block, judges break, general break, or announcement with a real time.",
                "Use ISO YYYY-MM-DD for eventDate and ISO 8601 for datetimeStart.",
                "Use a concise human-readable local time like 5:39 PM for eventTime.",
                "Use one of: Solo, Duo/Trio, Group, Line, Production.",
                "If category is unclear, use the closest visible category text.",
                "Use competition event types: awards, judges-break, break, announcement.",
                "If a field is uncertain, omit the row or competition event rather than inventing it.",
                body.targetDancerNames?.length
                  ? `Return routine rows only for these dancer names: ${body.targetDancerNames.join(", ")}. Still include competition-wide events even if they are not tied to one dancer.`
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

    return JSON.parse(jsonText) as { rows?: Array<Record<string, string | null>> };
  });

  const results = await Promise.all(chunkPromises);

  return mergeChunkRows({
    sourceType: "pdf",
    sourceUrl: body.asset?.downloadUrl,
    assetName: body.asset?.name,
    chunkResults: results,
    eventResults: results,
    targetDancerNames: body.targetDancerNames || []
  });
}

async function fetchPdfText(url: string) {
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
    const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
    const extracted = await extractText(pdf, { mergePages: true });
    const text = normalizePdfText(
      typeof extracted.text === "string" ? extracted.text : extracted.text.join("\n\n")
    );

    if (!text) {
      throw new Error("Downloaded PDF but extracted no readable text.");
    }

    return chunkText(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLinkContext(url: string) {
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

function buildInputFromRequest(body: RemoteParserBody, { linkContext, pdfChunks }: { linkContext?: string; pdfChunks?: string[] }) {
  const { sourceType, asset, link } = body;
  const content: Array<Record<string, string>> = [
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

function validateBody(body: RemoteParserBody) {
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

export async function parseCompetition(
  body: RemoteParserBody,
  options: {
    onStage?: (stage: string) => Promise<void> | void;
  } = {}
) {
  const { onStage } = options;
  validateBody(body);
  const openai = getClient();
  const linkContext = body.sourceType === "link" ? await fetchLinkContext(body.link!.url) : undefined;
  let pdfChunks: string[] | undefined;

  if (body.sourceType === "pdf") {
    await onStage?.("extracting-pdf-text");
    const extractedChunks = await fetchPdfText(body.asset!.downloadUrl!);
    await onStage?.("matching-dancer-names");
    pdfChunks = selectRelevantPdfChunks(extractedChunks, body.targetDancerNames || []);
  }

  if (body.sourceType === "pdf" && pdfChunks?.length) {
    await onStage?.("building-schedule");
    return parsePdfChunks(openai, body, pdfChunks);
  }

  if (body.sourceType === "screenshot") {
    await onStage?.("processing-image");
  }

  if (body.sourceType === "link") {
    await onStage?.("fetching-link");
  }

  const response = await openai.responses.create({
    model: Deno.env.get("OPENAI_MODEL") || "gpt-5",
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
