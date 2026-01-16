# Diagramas de Arquitectura - GitTeach

## 🏛️ **Arquitectura General del Sistema**

```mermaid
graph TB
    subgraph "Electron Application"
        subgraph "Main Process"
            MP[Main Process<br/>index.js]
            FW[Firewall Service<br/>🔥 Network Monitor]
            AM[AI Monitor Service<br/>🤖 Health Check]
            AH[Auth Handler<br/>🔐 OAuth Flow]
            CH[Cache Handler<br/>💾 Persistence]
            DH[Data Handler<br/>📡 GitHub API]
        end

        subgraph "Renderer Process"
            RP[Renderer Process<br/>index.js]
            AO[App Orchestrator<br/>🎭 View Management]
            SM[Session Manager<br/>🔑 Auth State]

            subgraph "AI Brain (services/)"
                AIR[Intent Router<br/>🧠 Decision Engine]
                AIS[AI Service<br/>🤖 LFM 2.5 Client]
                PA[Profile Analyzer<br/>📊 Analysis Pipeline]
                TR[Tool Registry<br/>🛠️ Command System]
            end

            subgraph "Analysis Pipeline"
                CS[Code Scanner<br/>🔍 Repository Analysis]
                WP[AI Worker Pool<br/>⚡ Parallel Processing]
                DC[Deep Curator<br/>🧬 Insight Synthesis]
                IS[Intelligence Synthesizer<br/>🧑‍🔬 Profile Creation]
            end

            subgraph "Memory System (RAG)"
                MM[Memory Manager<br/>🗃️ Vector Store]
                MA[Memory Agent<br/>🔎 Semantic Search]
                MC[Memory Curator<br/>📚 Context Injection]
            end

            subgraph "UI Layer"
                CV[Chat View<br/>💬 Conversation]
                DV[Dashboard View<br/>📊 Analytics]
                AV[Auth View<br/>🚪 Login/Logout]
            end
        end
    end

    subgraph "External Services"
        GH[GitHub API<br/>📚 Repository Data]
        LFM[LFM 2.5 Server<br/>🧠 Local AI Model]
        NOMIC[Nomic Embed<br/>🔢 Vector Generation]
    end

    %% Connections
    MP --> FW
    MP --> AM
    MP --> AH
    MP --> CH
    MP --> DH

    RP --> AO
    RP --> SM
    AO --> CV
    AO --> DV
    AO --> AV

    SM --> AH
    CV --> AIR
    AIR --> AIS
    AIR --> TR
    TR --> PA

    PA --> CS
    PA --> WP
    PA --> DC
    PA --> IS

    DC --> MM
    IS --> MM
    AIS --> MM

    MM --> MA
    MA --> MC

    CS --> GH
    AIS --> LFM
    AIS --> NOMIC

    style MP fill:#e1f5fe
    style RP fill:#f3e5f5
    style GH fill:#e8f5e8
    style LFM fill:#fff3e0
```

## 🔄 **Flujo de Análisis de Perfil**

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as UI Layer
    participant PA as ProfileAnalyzer
    participant CS as CodeScanner
    participant WP as AIWorkerPool
    participant DC as DeepCurator
    participant IS as IntelligenceSynthesizer
    participant MM as MemoryManager

    U->>UI: Solicitar análisis de perfil
    UI->>PA: analyze(username)

    PA->>CS: scan(username, repos)
    CS->>CS: getRepoTree() + identifyAnchorFiles()
    CS->>WP: enqueueBatch(files)
    WP->>WP: processAll() - Parallel AI processing

    PA->>DC: runDeepCurator()
    DC->>DC: curateInsights() + thematicMapping()
    DC->>MM: persistRepoMemory()

    PA->>IS: synthesizeProfile()
    IS->>IS: DNA synthesis + profile creation
    IS->>MM: saveTechnicalIdentity()

    PA->>UI: results
    UI->>U: Perfil técnico completo
```

## 🧠 **Sistema de IA: Thinking RAG Architecture**

```mermaid
graph TD
    subgraph "Thinking Engine"
        IR[Intent Router<br/>🧠 Parse & Route]
        SEH[System Event Handler<br/>⚡ Special Events]
        PCB[Parameter Constructor<br/>🔧 Tool Params]
        CPB[Chat Prompt Builder<br/>💬 Conversational AI]
    end

    subgraph "Tool System"
        TR[Tool Registry<br/>📋 Available Tools]
        TE[Tool Executor<br/>⚙️ Command Runner]
        RP[Response Processor<br/>📝 Result Formatting]
    end

    subgraph "Memory System (RAG)"
        VS[Vector Store<br/>🔢 Embeddings DB]
        SS[Semantic Search<br/>🔎 Similarity Match]
        CI[Context Injector<br/>📚 Prompt Enhancement]
    end

    subgraph "AI Model"
        LFM[LFM 2.5<br/>🧠 Local Model]
        NE[Nomic Embed<br/>🔢 Text → Vectors]
    end

    %% Flow
    Input[User Input] --> IR
    IR --> SEH
    IR --> PCB
    PCB --> TR
    TR --> TE
    TE --> RP

    RP --> CPB
    CPB --> CI
    CI --> VS
    VS --> SS
    SS --> CI

    CI --> LFM
    LFM --> Response[AI Response]

    Input --> NE
    NE --> VS

    style IR fill:#bbdefb
    style TR fill:#c8e6c9
    style VS fill:#ffcdd2
    style LFM fill:#fff3e0
