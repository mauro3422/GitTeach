---
description: Automatically gather context, update changelog/readme, and deploy to git
---

Este workflow automatiza el ciclo de cierre de implementación y despliegue.

1. **Analizar cambios actuales**
Ejecuta `git status` y `git diff --cached` para entender qué se ha modificado.

2. **Actualizar CHANGELOG.md**
Basado en los cambios detectados y el contexto de la tarea actual, añade una nueva entrada en `CHANGELOG.md` bajo la sección "[Unreleased]" o la versión actual.

3. **Evaluar actualización de README.md**
Revisa si los cambios introducen nuevas funcionalidades, cambios en la arquitectura o actualizaciones de configuración que deban reflejarse en el `README.md`. Actualízalo si es necesario.

// turbo
4. **Preparar cambios para commit**
`git add .`

// turbo
5. **Realizar commit con mensaje descriptivo**
Genera un mensaje de commit basado en el contexto analizado y ejecútalo.
`git commit -m "[Context-driven commit message]"`

// turbo
6. **Subir cambios al repositorio**
`git push`
