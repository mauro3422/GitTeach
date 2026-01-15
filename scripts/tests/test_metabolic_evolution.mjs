/**
 * TEST: Metabolic Evolution 🧬
 * Verifies that the MetabolicAgent correctly detects changes between DNA states.
 */
import { MetabolicAgent } from '../../src/renderer/js/services/metabolicAgent.js';

const metabolic = new MetabolicAgent();

const oldDNA = {
    bio: "Mauro is a JavaScript developer.",
    traits: [
        { name: "Architecture", score: 50 },
        { name: "UI", score: 30 }
    ],
    anomalies: ["Short readme"]
};

const newCuration = {
    bio: "Mauro is a Senior Architect with many skills.",
    traits: [
        { name: "Architecture", score: 75 }, // +25 (Significant)
        { name: "UI", score: 32 },           // +2 (Insignificant)
        { name: "Vulkan/C++", score: 80 }    // NEW (Significant)
    ],
    anomalies: ["Short readme", "Python in JS folder"] // +1 NEW
};

console.log("🧪 Starting Metabolic Agent Test...");

const { finalDNA, report, isSignificant } = metabolic.digest(oldDNA, newCuration);

console.log("   - [REPORT] New Skills:", report.newSkills);
console.log("   - [REPORT] Score Changes:", report.scoreChanges);
console.log("   - [REPORT] New Anomalies:", report.newAnomalies.length);
console.log("   - [STATUS] Is Significant:", isSignificant);

if (isSignificant && report.newSkills.includes("Vulkan/C++") && report.scoreChanges.some(c => c.name === "Architecture")) {
    console.log("✅ SUCCESS: Significant changes detected correctly.");
} else {
    console.log("❌ FAILURE: Changes not detected as expected.");
    process.exit(1);
}

const prompt = metabolic.generateMetabolicPrompt(report, "Mauro");
console.log("\n💬 Generated Prompt:\n", prompt);

if (prompt.includes("DNA_EVOLUTION_DETECTED") && prompt.includes("Vulkan/C++")) {
    console.log("✅ SUCCESS: Proactive prompt is correct.");
} else {
    console.log("❌ FAILURE: Prompt generation failed.");
    process.exit(1);
}

console.log("\n✨ TEST COMPLETE.");
