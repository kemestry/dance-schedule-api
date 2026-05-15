export function formatDayLabel(dateString: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date(`${dateString}T12:00:00`));
}

export function formatTime(datetime: string) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(datetime));
}

export function sortByDatetime<T extends { datetimeStart: string }>(items: T[]) {
  return [...items].sort(
    (left, right) => new Date(left.datetimeStart).getTime() - new Date(right.datetimeStart).getTime()
  );
}

export function getMinutesBetween(startIso: string, endIso: string) {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}
