import { z } from "zod";

export const senioritySchema = z.enum(["intern", "junior", "mid", "senior", "staff"]);

export const jobProfileSchema = z.object({
  title: z.string().min(2, "Job title is required"),
  company: z.string().optional(),
  description: z.string().min(80, "Paste a fuller job description to generate a useful interview"),
  seniority: senioritySchema,
  skills: z.array(z.string()).default([])
});

export const interviewQuestionSchema = z.object({
  id: z.string(),
  round: z.enum(["technical", "behavioral", "system_design", "coding"]),
  difficulty: z.enum(["warmup", "practical", "deep_dive", "expert"]),
  prompt: z.string(),
  expectedSignals: z.array(z.string()),
  followUps: z.array(z.string())
});

export const candidateAnswerSchema = z.object({
  questionId: z.string(),
  answer: z.string().min(20, "Answer should include enough detail to evaluate"),
  durationSeconds: z.number().int().positive().optional()
});

export const proctoringEventSchema = z.object({
  type: z.enum([
    "tab_blur",
    "fullscreen_exit",
    "copy",
    "paste",
    "camera_unavailable",
    "screen_share_stopped",
    "manual_note"
  ]),
  severity: z.enum(["low", "medium", "high"]),
  occurredAt: z.string(),
  details: z.string().optional()
});

export const generateInterviewRequestSchema = jobProfileSchema;

export const evaluateAnswerRequestSchema = z.object({
  question: interviewQuestionSchema,
  answer: candidateAnswerSchema,
  proctoringEvents: z.array(proctoringEventSchema).default([])
});

export type GenerateInterviewRequest = z.infer<typeof generateInterviewRequestSchema>;
export type EvaluateAnswerRequest = z.infer<typeof evaluateAnswerRequestSchema>;
