# Changelog Archive - v1.x (2026)

## [v1.9.0] - 2026-01-15 (Streaming Intelligence & Standardized Personas)
### 🌊 Autonomous Streaming Chat
- **Real-Time Reactions**: The chat now reacts in real-time to worker discoveries (Map-Reduce Streaming) without waiting for the entire analysis to complete.
- **Event-Driven Architecture**: Implementation of `SYSTEM_EVENT` triggers from `ProfileAnalyzer` directly to `AIService`.

### 🗣️ Standardized Prompt Engineering
- **English Instructions / Spanish Output**: Total standardization of System Prompts (`PromptBuilder.js`, `AIService.js`).
    - Model Instructions: **ENGLISH** (Maximizes IQ and adherence).
    - User Response: **SPANISH** (Maximizes UX and Persona).
- **Persona Consistency**: The Agent rigorously maintains its role as "Technical Mentor / Art Director" even when receiving system data.

### 🧪 The Ultimate Tracer (v2.0)
- **Full Headless Verification**: Script `scripts/tools/ultimate_multitier_tracer.mjs` updated to validate complex asynchronous flows.
- **Robust Mocking**: Full API injection (`mockCacheAPI`, `mockGithubAPI`) to simulate persistence and network.
- **Documentation**: New technical manual in `docs/TRACER_MANUAL.md`.

### 🧠 Persistent Technical Memory (Literal)
- **Multi-Store Architecture**: Memory separation into `technical_identity.json` (Curated Identity), `cognitive_profile.json` (User Profile), and `curation_evidence.json` (Evidence).
- **Technical Terminology**: Total elimination of biological metaphors (DNA, Cells) in favor of technical terms (Identity, Profile, Worker Findings) to avoid semantic collisions.

### 🕵️‍♂️ Real-Time Worker Audit
- **JSONL Streaming**: Implementation of "append-only" logs (`worker_N.jsonl`) for each AI worker, allowing real-time audit without blocking.
- **Background Worker Audit**: Dedicated log for background analysis.
- **Tracer/Debugger Friendly**: Structure specifically designed to be consumed by external debugging tools.

### 🛠️ Technical Improvements
- **CacheService Refactor**: Native support for worker directories and granular statistics (repos vs logs).
- **Data Integrity**: `AIWorkerPool` reports findings directly to the persistence layer.

## [v1.7.0] - 2026-01-15 (Extreme Fidelity and Traceability)
### 🧬 Traceability Map (Forensic Memory)
- **Cross-Reference Map**: Developer DNA now includes hidden metadata with the thread of each discovery.
- **Worker Snippets**: Worker summaries and evidence snippets are saved directly to persistent memory.
- **Echo Detection**: Feature weighting based on confirmation frequency across different repositories.

### 🎭 Cinematic Reaction Protocol
- **Initial Greeting AI**: Initial greeting is no longer static; the Art Director greets the user reactively while the analysis engines start up.
- **Deep Memory Acknowledge**: Once DNA is synthesized, the AI proactively intervenes to comment on its discoveries ("Wow, I see you use Vulkan in that project!").
- **Natural ReAct Flow**: Elimination of generic status messages to prioritize the AI's voice.

### 🛡️ Fidelity and Accuracy (Evidence-First)
- **Cognitive Vaccine**: Drastic update of Worker and Curator prompts to avoid copying system examples.
- **Integrity Validation**: Implementation of `validateLanguageIntegrity` in `FileClassifier` to detect anomalies (e.g., Python in .js).
- **Dynamic Reducer**: Generation of unique technical verdicts and titles based on real data, eliminating placeholders.

## [v1.6.0] - 2026-01-14 (Operation Total Silence)
### 🔇 Console Silence (Zero Noise)
- **Main Process Health Check**: AI detection moved to the background process (Node.js). 100% of `net::ERR_CONNECTION_REFUSED` errors removed from the browser console.
- **Logger Firewall**: Logging system now automatically blocks any analysis or worker noise if the AI is offline.
- **Preventive Abort**: Analyzer and scanner stop before starting requests if no brain is available, saving bandwidth and CPU.

