export function buildDeveloperPrompt() {
  return [
    "You extract dance competition schedules into structured JSON for CompCoach.",
    "Return only data that fits the provided JSON schema.",
    "Normalize dancer schedules into one competition payload.",
    "Keep competition-wide events like awards, judges breaks, meal breaks, and general pauses in a separate competitionEvents array.",
    "If the source is incomplete, omit uncertain rows rather than inventing them.",
    "Infer competition startDate and endDate from the extracted rows.",
    "Use sourceType exactly as provided by the caller.",
    "Use ISO dates in YYYY-MM-DD format and ISO datetimes for datetimeStart.",
    "Use these performanceType values only: Solo, Duo/Trio, Group, Line, Production.",
    "Generate stable ids from the competition and dancer names using simple slug-like strings.",
    "Set selectedDancers to every dancer you extracted.",
    "If a field is missing from the source but required, make the most conservative reasonable inference.",
    "Do not include commentary, markdown, or extra keys."
  ].join(" ");
}

export function buildUserInstructions({
  sourceType,
  link,
  asset,
  targetDancerNames
}: {
  sourceType: "pdf" | "screenshot" | "link";
  link?: { url?: string };
  asset?: { name?: string };
  targetDancerNames?: string[];
}) {
  const parts = [
    `Extract a dance competition schedule from a ${sourceType} source for the CompCoach mobile app.`,
    "The goal is to identify competition metadata, dancer names, routine rows, competition-wide events, dates, times, categories, and performance types."
  ];

  if (link?.url) {
    parts.push(`Source URL: ${link.url}`);
  }

  if (asset?.name) {
    parts.push(`Uploaded asset name: ${asset.name}`);
  }

  if (targetDancerNames?.length) {
    parts.push(`Target dancer names: ${targetDancerNames.join(", ")}`);
  }

  parts.push(
    targetDancerNames?.length
      ? "Only include rows that belong to the target dancer names or clearly related duo/group entries that include those dancers."
      : "If the source contains multiple dancers, include all of them.",
    "If the same dancer appears multiple times, merge them under one dancer record.",
    "Keep competition-wide schedule events like awards, judges breaks, meal breaks, and ballroom resets in competitionEvents instead of dropping them.",
    "Exclude only obvious headers, studio banners, advertisements, and blank lines.",
    "Preserve titles as written when possible."
  );

  return parts.join(" ");
}
