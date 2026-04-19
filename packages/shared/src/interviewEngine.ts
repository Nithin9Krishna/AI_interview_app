import type {
  AnswerEvaluation,
  Difficulty,
  InterviewPlan,
  InterviewQuestion,
  JobProfile,
  SeniorityLevel
} from "./types";

const KNOWN_SKILLS = [
  "power bi",
  "dax",
  "power query",
  "dashboarding",
  "dashboard",
  "business intelligence",
  "bi reporting",
  "data modeling",
  "data visualization",
  "etl",
  "excel",
  "azure data factory",
  "data analysis",
  "analytics",
  "react",
  "next.js",
  "node.js",
  "typescript",
  "javascript",
  "python",
  "fastapi",
  "sql",
  "postgresql",
  "mongodb",
  "aws",
  "docker",
  "kubernetes",
  "system design",
  "machine learning",
  "llm",
  "openai",
  "react native",
  "android",
  "ios",
  "swift",
  "kotlin",
  "java",
  "graphql",
  "rest"
];

const SENIORITY_DIFFICULTY: Record<SeniorityLevel, Difficulty> = {
  intern: "warmup",
  junior: "practical",
  mid: "deep_dive",
  senior: "deep_dive",
  staff: "expert"
};

export function inferSkills(description: string, providedSkills: string[] = []): string[] {
  const normalizedDescription = description.toLowerCase();
  const detected = KNOWN_SKILLS.filter((skill) => normalizedDescription.includes(skill));
  const combined = [...providedSkills, ...detected]
    .map((skill) => skill.trim())
    .filter(Boolean);

  const uniqueSkills = Array.from(new Set(combined));

  if (uniqueSkills.length) {
    return expandRelatedSkills(uniqueSkills).slice(0, 8);
  }

  return inferFallbackSkills(normalizedDescription).slice(0, 8);
}

export function generateInterviewPlan(profile: JobProfile): InterviewPlan {
  const skills = inferSkills(`${profile.title} ${profile.description}`, profile.skills);
  const primarySkill = skills[0] ?? "the core technology stack";
  const secondarySkill = skills[1] ?? "production engineering";
  const difficulty = SENIORITY_DIFFICULTY[profile.seniority];
  const humanRole = profile.title.trim() || "this role";
  const isDataRole = skills.some((skill) =>
    [
      "power bi",
      "dax",
      "power query",
      "dashboarding",
      "dashboard",
      "business intelligence",
      "bi reporting",
      "data modeling",
      "data visualization",
      "etl",
      "data analysis",
      "analytics",
      "sql"
    ].includes(skill)
  );

  const questions: InterviewQuestion[] = [
    {
      id: createId("q"),
      round: "technical",
      difficulty,
      prompt: isDataRole
        ? `Let's make this practical. Imagine a sales leader asks you for a ${primarySkill} dashboard by Friday, but the metrics are not clearly defined yet. How would you clarify the requirement, shape the data model, and make sure the numbers are trustworthy before anyone uses it?`
        : `Let's ground this in a real day on the job. Suppose your team asks you to deliver a ${primarySkill}-heavy feature for this ${humanRole} role. How would you break down the work, decide what to build first, and explain the tradeoffs to the team?`,
      expectedSignals: [
        "clear technical decomposition",
        `practical experience with ${primarySkill}`,
        "awareness of tradeoffs and failure modes",
        ...(isDataRole ? ["requirements clarity", "data validation", "business metric accuracy"] : [])
      ],
      followUps: [
        isDataRole
          ? "If two departments disagree on the same KPI, how would you handle that conversation?"
          : "If the scope doubled halfway through, what would you protect and what would you simplify?",
        isDataRole
          ? "What would you check before sending the dashboard link to leadership?"
          : "What would you validate first so you are not guessing?"
      ]
    },
    {
      id: createId("q"),
      round: "behavioral",
      difficulty: profile.seniority === "intern" ? "warmup" : "practical",
      prompt: isDataRole
        ? "Tell me about a time someone challenged your numbers, your report, or your analysis. What happened, how did you investigate it, and what did you learn from that situation?"
        : "Tell me about a time you had to learn something quickly to deliver a project. What was the situation, what did you do, and what was the result?",
      expectedSignals: [
        "specific example",
        "ownership",
        "reflection on outcome"
      ],
      followUps: [
        isDataRole ? "How did you explain the issue to a non-technical stakeholder?" : "What feedback did you receive?",
        isDataRole ? "What process did you change afterward to avoid the same issue?" : "What would you change if you did it again?"
      ]
    },
    {
      id: createId("q"),
      round: "coding",
      difficulty,
      prompt: isDataRole
        ? `I am not looking for perfect syntax here. Talk me through how you would build a report using ${primarySkill} and ${secondarySkill}: what tables you would need, what transformations you would do, what DAX or SQL logic might be involved, and how you would test edge cases.`
        : `I am less interested in perfect code and more interested in your thinking. Talk me through how you would implement a feature that uses ${primarySkill} and ${secondarySkill}, including edge cases, failure modes, and how you would test it.`,
      expectedSignals: [
        isDataRole ? "structured data modeling" : "structured algorithmic thinking",
        isDataRole ? "metric validation" : "complexity discussion",
        "edge case handling"
      ],
      followUps: [
        isDataRole ? "What data quality checks would you automate before refresh or publish?" : "What test cases would give you confidence?",
        isDataRole ? "What is one way this report could accidentally mislead the business?" : "Where could this implementation break in production?"
      ]
    },
    {
      id: createId("q"),
      round: "system_design",
      difficulty: profile.seniority === "staff" ? "expert" : "deep_dive",
      prompt: isDataRole
        ? `Imagine your dashboard becomes the weekly source of truth for executives. How would you design the full reporting workflow: data sources, refresh schedule, permissions, metric definitions, monitoring, and what happens when the data pipeline fails?`
        : `Imagine this work becomes business-critical after launch. How would you design the full workflow for one major responsibility in this ${humanRole} role, including data, reliability, security, and how the team would operate it?`,
      expectedSignals: [
        "end-to-end architecture",
        "data modeling",
        "operational maturity",
        "security awareness"
      ],
      followUps: [
        isDataRole ? "How would you alert the business if a refresh fails or a source table changes?" : "What would you monitor first after launch?",
        isDataRole ? "How would you manage access if different teams should see different slices of data?" : "How would you handle a privacy or data retention requirement?"
      ]
    }
  ];

  return {
    id: createId("interview"),
    createdAt: new Date().toISOString(),
    job: {
      ...profile,
      skills
    },
    questions,
    estimatedMinutes: questions.length * 8
  };
}

