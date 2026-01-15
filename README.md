# GitTeach 🚀

**Plataforma de Gestión de Perfiles y Aprendizaje de Git (Potenciada por IA Local)**

GitTeach es una aplicación de escritorio (Electron) diseñada para ayudar a los desarrolladores a gestionar sus perfiles de GitHub y mejorar sus habilidades mediante un asistente de IA local.

- Scripts de verificación (`verify_agent_flow.py`, `live_analysis_test.py`) incluidos para desarrollo.
- **[MODULAR]** Núcleo de IA rediseñado: `AIWorkerPool`, `DeepCurator`, `AIService` y `ProfileAnalyzer` ahora operan mediante submódulos especializados para máxima mantenibilidad.
- **[PRO]** `scripts/tools/tracer/`: Nuevo **Tracer Engine v2.1 Forensic**. La herramienta definitiva de validación *headless* con auditoría de integridad, rastreo de tráfico crudo y deltas metabólicos.

## ✨ Características Principales

*   **Autenticación con GitHub:** Login seguro y gestión de sesión persistente.
*   **Editor de README Inteligente:**
    *   Generación de banners animados (Welcome Headers).
    *   Estadísticas de GitHub (GitHub Readme Stats).
    *   Gráficos de lenguajes y contribuciones (Snake Game).
*   **Asistente de IA (Cerebro Local):**
    *   Motor: **LFM 2.5 (1.2B Parameters)** vía `llama.cpp`.
    *   **Arquitectura ReAct (Ciclo Cerrado):** La IA planifica, ejecuta herramientas reales y analiza los resultados antes de responder.
    *   **Memoria Persistente y Auditable:** Sistema multi-fichero (`JSONL`) que recuerda tu identidad técnica entre sesiones y permite auditoría forense en tiempo real.
    *   **Analista de Código:** Capacidad para leer y analizar tus repositorios públicos.
*   **Privacidad Total:** Todo corre en tu máquina (`localhost`), tus tokens y datos nunca salen a servidores de terceros (salvo GitHub API directa).

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
    npm start
    ```
    *Esto iniciará la App y el Servidor de IA automáticamente.*

## 🤖 Comandos de IA

Habla con el asistente en el chat lateral:

*   *"Pon un banner estilo shark color rojo"*
*   *"Lista mis repositorios"*
*   *"Lee el repo 'mi-proyecto' y dime qué opinas"*
*   *"Genera una serpiente de contribuciones"*

---
*Desarrollado con ❤️ por mauro3422*
