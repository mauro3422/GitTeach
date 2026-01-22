const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const CHANGELOG_PATH = path.join(process.cwd(), 'CHANGELOG.md');

try {
    // 1. Read Changelog to get latest version and changes
    const changelogContent = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
    const versionMatch = changelogContent.match(/## \[(\d+\.\d+\.\d+)\] - (.*?) -/);

    if (!versionMatch) {
        console.error("❌ Could not find version in CHANGELOG.md");
        process.exit(1);
    }

    const version = versionMatch[1];
    const features = versionMatch[2];

    console.log(`🚀 Preparing to deploy version ${version}: ${features}`);

    // 2. Extract description for commit message (lines between first header and next header)
    const lines = changelogContent.split('\n');
    let commitBody = "";
    let capture = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith(`## [${version}]`)) {
            capture = true;
            continue;
        }
        if (capture && line.startsWith('## [')) {
            break;
        }
        if (capture && line.trim() !== '' && !line.startsWith('---')) {
            commitBody += line + '\n';
        }
    }

    // 3. Status check
    console.log("📊 Checking git status...");
    const status = execSync('git status --porcelain').toString();
    if (!status) {
        console.log("✨ No changes to commit.");
        process.exit(0);
    }

    // 4. Add all changes
    console.log("➕ Staging changes...");
    execSync('git add .');

    // 5. Commit
    const commitMessage = `v${version} - ${features}\n\n${commitBody.trim()}`;
    console.log("💾 Committing...");
    // Using a temporary file for commit message to handle newlines correctly on Windows
    const msgPath = path.join(process.cwd(), '.git', 'COMMIT_EDITMSG_AUTO');
    fs.writeFileSync(msgPath, commitMessage);
    execSync(`git commit -F "${msgPath}"`);
    fs.unlinkSync(msgPath);

    // 6. Push
    console.log("⬆️ Pushing to origin...");
    execSync('git push');

    console.log(`✅ Successfully deployed v${version}!`);

} catch (error) {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
}