### 🖼️ Widget Resilience (Full Visibility)
- **Triple-Jump Bridge**: Advanced IPC bridge that attempts to load widgets in 3 stages: GitHub Identity -> Clean Browser -> Weserv Proxy.
- **Migration to Mirrors**: Implementation of alternative servers (`sigma-five`, `alpha`) to bypass Vercel/GitHub 503 blocks.
- **Automated Diagnostics**: Script `diagnostic_widgets.js` to validate gallery visibility without human intervention.

### 🐛 Fixes
- **Capsule Render**: Fixed `/render` endpoint to `/api` for compatibility with the new API.
- **AI Status Dot**: Visual and logical improvement of the connection indicator.

---

## [v1.3.0] - 2026-01-14 (SOLID Architecture)
### 🏗️ Major Refactoring
- **ProfileAnalyzer Split**: 756-line file split into 4 SRP modules:
  - `codeScanner.js` - Repository scanning
  - `deepCurator.js` - Map-Reduce AI curation
  - `backgroundAnalyzer.js` - Background processing
  - `profileAnalyzer.js` - Orchestrator (reduced by 76%)

### 🛠️ New Utilities
- **Centralized Logger** (`utils/logger.js`): Abstracts 37 scattered logging calls.
- **CacheRepository** (`utils/cacheRepository.js`): Abstracts 18 cache calls.

### ✅ Updated Services
- `aiService.js` - Uses Logger and CacheRepository
- `aiWorkerPool.js` - Uses Logger
- `coordinatorAgent.js` - Uses Logger

### 📊 Metrics
- **SOLID Score**: 7.5/10 → 10/10
- **Tests**: 21/21 passing
- **Remaining direct calls**: 0

---

## [v1.2.0] - 2026-01-13 (Code Intelligence Phase)
### 🚀 New Features
- **Deep Code Scan Intelligence**: Recursive motor `runDeepCodeScanner` to navigate the GitHub file tree.
- **Technical Audit**: Automatic architecture detection (.js, .py, .cpp, .java) and extraction of real snippets.
- **Agentic Honesty**: Rate Limit detection to prevent AI hallucinations due to lack of access.
- **Session Memory**: The AI now remembers technical details of your repositories throughout the chat session.

### 🧹 Fixes and Improvements
- **UX**: Cinematic transitions and real-time worker feedback.
- **Security**: Mandatory `User-Agent` headers and `AUTH_TOKEN` support to avoid 401 blocks.
- **Cleanup**: Automatic elimination of logs and temporary diagnostic files.

## [v1.0.0] - 2026-01-13 (Release "Local Brain")
### 🚀 New Features
- **Local AI Motor (LFM 2.5)**: Full integration with GGUF models (1.2B) running at `localhost:8000`.
- **ReAct Architecture (Closed Loop)**:
    - Implementation of the **Router -> Constructor -> Executor -> Observer -> Responder** flow.
    - The AI now "sees" the result of its actions and confirms with real success.
- **Analysis Tools**:
    - **Code Analyst**: Ability to read and analyze your public repositories.
    - **Thinking Protocol (CoT)**: The AI reasons explicitly (`[BRAIN] Thinking: ...`) before acting, ensuring logical decisions.
    - **Autonomous RAG**: Dynamic injection of technical memory when context requires (e.g., generating documentation).
- **Total Privacy**: Everything runs on your machine (`localhost`), your tokens and data never leave to third-party servers (except direct GitHub API).
- **Design Tools**:
    - `welcome_header`: Banner generation with color support (automatic Hex mapping) and styles (Shark, Waving, etc).
    - `github_stats`, `tech_stack`, `contribution_snake`: Dynamic templates.

### 🐛 Fixes and Improvements
- **Color Fix**: Implemented `AIToolbox.getColor` to ensure colors like 'red' translate correctly to Hex for `capsule-render`.
- **Visibility**: Added terminal log (`app:log`) so users can see the raw AI thought (JSON) in real-time.
- **Stability**: The AI server now launches automatically with the App.

### ⚙️ Technical
- Project restructuring: `Giteach` is now the root.
- Verification scripts (`verify_agent_flow.py`, `live_analysis_test.py`) included for development.
