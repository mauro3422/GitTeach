(multi-agente):
┌──────────────────────────────────────────────────────────────┐
│  WORKER POOL (modelo chico, ej: phi-3-mini o similar)        │
│  ├── Worker 1: Lee file1.py → "Este archivo maneja auth..."  │
│  ├── Worker 2: Lee file2.js → "API REST con Express..."      │
│  ├── Worker 3: Lee file3.cpp → "Simulador de física..."      │
│  └── ... (paralelo, LLAMADAS A IA REALES)                    │
└──────────────────────────────────────────────────────────────┘
                    ↓ Stream de resúmenes
┌──────────────────────────────────────────────────────────────┐
│  CURADOR (modelo mediano, agrega y prioriza)                 │
│  - Espera N resúmenes → agrupa por tema                      │
│  - Genera "perfil técnico" del usuario                       │
│  - Actualiza contexto del Chat en tiempo real                │
└──────────────────────────────────────────────────────────────┘
                    ↓ Contexto rico y curado
┌──────────────────────────────────────────────────────────────┐
│  CHAT PRINCIPAL (modelo grande o el mismo)                   │
│  - Sabe TODO sobre el usuario                                │
│  - Responde preguntas                                        │
│  - Edita README                                              │
└──────────────────────────────────────────────────────────────┘