```

## 📊 **Pipeline de Análisis de Código**

```mermaid
graph TD
    subgraph "Fase 1: Scanning"
        RT[Repository Tree<br/>🌳 File Structure]
        AF[Anchor Files<br/>🎯 Architecture Files]
        PF[Pending Files<br/>📄 Background Files]
    end

    subgraph "Fase 2: Processing"
        QUEUE[Worker Queue<br/>📋 File Queue]
        AIW[AI Workers<br/>⚡ Parallel Processing]
        CACHE[Cache Layer<br/>💾 Smart Cache]
    end

    subgraph "Fase 3: Curation"
        RAW[Raw Insights<br/>📝 AI Summaries]
        DEDUP[Deduplication<br/>🔄 Remove Duplicates]
        WEIGHT[Weighting<br/>⚖️ Importance Scoring]
        STRUCTURE[Structure<br/>🏗️ Organize by Domain]
    end

    subgraph "Fase 4: Synthesis"
        DNA[DNA Synthesis<br/>🧬 Technical DNA]
        PROFILE[Profile Creation<br/>🧑‍🔬 Developer Profile]
        MEMORY[Memory Injection<br/>💭 Context for Chat]
    end

    RT --> AF
    RT --> PF
    AF --> QUEUE
    PF --> QUEUE
    QUEUE --> AIW
    AIW --> CACHE
    CACHE --> RAW

    RAW --> DEDUP
    DEDUP --> WEIGHT
    WEIGHT --> STRUCTURE
    STRUCTURE --> DNA
    DNA --> PROFILE
    PROFILE --> MEMORY

    style RT fill:#e3f2fd
    style QUEUE fill:#f3e5f5
    style RAW fill:#e8f5e8
    style DNA fill:#fff3e0
```

## 🔐 **Arquitectura de Seguridad**

```mermaid
graph TD
    subgraph "Security Layers"
        FW[Firewall Service<br/>🔥 Network Monitor]
        IPC[IPC Validation<br/>✅ Message Validation]
        TOKEN[Token Security<br/>🔐 Secure Storage]
        ISOLATION[Process Isolation<br/>🚧 Main ↔ Renderer]
    end

    subgraph "Data Flow"
        IN[User Input] --> VAL[Validation]
        VAL --> IPC
        IPC --> MAIN[Main Process]
        MAIN --> FW
        FW --> API[GitHub API]
    end

    subgraph "Storage Security"
        TOKENS[OAuth Tokens] --> ENC[Encrypted Storage]
        CACHE[Cache Data] --> USERDATA[User Data Dir]
        LOGS[Audit Logs] --> SECURE[Secure Location]
    end

    FW --> API
    TOKEN --> ENC
    ISOLATION --> MAIN

    style FW fill:#ffebee
    style TOKEN fill:#e8f5e8
    style ISOLATION fill:#e3f2fd
```

## 📈 **Métricas de Rendimiento**

```mermaid
gantt
    title Performance Timeline
    dateFormat HH:mm
    axisFormat %H:%M

    section App Startup
    Main Process Init    :done, m1, 00:00, 00:30
    Renderer Load       :done, m2, 00:30, 01:00
    AI Server Health    :done, m3, 01:00, 01:30

    section Profile Analysis
    Repository Scan     :done, p1, 02:00, 05:00
    AI Processing       :done, p2, 05:00, 15:00
    Deep Curation       :done, p3, 15:00, 18:00
    Profile Synthesis   :done, p4, 18:00, 20:00

    section Memory Operations
    Vector Storage      :done, mem1, 20:00, 21:00
    Context Injection   :done, mem2, 21:00, 22:00
    RAG Ready          :done, mem3, 22:00, 23:00
```

## 🏗️ **Evolución Arquitectónica**

```mermaid
timeline
    title GitTeach Architecture Evolution
    2024-Q4 : Conceptualización<br>• Idea inicial<br>• Prototipo básico
    2025-Q1 : MVP Development<br>• Electron setup<br>• GitHub OAuth<br>• Basic UI
    2025-Q2 : AI Integration<br>• LFM 2.5 integration<br>• Basic analysis<br>• Simple caching
    2025-Q3 : Advanced Features<br>• Thinking RAG<br>• Parallel processing<br>• Deep curation
    2025-Q4 : Production Ready<br>• SOLID refactoring<br>• Comprehensive testing<br>• Documentation
    2026-Q1 : Scale & Extend<br>• Microservices<br>• API endpoints<br>• Multi-tenancy
```

## 🎯 **Decisiones Arquitectónicas Clave**

| Decisión | Razón | Alternativa Considerada |
|----------|--------|------------------------|
| **Electron** | Desktop app con web technologies | React Native, Tauri |
| **Local AI** | Privacidad total, sin APIs externas | OpenAI API, Anthropic |
| **ESM Modules** | Modern JavaScript, tree shaking | CommonJS, bundlers |
| **SOLID Principles** | Mantenibilidad a largo plazo | Quick & dirty approach |
| **Vector RAG** | Contexto semántico inteligente | Keyword search, rule-based |
| **Process Separation** | Seguridad y estabilidad | Single process (menos seguro) |

## 📋 **Límites del Sistema**

```mermaid
graph TD
    subgraph "Current Limits"
        REPOS[Max 500 repos<br/>por análisis]
        FILES[Max 50,000 archivos<br/>en cola]
        MEMORY[150MB RAM<br/>con modelos cargados]
        TIMEOUT[180s timeout<br/>por llamada AI]
    end

    subgraph "Scaling Considerations"
        HORIZONTAL[Horizontal Scaling<br/>🚀 Múltiples instancias]
        VERTICAL[Vertical Scaling<br/>💪 Más RAM/GPU]
        CACHING[Cache Optimization<br/>⚡ Redis/external DB]
        MICROSERVICES[Microservices Split<br/>🔧 AI independiente]
    end

    REPOS --> HORIZONTAL
    FILES --> VERTICAL
    MEMORY --> MICROSERVICES
    TIMEOUT --> CACHING
