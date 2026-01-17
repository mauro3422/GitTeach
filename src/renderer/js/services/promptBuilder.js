/**
 * PromptBuilder - Centraliza la lógica de generación de prompts para evitar hardcoding.
 * Permite que tanto la App como los scripts de test compartan la misma lógica.
 */
export const PromptBuilder = {
  /**
   * AGENTE 1: ROUTER
   * Decide QUÉ herramienta usar basándose en ejemplos dinámicos.
   * Salida estrictamente JSON para aprovechar el entrenamiento del modelo.
   */
  getRouterPrompt(tools) {
    const toolDescriptions = tools.map(t => {
      const schemaStr = Object.keys(t.schema).length > 0 ? ` [PARAMS: ${JSON.stringify(t.schema)}]` : '';
      return `- ${t.id}: ${t.description}${schemaStr}`;
    }).join('\n');

    return `SYSTEM: You are an Intent Classifier for GitTeach. You ONLY output valid JSON.

=== COGNITIVE VACCINES (Anti-Hallucination) ===
- "README" means generating documentation, NOT reading a file.
- "generate/crear/escribir" = ALWAYS needs context from memory.
- Chat is ONLY for greetings, jokes, or truly general questions.

**IMPERATIVE RULE**: If your thought mentions "context", "information", "project data", "codebase", "generate", "create", "write", or "documentation" → YOU MUST SELECT "query_memory". Do NOT invent new tools or use "chat".

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

User: "Lee el archivo utils.py"
JSON: {
  "thought": "User wants to read a specific file path.",
  "tool": "read_file",
  "searchTerms": [],
  "memorySource": null
}

User: "¿Qué tal mis hábitos de nombrado y modularidad?"
JSON: {
  "thought": "User is asking for coding habits. This is a thematic analysis layer.",
  "tool": "query_thematic_analysis",
  "params": { "subType": "habits" },
  "searchTerms": ["coding habits", "naming conventions", "modularity"],
  "memorySource": "curated"
}

User: "Dime mi puntaje de SOLID y Clean Code"
JSON: {
  "thought": "Technical metrics question about SOLID and general health.",
  "tool": "query_technical_metrics",
  "params": { "subType": "logic" },
  "searchTerms": ["solid", "clean code", "logic health"],
  "memorySource": "curated"
}

User: "Hola, cómo estás?"
JSON: {
  "thought": "Simple greeting, no external data needed.",
  "tool": "chat",
  "searchTerms": [],
  "memorySource": null
}

=== OUTPUT FORMAT (JSON ONLY) ===
{
  "thought": "Internal step-by-step reasoning about the user's hidden needs.",
  "tool": "TOOL_ID",
  "params": { "subType": "value", "...": "..." },
  "searchTerms": ["term1", "term2"],
  "memorySource": "vectors|curated|dna|all|null",
  "whisper_to_chat": "Strategic advice for the Chat Agent."
}

CRITICAL RULES:
1. "thought": EXPLAIN what you discovered in the user's intent vs their profile.
2. "whisper_to_chat": Strategic advice for the Voice.
3. "searchTerms": ALWAYS in English.
`;
  },

  /**
   * AGENTE 2: CONSTRUCTOR
   * Genera el JSON final para una herramienta específica (Few-Shot).
   */
  getConstructorPrompt(tool) {
    const fields = Object.keys(tool.schema).map(k => `- ${k} (${tool.schema[k]})`).join('\n');
    return `You are an Expert Parameter Extractor for the tool "${tool.id}".
Your ONLY job is to extract data from the user input to fill this JSON.

VARIABLES TO EXTRACT:
${fields}

EXAMPLE:
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

YOUR TURN:
Reply ONLY with the valid JSON.
`;
  },

  /**
   * Generates the prompt for the Responder Agent (ReAct - Observer Phase).
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
1. If SUCCESS: Briefly confirm what was done.
2. If FAILURE: Apologize and explain the error clearly.
3. REPLY IN SPANISH.
`;
  }
};