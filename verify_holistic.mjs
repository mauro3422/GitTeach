import { HolisticSynthesizer } from './src/renderer/js/services/curator/HolisticSynthesizer.js';

// Mock Blueprints
const blueprints = [
    {
        repoName: "Repo A (Old Script)",
        timestamp: "2024-01-01T00:00:00Z",
        metrics: {
            logic: { solid: "1.0", modularity: "1.0" }, // Low Logic
            knowledge: { clarity: "3.0" }
        },
        domains: { "Scripting": 1 }
    },
    {
        repoName: "Repo B (New App)",
        timestamp: "2025-01-01T00:00:00Z",
        metrics: {
            logic: { solid: "4.0", modularity: "4.0" }, // High Logic
            knowledge: { clarity: "4.0" }
        },
        domains: { "Web": 1, "Architecture": 1 }
    }
];

const synthesizer = new HolisticSynthesizer();
const result = synthesizer.synthesize(blueprints);

console.log("=== HOLISTIC METRICS VERIFICATION ===");
console.log(JSON.stringify(result, null, 2));

// Assertions
if (result.versatility_index > 50) console.log("✅ Versatility Detected");
if (result.evolution_rate.includes("+")) console.log("✅ Positive Evolution Detected");
if (result.domain_dominance.length > 0) console.log("✅ Domain Dominance Calculated");
