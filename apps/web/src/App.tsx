import { useEffect, useRef, useState } from "react";
import {
  evaluateCandidateAnswer,
  generateInterviewPlan,
  summarizeProctoring,
  type AnswerEvaluation,
  type InterviewPlan,
  type InterviewQuestion,
  type ProctoringEvent,
  type ProctoringSummary,
  type RiskLevel,
  type SeniorityLevel
} from "@ai-interview/shared";

type Screen = "landing" | "setup" | "onboarding" | "interview" | "dashboard";

const demoDescription =
  "We are hiring a full-stack engineer to build React, TypeScript, Node.js, PostgreSQL, and AI-powered product features. The role requires strong system design, API development, testing, collaboration, clear communication, secure product thinking, and ownership of production reliability.";

interface FacialSignalSample {
  occurredAt: string;
  visibilityScore: number;
  lightingScore: number;
  expressionEnergy: number;
  expressionLabel: "calm" | "engaged" | "animated" | "low-visibility";
}

interface FacialSignalSummary {
  sampleCount: number;
  visibilityScore: number;
  lightingScore: number;
  expressionEnergy: number;
  dominantExpression: FacialSignalSample["expressionLabel"];
  sessionQualityScore: number;
  observations: string[];
}

export function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [title, setTitle] = useState("Full Stack AI Engineer");
  const [company, setCompany] = useState("Luminary Talent");
  const [seniority, setSeniority] = useState<SeniorityLevel>("mid");
  const [description, setDescription] = useState(demoDescription);
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);
  const [proctoringSummary, setProctoringSummary] = useState<ProctoringSummary | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [focusModeStarted, setFocusModeStarted] = useState(false);
  const [notice, setNotice] = useState("Standalone mode active. Luminary Onboard AI runs locally in this app.");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaStatus, setMediaStatus] = useState<"idle" | "requesting" | "ready" | "blocked">("idle");
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [facialSignals, setFacialSignals] = useState<FacialSignalSample[]>([]);
  const [aiResponse, setAiResponse] = useState("I will ask each question out loud, listen to your answer, and then generate a final recruiter report.");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldKeepListeningRef = useRef(false);

  const activeQuestion = plan?.questions[activeQuestionIndex] ?? null;
  const activeAnswer = activeQuestion ? answers[activeQuestion.id] ?? "" : "";
  const canStartInterview = Boolean(plan && consentAccepted);
  const canEvaluate = Boolean(activeQuestion && activeAnswer.trim().length >= 20);
  const currentProgress = plan ? Math.round(((activeQuestionIndex + 1) / plan.questions.length) * 100) : 0;
  const visualSummary = summarizeFacialSignals(facialSignals);
  const fitScore = evaluation
    ? clampScore(evaluation.overallScore * 10 + Math.round((visualSummary.sessionQualityScore - 75) / 5), 1, 100)
    : 86;
  const trustScore = proctoringSummary
    ? Math.min(trustScoreFromRisk(proctoringSummary.riskLevel), visualSummary.sessionQualityScore)
    : visualSummary.sessionQualityScore;

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && screen === "interview") {
        recordEvent("tab_blur", "medium", "Browser tab lost focus during the interview.");
      }
    };

    const handleCopy = () => {
      if (screen === "interview") {
        recordEvent("copy", "medium", "Copy action detected during the interview.");
      }
    };

    const handlePaste = () => {
      if (screen === "interview") {
        recordEvent("paste", "high", "Paste action detected in the interview workspace.");
      }
    };

    const handleFullscreen = () => {
      if (focusModeStarted && screen === "interview" && !document.fullscreenElement) {
        recordEvent("fullscreen_exit", "high", "Candidate exited focused interview mode.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("paste", handlePaste);
    document.addEventListener("fullscreenchange", handleFullscreen);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("paste", handlePaste);
      document.removeEventListener("fullscreenchange", handleFullscreen);
    };
  }, [focusModeStarted, screen]);

  useEffect(() => {
    if (screen !== "interview") {
      stopListening();
    }
  }, [screen]);

  useEffect(() => {
    return () => {
      stopListening();
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, [mediaStream]);

  function createInterview() {
    const generatedPlan = generateInterviewPlan({
      title,
      company,
      description,
      seniority,
      skills: []
    });

    setPlan(generatedPlan);
    setActiveQuestionIndex(0);
    setAnswers({});
    setEvaluation(null);
    setProctoringEvents([]);
    setProctoringSummary(null);
    setFacialSignals([]);
    setInterimTranscript("");
    setAiResponse("I created your interview. After consent, I will speak the questions and listen to the candidate live.");
    setNotice("Interview generated locally by Luminary Onboard AI. Review consent before launching.");
    setScreen("onboarding");
  }

  async function startInterview() {
    if (!canStartInterview) {
      setNotice("Consent and a generated interview are required before starting.");
      return;
    }

    const stream = await requestLiveMedia();

    if (!stream) {
      setNotice("Camera and microphone access are required for the live AI interview.");
      return;
    }

    setFocusModeStarted(true);
    setScreen("interview");
    setNotice("Live interview room started. Camera, microphone, voice transcript, and visual signals are active.");

    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen().catch(() => {
        recordEvent("manual_note", "low", "Fullscreen request was blocked by the browser.");
      });
    }

    speakQuestion(activeQuestion);
  }

  function evaluateCurrentAnswer() {
    if (!activeQuestion) {
      return;
    }

    stopListening();

    const nextEvaluation = enhanceEvaluationWithLiveSignals(
      evaluateCandidateAnswer(activeQuestion, activeAnswer),
      visualSummary
    );
    const nextProctoringSummary = summarizeProctoring(proctoringEvents);
    const interviewerResponse = buildInterviewerResponse(nextEvaluation, activeQuestion);

    setEvaluation(nextEvaluation);
    setProctoringSummary(nextProctoringSummary);
    setAiResponse(interviewerResponse);
    setNotice("Live answer evaluated. The final report now includes transcript, proctoring, and visual signal context.");
    speakText(interviewerResponse, nextEvaluation.overallScore < 8);
  }

  function goToNextQuestion() {
    if (!plan) {
      return;
    }

    stopListening();
    const nextIndex = Math.min(activeQuestionIndex + 1, plan.questions.length - 1);
    setActiveQuestionIndex(nextIndex);
    setEvaluation(null);
    setInterimTranscript("");
    speakQuestion(plan.questions[nextIndex]);
  }

  function appendActiveAnswer(value: string) {
    if (!activeQuestion) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [activeQuestion.id]: `${current[activeQuestion.id] ?? ""} ${value}`.trim()
    }));
  }

  function speakQuestion(question: InterviewQuestion | null) {
    if (!question || !("speechSynthesis" in window)) {
      return;
    }

    stopListening();
    setAiResponse(question.prompt);
    speakText(question.prompt, true);
  }

  function speakText(text: string, listenAfterSpeech: boolean) {
    if (!("speechSynthesis" in window)) {
      if (listenAfterSpeech) {
        startListening();
      }
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (listenAfterSpeech) {
        startListening();
      }
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (listenAfterSpeech) {
        startListening();
      }
    };
    window.speechSynthesis.speak(utterance);
  }

  async function requestLiveMedia() {
    if (mediaStream) {
      return mediaStream;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaStatus("blocked");
      recordEvent("camera_unavailable", "high", "Browser does not support camera and microphone capture.");
      return null;
    }

    setMediaStatus("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      });

      setMediaStream(stream);
      setMediaStatus("ready");
      return stream;
    } catch {
      setMediaStatus("blocked");
      recordEvent("camera_unavailable", "high", "Candidate blocked or dismissed camera/microphone permissions.");
      return null;
    }
  }

  function startListening() {
    const SpeechRecognitionConstructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setNotice("Speech recognition is not available in this browser. Use Chrome or Edge for live voice capture.");
      return;
    }

    stopListening();
    shouldKeepListeningRef.current = true;
    setInterimTranscript("");

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalTranscript += ` ${transcript}`;
        } else {
          interim += ` ${transcript}`;
        }
      }

      if (finalTranscript.trim()) {
        appendActiveAnswer(finalTranscript.trim());
      }

      setInterimTranscript(interim.trim());
    };

    recognition.onerror = () => {
      shouldKeepListeningRef.current = false;
      setIsListening(false);
      setNotice("Voice capture paused. Check microphone permission and start listening again.");
    };

    recognition.onend = () => {
      setIsListening(false);
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
          setIsListening(true);
        } catch {
          shouldKeepListeningRef.current = false;
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
      setNotice("Listening live. The candidate should answer out loud; typed answers are disabled.");
    } catch {
      shouldKeepListeningRef.current = false;
      setIsListening(false);
    }
  }

  function stopListening() {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  function recordEvent(type: ProctoringEvent["type"], severity: ProctoringEvent["severity"], details: string) {
    setProctoringEvents((current) => [
      ...current,
      {
        type,
        severity,
        details,
        occurredAt: new Date().toISOString()
      }
    ]);
  }

  return (
    <main className="appShell">
      <Header currentScreen={screen} onNavigate={setScreen} />
      <div className="noticeBar">
        <span className="liveDot" />
        {notice}
      </div>

      {screen === "landing" ? (
        <LandingScreen onStart={() => setScreen("setup")} />
      ) : null}

      {screen === "setup" ? (
        <SetupScreen
          company={company}
          description={description}
          isReady={description.length >= 80}
          plan={plan}
          seniority={seniority}
          title={title}
          onCompanyChange={setCompany}
          onCreateInterview={createInterview}
          onDescriptionChange={setDescription}
          onSelectQuestion={(index) => {
            setActiveQuestionIndex(index);
            setScreen("interview");
          }}
          onSeniorityChange={setSeniority}
          onTitleChange={setTitle}
        />
      ) : null}

      {screen === "onboarding" ? (
        <OnboardingScreen
          canStart={canStartInterview}
          consentAccepted={consentAccepted}
          plan={plan}
          onConsentChange={setConsentAccepted}
          onStartInterview={() => void startInterview()}
        />
      ) : null}

      {screen === "interview" ? (
        <InterviewScreen
          activeAnswer={activeAnswer}
          activeQuestion={activeQuestion}
          activeQuestionIndex={activeQuestionIndex}
          aiResponse={aiResponse}
          canEvaluate={canEvaluate}
          evaluation={evaluation}
          interimTranscript={interimTranscript}
          isListening={isListening}
          isSpeaking={isSpeaking}
          mediaStatus={mediaStatus}
          mediaStream={mediaStream}
          plan={plan}
          proctoringEvents={proctoringEvents}
          progress={currentProgress}
          onEvaluate={evaluateCurrentAnswer}
          onFacialSample={(sample) => setFacialSignals((current) => [...current.slice(-60), sample])}
          onNext={goToNextQuestion}
          onSpeak={() => speakQuestion(activeQuestion)}
          onStartListening={startListening}
          onStopListening={stopListening}
          onViewDashboard={() => setScreen("dashboard")}
          visualSummary={visualSummary}
        />
      ) : null}

      {screen === "dashboard" ? (
        <DashboardScreen
          evaluation={evaluation}
          fitScore={fitScore}
          plan={plan}
          proctoringSummary={proctoringSummary}
          trustScore={trustScore}
          transcript={Object.values(answers).join("\n\n")}
          visualSummary={visualSummary}
          onBackToSetup={() => setScreen("setup")}
        />
      ) : null}
    </main>
  );
}

