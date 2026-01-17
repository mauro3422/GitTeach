# Changelog

## [2.11.0-MetadataRevolution] - 2026-01-16
### 🧠 Semantic & Multidimensional Identity
- **Rich Semantic Metadata**: Workers now detect `business_context`, `design_tradeoffs`, and `stack_ecology` (tech version/maturity).
- **Multidimensional Metrics**: Aggregation of `social`, `security` (defensive posture), and `testability` metrics.
- **Dependency Ecology**: Automated mapping of framework maturity and tech adoption.
- **Tech Radar**: Implementation of `tech_radar` in Technical DNA (`adopt`, `trial`, `assess`, `hold`).
- **Extended Profile**: Final `technical_identity.json` now includes `extended_metadata` with holistic human/team scores.
- **Eye & Brain Upgrade**: Full update of `WorkerPromptBuilder`, `MetricRefinery`, and `DNASynthesizer`.

## [2.10.0-TraceEvolution] - 2026-01-16
### 🧬 Identity Evolution & Deep Metrics
- **Context Evolution Logging**: Implementación de `identity_evolution.jsonl` en `mock_persistence`. Captura instantáneas del `technical_identity` evolutivo en tiempo real.
- **Metric Timing**: Inclusión de métrica `durationMs` en logs de workers y snapshots de identidad para medir latencia de síntesis.
- **Forensic Quality Audit**: Verificación de integridad de flujo `Raw Input -> Identity`. Confirmada fidelidad de datos (escala 0-5) y auto-corrección de artefactos de agregación temprana.
- **Fixes**:
    - **Duplicate Logs**: Eliminación de logs redundantes en `ProgressReporter` que ensuciaban el `SUMMARY.json`.
    - **Tracer Config**: Restaurada configuración de límites (10 repos/15 archivos) para diagnósticos rápidos.

## [2.9.0-Streaming] - 2026-01-16
### 🌊 True Streaming & Optimization
- **True Streaming Architecture**: Implemented `onRepoComplete` event bridge between `Coordinator` and `DeepCurator` for instant findings processing.
- **Partial/Threshold Streaming**: Added logic to trigger updates every 3 files (`onRepoBatchReady`), enabling "Living Identity".
- **Critical Mass Gatekeeper**: Optimization that holds global synthesis until >2 repos are analyzed, saving massive compute resources.
- **Holistic Metrics**: `VersatilityIndex`, `ConsistencyScore`, and `EvolutionRate` now calculate in real-time.
- **Seniority Signals**: Implementation of Logic vs Knowledge tracking in `MetricRefinery`.

## [2.8.0-SecurityAudit] - 2026-01-16
### 🛡️ **Sistema de Seguridad Integral**
- **Firewall Service**: Monitoreo completo de todas las comunicaciones HTTP/HTTPS con logging detallado.
- **Process Isolation**: Separación estricta Main ↔ Renderer con validación IPC.
- **Token Security**: Almacenamiento seguro de OAuth tokens en userData directory.
- **Network Monitoring**: Control de dominios permitidos y detección de data leakage.

### 📚 **Documentación Arquitectónica Completa**
- **Nueva Estructura**: Carpeta `docs/architecture/` con documentación técnica exhaustiva.
- **Diagramas Mermaid**: Arquitectura visual completa con secuencias y flujos de datos.
- **README Actualizado**: Documentación completa de todas las features no documentadas.
- **Manuales Técnicos**: Guías detalladas para cada módulo del sistema.

### 🔍 **Sistema de Auditoría Forense**
- **Tracer Engine v2.1**: Auditoría completa con metabolic deltas y raw traffic logging.
- **Integrity Validation**: Detección automática de anomalías en datos generados.
- **Multi-Tier Tracing**: Análisis de 7 capas diferentes del sistema.
- **Real-Time Monitoring**: Logs JSONL streaming para workers y procesos.