function inferFallbackSkills(normalizedDescription: string): string[] {
  if (/\b(data|analyst|analytics|report|reporting|dashboard|bi|business intelligence)\b/.test(normalizedDescription)) {
    return ["data analysis", "dashboarding", "sql", "data modeling"];
  }

  if (/\b(manager|lead|product|project)\b/.test(normalizedDescription)) {
    return ["stakeholder communication", "prioritization", "problem solving"];
  }

  return ["role-specific problem solving", "communication", "ownership"];
}

function expandRelatedSkills(skills: string[]): string[] {
  const expanded = [...skills];

  if (skills.includes("power bi")) {
    expanded.push("dax", "power query", "data modeling", "dashboarding");
  }

  if (skills.some((skill) => ["business intelligence", "bi reporting", "dashboard", "dashboarding"].includes(skill))) {
    expanded.push("data visualization", "data modeling", "sql");
  }

  if (skills.some((skill) => ["data analysis", "analytics", "etl"].includes(skill))) {
    expanded.push("sql", "data validation", "stakeholder communication");
  }

  return Array.from(new Set(expanded));
}

export function evaluateCandidateAnswer(question: InterviewQuestion, answerText: string): AnswerEvaluation {
  const answer = answerText.trim();
  const lowerAnswer = answer.toLowerCase();
  const wordCount = answer.split(/\s+/).filter(Boolean).length;
  const matchedSignals = question.expectedSignals.filter((signal) => {
    const signalWords = signal.toLowerCase().split(/\W+/).filter((word) => word.length > 4);
    return signalWords.some((word) => lowerAnswer.includes(word));
  });

  const structureScore = scoreBoolean(
    ["first", "then", "because", "tradeoff", "result", "test", "measure", "monitor"].some((word) =>
      lowerAnswer.includes(word)
    )
  );
  const depthScore = clamp(Math.round(wordCount / 7), 1, 10);
  const signalScore = clamp(4 + matchedSignals.length * 2, 1, 10);
  const concernPenalty = lowerAnswer.includes("not sure") || lowerAnswer.includes("i don't know") ? 2 : 0;

  const knowledgeScore = clamp(Math.round((depthScore + signalScore) / 2) - concernPenalty, 1, 10);
  const communicationScore = clamp(Math.round((structureScore + depthScore) / 2), 1, 10);
  const problemSolvingScore = clamp(Math.round((signalScore + structureScore) / 2), 1, 10);
  const confidenceScore = clamp(7 - concernPenalty + (wordCount > 70 ? 1 : 0), 1, 10);
  const overallScore = clamp(
    Math.round((knowledgeScore + communicationScore + problemSolvingScore + confidenceScore) / 4),
    1,
    10
  );

  const strengths = [
    wordCount >= 70 ? "Provides enough detail to evaluate reasoning." : "Gives a concise answer that can be probed further.",
    matchedSignals.length > 0
      ? `Addresses ${matchedSignals.length} expected signal${matchedSignals.length === 1 ? "" : "s"}.`
      : "Shows a starting point for discussion."
  ];

  const concerns = [
    wordCount < 45 ? "Answer is short; interviewer should ask for more detail and examples." : "",
    matchedSignals.length === 0 ? "Answer does not clearly map to the expected evaluation signals." : "",
    concernPenalty > 0 ? "Candidate expressed uncertainty that may need follow-up." : ""
  ].filter(Boolean);

  return {
    overallScore,
    knowledgeScore,
    communicationScore,
    problemSolvingScore,
    confidenceScore,
    strengths,
    concerns,
    recommendedFollowUps: question.followUps,
    summary: buildEvaluationSummary(overallScore, question.round)
  };
}

function buildEvaluationSummary(score: number, round: string): string {
  if (score >= 8) {
    return `Strong ${round} response with clear signal for the role.`;
  }

  if (score >= 6) {
    return `Promising ${round} response, but it needs deeper probing before a final decision.`;
  }

  return `Weak ${round} signal so far; ask follow-ups and look for concrete examples.`;
}

function scoreBoolean(value: boolean): number {
  return value ? 8 : 4;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
