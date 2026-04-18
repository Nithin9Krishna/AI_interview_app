import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  evaluateCandidateAnswer,
  generateInterviewPlan,
  type AnswerEvaluation,
  type InterviewPlan,
  type InterviewQuestion,
  type SeniorityLevel
} from "@ai-interview/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

const demoDescription =
  "We are hiring a full-stack engineer to build React Native, React, TypeScript, Node.js, PostgreSQL, and AI-powered product features. The role requires strong API development, collaboration, testing, and ownership of production reliability.";

export default function App() {
  const [title, setTitle] = useState("Mobile AI Interview Engineer");
  const [seniority, setSeniority] = useState<SeniorityLevel>("mid");
  const [description, setDescription] = useState(demoDescription);
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("Mobile MVP uses the same shared interview engine as web.");

  async function createInterview() {
    setIsLoading(true);
    setEvaluation(null);
    setStatus("Generating interview...");

    const payload = {
      title,
      description,
      seniority,
      skills: []
    };

    try {
      const response = await fetch(`${API_URL}/api/interviews/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("API unavailable");
      }

      const data = (await response.json()) as { plan: InterviewPlan };
      setPlan(data.plan);
      setActiveQuestion(data.plan.questions[0] ?? null);
      setStatus("Interview generated through API.");
    } catch {
      const localPlan = generateInterviewPlan(payload);
      setPlan(localPlan);
      setActiveQuestion(localPlan.questions[0] ?? null);
      setStatus("API not reachable, generated interview locally.");
    } finally {
      setIsLoading(false);
    }
  }

  async function evaluateAnswer() {
    if (!activeQuestion || answer.trim().length < 20) {
      Alert.alert("Add more detail", "The answer needs at least 20 characters before evaluation.");
      return;
    }

    setIsLoading(true);
    setStatus("Evaluating answer...");

    try {
      const response = await fetch(`${API_URL}/api/interviews/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: activeQuestion,
          answer: {
            questionId: activeQuestion.id,
            answer
          },
          proctoringEvents: []
        })
      });

      if (!response.ok) {
        throw new Error("API unavailable");
      }

      const data = (await response.json()) as { evaluation: AnswerEvaluation };
      setEvaluation(data.evaluation);
      setStatus("Answer evaluated through API.");
    } catch {
      setEvaluation(evaluateCandidateAnswer(activeQuestion, answer));
      setStatus("API not reachable, evaluated answer locally.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>Android and iPhone MVP</Text>
          <Text style={styles.title}>AI Interview</Text>
          <Text style={styles.subtitle}>
            Generate interviews from a JD, answer mobile-friendly questions, and produce an initial recruiter score.
          </Text>
        </View>

        <Text style={styles.status}>{status}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recruiter setup</Text>
          <Text style={styles.label}>Role title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />

          <Text style={styles.label}>Seniority: {seniority}</Text>
          <View style={styles.segmentRow}>
            {(["intern", "junior", "mid", "senior", "staff"] as SeniorityLevel[]).map((level) => (
              <Pressable
                key={level}
                style={[styles.segment, seniority === level && styles.segmentActive]}
                onPress={() => setSeniority(level)}
              >
                <Text style={[styles.segmentText, seniority === level && styles.segmentTextActive]}>{level}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Job description</Text>
          <TextInput
            multiline
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
          />

          <PrimaryButton disabled={isLoading || description.length < 80} onPress={createInterview}>
            Generate interview
          </PrimaryButton>
        </View>

        {plan ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Questions</Text>
            <Text style={styles.meta}>{plan.job.skills.length ? plan.job.skills.join(", ") : "General role skills"}</Text>
            {plan.questions.map((question, index) => (
              <Pressable
                key={question.id}
                style={[styles.question, question.id === activeQuestion?.id && styles.questionActive]}
                onPress={() => {
                  setActiveQuestion(question);
                  setEvaluation(null);
                }}
              >
                <Text style={styles.questionType}>
                  {index + 1}. {question.round.replace("_", " ")} | {question.difficulty}
                </Text>
                <Text style={styles.questionPrompt}>{question.prompt}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {activeQuestion ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Candidate answer</Text>
            <Text style={styles.activePrompt}>{activeQuestion.prompt}</Text>
            <TextInput
              multiline
              style={[styles.input, styles.answerBox]}
              placeholder="Type the candidate response..."
              placeholderTextColor="#8b7d69"
              value={answer}
              onChangeText={setAnswer}
            />
            <PrimaryButton disabled={isLoading || answer.trim().length < 20} onPress={evaluateAnswer}>
              Evaluate answer
            </PrimaryButton>
          </View>
        ) : null}

        {evaluation ? (
          <View style={styles.report}>
            <Text style={styles.reportLabel}>Recruiter report</Text>
            <Text style={styles.score}>{evaluation.overallScore}/10</Text>
            <Text style={styles.summary}>{evaluation.summary}</Text>
            <Metric label="Knowledge" value={evaluation.knowledgeScore} />
            <Metric label="Communication" value={evaluation.communicationScore} />
            <Metric label="Problem solving" value={evaluation.problemSolvingScore} />
            <Metric label="Confidence" value={evaluation.confidenceScore} />
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PrimaryButton({
  children,
  disabled,
  onPress
}: {
  children: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.primaryButton, disabled && styles.disabled]} disabled={disabled} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}/10</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f4efe4"
  },
  container: {
    gap: 16,
    padding: 18,
    paddingBottom: 48
  },
  hero: {
    borderRadius: 32,
    padding: 22,
    backgroundColor: "#17201a"
  },
  kicker: {
    color: "#e6b450",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
    textTransform: "uppercase"
  },
  title: {
    color: "#fffaf0",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -2
  },
  subtitle: {
    color: "#d8cfbd",
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8
  },
  status: {
    borderRadius: 22,
    padding: 14,
    color: "#812b1d",
    backgroundColor: "#fffaf0"
  },
  card: {
    gap: 12,
    borderRadius: 28,
    padding: 18,
    backgroundColor: "#fffaf0"
  },
  cardTitle: {
    color: "#17201a",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.8
  },
  label: {
    color: "#667061",
    fontSize: 13,
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(23, 32, 26, 0.14)",
    borderRadius: 18,
    padding: 13,
    color: "#17201a",
    backgroundColor: "#ffffff"
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: "top"
  },
  answerBox: {
    minHeight: 170,
    textAlignVertical: "top"
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  segment: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#efe6d2"
  },
  segmentActive: {
    backgroundColor: "#d9472b"
  },
  segmentText: {
    color: "#17201a",
    fontWeight: "800",
    textTransform: "capitalize"
  },
  segmentTextActive: {
    color: "#fffaf0"
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 999,
    padding: 15,
    backgroundColor: "#17201a"
  },
  primaryButtonText: {
    color: "#fffaf0",
    fontSize: 16,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.45
  },
  meta: {
    color: "#154f3a",
    fontWeight: "700"
  },
  question: {
    gap: 7,
    borderWidth: 1,
    borderColor: "rgba(23, 32, 26, 0.12)",
    borderRadius: 18,
    padding: 13,
    backgroundColor: "#ffffff"
  },
  questionActive: {
    borderColor: "#d9472b",
    backgroundColor: "#fff1ec"
  },
  questionType: {
    color: "#d9472b",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  questionPrompt: {
    color: "#17201a",
    fontSize: 15,
    lineHeight: 21
  },
  activePrompt: {
    color: "#154f3a",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700"
  },
  report: {
    gap: 10,
    borderRadius: 28,
    padding: 18,
    backgroundColor: "#812b1d"
  },
  reportLabel: {
    color: "#e6b450",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase"
  },
  score: {
    color: "#fffaf0",
    fontSize: 48,
    fontWeight: "900"
  },
  summary: {
    color: "#f1d9ce",
    fontSize: 15,
    lineHeight: 22
  },
  metric: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255, 250, 240, 0.1)"
  },
  metricLabel: {
    color: "#f1d9ce",
    fontWeight: "700"
  },
  metricValue: {
    color: "#fffaf0",
    fontWeight: "900"
  },
  loader: {
    alignItems: "center",
    padding: 12
  }
});