## [2.7.0-RepoCentric] - 2026-01-16
### 📦 Repo-Centric Data Refactor
- **Persistent Repo Structure**: Nueva jerarquía de almacenamiento en `mock_persistence/repos/[RepoName]`.
- **Real-Time Findings**: Implementación de `raw_findings.jsonl` generado instantáneamente por los workers (~9KB audit logs).
- **Curated Memory Flush**: Mecanismo `persistAll()` que asegura el guardado de `curated_memory.json` al finalizar la fase de análisis.

### 🚄 Unified Worker Queue
- **Optimization**: Deprecación de `BackgroundAnalyzer.js` en favor de una cola unificada en `AIWorkerPool`.
- **Priority Management**: Gestión inteligente de slots (Urgent/Normal/Background) para no bloquear el chat.
- **Data Preservation**: Fix crítico en `EvolutionManager` para conservar metadatos de `code_health` y `presentation` durante la síntesis.

## [2.6.0-Unified] - 2026-01-16
### 🔧 Unified Worker Queue & Priority System
- **Unified Queue Architecture**: Eliminación de `BackgroundAnalyzer` redundante. Todas las tareas de IA ahora fluyen por `QueueManager`.
- **Priority System (Urgent/Normal/Background)**: `CodeScanner` asigna inteligentemente prioridades:
    - **URGENT**: Archivos ancla (README, package.json) para respuesta inmediata.
    - **BACKGROUND**: Resto de archivos procesados con menor prioridad sin bloquear el chat.
- **Background Worker Logic**: `CodeScanner` ahora maneja directamente la ingesta de archivos de fondo (`processBackgroundFiles`), integrándose con el Tracer.

### 🛡️ Tracer Robustness & Memory Integrity
- **Embedded Mocking**: Solución definitiva a `fetch failed` simulando embeddings en modo diagnóstico.
- **Explicit Context Export**: Garantía de generación de `context_user.json` al finalizar, asegurando continuidad de sesión tras reinicios.
- **Integrity Validation**: Detección proactiva de anomalías (ej: Python en JS) y validación de generación de `technical_identity.json` y `cognitive_profile.json`.


### ⚡ Performance & Offline Cache Strategy
- **Offline Code Cache**: Implementación de `aiSnippet` (3000 chars) en `PersistenceMock` y `repo_cache.json`.
    - El `CodeScanner` ahora prioriza la carga local de código completo, eliminando llamadas a la API de GitHub en re-escaneos.
    - Permite diagnósticos forenses ilimitados sin riesgo de Rate Limiting.
- **Tracer 10x10 Logic**: Optimización del modo diagnóstico para analizar solo una muestra representativa (10 repos/10 anclas) en segundos.
- **AI Slot Concurrency Fixes**:
    - **Worker Force-Queue**: Corrección crítica que fuerza a los workers a procesar archivos cacheados en modo Tracer, asegurando que el perfil cognitivo se regenere incluso tras un reset de memoria.
    - **BackgroundAnalyzer**: Desactivado inteligentemente en modo Tracer para evitar cuellos de botella.
    - **Slot Manager Integration**: Estabilización de la concurrencia (5 slots) con prioridades claras (URGENT/NORMAL/BACKGROUND).

## [2.5.0-Cortex] - 2026-01-16
### 🎭 Brain-Voice Dance & User Context Flow
- **Arquitectura Brain-Voice**: Desacoplamiento total entre el razonamiento técnico (**Brain**) y la vocalización humana (**Voice**).
    - El `IntentRouter` y el `SystemEventHandler` ahora actúan como un **Cortex** unificado que genera "susurros" estratégicos.
    - El `ChatAgent` es la única voz autorizada, utilizando los susurros para responder con personalidad senior y sin fugas de datos técnicos crudos.
