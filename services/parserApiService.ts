import { parserApiUrl } from "@/config/parsing";
import { getSupabaseSession } from "@/services/supabaseClient";
import { ImportedScheduleAsset, LinkImportInput, ParsedCompetitionPayload, ParsingJob, SourceType, StoredScheduleAsset } from "@/types/models";

interface RemoteParserRequest {
  sourceType: Exclude<SourceType, "manual">;
  asset?: StoredScheduleAsset;
  link?: LinkImportInput;
  targetDancerNames?: string[];
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_SNIPPETS = [
  "boot_error",
  "network request failed",
  "network request timed out",
  "failed to fetch",
  "timed out",
  "waking up"
];

function getParserApiBaseUrl() {
  if (!parserApiUrl) {
    throw new Error("Remote parser is not configured.");
  }

  const trimmed = parserApiUrl.replace(/\/+$/, "");

  if (/\/functions\/v1\/[^/]+$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed.replace(/\/parse-competition$/, "");
}

async function buildParserHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const session = await getSupabaseSession();

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableParserError(message: string) {
  const normalized = message.toLowerCase();
  return RETRYABLE_ERROR_SNIPPETS.some((snippet) => normalized.includes(snippet));
}

async function readParserError(response: Response) {
  const errorText = await response.text();
  const retryAfter = response.headers.get("retry-after");

  return {
    message: errorText || `Parser request failed with status ${response.status}.`,
    retryAfterMs: retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : null,
    retryable: RETRYABLE_STATUS_CODES.has(response.status) || isRetryableParserError(errorText)
  };
}

async function fetchWithRetry(url: string, options: RequestInit, retryLabel: string) {
  const delays = [0, 1200, 2600];
  let lastMessage = `${retryLabel} failed.`;

  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt] > 0) {
      await sleep(delays[attempt]);
    }

    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      const error = await readParserError(response);
      lastMessage = error.message;

      if (!error.retryable || attempt === delays.length - 1) {
        throw new Error(error.message);
      }

      const retryDelay = error.retryAfterMs ?? delays[Math.min(attempt + 1, delays.length - 1)];
      await sleep(retryDelay);
      continue;
    } catch (error) {
      const message = error instanceof Error ? error.message : `${retryLabel} failed.`;
      lastMessage = message;

      if (!isRetryableParserError(message) || attempt === delays.length - 1) {
        throw error;
      }
    }
  }

  throw new Error(lastMessage);
}

async function postJson<TResponse>(path: string, body: RemoteParserRequest): Promise<TResponse> {
  const response = await fetchWithRetry(
    `${getParserApiBaseUrl()}${path}`,
    {
      method: "POST",
      headers: await buildParserHeaders(),
      body: JSON.stringify(body)
    },
    "parse-competition"
  );

  return (await response.json()) as TResponse;
}

async function fetchJson<TResponse>(url: string, options?: RequestInit): Promise<TResponse> {
  const response = await fetchWithRetry(
    url,
    {
      ...options,
      headers: {
        ...(options?.headers ?? {}),
        ...(await buildParserHeaders())
      }
    },
    "parser job request"
  );

  return (await response.json()) as TResponse;
}

export const parserApiService = {
  async parseUploadedAsset(sourceType: "pdf" | "screenshot", asset: StoredScheduleAsset): Promise<ParsedCompetitionPayload> {
    return postJson<ParsedCompetitionPayload>("/parse-competition", {
      sourceType,
      asset
    });
  },

  async parseLink(link: LinkImportInput): Promise<ParsedCompetitionPayload> {
    return postJson<ParsedCompetitionPayload>("/parse-competition", {
      sourceType: "link",
      link
    });
  },

  async createParsingJob(body: RemoteParserRequest): Promise<ParsingJob> {
    const baseUrl = getParserApiBaseUrl();

    return fetchJson<ParsingJob>(`${baseUrl}/parse-competition/jobs`, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  async getParsingJob(jobId: string): Promise<ParsingJob> {
    const baseUrl = getParserApiBaseUrl();
    return fetchJson<ParsingJob>(`${baseUrl}/parse-competition/jobs/${jobId}`);
  },

  // Stub contract for a future direct-device parser implementation if you want on-device OCR later.
  async parseLocally(_sourceType: Exclude<SourceType, "manual">, _input: ImportedScheduleAsset | LinkImportInput) {
    throw new Error("Local OCR parsing is not implemented.");
  }
};
