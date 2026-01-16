import fs from 'fs';
import path from 'path';
import os from 'os';

const APPDATA = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share');
const GITEACH_PATH = path.join(APPDATA, 'giteach');

const FILES_TO_DELETE = [
    'technical_identity.json',
    'cognitive_profile.json',
    'curation_evidence.json'
];

console.log(`\n🧹 Starting Clean Memory Reset at ${GITEACH_PATH}...\n`);

FILES_TO_DELETE.forEach(file => {
    const filePath = path.join(GITEACH_PATH, file);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted: ${file}`);
        } catch (e) {
            console.error(`❌ Error deleting ${file}: ${e.message}`);
        }
    } else {
        console.log(`ℹ️ Not found (skipping): ${file}`);
    }
});

console.log('\n✨ Memory reset complete. Repo cache (repo_cache.json) was PRESERVED.\n');