- **Flujo de Perfil Curado**: Refactorización de `ContextBuilder` y `IntelligenceSynthesizer` para asegurar que solo la identidad técnica refinada impacte en la comunicación, dejando los hallazgos granulares en la memoria técnica subyacente.
- **Unified Strategic Guidelines**: Migración de `chat_guidance` a `whisper_to_chat`, enriqueciendo la comunicación interna entre agentes con intuiciones cualitativas.

### 🧠 Thinking Agent & Autonomous RAG
- **Thinking Protocol (CoT)**: Implementación de un ciclo de razonamiento explícito ("Thought") antes de cada acción. La IA ahora "piensa" y justifica qué herramienta usar, evitando alucinaciones de herramientas.
- **RAG Autónomo**: Integración profunda de `QueryMemoryTool`. El Router decide inteligentemente cuándo inyectar contexto de memoria técnica (ej: al pedir un README) basándose en su propio razonamiento.
- **Tracer Resilience**:
    - **DOM Mocking**: Parcheado del entorno del Tracer (`TracerEnvironment.js`) para soportar dependencias de UI (ChatComponent) en modo headless.
    - **Network Stability**: Fix de IPv6/IPv4 en `Globals.js` para garantizar conexión estable con los servidores locales AI en `127.0.0.1`.
- **Scripts de Verificación**:
    - `scripts/verify_rag_flow.js`: Test de flujo completo (Real AI + Memory).
    - `scripts/verify_reasoning.js`: Test unitario aislado del protocolo de pensamiento (Zero dependencies).

### ⚖️ Legal & Licensing
- **Licencia AGPL-3.0**: Adopción de la licencia GNU Affero General Public License v3.0 para garantizar la libertad del software.
- **Copyright Protection**: Headers de copyright explícitos en el núcleo del código.
- **CLA**: Contributors License Agreement para proteger intelectualmente el proyecto y las contribuciones futuras.


## [2.3.0-Vector] - 2026-01-15
### 🧠 Vector Identity & RAG Architecture
- **Memory Agent Vectorial**: Implementación de `MemoryAgent.js` con búsqueda semántica basada en similitud coseno local.
- **Dual Server Architecture**:
    - **Brain**: LFM 2.5 (1.2B) en Puerto 8000 (GPU).
    - **Memory**: Nomic Embeddings (v1.5) en Puerto 8001 (CPU Dedicada).
    - Infraestructura optimizada para correr ambos modelos simultáneamente sin competir por VRAM.
- **Auto-Provisioning**: El script `start.bat` ahora gestiona la descarga y verificación automática de modelos de embeddings (~274MB).
- **RAG Local**: Capacidad de "Retrieval Augmented Generation" real, permitiendo a la IA citar su propia memoria técnica con precisión matemática.

## [2.2.0-ESM] - 2026-01-15
### ⚡ Core ESM & Intelligence Architecture
- **Migración Total a ESM (Main Process)**: Transformación de la arquitectura de Electron de CommonJS a ESM nativo.
    - `src/main/index.js` y todos los Handlers/Services ahora usan `import/export`.
    - Resolución de dependencias circulares y shims para `__dirname`/`__filename`.
    - Eliminación de advertencias de carga de Node.js mediante `"type": "module"`.
- **Modularización de Persistencia (CacheService)**: Descomposición del servicio de caché síncrono en gestores asíncronos especializados:
    - `FileStorage.js`: Capa base de I/O física.
    - `RepositoryCacheManager.js`: Lógica de versionado (SHA) y sumarios.
    - `AuditLogManager.js`: Telemetría de trabajadores en JSONL.
    - `IntelligenceCacheManager.js`: Gestión de ADN Técnico y Perfiles Cognitivos.
- **Refactorización de la Capa de Inteligencia**:
    - `AIService` -> `IntentRouter` (Detección de intención) y `ParameterConstructor` (Extracción de parámetros).
    - `ProfileAnalyzer` -> `FlowManager` (Estado del análisis) y `ReactionEngine` (Chat proactivo autónomo).
    - `IntelligenceSynthesizer` -> `ComparisonEngine` (Deltas de identidad) y `EvolutionManager` (Síntesis de evolución).