function Header({ currentScreen, onNavigate }: { currentScreen: Screen; onNavigate: (screen: Screen) => void }) {
  const links: Array<{ label: string; screen: Screen }> = [
    { label: "Home", screen: "landing" },
    { label: "Setup", screen: "setup" },
    { label: "Consent", screen: "onboarding" },
    { label: "Interview", screen: "interview" },
    { label: "Talent", screen: "dashboard" }
  ];

  return (
    <header className="topBar">
      <button className="brandButton" onClick={() => onNavigate("landing")} type="button">
        <span className="brandMark">L</span>
        <span>Luminary Talent</span>
      </button>
      <nav className="topNav" aria-label="Primary navigation">
        {links.map((link) => (
          <button
            className={currentScreen === link.screen ? "navLink active" : "navLink"}
            key={link.screen}
            onClick={() => onNavigate(link.screen)}
            type="button"
          >
            {link.label}
          </button>
        ))}
      </nav>
      <div className="aiPill">
        <span className="liveDot" />
        Onboard AI
      </div>
    </header>
  );
}

function LandingScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="landingPage page">
      <div className="heroGrid">
        <div className="heroCopyBlock">
          <div className="tag">
            <span className="liveDot" />
            Next-gen interview intelligence
          </div>
          <h1>
            The future of <span>talent selection</span>.
          </h1>
          <p>
            Run AI-led interviews, evaluate candidate signal, and protect hiring integrity with explainable
            proctoring intelligence in one standalone app.
          </p>
          <div className="heroActions">
            <button className="primaryAction" onClick={onStart} type="button">
              Build interview
            </button>
            <button className="secondaryAction" onClick={onStart} type="button">
              Candidate portal
            </button>
          </div>
        </div>

        <div className="heroVisual" aria-label="Product preview">
          <div className="orb orbOne" />
          <div className="orb orbTwo" />
          <div className="previewWindow">
            <div className="previewHeader">
              <span />
              <span />
              <span />
            </div>
            <div className="previewScore">
              <p>AI Fit Score</p>
              <strong>92</strong>
            </div>
            <div className="previewRows">
              <div />
              <div />
              <div />
            </div>
            <div className="proctorPreview">
              <span>Trust verified</span>
              <strong>98%</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="featureIntro">
        <h2>Precision engineering for modern hiring</h2>
        <p>The UI direction from your designs is now a system: bento layout, calm consent, focused interview mode, and recruiter decision cards.</p>
      </div>

      <div className="bentoGrid">
        <article className="bentoCard wide">
          <span className="cardIcon">SEC</span>
          <h3>Intelligent proctoring</h3>
          <p>Track tab changes, fullscreen exits, copy/paste events, and session risk with transparent red flags.</p>
          <div className="signalStrip">
            <span>Identity</span>
            <span>Screen focus</span>
            <span>Integrity</span>
          </div>
        </article>
        <article className="bentoCard dark">
          <span className="cardIcon">AI</span>
          <h3>Onboard AI interviewer</h3>
          <p>Local interview generation and scoring make the MVP work as a standalone product.</p>
        </article>
        <article className="bentoCard">
          <span className="cardIcon">REP</span>
          <h3>Explainable reports</h3>
          <p>Every score includes strengths, concerns, follow-ups, and trust context.</p>
        </article>
        <article className="bentoCard wide visualCard">
          <h3>Built for web first, mobile next</h3>
          <p>Web handles coding and proctoring depth. Mobile keeps interviews lightweight and candidate-friendly.</p>
        </article>
      </div>
    </section>
  );
}

