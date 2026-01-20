# GitTeach 🚀

**Plataforma de Gestión de Perfiles y Aprendizaje de Git (Potenciada por IA Local)**

GitTeach es una aplicación de escritorio (Electron) diseñada para ayudar a los desarrolladores a gestionar sus perfiles de GitHub y mejorar sus habilidades mediante un asistente de IA local con arquitectura Thinking RAG.

## 🎯 **Novedades v2.44.0 (Domain IPC & Core SOLID)**
- **Domain-Driven IPC**: Migración a handlers especializados (`Profile`, `Repo`, `Commit`, `System`) con arquitectura desacoplada.
- **IpcWrapper Pattern**: Estandarización de errores y auditoría de todas las llamadas entre procesos.
- **Core Service Decomposition**: Refactorización profunda de `AuthService` y `CacheService` en submódulos de responsabilidad única.
- **Design System Phase II**: Auditado total de CSS y adopción absoluta de variables de diseño en dashboard y componentes.

## 🎯 **Novedades v2.43.0 (Core Architecture & SOLID)**

## 📚 **Documentación Técnica**
- **[Arquitectura Completa](docs/architecture/)**: Diagramas y documentación detallada
- **[Manual de Tracing](docs/TRACER_MANUAL.md)**: Guía del sistema de auditoría
- **[Auditoría Técnica](docs/audit_report.md)**: Reporte de calidad del código

## ✨ Características Principales

### 🔐 **Seguridad y Autenticación**
*   **Autenticación con GitHub:** Login OAuth seguro con gestión de sesión persistente.
*   **Firewall Integrado:** Monitoreo y control de todas las comunicaciones de red.
*   **Aislamiento de Procesos:** Main Process y Renderer Process completamente separados.
*   **Token Security:** Almacenamiento seguro de credenciales OAuth.

### 📝 **Editor de README Inteligente**
*   **Generación de banners animados (Welcome Headers).**
*   **Estadísticas de GitHub (GitHub Readme Stats).**
*   **Gráficos de lenguajes y contribuciones (Snake Game).**
*   **Templates personalizables y previews en tiempo real.**

### 🧠 **Asistente de IA Avanzado (Thinking RAG System)**
*   **Motor:** **LFM 2.5 (1.2B Parameters)** vía `llama.cpp`.
*   **Chain of Thought:** IA que razona antes de ejecutar acciones.
*   **Sistema de Herramientas:** Tools inteligentes (`query_memory`, `read_file`, `analyze_code`, etc.).
*   **Arquitectura Cortex:** Separación entre razonamiento estratégico y comunicación natural.
*   **Arquitectura Triple-Server**:
    *   **Chat (GPU - 8000):** LFM 2.5 para respuestas conversacionales rápidas.
    *   **Inteligencia (CPU - 8002):** Mappers y Síntesis de ADN sin el bloqueo del GPU.
    *   **Vectores (CPU - 8001):** Nomic Embed Text v1.5 para memoria semántica.
*   **Memoria Jerárquica:**
    *   **Hallazgos:** Vectores semánticos de código analizado.
    *   **ADN Técnico:** Curación profunda de patrones de desarrollo.
    *   **Identidad Técnica:** Perfil cognitivo del desarrollador.
*   **Analista de Código Avanzado:**
    *   Scanning inteligente de hasta 500 repositorios.
    *   Análisis paralelo con 3 workers GPU concurrentes.
    *   Detección automática de tecnologías y patrones.
*   **Cache Offline Inteligente:** Sistema `aiSnippet` para análisis sin internet.

