import type {
  AnswerEvaluation,
  Difficulty,
  InterviewPlan,
  InterviewQuestion,
  JobProfile,
  SeniorityLevel
} from "./types";

type RoleFamily =
  | "data"
  | "frontend"
  | "backend"
  | "fullstack"
  | "mobile"
  | "product"
  | "design"
  | "qa"
  | "general_engineering"
  | "general_business";

interface RoleRule {
  title: string[];
  text: string[];
  skills: string[];
}

interface KeywordLabel {
  patterns: string[];
  label: string;
}

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
  "design system",
  "accessibility",
  "performance",
  "testing",
  "automation",
  "regression",
  "api testing",
  "defect triage",
  "quality assurance",
  "playwright",
  "cypress",
  "selenium",
  "roadmap",
  "prioritization",
  "retention",
  "activation",
  "pricing",
  "experimentation",
  "user research",
  "prototyping",
  "wireframing",
  "android",
  "ios",
  "swift",
  "kotlin",
  "java",
  "graphql",
  "rest"
];

const ROLE_RULES: Record<Exclude<RoleFamily, "general_engineering" | "general_business">, RoleRule> = {
  data: {
    title: [
      "power bi",
      "business intelligence",
      "bi analyst",
      "bi developer",
      "reporting analyst",
      "data analyst",
      "analytics engineer"
    ],
    text: [
      "power bi",
      "dax",
      "power query",
      "reporting",
      "dashboard",
      "metric",
      "kpi",
      "etl",
      "data model",
      "sql",
      "tableau",
      "looker"
    ],
    skills: [
      "power bi",
      "dax",
      "power query",
      "sql",
      "data modeling",
      "data visualization",
      "etl",
      "business intelligence"
    ]
  },
  frontend: {
    title: ["frontend", "front end", "ui engineer", "web developer", "react developer"],
    text: [
      "react",
      "next.js",
      "design system",
      "component",
      "frontend",
      "ui",
      "web app",
      "browser",
      "accessibility"
    ],
    skills: ["react", "next.js", "typescript", "javascript", "design system", "accessibility"]
  },
  backend: {
    title: ["backend", "back end", "api engineer", "platform engineer", "server engineer"],
    text: [
      "api",
      "microservice",
      "backend",
      "database",
      "queue",
      "worker",
      "service",
      "scalability",
      "authentication"
    ],
    skills: ["node.js", "python", "java", "graphql", "rest", "postgresql", "mongodb", "aws", "docker", "kubernetes"]
  },
  fullstack: {
    title: ["full stack", "fullstack"],
    text: ["frontend", "backend", "react", "node.js", "api", "web app"],
    skills: ["react", "next.js", "node.js", "typescript", "javascript", "graphql", "rest"]
  },
  mobile: {
    title: ["mobile", "ios", "android", "react native", "swift", "kotlin"],
    text: ["mobile", "ios", "android", "react native", "swift", "kotlin", "offline", "push notification"],
    skills: ["react native", "swift", "kotlin", "ios", "android", "performance"]
  },
  product: {
    title: ["product manager", "product owner", "program manager", "growth product manager"],
    text: [
      "roadmap",
      "prioritization",
      "stakeholder",
      "retention",
      "activation",
      "pricing",
      "adoption",
      "go to market",
      "experiment"
    ],
    skills: ["roadmap", "prioritization", "retention", "activation", "pricing", "experimentation"]
  },
  design: {
    title: ["designer", "ux", "ui", "product design", "interaction design"],
    text: ["prototype", "wireframe", "usability", "research", "figma", "user flow", "design system", "accessibility"],
    skills: ["design system", "user research", "prototyping", "wireframing", "accessibility"]
  },
  qa: {
    title: ["qa", "quality assurance", "sdet", "test engineer", "quality engineer"],
    text: [
      "test",
      "testing",
      "automation",
      "regression",
      "defect",
      "bug",
      "release confidence",
      "quality",
      "playwright",
      "selenium",
      "cypress",
      "api testing"
    ],
    skills: ["testing", "automation", "regression", "api testing", "defect triage", "quality assurance", "playwright", "cypress", "selenium"]
  }
};