function SetupScreen({
  company,
  description,
  isReady,
  plan,
  seniority,
  title,
  onCompanyChange,
  onCreateInterview,
  onDescriptionChange,
  onSelectQuestion,
  onSeniorityChange,
  onTitleChange
}: {
  company: string;
  description: string;
  isReady: boolean;
  plan: InterviewPlan | null;
  seniority: SeniorityLevel;
  title: string;
  onCompanyChange: (value: string) => void;
  onCreateInterview: () => void;
  onDescriptionChange: (value: string) => void;
  onSelectQuestion: (index: number) => void;
  onSeniorityChange: (value: SeniorityLevel) => void;
  onTitleChange: (value: string) => void;
}) {
  return (
    <section className="page twoColumn">
      <form
        className="panel recruiterPanel"
        onSubmit={(event) => {
          event.preventDefault();
          onCreateInterview();
        }}
      >
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Recruiter setup</p>
            <h2>Generate a role-specific interview</h2>
          </div>
          <span className="statusBadge">Standalone</span>
        </div>

        <label>
          Role title
          <input value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </label>

        <label>
          Company
          <input value={company} onChange={(event) => onCompanyChange(event.target.value)} />
        </label>

        <label>
          Seniority
          <select value={seniority} onChange={(event) => onSeniorityChange(event.target.value as SeniorityLevel)}>
            <option value="intern">Intern</option>
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
            <option value="staff">Staff</option>
          </select>
        </label>

        <label>
          Job description
          <textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} rows={11} />
        </label>

        <button className="primaryAction" disabled={!isReady} type="submit">
          Generate interview
        </button>
      </form>

      <section className="panel planPanel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Onboard AI output</p>
            <h2>Interview plan</h2>
          </div>
          {plan ? <strong>{plan.estimatedMinutes} min</strong> : null}
        </div>

        {!plan ? (
          <div className="emptyState">
            <span>JD</span>
            <p>Generate an interview to see adaptive technical, behavioral, coding, and system design prompts.</p>
          </div>
        ) : (
          <>
            <div className="skillRail">
              {plan.job.skills.length ? plan.job.skills.map((skill) => <span key={skill}>{skill}</span>) : <span>General skills</span>}
            </div>
            <div className="questionStack">
              {plan.questions.map((question, index) => (
                <button className="questionCard" key={question.id} onClick={() => onSelectQuestion(index)} type="button">
                  <span>
                    {index + 1}. {question.round.replace("_", " ")}
                  </span>
                  <strong>{question.difficulty.replace("_", " ")}</strong>
                  <p>{question.prompt}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </section>
  );
}

function OnboardingScreen({
  canStart,
  consentAccepted,
  plan,
  onConsentChange,
  onStartInterview
}: {
  canStart: boolean;
  consentAccepted: boolean;
  plan: InterviewPlan | null;
  onConsentChange: (value: boolean) => void;
  onStartInterview: () => void;
}) {
  return (
    <section className="page onboardingPage">
      <div className="centerIntro">
        <h1>You're almost ready, Alex.</h1>
        <p>
          Before the AI interview begins, review what the session captures. This live flow uses your camera,
          microphone, spoken transcript, and facial/presence signals to create the final report.
        </p>
      </div>

      <div className="consentGrid">
        <article className="consentCard large">
          <div className="iconPair">
            <span>CAM</span>
            <span>MIC</span>
          </div>
          <h2>Visual and audio connection</h2>
          <p>Camera and microphone let Onboard AI listen, respond out loud, and capture visible communication signals.</p>
          <strong className="readyPill">Systems ready</strong>
        </article>

        <article className="consentCard">
          <span className="squareIcon">SCR</span>
          <h2>Workspace focus</h2>
          <p>Screen focus events help flag distractions, tab changes, and suspicious behavior during the interview.</p>
        </article>

        <article className="consentCard indigo">
          <h3>Privacy first</h3>
          <p>Facial signals should be used as context only, not as the only reason to reject or advance a candidate.</p>
        </article>

        <article className="consentCard dark horizontal">
          <div>
            <h2>Keep your ID handy</h2>
            <p>Identity verification can be added before launch to confirm the expected candidate is present.</p>
            <div className="miniBadges">
              <span>Passport</span>
              <span>Driver license</span>
            </div>
          </div>
          <div className="idMock">ID</div>
        </article>
      </div>

      <div className="consentActionPanel">
        <label className="consentCheck">
          <input checked={consentAccepted} onChange={(event) => onConsentChange(event.target.checked)} type="checkbox" />
          <span>
            I understand and agree to the assessment guidelines and privacy policy. I consent to video, audio,
            speech transcription, facial/presence signal capture, and screen-focus monitoring for this session.
          </span>
        </label>
        <button className="primaryAction wideAction" disabled={!canStart} onClick={onStartInterview} type="button">
          I consent and start interview
        </button>
        <p className="secureNote">Secure standalone session. No backend is required for this MVP flow.</p>
        {!plan ? <p className="warningText">Generate an interview first from the setup screen.</p> : null}
      </div>
    </section>
  );
}

function InterviewScreen({
  activeAnswer,
  activeQuestion,
  activeQuestionIndex,
  aiResponse,
  canEvaluate,
  evaluation,
  interimTranscript,
  isListening,
  isSpeaking,
  mediaStatus,
  mediaStream,
  plan,
  proctoringEvents,
  progress,
  onEvaluate,
  onFacialSample,
  onNext,
  onSpeak,
  onStartListening,
  onStopListening,
  onViewDashboard,
  visualSummary
}: {
  activeAnswer: string;
  activeQuestion: InterviewQuestion | null;
  activeQuestionIndex: number;
  aiResponse: string;
  canEvaluate: boolean;
  evaluation: AnswerEvaluation | null;
  interimTranscript: string;
  isListening: boolean;
  isSpeaking: boolean;
  mediaStatus: "idle" | "requesting" | "ready" | "blocked";
  mediaStream: MediaStream | null;
  plan: InterviewPlan | null;
  proctoringEvents: ProctoringEvent[];
  progress: number;
  onEvaluate: () => void;
  onFacialSample: (sample: FacialSignalSample) => void;
  onNext: () => void;
  onSpeak: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onViewDashboard: () => void;
  visualSummary: FacialSignalSummary;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onFacialSampleRef = useRef(onFacialSample);

  useEffect(() => {
    onFacialSampleRef.current = onFacialSample;
  }, [onFacialSample]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !mediaStream) {
      return;
    }

    video.srcObject = mediaStream;
    void video.play();
  }, [mediaStream]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !mediaStream) {
      return;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let previousFrame: Uint8ClampedArray | null = null;

    const interval = window.setInterval(() => {
      if (!context || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }

      const width = 96;
      const height = 54;
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
      const frame = context.getImageData(0, 0, width, height).data;
      const sample = buildFacialSignalSample(frame, previousFrame);
      previousFrame = new Uint8ClampedArray(frame);
      onFacialSampleRef.current(sample);
    }, 1600);

    return () => window.clearInterval(interval);
  }, [mediaStream]);

  if (!plan || !activeQuestion) {
    return (
      <section className="page">
        <div className="emptyState largeEmpty">
          <span>AI</span>
          <p>Create an interview plan and complete consent before opening the interview room.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="interviewShell">
      <div className="interviewHeader">
        <div>
          <p className="eyebrow">Challenge {String(activeQuestionIndex + 1).padStart(2, "0")}</p>
          <h1>{roundTitle(activeQuestion)}</h1>
          <p>{activeQuestion.prompt}</p>
        </div>
        <div className="timerCard">
          <span>Progress</span>
          <strong>{progress}%</strong>
        </div>
      </div>

      <div className="progressTrack">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="workspaceGrid">
        <section className="interviewPanel">
          <div className="liveInterviewGrid">
            <div className="cameraStage">
              <video aria-label="Candidate live camera preview" autoPlay muted playsInline ref={videoRef} />
              <div className="cameraOverlay">
                <span className={mediaStatus === "ready" ? "cameraStatus ready" : "cameraStatus blocked"}>
                  {mediaStatus === "ready" ? "Camera live" : "Camera pending"}
                </span>
                <span>Expression signal: {visualSummary.dominantExpression.replace("-", " ")}</span>
              </div>
            </div>

            <div className="aiInterviewer live">
              <div className="avatarRing">AI</div>
              <div>
                <span>{isSpeaking ? "Speaking question" : isListening ? "Listening live" : "Onboard AI interviewer"}</span>
                <p>{aiResponse}</p>
              </div>
            </div>
          </div>

          <div className="voiceControls">
            <button className="secondaryAction" onClick={onSpeak} type="button">
              Replay AI question
            </button>
            {isListening ? (
              <button className="secondaryAction dangerAction" onClick={onStopListening} type="button">
                Pause listening
              </button>
            ) : (
              <button className="primaryAction" onClick={onStartListening} type="button">
                Start listening
              </button>
            )}
          </div>

          <div className="transcriptPanel">
            <div className="transcriptHeader">
              <div>
                <p className="eyebrow">Voice transcript</p>
                <h2>No typed answers</h2>
              </div>
              <span className={isListening ? "listeningBadge active" : "listeningBadge"}>{isListening ? "Listening" : "Paused"}</span>
            </div>
            <div className="transcriptBody">
              {activeAnswer ? <p>{activeAnswer}</p> : <p className="muted">The candidate's spoken answer will appear here automatically.</p>}
              {interimTranscript ? <p className="interimTranscript">{interimTranscript}</p> : null}
            </div>
          </div>

          {activeQuestion.round === "coding" ? (
            <div className="voiceCodingPrompt">
              <span>Voice-first coding round</span>
              <p>
                Ask the candidate to explain the algorithm verbally. The MVP captures reasoning through speech;
                the optional code editor can be added later for live coding.
              </p>
            </div>
          ) : null}

          <div className="interviewActions">
            <button className="secondaryAction" onClick={onNext} type="button">
              Next question
            </button>
            <button className="primaryAction" disabled={!canEvaluate} onClick={onEvaluate} type="button">
              Evaluate live answer
            </button>
            <button className="secondaryAction" onClick={onViewDashboard} type="button">
              Final report
            </button>
          </div>
        </section>

        <aside className="sideReport">
          <div className="proctorActive">
            <span className="liveDot" />
            AI proctor active
          </div>

          <div className="eventList">
            <h3>Session signals</h3>
            {proctoringEvents.length ? (
              proctoringEvents.slice(-5).map((event) => (
                <div className={`eventItem ${event.severity}`} key={`${event.type}-${event.occurredAt}`}>
                  <strong>{event.type.replace("_", " ")}</strong>
                  <span>{event.details}</span>
                </div>
              ))
            ) : (
              <p className="muted">No risk events recorded.</p>
            )}
          </div>

          {evaluation ? (
            <div className="evaluationCard">
              <span>Overall score</span>
              <strong>{evaluation.overallScore}/10</strong>
              <p>{evaluation.summary}</p>
              <ScoreGrid evaluation={evaluation} />
            </div>
          ) : (
            <div className="emptyState reportEmpty">
              <span>REP</span>
              <p>Submit an answer to generate the recruiter report.</p>
            </div>
          )}

          <div className="visualSignalCard">
            <h3>Facial and presence signals</h3>
            <SignalRow label="Visibility" value={visualSummary.visibilityScore} />
            <SignalRow label="Lighting" value={visualSummary.lightingScore} />
            <SignalRow label="Expression energy" value={visualSummary.expressionEnergy} />
            <p>{visualSummary.observations[0]}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function DashboardScreen({
  evaluation,
  fitScore,
  plan,
  proctoringSummary,
  transcript,
  trustScore,
  visualSummary,
  onBackToSetup
}: {
  evaluation: AnswerEvaluation | null;
  fitScore: number;
  plan: InterviewPlan | null;
  proctoringSummary: ProctoringSummary | null;
  transcript: string;
  trustScore: number;
  visualSummary: FacialSignalSummary;
  onBackToSetup: () => void;
}) {
  const candidates = [
    {
      name: "Alex Morgan",
      location: "Dallas, TX",
      score: fitScore,
      trust: trustScore,
      trustLabel: proctoringSummary?.riskLevel === "high" ? "Review Needed" : "Verified",
      tags: plan?.job.skills.slice(0, 3) ?? ["React", "Node.js", "System Design"],
      note: evaluation
        ? `${evaluation.summary} Visual signal: ${visualSummary.dominantExpression.replace("-", " ")}.`
        : "Awaiting final candidate evaluation.",
      selected: true
    },
    {
      name: "Elena Rodriguez",
      location: "San Francisco, CA",
      score: 94,
      trust: 98,
      trustLabel: "Verified",
      tags: ["Architecture", "React", "Leadership"],
      note: "Strong communication and zero proctoring incidents.",
      selected: false
    },
    {
      name: "Julian Vance",
      location: "London, UK",
      score: 88,
      trust: 72,
      trustLabel: "Review Needed",
      tags: ["Systems", "TypeScript", "Motion"],
      note: "Brief browser tab switching detected during assessment.",
      selected: false
    }
  ];

  return (
    <section className="page dashboardPage">
      <div className="dashboardHeader">
        <div>
          <p className="breadcrumb">Talent Pool / {plan?.job.title ?? "Full Stack AI Engineer"}</p>
          <h1>Candidate comparison</h1>
          <p>Review fit, trust, skill evidence, and AI-generated observations in one recruiter workspace.</p>
        </div>
        <div className="dashboardActions">
          <button className="secondaryAction" type="button">
            Filter
          </button>
          <button className="primaryAction" onClick={onBackToSetup} type="button">
            New interview
          </button>
        </div>
      </div>

      <div className="candidateGrid">
        {candidates.map((candidate) => (
          <article className={candidate.selected ? "candidateCard selected" : "candidateCard"} key={candidate.name}>
            <div className="candidateTop">
              <div className="candidateIdentity">
                <span className="candidateAvatar">{initials(candidate.name)}</span>
                <div>
                  <h3>{candidate.name}</h3>
                  <p>{candidate.location}</p>
                </div>
              </div>
              <div className="fitScore">
                <strong>{candidate.score}</strong>
                <span>/100</span>
              </div>
            </div>

            <div className="skillRail">
              {candidate.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>

            <div className="trustBox">
              <div>
                <span>Trust score</span>
                <strong className={candidate.trust < 80 ? "amberText" : "greenText"}>{candidate.trustLabel}</strong>
              </div>
              <div className="trustTrack">
                <span style={{ width: `${candidate.trust}%` }} />
              </div>
              <p>{candidate.note}</p>
            </div>

            <button className={candidate.selected ? "primaryAction" : "secondaryAction"} type="button">
              View report
            </button>
          </article>
        ))}
      </div>

      <section className="comparisonTable">
        <h2>Comparative analysis</h2>
        <div className="tableShell">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Fit score</th>
                <th>Trust level</th>
                <th>Skill match</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.name}>
                  <td>
                    <span className="miniAvatar">{initials(candidate.name)}</span>
                    {candidate.name}
                  </td>
                  <td>{candidate.score}</td>
                  <td>
                    <span className={candidate.trust < 80 ? "tableBadge amber" : "tableBadge green"}>
                      {candidate.trustLabel}
                    </span>
                  </td>
                  <td>
                    <div className="matchCell">
                      <strong>{Math.min(99, candidate.score + 3)}%</strong>
                      <span>
                        <i style={{ width: `${Math.min(99, candidate.score + 3)}%` }} />
                      </span>
                    </div>
                  </td>
                  <td>
                    <button className="textButton" type="button">
                      Shortlist
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="finalReportGrid">
        <article className="finalReportCard">
          <p className="eyebrow">Live interview transcript</p>
          <h2>Spoken answer record</h2>
          <p>{transcript || "No spoken transcript captured yet. Run the live interview and start listening first."}</p>
        </article>

        <article className="finalReportCard">
          <p className="eyebrow">Facial signal report</p>
          <h2>{visualSummary.dominantExpression.replace("-", " ")} presence</h2>
          <SignalRow label="Visibility" value={visualSummary.visibilityScore} />
          <SignalRow label="Lighting" value={visualSummary.lightingScore} />
          <SignalRow label="Expression energy" value={visualSummary.expressionEnergy} />
          <ul>
            {visualSummary.observations.map((observation) => (
              <li key={observation}>{observation}</li>
            ))}
          </ul>
        </article>

        <article className="finalReportCard">
          <p className="eyebrow">Evaluation note</p>
          <h2>Responsible use</h2>
          <p>
            The report combines spoken content, communication structure, proctoring events, and camera-derived
            visibility/expression-energy signals. Facial signals are contextual and should not be used as the sole
            hiring decision factor.
          </p>
        </article>
      </section>
    </section>
  );
}

function SignalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="signalRow">
      <span>{label}</span>
      <strong>{value}%</strong>
      <i>
        <b style={{ width: `${value}%` }} />
      </i>
    </div>
  );
}

function buildFacialSignalSample(
  frame: Uint8ClampedArray,
  previousFrame: Uint8ClampedArray | null
): FacialSignalSample {
  let luminanceTotal = 0;
  let motionTotal = 0;
  let contrastTotal = 0;
  const pixelCount = frame.length / 4;

  for (let index = 0; index < frame.length; index += 4) {
    const luminance = frame[index] * 0.2126 + frame[index + 1] * 0.7152 + frame[index + 2] * 0.0722;
    luminanceTotal += luminance;
    contrastTotal += Math.abs(luminance - 128);

    if (previousFrame) {
      const previousLuminance =
        previousFrame[index] * 0.2126 + previousFrame[index + 1] * 0.7152 + previousFrame[index + 2] * 0.0722;
      motionTotal += Math.abs(luminance - previousLuminance);
    }
  }

  const averageLuminance = luminanceTotal / pixelCount;
  const averageMotion = previousFrame ? motionTotal / pixelCount : 0;
  const averageContrast = contrastTotal / pixelCount;
  const lightingScore = clampScore(Math.round(100 - Math.abs(averageLuminance - 135) * 0.65), 0, 100);
  const visibilityScore = clampScore(Math.round(lightingScore * 0.62 + Math.min(100, averageContrast * 1.9) * 0.38), 0, 100);
  const expressionEnergy = clampScore(Math.round(averageMotion * 4.8), 0, 100);

  return {
    occurredAt: new Date().toISOString(),
    visibilityScore,
    lightingScore,
    expressionEnergy,
    expressionLabel: classifyExpressionSignal(visibilityScore, expressionEnergy)
  };
}

function summarizeFacialSignals(samples: FacialSignalSample[]): FacialSignalSummary {
  if (!samples.length) {
    return {
      sampleCount: 0,
      visibilityScore: 85,
      lightingScore: 85,
      expressionEnergy: 50,
      dominantExpression: "engaged",
      sessionQualityScore: 88,
      observations: [
        "Camera analysis has not started yet. The report will update after the live interview begins."
      ]
    };
  }

  const recentSamples = samples.slice(-45);
  const visibilityScore = averageScore(recentSamples.map((sample) => sample.visibilityScore));
  const lightingScore = averageScore(recentSamples.map((sample) => sample.lightingScore));
  const expressionEnergy = averageScore(recentSamples.map((sample) => sample.expressionEnergy));
  const dominantExpression = mostFrequent(recentSamples.map((sample) => sample.expressionLabel));
  const sessionQualityScore = clampScore(
    Math.round(visibilityScore * 0.48 + lightingScore * 0.28 + expressionEnergyBalance(expressionEnergy) * 0.24),
    0,
    100
  );
  const observations = [
    `Dominant visual signal is ${dominantExpression.replace("-", " ")} with ${expressionEnergy}% expression energy.`,
    visibilityScore < 55
      ? "Face/presence visibility appears weak; review camera angle or lighting before relying on visual signals."
      : "Candidate presence remained visible enough for contextual review.",
    lightingScore < 55
      ? "Lighting quality is low, so facial signal confidence should be treated carefully."
      : "Lighting quality is acceptable for a basic browser-native signal."
  ];

  return {
    sampleCount: recentSamples.length,
    visibilityScore,
    lightingScore,
    expressionEnergy,
    dominantExpression,
    sessionQualityScore,
    observations
  };
}

function enhanceEvaluationWithLiveSignals(
  evaluation: AnswerEvaluation,
  visualSummary: FacialSignalSummary
): AnswerEvaluation {
  const strengths = [...evaluation.strengths];
  const concerns = [...evaluation.concerns];

  if (visualSummary.visibilityScore >= 70) {
    strengths.push("Camera presence remained clear enough to support live-interview review.");
  } else {
    concerns.push("Camera visibility was weak, so visual communication signals should be reviewed manually.");
  }

  if (visualSummary.expressionEnergy >= 35 && visualSummary.expressionEnergy <= 82) {
    strengths.push("Facial/expression energy suggests active engagement during the spoken response.");
  } else if (visualSummary.expressionEnergy < 20) {
    concerns.push("Low expression-energy signal; this may be caused by camera angle, lighting, or a naturally calm style.");
  }

  return {
    ...evaluation,
    strengths,
    concerns,
    summary: `${evaluation.summary} Live visual context: ${visualSummary.dominantExpression.replace("-", " ")} presence.`
  };
}

function buildInterviewerResponse(evaluation: AnswerEvaluation, question: InterviewQuestion) {
  if (evaluation.overallScore >= 8) {
    return `Thank you. That was a strong ${question.round.replace("_", " ")} response. I captured the answer and visual communication signals for the final report.`;
  }

  if (evaluation.overallScore >= 6) {
    return `Thank you. I captured your answer. I would like one follow-up: ${question.followUps[0]}`;
  }

  return `Thank you. I need more detail to evaluate this fairly. ${question.followUps[0]}`;
}

function classifyExpressionSignal(
  visibilityScore: number,
  expressionEnergy: number
): FacialSignalSample["expressionLabel"] {
  if (visibilityScore < 35) {
    return "low-visibility";
  }

  if (expressionEnergy > 70) {
    return "animated";
  }

  if (expressionEnergy > 24) {
    return "engaged";
  }

  return "calm";
}

function expressionEnergyBalance(value: number) {
  return clampScore(100 - Math.abs(value - 52), 0, 100);
}

function averageScore(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return clampScore(Math.round(values.reduce((total, value) => total + value, 0) / values.length), 0, 100);
}

function mostFrequent<T extends string>(values: T[]) {
  const counts = values.reduce<Record<string, number>>((total, value) => {
    total[value] = (total[value] ?? 0) + 1;
    return total;
  }, {});

  return values.reduce((highest, value) => (counts[value] > counts[highest] ? value : highest), values[0]);
}

function ScoreGrid({ evaluation }: { evaluation: AnswerEvaluation }) {
  return (
    <div className="scoreGrid">
      <Metric label="Knowledge" value={evaluation.knowledgeScore} />
      <Metric label="Communication" value={evaluation.communicationScore} />
      <Metric label="Problem solving" value={evaluation.problemSolvingScore} />
      <Metric label="Confidence" value={evaluation.confidenceScore} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}/10</strong>
    </div>
  );
}

function roundTitle(question: InterviewQuestion) {
  if (question.round === "coding") {
    return "Technical round: coding";
  }

  return question.round.replace("_", " ");
}

function trustScoreFromRisk(risk: RiskLevel) {
  if (risk === "high") {
    return 62;
  }

  if (risk === "medium") {
    return 78;
  }

  return 96;
}

function clampScore(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
