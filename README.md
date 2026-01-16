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
    *   **Arquitectura Cortex (Brain-Voice Dance):** Separación de responsabilidades entre el razonamiento estratégico (Cortex) y la vocalización humana (Vocalizer) para una comunicación libre de ruido técnico.
    *   **Arquitectura Dual-Server**:
        *   **Chat (GPU):** LFM 2.5 (1.2B) para razonamiento fluido.
        *   **Vectores (CPU):** Nomic Embed Text v1.5 para memoria semántica de alta fidelidad.
    *   **Memoria Jerárquica:** Sistema que distingue entre **Hallazgos** (Vectores), **ADN Técnico** (Curación Interna) e **Identidad de Usuario** (Perfil para el chat).
    *   **Analista de Código:** Capacidad para leer y analizar tus repositorios públicos con introspección profunda.
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
    ```bash
    start.bat
    ```
    *Usa el menú interactivo para iniciar la pila completa (App + Dual AI Servers) o gestionar los procesos individualmente.*

## 🤖 Comandos de IA

Habla con el asistente en el chat lateral:

*   *"Pon un banner estilo shark color rojo"*
*   *"Lista mis repositorios"*
*   *"Lee el repo 'mi-proyecto' y dime qué opinas"*
*   *"Genera una serpiente de contribuciones"*

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
