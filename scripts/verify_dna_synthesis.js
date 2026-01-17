import { DNASynthesizer } from '../src/renderer/js/services/curator/DNASynthesizer.js';

// Mock AIService to return valid JSON
import { AIService } from '../src/renderer/js/services/aiService.js';
AIService.callAI = async () => {
    return JSON.stringify({
        thought: "Thinking...",
        bio: "Bio...",
        traits: [],
        distinctions: [],
        signature_files: [],
        code_health: { logic_integrity: 80, knowledge_integrity: 80, details: "Good" },
        verdict: "Senior",
        tech_radar: { adopt: ["React"], trial: [], assess: [], hold: [] }
    });
};

const synthesizer = new DNASynthesizer();
const healthReport = {
    logic_health: { solid: 4, modularity: 4, complexity: 3 },
    knowledge_health: { clarity: 4, discipline: 4, depth: 3 },
    seniority_signals: { semantic: 4, resilience: 4, resources: 4, auditability: 4, domain_fidelity: 4 },
    extended_metadata: {
        dimensions: { social: 4.5, security: 3.2, testability: 5.0 },
        semantic: { top_contexts: ["Fintech"], top_frameworks: ["React"], dominant_maturity: "Stable" }
    }
};

synthesizer.synthesize("test user", [], { topStrengths: [], repoCount: 1 }, {}, 10, 5, healthReport, null)
    .then(result => {
        console.log("--- RESULT ---");
        console.log(JSON.stringify(result.dna, null, 2));

        if (result.dna.extended_metadata && result.dna.tech_radar) {
            console.log("\n✅ SUCCESS: DNA contains extended_metadata and tech_radar!");
        } else {
            console.error("\n❌ FAILURE: Missing new fields.");
        }
    })
    .catch(err => console.error(err));