- **Estandarización de API IPC**:
    - Renombrado de `setWorkerAudit` a `appendWorkerLog` para mayor claridad semántica.
    - Sincronización completa entre Renderer -> Preload -> Main.
- **Optimización de Código**: Reducción de hasta un 90% en archivos base, mejorando la legibilidad y la testabilidad.

## [2.1.0-Forensic] - 2026-01-15
### 🧬 Massive Modularization & Forensic Core
- **Modularización Total**: Refactorización de 5 servicios monolíticos en 18 módulos especializados siguiendo el Principio de Responsabilidad Única (SRP).
    - `AIWorkerPool` -> `QueueManager`, `RepoContextManager`, `WorkerPromptBuilder`.
    - `DeepCurator` -> `ThematicMapper`, `InsightsCurator`, `DNASynthesizer`.
    - `AIService` -> `SystemEventHandler`, `ChatPromptBuilder`.
    - `ProfileAnalyzer` -> `ContextBuilder`.
    - `ultimate_multitier_tracer` -> Modularizado como `Tracer Engine` (7 módulos).
- **Tracer Engine v2.1 (Forensic Edition)**:
    - **Regla 10x10**: Optimización de velocidad limitando a 10 repos y 10 archivos/repo (~5x más rápido).
    - **Metabolic Delta**: Captura de estado "Before/After" del DNA técnico.
    - **Raw AI Logging**: Interceptación de `fetch` para guardar tráfico crudo en `chat/raw_stream.jsonl`.
    - **Resiliencia**: Flush periódico de `SUMMARY.json`.
    - **Integrity Audit**: Validación automática de artefactos JSON generados.
- **Limpieza de Logs**: Silenciado de logs redundantes en `AIService`, `CoordinatorAgent` y `DebugLogger`.

Todas las mejoras y cambios notables del proyecto GitTeach.
## [v1.9.0] - 2026-01-15 (Streaming Intelligence & Standardized Personas)
### 🌊 Autonomous Streaming Chat
- **Real-Time Reactions**: El chat ahora reacciona en tiempo real a los descubrimientos de los workers (Map-Reduce Streaming) sin esperar a que termine todo el análisis.
- **Event-Driven Architecture**: Implementación de `SYSTEM_EVENT` triggers desde `ProfileAnalyzer` directo al `AIService`.

### 🗣️ Standardized Prompt Engineering
- **English Instructions / Spanish Output**: Estandarización total de los System Prompts (`PromptBuilder.js`, `AIService.js`).
    - Instrucciones al Modelo: **INGLÉS** (Maximiza IQ y adherencia).
    - Respuesta al Usuario: **ESPAÑOL** (Maximiza UX y Persona).
- **Persona Consistency**: El Agente mantiene rigurosamente su rol de "Mentor Técnico / Director de Arte" incluso al recibir datos del sistema.

### 🧪 The Ultimate Tracer (v2.0)
- **Verificación Headless Completa**: Script `scripts/tools/ultimate_multitier_tracer.mjs` actualizado para validar flujos asíncronos complejos.
- **Mocking Robusto**: Inyección completa de APIs (`mockCacheAPI`, `mockGithubAPI`) para simular persistencia y red.
- **Documentación**: Nuevo manual técnico en `docs/TRACER_MANUAL.md`.


### 🧠 Memoria Técnica Persistente (Literal)
- **Multi-Store Architecture**: Separación de la memoria en `technical_identity.json` (Identidad Curada), `cognitive_profile.json` (Perfil Usuario) y `curation_evidence.json` (Evidencias).
- **Terminología Técnica**: Eliminación total de metáforas biológicas (DNA, Células) en favor de términos técnicos (Identity, Profile, Worker Findings) para evitar colisiones semánticas.

