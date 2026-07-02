import type { Task } from "@/types/familyApp";
import { rideSummary } from "@/components/family-app/utils";

// Exports a single Task as a standalone .ics file the phone's own calendar
// app can import — this is a one-way, client-side-only export. It does not
// read/write Supabase and has nothing to do with the future Google/Apple/
// Samsung calendar sync (still not connected).

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function buildLocalDate(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

// Emits a "floating" local date-time (no Z, no TZID) — interpreted by the
// receiving calendar app in whatever timezone the phone is already set to.
// Simpler and safer than attaching a TZID block for a single-family app that
// doesn't track member timezones.
function formatICSDateTime(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(
    date.getDate()
  )}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

function formatICSDateOnly(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${y}${m}${d}`;
}

function addOneCalendarDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

function formatICSUTCTimestamp(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
    now.getUTCDate()
  )}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(
    now.getUTCSeconds()
  )}Z`;
}

// RFC 5545 §3.3.11 TEXT escaping — backslash/semicolon/comma/newline.
function escapeICSText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

// RFC 5545 §3.1 line folding: no physical line may exceed 75 octets: fold by
// UTF-8 byte length (not character count), since Hebrew text is multi-byte,
// and never split a UTF-8 sequence mid-character.
function foldICSLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const folded: string[] = [];
  let rest = line;
  let limit = 75;
  while (encoder.encode(rest).length > limit) {
    let cut = Math.min(rest.length, limit);
    while (cut > 0 && encoder.encode(rest.slice(0, cut)).length > limit) {
      cut--;
    }
    folded.push(rest.slice(0, cut));
    rest = rest.slice(cut);
    limit = 74; // continuation lines lose one octet to the leading space
  }
  folded.push(rest);
  return folded.join("\r\n ");
}

function buildDescription(task: Task): string {
  const parts = [
    `סוג: ${task.type}`,
    `בן משפחה: ${task.assignedTo}`,
    `סטטוס: ${task.status}`,
  ];
  const ride = rideSummary(task);
  if (ride) parts.push(ride);
  if (task.notes) parts.push(`הערות: ${task.notes}`);
  return parts.join("\n");
}

export function taskToICS(task: Task): string {
  let dtStartLine: string;
  let dtEndLine: string;

  if (task.time) {
    const start = buildLocalDate(task.date, task.time);
    let end = task.endTime
      ? buildLocalDate(task.date, task.endTime)
      : new Date(start.getTime() + 60 * 60 * 1000);
    // Guard against an end time at/before the start (blank form field left
    // equal, or a typo) rather than emitting an invalid zero/negative range.
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }
    dtStartLine = `DTSTART:${formatICSDateTime(start)}`;
    dtEndLine = `DTEND:${formatICSDateTime(end)}`;
  } else {
    // No start time at all: represent as an all-day event instead of
    // guessing a fake time. Per RFC 5545, an all-day VEVENT's DTEND is
    // exclusive, so it's the day after DTSTART.
    dtStartLine = `DTSTART;VALUE=DATE:${formatICSDateOnly(task.date)}`;
    dtEndLine = `DTEND;VALUE=DATE:${addOneCalendarDay(task.date)}`;
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Family Home App//HE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${task.id}@family-home-app`,
    `DTSTAMP:${formatICSUTCTimestamp()}`,
    dtStartLine,
    dtEndLine,
    `SUMMARY:${escapeICSText(task.title)}`,
    `DESCRIPTION:${escapeICSText(buildDescription(task))}`,
  ];
  if (task.location) {
    lines.push(`LOCATION:${escapeICSText(task.location)}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(foldICSLine).join("\r\n") + "\r\n";
}

// Triggers a browser download of the task as a .ics file. UTF-8 charset is
// set explicitly on the Blob so Hebrew text survives the download/open step
// on both iOS and Android.
export function downloadTaskAsICS(task: Task): void {
  const content = taskToICS(task);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "family-home-event.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Deferred so the browser has a chance to start the download/open before
  // the object URL is freed.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
