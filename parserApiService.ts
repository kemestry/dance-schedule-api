import { parserApiUrl } from "@/config/parsing";
import { ImportedScheduleAsset, LinkImportInput, ParsedCompetitionPayload, ParsingJob, SourceType, StoredScheduleAsset } from "@/types/models";

interface RemoteParserRequest {
  sourceType: Exclude<SourceType, "manual">;
  asset?: StoredScheduleAsset;
  link?: LinkImportInput;
  targetDancerNames?: string[];
}

async function postJson<TResponse>(body: RemoteParserRequest): Promise<TResponse> {
  if (!parserApiUrl) {
    throw new Error("Remote parser is not configured.");
  }

  const response = await fetch(parserApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Parser request failed with status ${response.status}.`);
  }

  return (await response.json()) as TResponse;
}

function getParserApiBaseUrl() {
  if (!parserApiUrl) {
    throw new Error("Remote parser is not configured.");
  }

  return parserApiUrl.replace(/\/parse-competition$/, "");
}

async function fetchJson<TResponse>(url: string, options?: RequestInit): Promise<TResponse> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Parser request failed with status ${response.status}.`);
  }

  return (await response.json()) as TResponse;
}

export const parserApiService = {
  async parseUploadedAsset(
    sourceType: "pdf" | "screenshot",
    asset: StoredScheduleAsset,
    targetDancerNames?: string[]
  ): Promise<ParsedCompetitionPayload> {
    return postJson<ParsedCompetitionPayload>({
      sourceType,
      asset,
      targetDancerNames
    });
  },

  async parseLink(link: LinkImportInput): Promise<ParsedCompetitionPayload> {
    return postJson<ParsedCompetitionPayload>({
      sourceType: "link",
      link
    });
  },

  async createParsingJob(body: RemoteParserRequest): Promise<ParsingJob> {
    const baseUrl = getParserApiBaseUrl();

    return fetchJson<ParsingJob>(`${baseUrl}/parse-competition/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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
