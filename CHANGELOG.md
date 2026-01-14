# Changelog

Todas las mejoras y cambios notables del proyecto GitTeach.

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