const ROLE_SKILL_PRIORITIES: Record<RoleFamily, string[]> = {
  data: ["power bi", "dax", "power query", "sql", "data modeling", "data visualization", "etl", "excel"],
  frontend: ["react", "next.js", "typescript", "javascript", "design system", "accessibility", "graphql", "rest"],
  backend: ["node.js", "python", "java", "graphql", "rest", "postgresql", "mongodb", "aws", "docker", "kubernetes"],
  fullstack: ["react", "next.js", "node.js", "typescript", "javascript", "graphql", "rest", "sql"],
  mobile: ["react native", "swift", "kotlin", "ios", "android", "performance"],
  product: ["prioritization", "roadmap", "activation", "retention", "pricing", "experimentation", "stakeholder communication"],
  design: ["design system", "user research", "prototyping", "wireframing", "accessibility"],
  qa: ["automation", "testing", "regression", "api testing", "defect triage", "quality assurance", "playwright", "cypress", "selenium"],
  general_engineering: ["typescript", "javascript", "python", "node.js", "sql", "docker", "aws", "system design"],
  general_business: ["prioritization", "stakeholder communication", "problem solving", "communication", "ownership"]
};

const ROLE_SKILL_DEFAULTS: Record<RoleFamily, string[]> = {
  data: ["Power BI", "SQL"],
  frontend: ["React", "design systems"],
  backend: ["API design", "reliability engineering"],
  fullstack: ["TypeScript", "API design"],
  mobile: ["React Native", "mobile performance"],
  product: ["prioritization", "metric thinking"],
  design: ["workflow design", "user research"],
  qa: ["test strategy", "automation testing"],
  general_engineering: ["system design", "testing"],
  general_business: ["problem solving", "communication"]
};

const LOW_SIGNAL_SKILLS = new Set(["dashboard", "dashboarding", "communication", "ownership", "problem solving"]);

