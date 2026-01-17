
import { TracerEnvironment } from './scripts/tools/tracer/TracerEnvironment.js';

TracerEnvironment.setupHighlanderProtocol(); // Mocks window

console.log("Attempting to import ProfileAnalyzer...");
try {
    const { ProfileAnalyzer } = await import('./src/renderer/js/services/profileAnalyzer.js');
    console.log("Import SUCCESS");
    const p = new ProfileAnalyzer();
    console.log("Instantiation SUCCESS");
} catch (e) {
    console.error("Import FAILED:", e);
}
