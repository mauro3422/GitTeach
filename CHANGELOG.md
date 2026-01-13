# Changelog

Todas las mejoras y cambios notables del proyecto GitTeach.

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
