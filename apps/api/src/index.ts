import cors from "@fastify/cors";
import Fastify, { type FastifyReply } from "fastify";
import { ZodError } from "zod";
import {
  evaluateAnswerRequestSchema,
  evaluateCandidateAnswer,
  generateInterviewPlan,
  generateInterviewRequestSchema,
  summarizeProctoring
} from "@ai-interview/shared";

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: true
});

app.get("/health", async () => ({
  ok: true,
  service: "ai-interview-api",
  timestamp: new Date().toISOString()
}));

app.post("/api/interviews/generate", async (request, reply) => {
  try {
    const payload = generateInterviewRequestSchema.parse(request.body);
    const plan = generateInterviewPlan(payload);

    return reply.send({ plan });
  } catch (error) {
    return handleRouteError(reply, error);
  }
});

app.post("/api/interviews/evaluate", async (request, reply) => {
  try {
    const payload = evaluateAnswerRequestSchema.parse(request.body);
    const evaluation = evaluateCandidateAnswer(payload.question, payload.answer.answer);
    const proctoring = summarizeProctoring(payload.proctoringEvents);

    return reply.send({
      evaluation,
      proctoring
    });
  } catch (error) {
    return handleRouteError(reply, error);
  }
});

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

function handleRouteError(reply: FastifyReply, error: unknown) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "Invalid request",
      issues: error.issues
    });
  }

  requestLog(error);
  return reply.status(500).send({
    error: "Unexpected server error"
  });
}

function requestLog(error: unknown) {
  app.log.error(error);
}
