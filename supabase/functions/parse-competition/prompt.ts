export function buildDeveloperPrompt() {
  return [
    "You extract dance competition schedules into structured JSON for CompCoach.",
    "Return only data that fits the provided JSON schema.",
    "Normalize dancer schedules and competition-wide events into one competition payload.",
    "If the source is incomplete, omit uncertain rows rather than inventing them.",
    "Infer competition startDate and endDate from the extracted rows.",
    "Use sourceType exactly as provided by the caller.",
    "Use ISO dates in YYYY-MM-DD format and ISO datetimes for datetimeStart.",
    "Use these performanceType values only: Solo, Duo/Trio, Group, Line, Production.",
    "Use competitionEvents for awards, judges breaks, general breaks, and competition-wide announcements.",
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
    "The goal is to identify competition metadata, dancer names, routine rows, dates, times, categories, performance types, and competition-wide events such as awards or judges breaks."
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
      ? "Only include routine rows that belong to the target dancer names or clearly related duo/group entries that include those dancers. Still include competition-wide events that matter to all parents, such as awards and judges breaks."
      : "If the source contains multiple dancers, include all of them.",
    "If the same dancer appears multiple times, merge them under one dancer record.",
    "If a line is clearly a header, studio banner, or blank divider, exclude it.",
    "If a line is an award block, judges break, or other competition-wide timing cue, include it in competitionEvents instead of entries.",
    "Preserve titles as written when possible."
  );

  return parts.join(" ");
}
