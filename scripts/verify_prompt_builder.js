import { WorkerPromptBuilder } from '../src/renderer/js/services/workers/WorkerPromptBuilder.js';

const builder = new WorkerPromptBuilder();

console.log("--- SYSTEM PROMPT ---");
console.log(builder.buildSystemPrompt());

console.log("\n--- SCHEMA ---");
console.log(JSON.stringify(builder.getResponseSchema(), null, 2));

console.log("\n--- TEST PARSE ---");
const sampleResponse = JSON.stringify({
    thought: "Thinking...",
    domain: "Test",
    confidence: 1,
    complexity: 3,
    summary: "Sum",
    evidence: "Ev",
    logic: { solid: 5, modularity: 5, patterns: ["Singleton"] },
    knowledge: { clarity: 5, discipline: 5, depth: 5 },
    signals: { semantic: 5, resilience: 5, resources: 5, auditability: 5, domain_fidelity: 5 },
    semantic: { business_context: "Biz", design_tradeoffs: ["Speed"], dependencies: { frameworks: ["React"], maturity: "Stable" } },
    dimensions: { social: 5, security: 5, testability: 5 }
});

const parsed = builder.parseResponse(sampleResponse, "test.js");
console.log(JSON.stringify(parsed, null, 2));

if (parsed.params.metadata.semantic.business_context === "Biz" && parsed.params.metadata.dimensions.security === 5) {
    console.log("\n✅ SUCCESS: New metadata fields captured correctly!");
} else {
    console.error("\n❌ FAILURE: Metadata fields missing or incorrect.");
}