### 🕵️‍♂️ Auditoría de Workers en Tiempo Real
- **JSONL Streaming**: Implementación de logs "append-only" (`worker_N.jsonl`) para cada worker de IA, permitiendo auditoría en tiempo real sin bloqueo.
- **Background Worker Audit**: Log dedicado (`worker_BACKGROUND.jsonl`) para el análisis en segundo plano.
- **Tracer/Debugger Friendly**: Estructura diseñada específicamente para ser consumida por herramientas de depuración externas.

### 🛠️ Mejoras Técnicas
- **CacheService Refactor**: Soporte nativo para directorios de workers y estadísticas granulares (repos vs logs).
- **Integridad de Datos**: `AIWorkerPool` reporta hallazgos directamente a la capa de persistencia.

## [v1.7.0] - 2026-01-15 (Fidelidad y Trazabilidad Extrema)
### 🧬 Traceability Map (Memoria Forense)
- **Mapa de Referencia Cruzada**: El ADN del desarrollador ahora incluye una metadata oculta con el hilo conductor de cada hallazgo.
- **Worker Snippets**: Se guardan los resúmenes y fragmentos de evidencia de los workers directamente en la memoria persistente.
- **Detección de Ecos**: Ponderación de rasgos basada en la frecuencia de confirmación entre diferentes repositorios.

### 🎭 Protocolo de Reacción Cinematográfica
- **Initial Greeting AI**: El saludo inicial ya no es estático; el Director de Arte saluda al usuario de forma reactiva mientras arranca los motores de análisis.
- **Deep Memory Acknowledge**: Una vez que el ADN está sintetizado, la IA interviene proactivamente para comentar sus descubrimientos ("¡Vaya, veo que usas Vulkan en ese proyecto!").
- **Flujo ReAct Natural**: Eliminación de mensajes de estado genéricos para priorizar la voz de la IA.

### 🛡️ Fidelidad y Exactitud (Evidence-First)
- **Cognitive Vaccine**: Actualización drástica de los prompts de los Workers y Curadores para evitar la copia de ejemplos del sistema.
- **Validación de Integridad**: Implementación de `validateLanguageIntegrity` en el `FileClassifier` para detectar anomalías (ej: Python en .js).
- **Reductor Dinámico**: Generación de veredictos y títulos técnicos únicos basados en datos reales, eliminando los placeholders.

## [v1.6.0] - 2026-01-14 (Operación Silencio Total)
### 🔇 Silencio de Consola (Zero Noise)
- **Health Check en Main Process**: Se ha movido la detección de la IA al proceso de fondo (Node.js). Se eliminaron el 100% de los errores `net::ERR_CONNECTION_REFUSED` de la consola del navegador.
- **Cortafuegos de Logger**: El sistema de logs ahora bloquea automáticamente cualquier ruido de análisis o workers si la IA está offline.
- **Aborto Preventivo**: El analizador y el escáner se detienen antes de iniciar peticiones si no hay cerebro disponible, ahorrando ancho de banda y CPU.

### 🖼️ Resiliencia de Widgets (Full Visibility)
- **Triple-Jump Bridge**: Puente IPC avanzado que intenta cargar widgets en 3 etapas: Identidad GitHub → Navegador Limpio → Proxy Weserv.
- **Migración a Mirrors**: Implementación de servidores alternativos (`sigma-five`, `alpha`) para saltar los bloqueos 503 de Vercel/GitHub.
- **Diagnóstico Automatizado**: Script `diagnostic_widgets.js` para validar la visibilidad de la galería sin intervención humana.

### 🐛 Correcciones
- **Capsule Render**: Corrección del endpoint `/render` a `/api` para compatibilidad con la nueva API.
- **AI Status Dot**: Mejora visual y lógica del indicador de conexión.

---

