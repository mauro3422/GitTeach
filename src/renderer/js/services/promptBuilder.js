/**
 * PromptBuilder - Centraliza la lógica de generación de prompts para evitar hardcoding.
 * Permite que tanto la App como los scripts de test compartan la misma lógica.
 */
export const PromptBuilder = {
  /**
   * Genera el System Prompt dinámico.
   * @param {string} toolInstructions - Instrucciones obtenidas de ToolRegistry.
   * @returns {string}
   */
  /**
   * AGENTE 1: ROUTER
   * Decide QUÉ herramienta usar basándose en ejemplos dinámicos.
   * Salida estrictamente JSON para aprovechar el entrenamiento del modelo.
   */
  getRouterPrompt(tools) {
    const trainingData = tools.map(t => {
      return t.examples.map(ex => `User: "${ex}"\nJSON: {"tool": "${t.id}"}`).join('\n\n');
    }).join('\n\n');

    const toolDescriptions = tools.map(t => `- ${t.id}: ${t.description}`).join('\n');

    return `SYSTEM: You are an Intent Classifier. You ONLY output JSON.
Tasks:
1. Analyze the user request.
2. Match it to a tool ID from the catalog.
3. If no match, use "chat".
4. CRITICAL: If the user mentions a specific file path or extension (e.g., .py, .js, .cpp, .json, .md), prioritize "read_file" over "read_repo".

CATALOG:
${toolDescriptions}

EXAMPLES:
${trainingData}

User: "Qué hay en el archivo setup.py de giteach?"
JSON: {"tool": "read_file"}

User: "Analiza el código de main.js"
JSON: {"tool": "read_file"}

User: "Logo vectorial"
JSON: {"tool": "chat"}

RESPONSE FORMAT:
{"tool": "TOOL_ID_OR_CHAT"}
`;
  },

  /**
   * AGENTE 2: CONSTRUCTOR
   * Genera el JSON final para una herramienta específica (Few-Shot).
   */
  /**
   * AGENTE 2: CONSTRUCTOR
   * Genera el JSON final para una herramienta específica (Few-Shot).
   */
  getConstructorPrompt(tool) {
    // Simplificación radical para modelo 1.2B
    const fields = Object.keys(tool.schema).map(k => `- ${k} (${tool.schema[k]})`).join('\n');

    return `Eres un Extractor de Parámetros experto para la herramienta "${tool.id}".
Tu único trabajo es leer el texto del usuario y sacar los datos para llenar este JSON.

VARIABLES A EXTRAER:
${fields}

EJEMPLO 1:
Input: "Pon un banner estilo shark color rojo"
JSON:
{
  "action": "insert_banner",
  "toolId": "${tool.id}",
  "params": {
    "type": "shark",
    "color": "red"
  },
  "message": "He aplicado el estilo shark en rojo."
}

EJEMPLO 2:
Input: "Texto: Hola Mundo, Tema: dark"
JSON:
{
  "action": "insert_banner",
  "toolId": "${tool.id}",
  "params": {
    "text": "Hola Mundo",
    "theme": "dark"
  },
  "message": "Texto establecido con tema oscuro."
}

EJEMPLO 3:
Input: "Configura snake_game"
JSON:
{
  "action": "insert_banner",
  "toolId": "configure_snake_workflow",
  "params": {},
  "message": "Iniciando configuración del workflow de Snake."
}

TU TURNO (Usa el Input del Usuario):
Responde SOLO con el JSON válido.
`;
  },

  /**
   * Genera el prompt para el Agente Respondedor (ReAct - Observer Phase).
   * @param {string} toolName 
   * @param {Object} result { success, details }
   * @param {string} userRequest 
   */
  getPostActionPrompt(toolName, result, userRequest) {
    return `Eres el Agente de Comunicación de GitTeach.
Acabamos de ejecutar una acción técnica basada en la petición del usuario.
Tu trabajo es reportar el resultado de forma natural y amigable en ESPAÑOL.

CONTEXTO:
- Petición del Usuario: "${userRequest}"
- Herramienta Ejecutada: "${toolName}"
- Resultado del Sistema: "${result.details}"
- Estado: ${result.success ? "ÉXITO ✅" : "FALLO ❌"}

INSTRUCCIONES:
1. Si fue ÉXITO: Confirma brevemente qué se hizo (repite los parámetros clave si es relevante).
2. Si fue FALLO: Pide disculpas y explica el error claramente.
3. NO menciones "JSON" ni detalles técnicos internos innecesarios.
4. Sé conciso.
`;
  }
};
