import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js@2";

import { parseCompetition, RemoteParserBody } from "./parser.ts";

const PARSING_JOB_TIMEOUT_MS = Number(Deno.env.get("PARSING_JOB_TIMEOUT_MS") || "180000");

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });
}

function toCamelJob(row: Record<string, unknown>, payload?: unknown) {
  return {
    id: row.id,
    status: row.status,
    sourceType: row.source_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stage: row.stage,
    targetDancerNames: Array.isArray(row.target_dancer_names) ? row.target_dancer_names : [],
    payload,
    error: row.error ?? undefined
  };
}

function getPathname(request: Request) {
  const url = new URL(request.url);
  const prefix = "/parse-competition";
  if (url.pathname.endsWith(prefix)) {
    return "/parse-competition";
  }

  if (url.pathname.includes(`${prefix}/`)) {
    return url.pathname.slice(url.pathname.lastIndexOf(prefix));
  }

  return url.pathname;
}

function getClients(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new Error("Supabase function environment is missing required keys.");
  }

  const authHeader = request.headers.get("Authorization") || "";

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    }
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, serviceRoleKey ? {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  } : undefined);

  return { authClient, adminClient };
}

async function requireUser(request: Request) {
  const { authClient, adminClient } = getClients(request);
  const { data, error } = await authClient.auth.getUser();

  if (error || !data.user) {
    return { error: json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user: data.user, adminClient };
}

async function updateJobStage(adminClient: ReturnType<typeof createClient>, jobId: string, updates: Record<string, unknown>) {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  const { error } = await adminClient.from("parse_jobs").update(payload).eq("id", jobId);
  if (error) {
    console.error("Failed to update parse job", jobId, error);
  }
}

async function ensureAssetDownloadUrl(adminClient: ReturnType<typeof createClient>, body: RemoteParserBody) {
  if ((body.sourceType !== "pdf" && body.sourceType !== "screenshot") || body.asset?.downloadUrl) {
    return body;
  }

  const storagePath = body.asset?.storagePath;
  if (!storagePath) {
    throw new Error(`${body.sourceType} imports require asset.storagePath or asset.downloadUrl.`);
  }

  const [bucket, ...rest] = storagePath.split("/");
  const objectPath = rest.join("/");

  if (!bucket || !objectPath) {
    throw new Error("Stored asset path is invalid.");
  }

  const signed = await adminClient.storage.from(bucket).createSignedUrl(objectPath, 60 * 60);

  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(signed.error?.message || "Unable to create parser download URL.");
  }

  return {
    ...body,
    asset: {
      ...body.asset,
      downloadUrl: signed.data.signedUrl
    }
  };
}

async function runParsingJob(adminClient: ReturnType<typeof createClient>, jobId: string, body: RemoteParserBody) {
  await updateJobStage(adminClient, jobId, {
    status: "processing",
    stage:
      body.sourceType === "pdf"
        ? "extracting-pdf-text"
        : body.sourceType === "link"
          ? "fetching-link"
          : "processing-image",
    started_at: new Date().toISOString()
  });

  try {
    let parserBody: RemoteParserBody;
    try {
      parserBody = await ensureAssetDownloadUrl(adminClient, body);
    } catch (error) {
      throw new Error(
        `prepare-asset failed: ${error instanceof Error ? error.message : "Unknown asset preparation error."}`
      );
    }

    let payload: unknown;
    try {
      payload = await Promise.race([
        parseCompetition(parserBody, {
          onStage: async (stage) => {
            await updateJobStage(adminClient, jobId, { stage });
          }
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Parser timed out before it could finish this import.")), PARSING_JOB_TIMEOUT_MS)
        )
      ]);
    } catch (error) {
      throw new Error(
        `parse-competition failed: ${error instanceof Error ? error.message : "Unknown parser error."}`
      );
    }

    const { error: resultError } = await adminClient.from("parse_job_results").upsert(
      {
        parse_job_id: jobId,
        raw_payload: payload
      },
      {
        onConflict: "parse_job_id"
      }
    );

    if (resultError) {
      throw new Error(`save-result failed: ${resultError.message}`);
    }

    await updateJobStage(adminClient, jobId, {
      status: "completed",
      stage: "completed",
      completed_at: new Date().toISOString(),
      error: null
    });
  } catch (error) {
    await updateJobStage(adminClient, jobId, {
      status: "failed",
      stage: "failed",
      completed_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown parser error."
    });
  }
}

Deno.serve(async (request) => {
  try {
    const pathname = getPathname(request);

    if (request.method === "OPTIONS") {
      return new Response("ok");
    }

    if (request.method === "GET" && (pathname === "/health" || pathname === "/parse-competition/health")) {
      return json({
        ok: true,
        parserConfigured: Boolean(Deno.env.get("OPENAI_API_KEY")),
        model: Deno.env.get("OPENAI_MODEL") || "gpt-5",
        now: new Date().toISOString()
      });
    }

    const auth = await requireUser(request);
    if ("error" in auth) {
      return auth.error;
    }

    const { user, adminClient } = auth;

    if (request.method === "POST" && pathname === "/parse-competition/jobs") {
      const body = (await request.json()) as RemoteParserBody;
      const now = new Date().toISOString();
      const insert = {
        owner_user_id: user.id,
        source_type: body.sourceType,
        status: "queued",
        stage: "queued",
        target_dancer_names: body.targetDancerNames || [],
        storage_path: body.asset?.storagePath ?? null,
        file_name: body.asset?.name ?? null,
        created_at: now,
        updated_at: now
      };

      const { data, error } = await adminClient.from("parse_jobs").insert(insert).select("*").single();

      if (error || !data) {
        return json({ error: error?.message || "Unable to create parser job." }, { status: 400 });
      }

      EdgeRuntime.waitUntil(runParsingJob(adminClient, String(data.id), body));
      return json(toCamelJob(data), { status: 202 });
    }

    if (request.method === "GET" && pathname.startsWith("/parse-competition/jobs/")) {
      const jobId = pathname.replace("/parse-competition/jobs/", "");
      const { data: job, error: jobError } = await adminClient
        .from("parse_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("owner_user_id", user.id)
        .single();

      if (jobError || !job) {
        return json({ error: "Parser job not found." }, { status: 404 });
      }

      let payload: unknown;
      if (job.status === "completed") {
        const { data: resultRow } = await adminClient
          .from("parse_job_results")
          .select("raw_payload")
          .eq("parse_job_id", jobId)
          .maybeSingle();
        payload = resultRow?.raw_payload;
      }

      return json(toCamelJob(job, payload));
    }

    if (request.method === "POST" && pathname === "/parse-competition") {
      const body = await ensureAssetDownloadUrl(adminClient, (await request.json()) as RemoteParserBody);
      const payload = await parseCompetition(body);
      return json(payload);
    }

    return json({ error: "Not found." }, { status: 404 });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unexpected parser error."
      },
      { status: 500 }
    );
  }
});
