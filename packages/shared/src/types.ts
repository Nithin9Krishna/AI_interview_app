export type InterviewRound = "technical" | "behavioral" | "system_design" | "coding";

export type SeniorityLevel = "intern" | "junior" | "mid" | "senior" | "staff";

export type Difficulty = "warmup" | "practical" | "deep_dive" | "expert";

export type ProctoringEventType =
  | "tab_blur"
  | "fullscreen_exit"
  | "copy"
  | "paste"
  | "camera_unavailable"
  | "screen_share_stopped"
  | "manual_note";

export type RiskLevel = "low" | "medium" | "high";

export interface JobProfile {
  title: string;
  company?: string;
  description: string;
  seniority: SeniorityLevel;
  skills: string[];
}

export interface InterviewQuestion {
  id: string;
  round: InterviewRound;
  difficulty: Difficulty;
  prompt: string;
  expectedSignals: string[];
  followUps: string[];
}

export interface InterviewPlan {
  id: string;
  createdAt: string;
  job: JobProfile;
  questions: InterviewQuestion[];
  estimatedMinutes: number;
}

export interface CandidateAnswer {
  questionId: string;
  answer: string;
  durationSeconds?: number;
}

export interface AnswerEvaluation {
  overallScore: number;
  knowledgeScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  confidenceScore: number;
  strengths: string[];
  concerns: string[];
  recommendedFollowUps: string[];
  summary: string;
}

export interface ProctoringEvent {
  type: ProctoringEventType;
  severity: RiskLevel;
  occurredAt: string;
  details?: string;
}

export interface ProctoringSummary {
  riskLevel: RiskLevel;
  eventCount: number;
  redFlags: string[];
}
