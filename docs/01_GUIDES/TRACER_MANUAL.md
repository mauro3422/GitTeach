# Ultimate Multitier Tracer - Manual Técnico Experimental (v2.0)

El **Ultimate Multitier Tracer** (`scripts/tools/ultimate_multitier_tracer.mjs`) es la herramienta de validación más avanzada y crítica de GitTeach. Se diseñó para verificar todo el flujo de inteligencia (IA, Workers, Memoria, Chat) sin necesidad de levantar la interfaz gráfica (Electron).

> **IMPORTANTE**: Este script es la "Verdad Absoluta" del sistema. Si el Tracer funciona, el Backend lógico funciona.

## 🎯 Propósito
1. **Simulación Headless Total**: Ejecuta el núcleo de lógica (`AIService`, `ProfileAnalyzer`, `DeepCurator`) en un entorno de Node.js puro.
2. **Validación de Streaming**: Verifica que los workers procesen archivos en paralelo y que el Chat reaccione en tiempo real ("Autonomous Reactions").
3. **Prueba de Persistencia**: Valida que los archivos de memoria (`technical_identity.json`, etc.) se creen y lean correctamente en una capa de persistencia simulada (`mock_persistence`).

## ⚙️ Cómo Funciona (Arquitectura Mock)
El script "engaña" al sistema inyectando un objeto `global.window` falso que simula las APIs del navegador que Electron provee normalmente:

- **`mockGithubAPI`**: Simula respuestas de GitHub (lista de repos, contenido de archivos) usando datos "dummy" controlados.
- **`mockCacheAPI`**: Simula el sistema de archivos local (`CacheService`) escribiendo en una carpeta temporal `mock_persistence` dentro de la sesión.
- **`mockDebugAPI`**: Redirige los logs del sistema a la consola de Node.js y a archivos `.jsonl`.

## 🚀 Guía de Ejecución

### Requisitos Previo
Asegúrate de estar en la raíz del proyecto.

### Comando
```bash
node scripts/tools/ultimate_multitier_tracer.mjs
```

### Flujo de Ejecución (The Pipeline)

1. **BOOTSTRAP**:
   - Carga de módulos ESM (`import()`).
   - Verificación de "Salud" de la IA (Ping al servidor local).
   - Creación de carpetas de sesión (`logs/sessions/SESSION_ID/...`).

2. **PHASE 1: WORKER SCAN (Map)**:
   - El `Coordinator` detecta repositorios (simulados).
   - Se lanzan 3 Workers en paralelo (`AIWorkerPool`).
   - Cada worker procesa archivos y emite logs de "pensamiento" (`worker_N.jsonl`).
   - **Puntos Clave**: Verás mensajes como `🔧 [Worker 1] Procesando [Repo]: File.js`.

3. **PHASE 2: INTELLIGENCE SYNTHESIS (Reduce)**:
   - Los hallazgos fluyen al `DeepCurator` y `IntelligenceSynthesizer`.
   - El sistema detecta "Evoluciones Intermedias" (batches de findings).
   - **Autonomous Chat**: El `AIService` recibe estas evoluciones y genera una reacción automática (ver log `chat/session.jsonl`).

## 📊 Interpretación de Logs (Symbols)

| Símbolo | Significado | Componente |
| :--- | :--- | :--- |
| 🧬 | Inicio del Tracer | System |
| 🔧 | Worker Activo | `AIWorkerPool` |
| 📝 | Log de Progreso | `Coordinator` |
| 🔄 | Streaming / Batch | `DeepCurator` |
| ✅ | Éxito / Online | System |

## 🛠️ Solución de Problemas Comunes

### 1. `TypeError: window.cacheAPI.setRepoTreeSha is not a function`
- **Causa**: El Mock en el script estaba incompleto (faltaba definir esa función).
- **Solución**: Ya fue parcheado en la `v1.9`. Si reaparece, verifica el objeto `mockCacheAPI` en el script (línea ~180).

### 2. `ModuleJob._link error`
- **Causa**: Error de sintaxis en `AIService.js` o algún módulo importado.
- **Solución**: Revisa los últimos cambios en el código fuente (`src/renderer/...`). El Tracer fallará si el código real tiene errores de compilación JS.

### 3. El Chat no reacciona
- **Causa**: Puede que la configuración de `batchSize` en `AIWorkerPool` sea muy alta o que `synthesizeBatch` no considere "significativo" el cambio.
- **Verificación**: Revisa `chat/session.jsonl`. Si está vacío, ajusta los umbrales de sensibilidad en `ProfileAnalyzer.js`.

---
*Este documento debe actualizarse si se cambia la lógica de Mocking o el Pipeline de Workers.*
