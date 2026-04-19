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
  const roleContext = `${profile.seniority} ${profile.title}`.trim();
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
        ? `Walk me through how you would build a reliable ${primarySkill} solution for a real ${roleContext} request. How would you gather requirements, model the data, validate metrics, and handle stakeholder feedback?`
        : `Walk me through how you would approach a real ${roleContext} task that heavily uses ${primarySkill}. What tradeoffs would you consider?`,
      expectedSignals: [
        "clear technical decomposition",
        `practical experience with ${primarySkill}`,
        "awareness of tradeoffs and failure modes",
        ...(isDataRole ? ["requirements clarity", "data validation", "business metric accuracy"] : [])
      ],
      followUps: [
        isDataRole
          ? "How would you verify the dashboard numbers match the source of truth?"
          : "What would you do differently if this had to support 10x more users?",
        isDataRole
          ? "How would you handle a stakeholder asking for a metric that is poorly defined?"
          : "Which part of your solution would you validate first?"
      ]
    },
    {
      id: createId("q"),
      round: "behavioral",
      difficulty: profile.seniority === "intern" ? "warmup" : "practical",
      prompt: "Tell me about a time you had to learn something quickly to deliver a project. What was the situation, what did you do, and what was the result?",
      expectedSignals: [
        "specific example",
        "ownership",
        "reflection on outcome"
      ],
      followUps: [
        "What feedback did you receive?",
        "What would you change if you did it again?"
      ]
    },
    {
      id: createId("q"),
      round: "coding",
      difficulty,
      prompt: isDataRole
        ? `Design the technical approach for a ${roleContext} reporting task using ${primarySkill} and ${secondarySkill}. Explain the data model, transformations, DAX/SQL logic, refresh strategy, edge cases, and how you would test accuracy.`
        : `Design an algorithm or implementation plan for a feature in this role that uses ${primarySkill} and ${secondarySkill}. Explain correctness, complexity, and edge cases.`,
      expectedSignals: [
        isDataRole ? "structured data modeling" : "structured algorithmic thinking",
        isDataRole ? "metric validation" : "complexity discussion",
        "edge case handling"
      ],
      followUps: [
        isDataRole ? "What data quality checks would you build before publishing?" : "What test cases would give you confidence?",
        isDataRole ? "What could make this report misleading in production?" : "Where could this implementation break in production?"
      ]
    },
    {
      id: createId("q"),
      round: "system_design",
      difficulty: profile.seniority === "staff" ? "expert" : "deep_dive",
      prompt: `Design a production-ready system for one major responsibility in this ${profile.title} role. Include APIs, data model, scaling, observability, and security considerations.`,
      expectedSignals: [
        "end-to-end architecture",
        "data modeling",
        "operational maturity",
        "security awareness"
      ],
      followUps: [
        "What would you monitor first after launch?",
        "How would you handle a privacy or data retention requirement?"
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
