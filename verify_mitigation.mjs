/**
 * Logic Verification Script
 * Validates that SkipManager catches the known "inflation" files
 * and that WorkerPromptBuilder parses the new CoT format correctly.
 */
import { SkipManager } from './src/renderer/js/utils/classifier/SkipManager.js';
import { WorkerPromptBuilder } from './src/renderer/js/services/workers/WorkerPromptBuilder.js';

const testFiles = {
    'antigravity_cache_summary.txt': 'Session summary with AI logs and some paths...',
    'verify_sliding_tab_offset.py': 'print("Verification COMPLETE")\nif len(list) == 6: pass',
    'hospital_guide.md': '# Hospital Installation Guide\nThis is a text guide for medical staff.',
    'real_logic.js': 'export class Processor { constructor() { this.data = []; } process(item) { return item.map(x => x * 2); } }'
};

console.log('--- TESTING SKIPMANAGER ---');
for (const [file, content] of Object.entries(testFiles)) {
    const result = SkipManager.shouldSkip(file, content);
    console.log(`File: ${file} | Skip: ${result.skip} | Reason: ${result.reason || 'N/A'}`);
}

console.log('\n--- TESTING COT PARSER ---');
const builder = new WorkerPromptBuilder();
const mockAIPostThinking = `
<thinking>
The file hospital_guide.md is purely descriptive text for installation.
It does not contain any executable logic or technical skill.
Verdict: SKIP.
</thinking>

[SKIP] | [CONF:1.0] | [COMP:1]
SUMMARY: Installation guide for hospital system.
METRICS: {"solid": 0, "modularity": 0, "readability": 0, "patterns": []}
EVIDENCE: Hospital Installation Guide
`;

const parsed = builder.parseResponse(mockAIPostThinking);
console.log('Parsed [SKIP] with <thinking>:', parsed?.tool === 'skip' ? 'SUCCESS' : 'FAILED');

const mockAILogic = `
<thinking>
This file implements a data processing class.
It shows basic moderate complexity and modularity.
</thinking>

[Backend] | [CONF:0.9] | [COMP:3]
SUMMARY: Implements a Processor class for data mapping.
METRICS: {"solid": 4, "modularity": 3, "readability": 4, "patterns": ["map"]}
EVIDENCE: export class Processor
`;

const parsedLogic = builder.parseResponse(mockAILogic);
console.log('Parsed Logic with <thinking>:', parsedLogic?.params?.insight === 'Implements a Processor class for data mapping.' ? 'SUCCESS' : 'FAILED');
console.log('Metrics parsed:', JSON.stringify(parsedLogic?.params?.metadata));