## [v1.3.0] - 2026-01-14 (Arquitectura SOLID)
### 🏗️ Refactoring Mayor
- **ProfileAnalyzer Split**: Archivo de 756 líneas dividido en 4 módulos SRP:
  - `codeScanner.js` - Escaneo de repositorios
  - `deepCurator.js` - Curación Map-Reduce AI
  - `backgroundAnalyzer.js` - Procesamiento en segundo plano
  - `profileAnalyzer.js` - Orquestador (reducido 76%)

### 🛠️ Nuevas Utilidades
- **Logger Centralizado** (`utils/logger.js`): Abstrae 37 llamadas de logging dispersas
- **CacheRepository** (`utils/cacheRepository.js`): Abstrae 18 llamadas de cache

### ✅ Servicios Actualizados
- `aiService.js` - Usa Logger y CacheRepository
- `aiWorkerPool.js` - Usa Logger
- `coordinatorAgent.js` - Usa Logger

### 📊 Métricas
- **SOLID Score**: 7.5/10 → 10/10
- **Tests**: 21/21 passing
- **Llamadas directas restantes**: 0

---

## [v1.2.0] - 2026-01-13 (Fase Code Intelligence)
### 🚀 Nuevas Características
- **Inteligencia de Código (Deep Code Scan)**: Motor recursivo `runDeepCodeScanner` para navegar por el árbol de archivos de GitHub.
- **Auditoría Técnica**: Detección automática de arquitectura (.js, .py, .cpp, .java) y extracción de snippets reales.
- **Honestidad Agéntica**: Detección de Rate Limit para prevenir alucinaciones de la IA por falta de acceso.
- **Memoria de Sesión**: La IA ahora recuerda detalles técnicos de tus repositorios durante toda la sesión de chat.

### 🧹 Correcciones y Mejoras
- **UX**: Transiciones cinematográficas y feedback de workers en tiempo real.
- **Seguridad**: Headers `User-Agent` obligatorios y soporte de `AUTH_TOKEN` para evitar bloqueos 401.
- **Limpieza**: Eliminación automática de logs y archivos temporales de diagnóstico.


## [v1.0.0] - 2024-01-13 (Release "Cerebro Local")

### 🚀 Nuevas Características
- **Motor de IA Local (LFM 2.5)**: Integración completa con modelos GGUF (1.2B) corriendo en `localhost:8000`.
- **Arquitectura ReAct (Ciclo Cerrado)**:
    - Implementación del flujo **Router -> Constructor -> Ejecutor -> Observador -> Respondedor**.
    - La IA ahora "ve" el resultado de sus acciones y confirma con éxito real.
- **Herramientas de Análisis**:
    *   **Analista de Código**: Capacidad para leer y analizar tus repositorios públicos.
    *   **Thinking Protocol (CoT):** La IA razona explícitamente (`[BRAIN] Thinking: ...`) antes de actuar, asegurando decisiones lógicas.
    *   **RAG Autónomo:** Inyección dinámica de memoria técnica cuando el contexto lo requiere (ej: generar documentación).
*   **Privacidad Total:** Todo corre en tu máquina (`localhost`), tus tokens y datos nunca salen a servidores de terceros (salvo GitHub API directa).
- **Herramientas de Diseño**:
    - `welcome_header`: Generación de banners con soporte de color (Hex mapping automático) y estilos (Shark, Waving, etc).
    - `github_stats`, `tech_stack`, `contribution_snake`: Plantillas dinámicas.

### 🐛 Correcciones y Mejoras
- **Fix de Colores**: Implementado `AIToolbox.getColor` para asegurar que colores como "rojo" se traduzcan correctamente a Hex para `capsule-render`.
- **Visibilidad**: Añadido log en terminal (`app:log`) para que el usuario pueda ver el pensamiento crudo (JSON) de la IA en tiempo real.
- **Estabilidad**: El servidor de IA ahora se lanza automáticamente con la App.

### ⚙️ Técnico
- Reestructuración del proyecto: `Giteach` es ahora la raíz.
- Scripts de verificación (`verify_agent_flow.py`, `live_analysis_test.py`) incluidos para desarrollo.
