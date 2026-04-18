import { useEffect, useState } from "react";
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

const defaultCode = `function findLongestSubarray(arr, k) {
  let left = 0;
  let currentSum = 0;
  let maxLength = 0;

  for (let right = 0; right < arr.length; right++) {
    currentSum += arr[right];

    while (currentSum > k) {
      currentSum -= arr[left];
      left++;
    }

    maxLength = Math.max(maxLength, right - left + 1);
  }

  return maxLength;
}`;

export function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [title, setTitle] = useState("Full Stack AI Engineer");
  const [company, setCompany] = useState("Luminary Talent");
  const [seniority, setSeniority] = useState<SeniorityLevel>("mid");
  const [description, setDescription] = useState(demoDescription);
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [codeDraft, setCodeDraft] = useState(defaultCode);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [proctoringEvents, setProctoringEvents] = useState<ProctoringEvent[]>([]);
  const [proctoringSummary, setProctoringSummary] = useState<ProctoringSummary | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [focusModeStarted, setFocusModeStarted] = useState(false);
  const [notice, setNotice] = useState("Standalone mode active. Luminary Onboard AI runs locally in this app.");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const activeQuestion = plan?.questions[activeQuestionIndex] ?? null;
  const activeAnswer = activeQuestion ? answers[activeQuestion.id] ?? "" : "";
  const canStartInterview = Boolean(plan && consentAccepted);
  const canEvaluate = Boolean(activeQuestion && activeAnswer.trim().length >= 20);
  const currentProgress = plan ? Math.round(((activeQuestionIndex + 1) / plan.questions.length) * 100) : 0;
  const fitScore = evaluation ? evaluation.overallScore * 10 : 86;
  const trustScore = proctoringSummary ? trustScoreFromRisk(proctoringSummary.riskLevel) : 96;

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
    setNotice("Interview generated locally by Luminary Onboard AI. Review consent before launching.");
    setScreen("onboarding");
  }

  async function startInterview() {
    if (!canStartInterview) {
      setNotice("Consent and a generated interview are required before starting.");
      return;
    }

    setFocusModeStarted(true);
    setScreen("interview");
    setNotice("Interview room started. Proctoring signals are being tracked locally for this session.");

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

    const mergedAnswer =
      activeQuestion.round === "coding"
        ? `${activeAnswer}\n\nCandidate code:\n${codeDraft}`
        : activeAnswer;

    const nextEvaluation = evaluateCandidateAnswer(activeQuestion, mergedAnswer);
    const nextProctoringSummary = summarizeProctoring(proctoringEvents);

    setEvaluation(nextEvaluation);
    setProctoringSummary(nextProctoringSummary);
    setNotice("Answer evaluated by the local Onboard AI model. Recruiter report is ready.");
  }

  function goToNextQuestion() {
    if (!plan) {
      return;
    }

    const nextIndex = Math.min(activeQuestionIndex + 1, plan.questions.length - 1);
    setActiveQuestionIndex(nextIndex);
    setEvaluation(null);
    speakQuestion(plan.questions[nextIndex]);
  }

  function updateActiveAnswer(value: string) {
    if (!activeQuestion) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [activeQuestion.id]: value
    }));
  }

  function speakQuestion(question: InterviewQuestion | null) {
    if (!question || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.prompt);
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
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
          canEvaluate={canEvaluate}
          codeDraft={codeDraft}
          evaluation={evaluation}
          isSpeaking={isSpeaking}
          plan={plan}
          proctoringEvents={proctoringEvents}
          progress={currentProgress}
          onCodeChange={setCodeDraft}
          onEvaluate={evaluateCurrentAnswer}
          onNext={goToNextQuestion}
          onSpeak={() => speakQuestion(activeQuestion)}
          onUpdateAnswer={updateActiveAnswer}
          onViewDashboard={() => setScreen("dashboard")}
        />
      ) : null}

      {screen === "dashboard" ? (
        <DashboardScreen
          evaluation={evaluation}
          fitScore={fitScore}
          plan={plan}
          proctoringSummary={proctoringSummary}
          trustScore={trustScore}
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
          Before the AI interview begins, review what the session captures. This consent flow is calm by design:
          transparent, explicit, and candidate-friendly.
        </p>
      </div>

      <div className="consentGrid">
        <article className="consentCard large">
          <div className="iconPair">
            <span>CAM</span>
            <span>MIC</span>
          </div>
          <h2>Visual and audio connection</h2>
          <p>Camera and microphone help capture responses naturally and create a fair record of the session.</p>
          <strong className="readyPill">Systems ready</strong>
        </article>

        <article className="consentCard">
          <span className="squareIcon">SCR</span>
          <h2>Workspace focus</h2>
          <p>Screen focus events help flag distractions, tab changes, and suspicious behavior during the interview.</p>
        </article>

        <article className="consentCard indigo">
          <h3>Privacy first</h3>
          <p>Interview data should be encrypted, access-limited, and automatically deleted after your retention window.</p>
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
            and screen-focus capture for this session.
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
  canEvaluate,
  codeDraft,
  evaluation,
  isSpeaking,
  plan,
  proctoringEvents,
  progress,
  onCodeChange,
  onEvaluate,
  onNext,
  onSpeak,
  onUpdateAnswer,
  onViewDashboard
}: {
  activeAnswer: string;
  activeQuestion: InterviewQuestion | null;
  activeQuestionIndex: number;
  canEvaluate: boolean;
  codeDraft: string;
  evaluation: AnswerEvaluation | null;
  isSpeaking: boolean;
  plan: InterviewPlan | null;
  proctoringEvents: ProctoringEvent[];
  progress: number;
  onCodeChange: (value: string) => void;
  onEvaluate: () => void;
  onNext: () => void;
  onSpeak: () => void;
  onUpdateAnswer: (value: string) => void;
  onViewDashboard: () => void;
}) {
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
          <div className="aiInterviewer">
            <div className="avatarRing">AI</div>
            <div>
              <span>{isSpeaking ? "Speaking" : "Luminary Onboard AI"}</span>
              <p>{activeQuestion.followUps[0]}</p>
            </div>
            <button className="secondaryAction compact" onClick={onSpeak} type="button">
              Replay
            </button>
          </div>

          <label>
            Candidate response
            <textarea
              className="answerInput"
              onChange={(event) => onUpdateAnswer(event.target.value)}
              placeholder="Explain your reasoning, tradeoffs, and validation approach..."
              rows={activeQuestion.round === "coding" ? 7 : 12}
              value={activeAnswer}
            />
          </label>

          {activeQuestion.round === "coding" ? (
            <div className="codeWorkspace">
              <div className="codeTopBar">
                <span>JavaScript</span>
                <strong>Console: Test passed, result = 4</strong>
              </div>
              <textarea
                aria-label="Coding editor"
                className="codeEditor"
                onChange={(event) => onCodeChange(event.target.value)}
                spellCheck={false}
                value={codeDraft}
              />
            </div>
          ) : null}

          <div className="interviewActions">
            <button className="secondaryAction" onClick={onNext} type="button">
              Next question
            </button>
            <button className="primaryAction" disabled={!canEvaluate} onClick={onEvaluate} type="button">
              Evaluate answer
            </button>
            <button className="secondaryAction" onClick={onViewDashboard} type="button">
              Recruiter dashboard
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
  trustScore,
  onBackToSetup
}: {
  evaluation: AnswerEvaluation | null;
  fitScore: number;
  plan: InterviewPlan | null;
  proctoringSummary: ProctoringSummary | null;
  trustScore: number;
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
      note: evaluation?.summary ?? "Awaiting final candidate evaluation.",
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
    </section>
  );
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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
