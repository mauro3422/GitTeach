---
description: Sincroniza el contexto inicial leyendo los registros de la carpeta /brain
---

Este workflow permite retomar una tarea exactamente donde se dejó, sincronizando el estado mental mediante la lectura de los artefactos de la sesión.

1. **Localizar la Carpeta Brain**
   Identifica la ruta `<appDataDir>/brain/<conversation-id>` de la sesión actual.

2. **Auditar el Progreso (`task.md`)**
   Lee el archivo `task.md` para visualizar el checklist de tareas completadas, en progreso y pendientes.

3. **Revisar Logros (`walkthrough.md`)**
   Lee el último `walkthrough.md` para entender qué cambios se verificaron y desplegaron en la última interacción.

4. **Verificar Planes Activos (`implementation_plan.md`)**
   Si existe un plan de implementación, léelo para confirmar si hay pasos de ejecución o validación pendientes.

5. **Sincronizar con el Código**
   - Ejecuta `git status` para ver si hay cambios locales sin commit.
   - Revisa las últimas 3 entradas de `CHANGELOG.md`.

6. **Generar Resumen de Sesión**
   Presenta al usuario un resumen conciso:
   - **Estado Actual**: ¿Qué se hizo exactamente?
   - **Pendientes**: ¿Cuál es el siguiente paso lógico según el `task.md`?
   - **Bloqueos**: ¿Alguna decisión pendiente?

7. **Actuar**
   Inicia la tarea automáticamente marcando el siguiente ítem del `task.md` como `[/]`.