### 🔍 **Sistema de Análisis de Perfil (SOLID)**
*   **Pipeline Desacoplado:** Scanning (FileAuditor) → Filtering (FileFilter) → Processing (Workers) → Curation (InsightsCurator) → Synthesis.
*   **AI Circuit Breaker:** Protección contra fallos de red/servidor en `AIClient.js`.
*   **Análisis de Forks:** Detección automática de contribuciones en repositorios forked.
*   **Filtrado Anti-Noise:** Eliminación inteligente de archivos irrelevantes via `FileFilter`.
*   **Curación de Insights:** Deduplicación (Jaccard) y weighting centralizado.
*   **Síntesis de ADN Técnico:** Creación de perfiles técnicos objetivos.

### 🛡️ **Privacidad y Rendimiento**
*   **Privacidad Total:** Todo procesa localmente, solo API calls directos a GitHub.
*   **Zero External Dependencies:** No requiere servicios de terceros para funcionar.
*   **Rendimiento Optimizado:** View Transitions nativas, lazy loading, virtual scrolling.
*   **Health Monitoring:** Monitoreo continuo del estado de los servidores IA.

## 🛠️ Tecnologías

*   **Electron:** Framework de escritorio.
*   **Node.js / Express:** Backend local.
*   **Llama.cpp:** Inferencia de IA optimizada (Vulkan GPU Support).
*   **Vainilla JS / CSS:** Frontend ligero y performante.

## 📦 Instalación

1.  **Requisitos:**
    *   Node.js (v16+)
    *   Python (para scripts de prueba)
    *   Tarjeta Gráfica compatible con Vulkan (Opcional, pero recomendado).

2.  **Setup:**
    ```bash
    npm install
    ```

3.  **Ejecución:**
    ```bash
    ```bash
    start.bat
    ```
    *Usa el menú interactivo para iniciar la pila completa (App + Dual AI Servers) o gestionar los procesos individualmente.*

## 🧪 **Testing y Desarrollo**

### Scripts de Verificación
```bash
# Verificar flujo completo de análisis
node scripts/verify_agent_flow.py

# Tests end-to-end con Electron
node scripts/test_headless_concept.js

# Verificar integridad de handlers IPC
node scripts/verify_integrity.js

# Testing del sistema de memoria
node scripts/verify_rag_flow.js

# Auditoría forense completa
node scripts/tools/tracer/ultimate_multitier_tracer.mjs
```

### Scripts de Análisis
```bash
# Simulación de análisis vectorial
node scripts/simulate_vector_search.mjs

# Tests metabólicos del sistema
node scripts/tests/test_metabolic_evolution.mjs

# Verificación de widgets UI
node scripts/verify_widgets.js
```

## 🤖 Comandos de IA

Habla con el asistente en el chat lateral usando lenguaje natural:

### 📊 **Análisis de Código**
*   *"Analiza mi perfil de GitHub"*
*   *"Qué tecnologías uso más?"*
*   *"Dime qué tipo de desarrollador soy"*
*   *"Revisa el repo 'mi-proyecto' y dame feedback"*

### 🧠 **Sistema RAG (Thinking)**
*   *"Qué recuerdo sobre mis proyectos en Python?"* (query_memory)
*   *"Cuéntame sobre mi experiencia con React"* (semantic search)
*   *"Cómo he evolucionado como developer?"* (technical DNA)

### 📝 **Editor de README**
*   *"Pon un banner estilo shark color rojo"*
*   *"Agrega estadísticas de GitHub"*
*   *"Genera una serpiente de contribuciones"*
*   *"Crea un header animado"*

### 🔧 **Herramientas del Sistema**
*   *"Verifica el estado de los servicios"* (system health)
*   *"Limpia la caché del sistema"* (cache management)
*   *"Audita la configuración"* (system audit)

---
## 📄 License

GitTeach is licensed under the **GNU Affero General Public License v3.0**.

This means:
- ✅ You can use, modify, and distribute this software freely
- ✅ Commercial use is allowed
- ⚠️ If you run a modified version as a service (SaaS), you MUST release your source code
- ⚠️ Derivative works must use the same license

See [LICENSE](LICENSE) for full details.

*Desarrollado con ❤️ por mauro3422*
