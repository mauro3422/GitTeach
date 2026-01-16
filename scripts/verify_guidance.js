
import { IntentRouter } from '../src/renderer/js/services/ai/IntentRouter.js';
import { PromptBuilder } from '../src/renderer/js/services/promptBuilder.js';

// MOCK AI Function
const mockAI = async (prompt, input) => {
    console.log("--> AI Simulation: Thinking about inputs...");

    // Simulate Router Response dealing with an angry/confused user
    if (prompt.includes("OUTPUT FORMAT")) {
        return JSON.stringify({
            thought: "User seems frustrated with an error. Need to investigate but also calm them down.",
            tool: "chat",
            searchTerms: [],
            memorySource: null,
            chat_guidance: "Acknowledge the frustration first, then ask for the error logs gently."
        });
    }
    return "OK";
};

async function testGuidance() {
    console.log("🧠 VERIFYING STRATEGIC GUIDANCE PROTOCOL...\n");
    console.log("🔹 INPUT: '¡Esto es una basura! No funciona nada.'");

    // Patch ToolRegistry for the test (Router needs it)
    global.window = { AI_CONFIG: {} };
    const { ToolRegistry } = await import('../src/renderer/js/services/toolRegistry.js');
    ToolRegistry.tools = [{ id: 'chat', description: 'Chat' }];

    const result = await IntentRouter.route(
        "¡Esto es una basura! No funciona nada.",
        "User is angry.",
        mockAI
    );

    console.log("\n✅ ROUTER OUTPUT:");
    console.log(JSON.stringify(result, null, 2));

    if (result.chat_guidance === "Acknowledge the frustration first, then ask for the error logs gently.") {
        console.log("\n✨ SUCCESS: Strategic Guidance extracted correctly!");
    } else {
        console.error("\n❌ FAILURE: Guidance missing or incorrect.");
    }
}

testGuidance();