const HUMANIZED_SKILLS: Record<string, string> = {
  "power bi": "Power BI",
  dax: "DAX",
  sql: "SQL",
  etl: "ETL",
  api: "API",
  "api testing": "API testing",
  graphql: "GraphQL",
  rest: "REST",
  "node.js": "Node.js",
  "next.js": "Next.js",
  typescript: "TypeScript",
  javascript: "JavaScript",
  aws: "AWS",
  llm: "LLM",
  openai: "OpenAI",
  ios: "iOS",
  qa: "QA",
  ux: "UX",
  ui: "UI"
};

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
  const roleFamily = classifyRoleFamily(profile.title, profile.description, skills);
  const difficulty = SENIORITY_DIFFICULTY[profile.seniority];
  const humanRole = profile.title.trim() || "this role";
  const roleContext = buildRoleContext(roleFamily, profile.description);
  const primarySkill = formatSkillLabel(selectPrimarySkill(roleFamily, skills));
  const secondarySkill = formatSkillLabel(selectSecondarySkill(roleFamily, skills, primarySkill));
  const executionRound: InterviewQuestion = buildExecutionQuestion({
    difficulty,
    humanRole,
    primarySkill,
    profile,
    roleFamily,
    roleContext,
    secondarySkill
  });

  const questions: InterviewQuestion[] = [
    {
      id: createId("q"),
      round: "technical",
      difficulty,
      prompt: buildTechnicalPrompt(roleFamily, humanRole, primarySkill, roleContext),
      expectedSignals: buildTechnicalSignals(roleFamily, primarySkill),
      followUps: buildTechnicalFollowUps(roleFamily)
    },
    {
      id: createId("q"),
      round: "behavioral",
      difficulty: profile.seniority === "intern" ? "warmup" : "practical",
      prompt: buildBehavioralPrompt(roleFamily),
      expectedSignals: [
        "specific example",
        "ownership",
        "reflection on outcome"
      ],
      followUps: buildBehavioralFollowUps(roleFamily)
    },
    executionRound,
    {
      id: createId("q"),
      round: "system_design",
      difficulty: profile.seniority === "staff" ? "expert" : "deep_dive",
      prompt: buildSystemDesignPrompt(roleFamily, humanRole, roleContext),
      expectedSignals: buildSystemSignals(roleFamily),
      followUps: buildSystemFollowUps(roleFamily)
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

function classifyRoleFamily(title: string, description: string, skills: string[]): RoleFamily {
  const normalizedTitle = normalizeText(title);
  const normalizedDescription = normalizeText(description);
  const normalizedSkills = skills.map((skill) => normalizeText(skill));

  if (
    normalizedTitle.includes("business analyst") &&
    !containsAnyPhrase(`${normalizedTitle} ${normalizedDescription}`, [
      "power bi",
      "business intelligence",
      "bi analyst",
      "bi developer",
      "data analyst",
      "analytics engineer",
      "dax",
      "power query",
      "tableau",
      "looker"
    ])
  ) {
    return "general_business";
  }

  let bestFamily: Exclude<RoleFamily, "general_engineering" | "general_business"> | null = null;
  let bestScore = 0;

  for (const [roleFamily, rule] of Object.entries(ROLE_RULES) as Array<
    [Exclude<RoleFamily, "general_engineering" | "general_business">, RoleRule]
  >) {
    const score =
      countPhraseMatches(normalizedTitle, rule.title) * 6 +
      countPhraseMatches(normalizedDescription, rule.text) * 2 +
      countSkillMatches(normalizedSkills, rule.skills) * 4;

    if (score > bestScore) {
      bestScore = score;
      bestFamily = roleFamily;
    }
  }

  if (normalizedTitle.includes("business analyst") && bestFamily === "data" && bestScore < 8) {
    return "general_business";
  }

  if (bestFamily && bestScore >= 4) {
    return bestFamily;
  }

  if (containsAnyPhrase(normalizedTitle, ["engineer", "developer", "architect"])) {
    return "general_engineering";
  }

  if (containsAnyPhrase(normalizedDescription, ["implementation", "architecture", "service", "feature development"])) {
    return "general_engineering";
  }

  return "general_business";
}

function inferFallbackSkills(normalizedDescription: string): string[] {
  if (/\b(qa|quality assurance|sdet|test engineer|testing|automation|regression|defect|bug)\b/.test(normalizedDescription)) {
    return ["test strategy", "automation", "regression", "api testing"];
  }

  if (/\b(frontend|front end|react|next\.js|design system|ui|accessibility)\b/.test(normalizedDescription)) {
    return ["react", "design system", "typescript", "accessibility"];
  }

  if (/\b(backend|back end|api|node\.js|python|java|service|database|microservice)\b/.test(normalizedDescription)) {
    return ["api design", "node.js", "sql", "reliability"];
  }

  if (/\b(mobile|ios|android|react native|swift|kotlin)\b/.test(normalizedDescription)) {
    return ["react native", "mobile performance", "ios", "android"];
  }

  if (/\b(power bi|dax|power query)\b/.test(normalizedDescription)) {
    return ["power bi", "sql", "data modeling", "dax"];
  }

  if (/\b(business intelligence|analytics|reporting|metric|kpi|sql|etl)\b/.test(normalizedDescription)) {
    return ["sql", "data modeling", "metric definitions", "stakeholder communication"];
  }

  if (/\b(product manager|roadmap|prioritization|stakeholder|activation|retention|pricing|adoption|experiment)\b/.test(normalizedDescription)) {
    return ["prioritization", "roadmap", "stakeholder communication", "metric thinking"];
  }

  if (/\b(design|designer|ux|ui|research|wireframe|prototype|figma)\b/.test(normalizedDescription)) {
    return ["design system", "user research", "prototyping", "accessibility"];
  }

  if (/\b(manager|lead|project)\b/.test(normalizedDescription)) {
    return ["stakeholder communication", "prioritization", "problem solving"];
  }

  return ["role-specific problem solving", "communication", "ownership"];
}

function expandRelatedSkills(skills: string[]): string[] {
  const expanded = [...skills];

  if (skills.includes("power bi")) {
    expanded.push("dax", "power query", "data modeling", "dashboarding");
  }

  if (skills.some((skill) => ["business intelligence", "bi reporting"].includes(skill))) {
    expanded.push("data visualization", "data modeling", "sql");
  }

  if (skills.some((skill) => ["data analysis", "etl"].includes(skill))) {
    expanded.push("sql", "data validation", "stakeholder communication");
  }

  if (skills.includes("react")) {
    expanded.push("typescript", "design system");
  }

  if (skills.some((skill) => ["automation", "testing", "quality assurance"].includes(skill))) {
    expanded.push("regression", "api testing");
  }

  return Array.from(new Set(expanded));
}

function selectPrimarySkill(roleFamily: RoleFamily, skills: string[]): string {
  const normalizedSkills = skills.map((skill) => normalizeText(skill));
  const prioritized = ROLE_SKILL_PRIORITIES[roleFamily].find((skill) => normalizedSkills.includes(skill));

  if (prioritized) {
    return prioritized;
  }

  const meaningfulSkill = normalizedSkills.find((skill) => !LOW_SIGNAL_SKILLS.has(skill));

  if (meaningfulSkill) {
    return meaningfulSkill;
  }

  return ROLE_SKILL_DEFAULTS[roleFamily][0];
}

function selectSecondarySkill(roleFamily: RoleFamily, skills: string[], primarySkill: string): string {
  const normalizedPrimarySkill = normalizeText(primarySkill);
  const normalizedSkills = skills.map((skill) => normalizeText(skill));
  const prioritized = ROLE_SKILL_PRIORITIES[roleFamily].find(
    (skill) => skill !== normalizedPrimarySkill && normalizedSkills.includes(skill)
  );

  if (prioritized) {
    return prioritized;
  }

  const meaningfulSkill = normalizedSkills.find(
    (skill) => skill !== normalizedPrimarySkill && !LOW_SIGNAL_SKILLS.has(skill)
  );

  if (meaningfulSkill) {
    return meaningfulSkill;
  }

  return ROLE_SKILL_DEFAULTS[roleFamily].find((skill) => normalizeText(skill) !== normalizedPrimarySkill) ?? "execution quality";
}

function formatSkillLabel(skill: string): string {
  const normalizedSkill = normalizeText(skill);
  return HUMANIZED_SKILLS[normalizedSkill] ?? toTitleCase(normalizedSkill);
}

function buildRoleContext(roleFamily: RoleFamily, description: string): string {
  switch (roleFamily) {
    case "data":
      return buildDataContext(description);
    case "frontend":
      return buildFrontendContext(description);
    case "backend":
    case "fullstack":
    case "general_engineering":
      return buildEngineeringContext(description);
    case "mobile":
      return buildMobileContext(description);
    case "product":
      return buildProductContext(description);
    case "design":
      return buildDesignContext(description);
    case "qa":
      return buildQaContext(description);
    case "general_business":
      return buildGeneralBusinessContext(description);
    default:
      return "";
  }
}

function buildDataContext(description: string): string {
  const domains = collectLabels(description, [
    { patterns: ["sales"], label: "sales" },
    { patterns: ["finance", "financial"], label: "finance" },
    { patterns: ["marketing"], label: "marketing" },
    { patterns: ["operations", "ops"], label: "operations" },
    { patterns: ["customer support"], label: "support" },
    { patterns: ["product"], label: "product" }
  ]);
  const deliverable = collectLabels(description, [
    { patterns: ["dashboard"], label: "dashboard" },
    { patterns: ["scorecard"], label: "scorecard" },
    { patterns: ["forecast"], label: "forecasting model" },
    { patterns: ["report", "reporting"], label: "reporting workflow" }
  ], 1)[0] ?? "dashboard";

  return domains.length ? `${formatNaturalList(domains)} ${deliverable}` : deliverable;
}

function buildFrontendContext(description: string): string {
  const surface = collectLabels(description, [
    { patterns: ["onboarding"], label: "customer onboarding flow" },
    { patterns: ["checkout"], label: "checkout flow" },
    { patterns: ["dashboard"], label: "dashboard experience" },
    { patterns: ["admin"], label: "admin workflow" },
    { patterns: ["reporting"], label: "reporting interface" }
  ], 1)[0] ?? "user-facing workflow";
  const constraint = collectLabels(description, [
    { patterns: ["design system"], label: "design-system consistency" },
    { patterns: ["accessibility"], label: "accessibility" },
    { patterns: ["performance"], label: "performance" }
  ], 1)[0];

  return constraint ? `${surface} with ${constraint}` : surface;
}

function buildEngineeringContext(description: string): string {
  const workflows = collectLabels(description, [
    { patterns: ["authentication", "auth"], label: "authentication" },
    { patterns: ["billing", "payments"], label: "billing" },
    { patterns: ["reporting"], label: "reporting" },
    { patterns: ["integration", "integrations"], label: "integrations" },
    { patterns: ["data pipeline"], label: "data pipeline" },
    { patterns: ["onboarding"], label: "onboarding" }
  ]);

  return workflows.length ? `${formatNaturalList(workflows)} workflows` : "an important production workflow";
}

function buildMobileContext(description: string): string {
  const flows = collectLabels(description, [
    { patterns: ["onboarding"], label: "the onboarding flow" },
    { patterns: ["checkout", "payments"], label: "the payments flow" },
    { patterns: ["offline"], label: "offline behavior" },
    { patterns: ["push"], label: "push-driven engagement" }
  ], 2);

  return flows.length ? formatNaturalList(flows) : "a daily-use mobile flow";
}

function buildProductContext(description: string): string {
  const metrics = collectLabels(description, [
    { patterns: ["activation"], label: "activation" },
    { patterns: ["retention"], label: "retention" },
    { patterns: ["conversion"], label: "conversion" },
    { patterns: ["adoption"], label: "adoption" },
    { patterns: ["revenue"], label: "revenue" },
    { patterns: ["engagement"], label: "engagement" },
    { patterns: ["churn"], label: "churn" }
  ]);

  return metrics.length ? formatNaturalList(metrics) : "one underperforming product metric";
}

function buildDesignContext(description: string): string {
  return collectLabels(description, [
    { patterns: ["onboarding"], label: "the onboarding experience" },
    { patterns: ["checkout"], label: "the checkout experience" },
    { patterns: ["dashboard"], label: "the dashboard experience" },
    { patterns: ["admin"], label: "an internal workflow" }
  ], 1)[0] ?? "a critical user workflow";
}

function buildQaContext(description: string): string {
  const modules = collectLabels(description, [
    { patterns: ["login", "authentication", "auth"], label: "login" },
    { patterns: ["billing", "payments"], label: "billing" },
    { patterns: ["reporting"], label: "reporting" },
    { patterns: ["checkout"], label: "checkout" },
    { patterns: ["onboarding"], label: "onboarding" },
    { patterns: ["api"], label: "API" },
    { patterns: ["integration", "integrations"], label: "integrations" }
  ]);

  return modules.length ? formatNaturalList(modules) : "a complex multi-surface release";
}

function buildGeneralBusinessContext(description: string): string {
  const themes = collectLabels(description, [
    { patterns: ["requirements"], label: "requirements definition" },
    { patterns: ["process", "processes"], label: "process mapping" },
    { patterns: ["reporting"], label: "operational reporting" },
    { patterns: ["stakeholder"], label: "stakeholder alignment" },
    { patterns: ["operations"], label: "operational workflows" }
  ]);

  return themes.length ? formatNaturalList(themes) : "a cross-functional business workflow";
}

function buildTechnicalPrompt(roleFamily: RoleFamily, humanRole: string, primarySkill: string, roleContext: string) {
  switch (roleFamily) {
    case "data":
      return `Let's make this practical. Imagine a stakeholder asks you for a ${roleContext || "dashboard"} built in ${primarySkill} by Friday, but the metric definitions are still fuzzy. How would you clarify the requirement, shape the data model, and make sure the numbers are trustworthy before anyone uses it?`;
    case "frontend":
      return `Imagine design and product ask you to ship the ${roleContext || "user-facing workflow"} using ${primarySkill} for this ${humanRole} role. How would you break the work down, handle API uncertainty, and keep the UI fast and maintainable?`;
    case "backend":
      return `Suppose your team needs a new backend capability around ${roleContext || "an important production workflow"} in this ${humanRole} role. How would you design the API contract, protect reliability, and avoid creating operational pain later?`;
    case "fullstack":
      return `Imagine you are responsible for the end-to-end delivery of ${roleContext || "a core product workflow"} in this ${humanRole} role. How would you split the frontend, backend, and data work so the team can move quickly without creating brittle handoffs?`;
    case "mobile":
      return `Imagine you need to ship ${roleContext || "a mobile feature"} in this ${humanRole} role under a tight deadline. How would you balance app performance, platform-specific behavior, and a clean user experience?`;
    case "product":
      return `Let's make this concrete. Suppose leadership asks you to improve ${roleContext || "one weak product metric"} in this ${humanRole} role, but engineering capacity is tight. How would you decide what to change first and how would you explain that decision to stakeholders?`;
    case "design":
      return `Imagine you are asked to redesign ${roleContext || "a critical workflow"} in this ${humanRole} role, but research, engineering, and business goals are pulling in different directions. How would you work through that?`;
    case "qa":
      return `Suppose a release touching ${roleContext || "several critical workflows"} is approaching in this ${humanRole} role. How would you decide where to focus testing effort, what to automate, and what risks to surface to the team?`;
    case "general_business":
      return `Imagine you are asked to clarify ${roleContext || "a messy business workflow"} for this ${humanRole} role, but different stakeholders want different outcomes. How would you gather requirements, resolve ambiguity, and turn it into an actionable plan?`;
    default:
      return `Let's ground this in a real day on the job. Suppose your team asks you to deliver a ${primarySkill}-heavy piece of work for this ${humanRole} role. How would you break down the work, decide what to do first, and explain the tradeoffs to the team?`;
  }
}

function buildTechnicalSignals(roleFamily: RoleFamily, primarySkill: string) {
  switch (roleFamily) {
    case "data":
      return [
        "clear technical decomposition",
        `practical experience with ${primarySkill}`,
        "requirements clarity",
        "data validation",
        "business metric accuracy"
      ];
    case "frontend":
      return ["UI decomposition", "performance awareness", "API collaboration", "maintainability"];
    case "backend":
      return ["API contract thinking", "reliability awareness", "operational judgment", "failure mode awareness"];
    case "mobile":
      return ["platform awareness", "performance judgment", "UX reasoning", "release discipline"];
    case "product":
      return ["prioritization clarity", "metric thinking", "stakeholder communication", "tradeoff awareness"];
    case "design":
      return ["problem framing", "user-centered reasoning", "tradeoff awareness", "cross-functional collaboration"];
    case "qa":
      return ["risk assessment", "test strategy", "coverage awareness", "release judgment"];
    case "general_business":
      return ["requirements clarity", "stakeholder management", "structured thinking", "decision quality"];
    default:
      return [
        "clear technical decomposition",
        `practical experience with ${primarySkill}`,
        "awareness of tradeoffs and failure modes"
      ];
  }
}

function buildTechnicalFollowUps(roleFamily: RoleFamily) {
  switch (roleFamily) {
    case "data":
      return [
        "If two departments disagree on the same KPI, how would you handle that conversation?",
        "What would you check before sending the dashboard link to leadership?"
      ];
    case "frontend":
      return [
        "What would you mock first so the team can move before every backend detail is ready?",
        "Where do UI bugs usually appear in work like this, and how would you guard against them?"
      ];
    case "backend":
      return [
        "Which failure mode would worry you most in production?",
        "What would you instrument first so you are not debugging blind later?"
      ];
    case "mobile":
      return [
        "What would you test on real devices before you felt comfortable shipping?",
        "Where do platform-specific edge cases usually show up in work like this?"
      ];
    case "product":
      return [
        "How would you know within two weeks whether the change was working?",
        "What would you say no to in order to keep the team focused?"
      ];
    case "design":
      return [
        "Where would you push back if the request hurt usability?",
        "How would you validate the direction before a full handoff?"
      ];
    case "qa":
      return [
        "What would make you block the release?",
        "How would you explain residual risk to non-QA stakeholders?"
      ];
    case "general_business":
      return [
        "What would you document first so the team stops guessing?",
        "How would you handle two stakeholders asking for conflicting outcomes?"
      ];
    default:
      return [
        "If the scope doubled halfway through, what would you protect and what would you simplify?",
        "What would you validate first so you are not guessing?"
      ];
  }
}

function buildBehavioralPrompt(roleFamily: RoleFamily) {
  switch (roleFamily) {
    case "data":
      return "Tell me about a time someone challenged your numbers, your report, or your analysis. What happened, how did you investigate it, and what did you learn from that situation?";
    case "frontend":
      return "Tell me about a time a UI change looked simple at first but turned out to be more complex once you started building it. How did you handle it?";
    case "backend":
      return "Tell me about a time a technical decision you made affected reliability, support, or operational load later. What happened, and what did you learn?";
    case "mobile":
      return "Tell me about a time device behavior, platform differences, or release constraints forced you to change your implementation plan. What did you do?";
    case "product":
      return "Tell me about a time you had to align strong opinions from different stakeholders and still move the product forward. What did you do?";
    case "design":
      return "Tell me about a time your first design direction was not the right one. How did you realize it, and what did you change?";
    case "qa":
      return "Tell me about a time you caught an issue late in the cycle. How did you handle it, and what changed afterward?";
    case "general_business":
      return "Tell me about a time the requirements for a project were not clear at the start. How did you bring structure to the situation, and what was the result?";
    default:
      return "Tell me about a time you had to learn something quickly to deliver a project. What was the situation, what did you do, and what was the result?";
  }
}

function buildBehavioralFollowUps(roleFamily: RoleFamily) {
  switch (roleFamily) {
    case "data":
      return [
        "How did you explain the issue to a non-technical stakeholder?",
        "What process did you change afterward to avoid the same issue?"
      ];
    case "frontend":
      return [
        "What part of the implementation surprised you the most?",
        "How did you keep the user experience from slipping while scope was changing?"
      ];
    case "backend":
      return [
        "What early signal told you the design needed to change?",
        "What would you do differently before the next rollout?"
      ];
    case "mobile":
      return [
        "What tradeoff did you have to make because of the platform constraints?",
        "How did you decide what still needed to feel polished in the first release?"
      ];
    case "product":
      return [
        "Who was hardest to align, and why?",
        "What would you handle differently next time?"
      ];
    case "design":
      return [
        "What feedback changed your mind the most?",
        "How did you keep stakeholders confident while you changed direction?"
      ];
    case "qa":
      return [
        "How did the team respond when you raised the issue?",
        "What process improvement came out of that experience?"
      ];
    case "general_business":
      return [
        "What did you do when different stakeholders wanted different things?",
        "What would you do earlier next time to reduce confusion?"
      ];
    default:
      return ["What feedback did you receive?", "What would you change if you did it again?"];
  }
}

function buildExecutionQuestion({
  difficulty,
  humanRole,
  primarySkill,
  profile,
  roleFamily,
  roleContext,
  secondarySkill
}: {
  difficulty: Difficulty;
  humanRole: string;
  primarySkill: string;
  profile: JobProfile;
  roleFamily: RoleFamily;
  roleContext: string;
  secondarySkill: string;
}): InterviewQuestion {
  switch (roleFamily) {
    case "data":
      return {
        id: createId("q"),
        round: "coding",
        difficulty,
        prompt: `I am not looking for perfect syntax here. Talk me through how you would build the ${roleContext || "reporting workflow"} using ${primarySkill} and ${secondarySkill}: what tables you would need, what transformations you would do, what DAX or SQL logic might be involved, and how you would test edge cases.`,
        expectedSignals: ["structured data modeling", "metric validation", "edge case handling"],
        followUps: [
          "What data quality checks would you automate before refresh or publish?",
          "What is one way this report could accidentally mislead the business?"
        ]
      };
    case "frontend":
    case "backend":
    case "fullstack":
    case "mobile":
    case "general_engineering":
      return {
        id: createId("q"),
        round: "coding",
        difficulty,
        prompt: `I am less interested in perfect code and more interested in your thinking. Talk me through how you would implement ${roleContext || "a feature"} using ${primarySkill} and ${secondarySkill}, including edge cases, failure modes, and how you would test it.`,
        expectedSignals: ["structured implementation thinking", "edge case handling", "test strategy"],
        followUps: [
          "What test cases would give you confidence?",
          "Where could this implementation break in production?"
        ]
      };
    case "product":
      return {
        id: createId("q"),
        round: "technical",
        difficulty,
        prompt: `Let's do a working session. You are the ${humanRole} and adoption is flat around ${roleContext || "an important workflow"}. Walk me through how you would diagnose the problem, decide whether it is a UX, onboarding, pricing, or positioning issue, and what you would do next.`,
        expectedSignals: ["structured diagnosis", "metric reasoning", "decision quality"],
        followUps: [
          "What evidence would you want before changing the roadmap?",
          "How would you keep the team from chasing noise?"
        ]
      };
    case "design":
      return {
        id: createId("q"),
        round: "technical",
        difficulty,
        prompt: `Walk me through how you would redesign ${roleContext || "a messy user flow"} in this ${humanRole} role. How would you understand the current pain points, explore options, and know which direction is actually better?`,
        expectedSignals: ["flow thinking", "user validation", "tradeoff awareness"],
        followUps: [
          "What would you show engineering first?",
          "How would you decide what not to polish in the first iteration?"
        ]
      };
    case "qa":
      return {
        id: createId("q"),
        round: "technical",
        difficulty,
        prompt: `Suppose a release touches ${roleContext || "login, billing, and reporting"}. How would you build a test strategy in this ${humanRole} role so the team gets meaningful confidence without wasting time?`,
        expectedSignals: ["test strategy", "risk prioritization", "coverage planning"],
        followUps: [
          "What would you automate first and why?",
          "How would you handle a bug that only appears intermittently?"
        ]
      };
    case "general_business":
      return {
        id: createId("q"),
        round: "technical",
        difficulty,
        prompt: `Walk me through how you would take ${roleContext || "an ambiguous business request"} in this ${humanRole} role from initial ask to an actionable plan. What would you clarify first, who would you involve, and how would you make sure the output is actually usable?`,
        expectedSignals: ["requirements framing", "stakeholder judgment", "execution planning"],
        followUps: [
          "What would you put in writing so everyone leaves with the same understanding?",
          "How would you know the recommendation is ready to hand over?"
        ]
      };
    default:
      return {
        id: createId("q"),
        round: "technical",
        difficulty,
        prompt: `Walk me through a realistic execution scenario for this ${profile.title} role. How would you plan the work, make decisions under uncertainty, and make sure the outcome is actually useful?`,
        expectedSignals: ["structured reasoning", "ownership", "decision quality"],
        followUps: [
          "What would you validate early?",
          "How would you know the work actually solved the problem?"
        ]
      };
  }
}

function buildSystemDesignPrompt(roleFamily: RoleFamily, humanRole: string, roleContext: string) {
  switch (roleFamily) {
    case "data":
      return `Imagine your ${roleContext || "dashboard"} becomes the weekly source of truth for executives. How would you design the full reporting workflow: data sources, refresh schedule, permissions, metric definitions, monitoring, and what happens when the data pipeline fails?`;
    case "frontend":
      return `Imagine the ${roleContext || "workflow"} you shipped becomes one of the busiest parts of the product. How would you design the frontend architecture, data fetching, error handling, rollout strategy, and monitoring so the experience stays reliable over time?`;
    case "backend":
      return `Imagine the backend workflow around ${roleContext || "this service"} becomes business-critical. How would you design the service boundaries, contracts, storage strategy, observability, and failure recovery model?`;
    case "fullstack":
      return `Imagine the end-to-end workflow around ${roleContext || "this product area"} becomes business-critical. How would you design the frontend, backend, data, and operational boundaries so teams can keep shipping safely?`;
    case "mobile":
      return `Imagine ${roleContext || "this mobile flow"} becomes part of the user's daily routine. How would you design offline behavior, analytics, crash monitoring, release rollout, and performance guardrails so the experience stays dependable?`;
    case "product":
      return `Imagine the workflow tied to ${roleContext || "a core product metric"} becomes critical to revenue. How would you structure the operating model around this ${humanRole} role: metrics, customer feedback loops, release decision-making, and how the team responds when results go off track?`;
    case "design":
      return `Imagine ${roleContext || "the workflow"} you designed becomes one of the most used parts of the product. How would you make sure the design system, feedback loops, analytics, and ongoing iteration model support it well over time?`;
    case "qa":
      return `Imagine the areas around ${roleContext || "this release surface"} now ship continuously. How would you design the quality system around this ${humanRole} role so regressions are caught early, release risk stays visible, and the team can still move fast?`;
    case "general_business":
      return `Imagine the workflow around ${roleContext || "this business process"} becomes critical to the company. How would you design the operating model around this ${humanRole} role: intake, documentation, decision points, metrics, escalation paths, and how teams stay aligned over time?`;
    default:
      return `Imagine this work becomes business-critical after launch. How would you design the full workflow for one major responsibility in this ${humanRole} role, including data, reliability, security, and how the team would operate it?`;
  }
}

function buildSystemSignals(roleFamily: RoleFamily) {
  switch (roleFamily) {
    case "frontend":
      return ["frontend architecture thinking", "state and data-flow awareness", "observability thinking", "release discipline"];
    case "backend":
      return ["service design thinking", "reliability awareness", "observability awareness", "failure recovery planning"];
    case "mobile":
      return ["platform systems thinking", "performance awareness", "release governance", "observability awareness"];
    case "product":
      return ["operating model thinking", "metrics discipline", "cross-functional leadership", "risk awareness"];
    case "design":
      return ["systems thinking", "design operations awareness", "measurement thinking", "collaboration"];
    case "qa":
      return ["quality systems thinking", "release governance", "observability awareness", "risk management"];
    case "general_business":
      return ["operating model thinking", "documentation discipline", "stakeholder alignment", "measurement awareness"];
    default:
      return ["end-to-end architecture", "data modeling", "operational maturity", "security awareness"];
  }
}

function buildSystemFollowUps(roleFamily: RoleFamily) {
  switch (roleFamily) {
    case "data":
      return [
        "How would you alert the business if a refresh fails or a source table changes?",
        "How would you manage access if different teams should see different slices of data?"
      ];
    case "frontend":
      return [
        "What would you monitor first after launch to know the experience is actually healthy?",
        "How would you roll out a risky UI change without surprising users all at once?"
      ];
    case "backend":
      return [
        "Where would you place your first alerts so failures are visible before customers notice?",
        "How would you evolve the contract without breaking dependent teams?"
      ];
    case "mobile":
      return [
        "What would you watch first after release to catch device-specific regressions?",
        "How would you stage the rollout if crash rates started to climb?"
      ];
    case "product":
      return [
        "What would you monitor every week to know the system is healthy?",
        "How would you decide when a problem needs a product change versus an execution change?"
      ];
    case "design":
      return [
        "How would you detect UX degradation over time?",
        "Where would design debt start to build up if no one owned it?"
      ];
    case "qa":
      return [
        "What would you monitor to know quality is slipping before customers complain?",
        "How would you keep release quality visible to the whole team?"
      ];
    case "general_business":
      return [
        "Where would misalignment usually start to build up in a process like this?",
        "What would you track every week to know the workflow is still healthy?"
      ];
    default:
      return ["What would you monitor first after launch?", "How would you handle a privacy or data retention requirement?"];
  }
}

function collectLabels(description: string, rules: KeywordLabel[], limit = 2): string[] {
  const normalizedDescription = normalizeText(description);

  return Array.from(
    new Set(
      rules
        .filter((rule) => rule.patterns.some((pattern) => normalizedDescription.includes(pattern)))
        .map((rule) => rule.label)
    )
  ).slice(0, limit);
}

function countPhraseMatches(text: string, phrases: string[]): number {
  return phrases.filter((phrase) => text.includes(phrase)).length;
}

function countSkillMatches(skills: string[], phrases: string[]): number {
  return phrases.filter((phrase) => skills.some((skill) => skill.includes(phrase))).length;
}

function containsAnyPhrase(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function formatNaturalList(items: string[]): string {
  if (!items.length) {
    return "";
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
