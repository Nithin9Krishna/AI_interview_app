import type { ProctoringEvent, ProctoringSummary, RiskLevel } from "./types";

const EVENT_MESSAGES: Record<string, string> = {
  tab_blur: "Candidate left the interview tab.",
  fullscreen_exit: "Candidate exited fullscreen mode.",
  copy: "Candidate copied content during the interview.",
  paste: "Candidate pasted content during the interview.",
  camera_unavailable: "Camera was unavailable or disabled.",
  screen_share_stopped: "Screen sharing stopped during the interview.",
  manual_note: "Manual proctoring note was recorded."
};

export function summarizeProctoring(events: ProctoringEvent[]): ProctoringSummary {
  const highCount = events.filter((event) => event.severity === "high").length;
  const mediumCount = events.filter((event) => event.severity === "medium").length;
  const riskLevel = calculateRiskLevel(highCount, mediumCount, events.length);
  const redFlags = events.map((event) => {
    const message = EVENT_MESSAGES[event.type] ?? "Suspicious activity detected.";
    return event.details ? `${message} ${event.details}` : message;
  });

  return {
    riskLevel,
    eventCount: events.length,
    redFlags: Array.from(new Set(redFlags)).slice(0, 8)
  };
}

function calculateRiskLevel(highCount: number, mediumCount: number, eventCount: number): RiskLevel {
  if (highCount > 0 || mediumCount >= 3 || eventCount >= 5) {
    return "high";
  }

  if (mediumCount > 0 || eventCount >= 2) {
    return "medium";
  }

  return "low";
}
