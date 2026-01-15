# Changelog

Todas las mejoras y cambios notables del proyecto GitTeach.

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
    - `list_repos`: Capacidad de listar repositorios públicos.
    - `read_repo`: Capacidad de leer y resumir READMEs de proyectos.
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
