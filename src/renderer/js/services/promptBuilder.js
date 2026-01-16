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
    const toolDescriptions = tools.map(t => `- ${t.id}: ${t.description}`).join('\n');

    // LFM2 Optimized: Step-Based Extraction + Cognitive Vaccines + JSON Schema
    return `SYSTEM: You are an Intent Classifier for GitTeach. You ONLY output valid JSON.

=== COGNITIVE VACCINES (Anti-Hallucination) ===
- "README" means generating documentation, NOT reading a file.
- "generate/crear/escribir" = ALWAYS needs context from memory.
- Chat is ONLY for greetings, jokes, or truly general questions.

=== STEP-BASED CLASSIFICATION ===
STEP 1: Identify the USER INTENT (What do they want?)
STEP 2: Does this intent require EXTERNAL DATA? (Yes/No)
STEP 3: Select the appropriate tool and memory source.

=== MEMORY SOURCES ===
- "vectors": Raw technical findings from workers (for specific code questions)
- "curated": Grouped insights by domain (for project overviews, README)
- "dna": Developer profile and identity (for bio, "who am I", strengths)
- "all": Combine all sources (for comprehensive documentation)

=== TOOL CATALOG ===
${toolDescriptions}

=== EXAMPLES ===
User: "Generame un README para mi perfil"
JSON: {
  "thought": "User wants to generate a README. Needs curated project overview.",
  "tool": "query_memory",
  "searchTerms": ["architecture", "main features", "tech stack", "project purpose"],
  "memorySource": "curated"
}

User: "¿Cómo funciona el sistema de login?"
JSON: {
  "thought": "Specific technical question about login. Needs raw vector search.",
  "tool": "query_memory",
  "searchTerms": ["authentication", "login", "session", "security"],
  "memorySource": "vectors"
}

User: "Escribe una bio basada en mi código"
JSON: {
  "thought": "User wants a bio reflecting their identity. Needs DNA profile.",
  "tool": "query_memory",
  "searchTerms": ["developer identity", "coding style", "strengths"],
  "memorySource": "dna"
}

User: "Hola, cómo estás?"
JSON: {
  "thought": "Simple greeting, no external data needed.",
  "tool": "chat",
  "searchTerms": [],
  "memorySource": null
}

User: "Lee el archivo utils.py"
JSON: {
  "thought": "User wants to read a specific file path.",
  "tool": "read_file",
  "searchTerms": [],
  "memorySource": null
}

=== OUTPUT FORMAT (JSON ONLY) ===
{
  "thought": "Internal step-by-step reasoning about the user's hidden needs.",
  "tool": "TOOL_ID",
  "searchTerms": ["term1", "term2"],
  "memorySource": "vectors|curated|dna|all|null",
  "whisper_to_chat": "Strategic advice for the Chat Agent. Example: 'Connect his obsession with O(1) efficiency to this specific code question'."
}

CRITICAL RULES:
1. "thought": EXPLAIN what you discovered in the user's intent vs their profile.
2. "whisper_to_chat": This is the 'Brain' talking to the 'Voice'. Give the Chat Agent a secret insight or strategic angle to win over the user. Focus on their DEVELOPER IDENTITY.
3. "searchTerms": ALWAYS in English. Translate user concepts (e.g. "entrada" -> "login", "crear" -> "create").
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
