# AI Interview Platform MVP

Cross-platform MVP for an AI-powered interview product with web, Android, iPhone, backend API, and shared interview logic.

## What is built

- Standalone Luminary Talent web app in `apps/web`
- Android/iPhone Expo app in `apps/mobile`
- Fastify API in `apps/api`
- Shared TypeScript interview engine in `packages/shared`
- JD-based question generation
- Candidate answer scoring
- Landing page, recruiter setup, onboarding/consent, focused interview room, coding workspace, and candidate comparison dashboard
- Local "Onboard AI" interview flow that works without the backend
- Live camera and microphone interview room
- AI interviewer speaks questions with browser text-to-speech
- Candidate answers are captured through browser speech recognition instead of typed answers
- Browser-native visual signal sampling for camera visibility, lighting, and expression-energy context
- Basic web proctoring signals for tab blur, copy, paste, and fullscreen exit
- Mobile-first interview flow with local fallback if the API is not reachable

## Project structure

```text
apps/
  api/      Fastify backend
  web/      Vite React web app
  mobile/   Expo React Native app
packages/
  shared/   Types, schemas, scoring, proctoring helpers
```

## Run locally

Install dependencies:

```bash
npm install
```

Start the API:

```bash
npm run dev:api
```

Start the web app:

```bash
npm run dev:web
```

The web app is standalone by default. It generates questions, speaks prompts with the browser speech engine, listens to candidate answers through browser speech recognition, samples camera-based visual context, scores answers, and creates recruiter reports locally through `packages/shared`.

Live voice capture works best in Chrome or Edge on `localhost` because browser speech recognition support varies. Camera/microphone permissions are required for the live interview room.

Short job descriptions are supported. For example, a title like `Power BI Analyst` with `We are hiring a Power BI Developer` will still generate Power BI, DAX, Power Query, data modeling, and dashboarding interview questions.

Start the mobile app:

```bash
npm run dev:mobile
```

You can also run all three together:

```bash
npm run dev
```

## Environment

The API defaults to port `4000`.

For web, use:

```bash
VITE_API_URL=http://localhost:4000
```

For mobile, use:

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000
```

For Android emulator, use this instead:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

## MVP roadmap

1. Replace mock scoring with a real LLM provider in the API.
2. Add authentication for recruiters and candidates.
3. Persist interviews, answers, reports, and proctoring events in PostgreSQL.
4. Add a coding round editor on web.
5. Add recording/storage for interview sessions.
6. Harden proctoring with consent screens and privacy controls.
