
// Minimal RAG Reasoning Verification (Zero Dependencies)
// Run with: node scripts/verify_reasoning.js

const AI_CONFIG = {
    endpoint: 'http://localhost:8000/v1/chat/completions'
};

// --- PROMPT LOGIC (Replicating PromptBuilder.js) ---
function getRouterPrompt() {
    // Mini mock catalog
    const tools = [
        { id: 'query_memory', description: 'REQUIRED for any task involving: Generating READMEs, Writing Documentation, Summarizing Code. Retrieves technical context.' },
        { id: 'read_file', description: 'Reads a specific file from disk.' },
        { id: 'chat', description: 'General chat interactions.' }
    ];

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
}

// --- AI CALL (Native Node 22 Fetch) ---
async function callAI(prompt, input) {
    console.log("SENDING REQUEST TO AI...");
    try {
        const payload = {
            model: "lfm2.5",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: input }
            ],
            temperature: 0.0,
            response_format: { type: "json_object" }
        };

        const response = await fetch(AI_CONFIG.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content;

    } catch (e) {
        console.error("AI CONNECTION FAILED:", e.message);
        return null;
    }
}

// --- MAIN TEST ---
async function run() {
    console.log("🧠 VERIFYING REASONING PROTOCOL (Thinking Agent)...\n");

    const input = "Generame un README para mi perfil";
    console.log(`🔹 INPUT: "${input}"`);

    const prompt = getRouterPrompt();
    const resultRaw = await callAI(prompt, input);

    if (resultRaw) {
        try {
            const result = JSON.parse(resultRaw);
            console.log("\n✅ AI RESPONSE RECEIVED:");
            console.log("---------------------------------------------------");
            console.log(`🧠 THOUGHT:  "${result.thought}"`);
            console.log(`🔧 TOOL:     "${result.tool}"`);
            console.log("---------------------------------------------------");

            if (result.thought && result.tool === 'query_memory') {
                console.log("\n🚀 SUCCESS: The AI reasoned correctly and selected the Memory Tool!");
            } else {
                console.log("\n⚠️ WARN: Logic seems off context.", result);
            }
        } catch (e) {
            console.log("Failed to parse JSON:", resultRaw);
        }
    }
}

run();
