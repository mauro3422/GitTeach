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
TASKS:
1. THINK: Analyze the user request. Does it require external info?
2. REASON: Explain WHY a tool is needed (e.g. "Need memory for documentation").
3. SELECT: Output the JSON with your reasoning.

RULES FOR INTELLIGENCE:
- **CONTENT GENERATION**: Use "query_memory" for README/Docs.
- **FILE ACCESS**: Use "read_file" for specific paths.
- **IMPERATIVE**: If your thought mentions "context", "information", "project data", or "codebase", YOU MUST SELECT "query_memory". Do NOT use "chat".

CATALOG:
${toolDescriptions}

EXAMPLES:
User: "Analiza el código de main.js"
JSON: {
  "thought": "User wants file analysis. 'main.js' is a file path.",
  "tool": "read_file"
}

User: "Generame un README para mi perfil"
JSON: {
  "thought": "User wants to generate content. This requires deep context about the project.",
  "tool": "query_memory"
}

User: "Logo vectorial"
JSON: {
  "thought": "This is a general or conversational request.",
  "tool": "chat"
}

RESPONSE FORMAT (Chain of Thought):
{
  "thought": "Brief reasoning here...",
  "tool": "TOOL_ID_OR_CHAT"
}
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
    // Radical simplification for 1.2B model
    const fields = Object.keys(tool.schema).map(k => `- ${k} (${tool.schema[k]})`).join('\n');

    return `You are an Expert Parameter Extractor for the tool "${tool.id}".
Your ONLY job is to extract data from the user input to fill this JSON.

VARIABLES TO EXTRACT:
${fields}

EXAMPLE 1:
Input: "Put a red shark banner"
JSON:
{
  "action": "insert_banner",
  "toolId": "${tool.id}",
  "params": {
    "type": "shark",
    "color": "red"
  },
  "message": "Shark banner applied in red."
}

EXAMPLE 2:
Input: "Text: Hello World, Theme: dark"
JSON:
{
  "action": "insert_banner",
  "toolId": "${tool.id}",
  "params": {
    "text": "Hello World",
    "theme": "dark"
  },
  "message": "Text set with dark theme."
}

EXAMPLE 3:
Input: "Configure snake_game"
JSON:
{
  "action": "insert_banner",
  "toolId": "configure_snake_workflow",
  "params": {},
  "message": "Starting Snake workflow configuration."
}

YOUR TURN (Use User Input):
Reply ONLY with the valid JSON.
`;
  },

  /**
   * Generates the prompt for the Responder Agent (ReAct - Observer Phase).
   * @param {string} toolName 
   * @param {Object} result { success, details }
   * @param {string} userRequest 
   */
  getPostActionPrompt(toolName, result, userRequest) {
    return `You are the Communication Agent for GitTeach.
We just executed a technical action based on the user's request.
Your job is to report the result accurately and naturally while maintaining the persona.

CONTEXT:
- User Request: "${userRequest}"
- Tool Executed: "${toolName}"
- System Result: "${result.details}"
- Status: ${result.success ? "SUCCESS ✅" : "FAILURE ❌"}

INSTRUCTIONS:
1. If SUCCESS: Briefly confirm what was done (mention key parameters or findings).
2. If FAILURE: Apologize and explain the error clearly.
3. DO NOT mention "JSON" or unnecessary internal technical details.
4. If the result contains code or data, interpret it for the user.
5. BE CONCISE.
6. REPLY IN SPANISH.
`;
  }
};
