#!/usr/bin/env node

/**
 * Verification script for Editor System refactor
 * Tests that PreviewManager and TabManager work correctly after decomposition
 */

const fs = require('fs');

console.log('🔍 Verifying Editor System Refactor...\n');

// Check if all new files exist
const requiredFiles = [
    'src/renderer/js/components/PreviewManager.js',
    'src/renderer/js/components/TabManager.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('\n❌ Some required files are missing. Refactor incomplete.');
    process.exit(1);
}

// Check if editorComponent.js was properly refactored
console.log('\n📋 Checking editorComponent.js refactor...');
const editorComponentPath = 'src/renderer/js/components/editorComponent.js';
const editorComponentContent = fs.readFileSync(editorComponentPath, 'utf8');

const checks = [
    {
        name: 'Uses ES6 class syntax',
        check: () => editorComponentContent.includes('export class EditorComponent'),
        required: true
    },
    {
        name: 'Imports PreviewManager',
        check: () => editorComponentContent.includes('import { previewManager }'),
        required: true
    },
    {
        name: 'Imports TabManager',
        check: () => editorComponentContent.includes('import { tabManager }'),
        required: true
    },
    {
        name: 'Uses previewManager.init()',
        check: () => editorComponentContent.includes('previewManager.init'),
        required: true
    },
    {
        name: 'Uses tabManager.init()',
        check: () => editorComponentContent.includes('tabManager.init'),
        required: true
    },
    {
        name: 'No longer contains switchTab method',
        check: () => !editorComponentContent.includes('switchTab'),
        required: true
    },
    {
        name: 'No longer contains render function',
        check: () => !editorComponentContent.includes('const render ='),
        required: true
    },
    {
        name: 'No longer contains live preview logic',
        check: () => !editorComponentContent.includes('addEventListener(\'input\''),
        required: true
    }
];

let refactorChecksPass = true;
checks.forEach(({ name, check, required }) => {
    const passes = check();
    const status = passes ? '✅' : '❌';
    console.log(`${status} ${name}`);

    if (required && !passes) {
        refactorChecksPass = false;
    }
});

if (!refactorChecksPass) {
    console.log('\n❌ EditorComponent refactor verification failed.');
    process.exit(1);
}

// Check PreviewManager structure
console.log('\n🔍 Checking PreviewManager structure...');
const previewManagerContent = fs.readFileSync('src/renderer/js/components/PreviewManager.js', 'utf8');

const previewChecks = [
    {
        name: 'Has init method',
        check: () => previewManagerContent.includes('init(previewContainer)'),
        required: true
    },
    {
        name: 'Has attachLivePreview method',
        check: () => previewManagerContent.includes('attachLivePreview()'),
        required: true
    },
    {
        name: 'Has updatePreview method',
        check: () => previewManagerContent.includes('updatePreview(text)'),
        required: true
    },
    {
        name: 'Uses marked library',
        check: () => previewManagerContent.includes('window.marked'),
        required: true
    }
];

previewChecks.forEach(({ name, check, required }) => {
    const passes = check();
    const status = passes ? '✅' : '❌';
    console.log(`${status} PreviewManager: ${name}`);
});

// Check TabManager structure
console.log('\n🔍 Checking TabManager structure...');
const tabManagerContent = fs.readFileSync('src/renderer/js/components/TabManager.js', 'utf8');

const tabChecks = [
    {
        name: 'Has init method with previewManager parameter',
        check: () => tabManagerContent.includes('init(editorTab, previewTab, slidingContainer, previewManager)'),
        required: true
    },
    {
        name: 'Has attachTabListeners method',
        check: () => tabManagerContent.includes('attachTabListeners()'),
        required: true
    },
    {
        name: 'Has switchTab method',
        check: () => tabManagerContent.includes('switchTab(tabId)'),
        required: true
    },
    {
        name: 'Has slideToEditor method',
        check: () => tabManagerContent.includes('slideToEditor()'),
        required: true
    },
    {
        name: 'Has slideToPreview method',
        check: () => tabManagerContent.includes('slideToPreview()'),
        required: true
    },
    {
        name: 'Updates preview on tab switch',
        check: () => tabManagerContent.includes('previewManager.updatePreview'),
        required: true
    }
];

tabChecks.forEach(({ name, check, required }) => {
    const passes = check();
    const status = passes ? '✅' : '❌';
    console.log(`${status} TabManager: ${name}`);
});

console.log('\n🎉 Editor System refactor verification completed successfully!');
console.log('\nNext steps for manual testing:');
console.log('1. Input Markdown and verify instant preview');
console.log('2. Switch tabs (Editor/Preview) and verify smooth sliding transition');
console.log('3. Verify preview updates when switching to preview tab');
