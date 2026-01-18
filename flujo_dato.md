# Flujo de Datos - GitTeach Pipeline

> Última actualización: 2026-01-18

## 🔄 Flujo Principal

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          WORKER (GPU:8000)                                 │
│                                                                            │
│  Analiza archivo y genera:                                                 │
│  finding = {                                                               │
│      summary: "Descripción textual del archivo...",         ← TEXTO       │
│      metadata: { patterns, complexity, signals... },        ← DATOS       │
│      params: { insight: "..." },                             ← EXTRA       │
│      file_meta: { path, sha, size }                          ← INFO        │
│  }                                                                         │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ StreamingHandler    │  │ RepoContextManager  │  │ MemoryManager       │
│ .accumulatedFindings│  │ .recentFindings[]   │  │ .storeFinding()     │
│                     │  │                     │  │                     │
│ Acumula findings    │  │ Buffer para         │  │ Persiste en grafo   │
│ para mappers        │  │ compaction          │  │ de memoria          │
└──────────┬──────────┘  └──────────┬──────────┘  └─────────────────────┘
           │                        │
           │                        │ Cada 10 archivos
           │                        ▼
           │             ┌─────────────────────┐
           │             │ runCompaction (CPU) │
           │             ├─────────────────────┤
           │             │ Genera:             │
           │             │ - synthesis (texto) │
           │             │ - coherence_score   │
           │             │ - health_indicators │
           │             │ - dominant_patterns │
           │             │ - tech_stack_signals│
           │             └──────────┬──────────┘
           │                        │
           │                        ▼
           │             ┌─────────────────────┐
           │             │ goldenKnowledge     │
           │             │ (curated per repo)  │
           │             │                     │
           │             │ Persiste en:        │
           │             │ golden_knowledge.json│
           │             └──────────┬──────────┘
           │                        │
           └────────────┬───────────┘
                        ▼
         ┌──────────────────────────────────────┐
         │         FLUJO SUMMARY (CPU:8002)     │
         ├──────────────────────────────────────┤
         │                                      │
         │  1. synthesizeBlueprint() busca      │
         │     goldenKnowledge curado           │
         │                                      │
         │  2. ThematicMapper.executeMapping()  │
         │     recibe 1 párrafo curado          │
         │     (no 50 summaries crudos)         │
         │                                      │
         │  3. Mappers paralelos:               │
         │     ├─ ArchitectureMapper            │
         │     ├─ HabitsMapper                  │
         │     └─ StackMapper                   │
         │                                      │
         │  4. Resultado: thematicAnalysis{}    │
         │                                      │
         └──────────────┬───────────────────────┘
                        │
         ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                        │  EN PARALELO
         ─ ─ ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                        │
         ┌──────────────────────────────────────┐
         │         FLUJO METADATA               │
         ├──────────────────────────────────────┤
         │                                      │
         │  1. MetricRefinery.refine()          │
         │     procesa finding.metadata         │
         │                                      │
         │  2. MetricAggregators suman          │
         │     valores por repo/global          │
         │                                      │
         │  3. Genera healthReport:             │
         │     - logic_health                   │
         │     - knowledge_health               │
         │     - seniority_signals              │
         │                                      │
         └──────────────┬───────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │          REUNIÓN FINAL               │
         │       DNASynthesizer (CPU)           │
         ├──────────────────────────────────────┤
         │                                      │
         │  Recibe:                             │
         │  - thematicAnalyses[] (de summaries) │
         │  - healthReport (de metadata)        │
         │  - compactionMetrics (bonus)         │
         │                                      │
         │  Genera DNA:                         │
         │  {                                   │
         │    bio: "...",                       │
         │    traits: [{ name, score }],        │
         │    code_health: {...},               │
         │    verdict: "..."                    │
         │  }                                   │
         │                                      │
         └──────────────┬───────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │     IntelligenceSynthesizer          │
         │       (Personalidad Final)           │
         ├──────────────────────────────────────┤
         │                                      │
         │  Evoluciona DNA → Identidad:         │
         │  - title                             │
         │  - bio                               │
         │  - core_languages                    │
         │  - domain                            │
         │  - evolution_snapshot                │
         │                                      │
         └──────────────┬───────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────────┐
         │         PERSISTENCIA                 │
         ├──────────────────────────────────────┤
         │                                      │
         │  mock_persistence/                   │
         │  ├── repos/                          │
         │  │   └── [RepoName]/                 │
         │  │       ├── raw_findings.jsonl      │
         │  │       ├── curated_memory.json     │
         │  │       ├── golden_knowledge.json   │ ← NUEVO
         │  │       ├── blueprint.json          │
         │  │       └── partitions.json         │
         │  ├── mappers/                        │
         │  │   ├── inputs/                     │
         │  │   ├── outputs/                    │
         │  │   └── history/                    │
         │  ├── context_user.json               │
         │  └── technical_identity.json         │
         │                                      │
         └──────────────────────────────────────┘
```

## 📊 Flujo de Métricas

| Origen | Métrica | Destino |
|--------|---------|---------|
| Worker.metadata | complexity, patterns, signals | MetricRefinery → healthReport |
| Worker.summary | texto descriptivo | GoldenKnowledge → Mappers |
| Compaction | coherence_score, health_indicators | Blueprint.compactionMetrics |
| Mappers | architecture, habits, stack | GlobalIdentityRefiner |
| DNASynthesizer | traits, bio, verdict | Identidad final |

## ⏱️ Eventos de Streaming

| Evento | Cuándo | Acción |
|--------|--------|--------|
| `onFileProcessed` | Cada archivo | Actualiza progreso |
| `onRepoBatchReady` | Cada 3 archivos | processStreamingRepo (partial) |
| `onRepoComplete` | Repo terminado | processStreamingRepo (final) |
| Compaction | Cada 10 archivos | runCompaction → goldenKnowledge |
| Gatekeeper | 1 rico o 2 decentes | updateGlobalIdentity |

## 🔧 Servidores

| Puerto | Función | Componentes |
|--------|---------|-------------|
| 8000 | GPU (Workers) | AIWorkerPool, Chat |
| 8001 | Embeddings | RAG, Semantic Search |
| 8002 | CPU (Heavy) | Mappers, Compaction, DNASynth, Evolution |
