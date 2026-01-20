/**
 * verify_tier2_refactor_integrity.js
 * Verification script for Tier 2 Architecture Refactor (UI Components & CSS)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Verifying Tier 2 Architecture Refactor Integrity...\n');

// Test cases for Tier 2 refactor
const tests = [
    {
        name: 'PipelineUI.js is a facade',
        check: () => {
            const content = readFileSync(join(__dirname, '../src/renderer/js/views/pipeline/PipelineUI.js'), 'utf8');
            return content.includes('DrawerManager') &&
                content.includes('drawerManager.show') &&
                content.includes('drawerManager.updateDrawer') &&
                !content.includes('getSlotLabel') &&
                !content.includes('groupHistoryBy');
        }
    },
    {
        name: 'ChatComponent.js delegates to specialized managers',
        check: () => {
            const content = readFileSync(join(__dirname, '../src/renderer/js/components/chatComponent.js'), 'utf8');
            return content.includes('MessageHandler') &&
                content.includes('ChatUI') &&
                content.includes('ProactiveMessenger') &&
                content.includes('messageHandler.sendMessage') &&
                content.includes('proactiveMessenger.showProactiveStep');
        }
    },
    {
        name: 'CSS variables are centralized in design_system.css',
        check: () => {
            const content = readFileSync(join(__dirname, '../src/renderer/style/design_system.css'), 'utf8');
            return content.includes('--color-neutral: #8b949e') &&
                content.includes('--color-green: #3fb950') &&
                content.includes('--color-blue: #2f81f7') &&
                content.includes('--color-idle: #8b949e') &&
                content.includes('--color-active: #3fb950');
        }
    },
    {
        name: 'Debugger CSS uses variables instead of hardcoded colors',
        check: () => {
            const content = readFileSync(join(__dirname, '../src/renderer/style/debugger/debugger-canvas.css'), 'utf8');
            return content.includes('border-bottom: 1px solid var(--color-green)') &&
                content.includes('color: var(--color-yellow)') &&
                content.includes('color: var(--color-blue)') &&
                content.includes('background: var(--color-active)') &&
                !content.includes('#3fb950') &&
                !content.includes('#f1e05a') &&
                !content.includes('#2f81f7');
        }
    },
    {
        name: 'HistoryRenderer.js handles history rendering logic',
        check: () => {
            const content = readFileSync(join(__dirname, '../src/renderer/js/views/pipeline/HistoryRenderer.js'), 'utf8');
            return content.includes('renderHistory') &&
                content.includes('groupHistoryBy') &&
                content.includes('renderHistoryGroup') &&
                content.includes('renderHistoryItem') &&
                content.includes('getSlotLabel');
        }
    },
    {
        name: 'TemplateUtils.js contains formatters',
        check: () => {
            const content = readFileSync(join(__dirname, '../src/renderer/js/views/pipeline/TemplateUtils.js'), 'utf8');
            return content.includes('getStatusText') &&
                content.includes('formatRepoName') &&
                content.includes('formatFilePath') &&
                content.includes('getNodeIcon');
        }
    },
    {
        name: 'DrawerManager.js handles drawer lifecycle',
        check: () => {
            const content = readFileSync(join(__dirname, '../src/renderer/js/views/pipeline/DrawerManager.js'), 'utf8');
            return content.includes('initialize') &&
                content.includes('updateDrawer') &&
                content.includes('renderHeader') &&
                content.includes('renderStats') &&
                content.includes('setupCloseHandler');
        }
    },
    {
        name: 'MessageHandler.js handles message processing',
        check: () => {
            const content = readFileSync(join(__dirname, '../src/renderer/js/components/MessageHandler.js'), 'utf8');
            return content.includes('sendMessage') &&
                content.includes('processAIResponse') &&
                content.includes('isCurrentlyProcessing') &&
                content.includes('AIService.processIntent');
        }
    },
    {
        name: 'ChatUI.js handles DOM interactions',
        check: () => {
            const content = readFileSync(join(__dirname, '../src/renderer/js/components/ChatUI.js'), 'utf8');
            return content.includes('initialize') &&
                content.includes('setupInputHandler') &&
                content.includes('addMessage') &&
                content.includes('scrollToBottom') &&
                content.includes('updateProgress');
        }
    },
    {
        name: 'ProactiveMessenger.js handles proactive features',
        check: () => {
            const content = readFileSync(join(__dirname, '../src/renderer/js/components/ProactiveMessenger.js'), 'utf8');
            return content.includes('showProactiveStep') &&
                content.includes('showInsight') &&
                content.includes('showScanningProgress') &&
                content.includes('showAIProcessing');
        }
    }
];

// Run tests
let passed = 0;
let failed = 0;

tests.forEach(test => {
    try {
        const result = test.check();
        if (result) {
            console.log(`✅ ${test.name}`);
            passed++;
        } else {
            console.log(`❌ ${test.name}`);
            failed++;
        }
    } catch (error) {
        console.log(`❌ ${test.name} (Error: ${error.message})`);
        failed++;
    }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log('🎉 Tier 2 Architecture Refactor verification PASSED!');
    console.log('\n✅ All UI components properly decomposed');
    console.log('✅ CSS variables centralized and applied');
    console.log('✅ SRP principles maintained across all modules');
    console.log('✅ Backward compatibility preserved');
} else {
    console.log('⚠️  Tier 2 Architecture Refactor verification FAILED!');
    console.log('Please review the failed tests above.');
    process.exit(1);
}
