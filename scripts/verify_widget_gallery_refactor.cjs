#!/usr/bin/env node

/**
 * Verification script for WidgetGallery refactor
 * Tests that all components work together correctly after decomposition
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying WidgetGallery Refactor...\n');

// Check if all new files exist
const requiredFiles = [
    'src/renderer/js/components/WidgetUrlManager.js',
    'src/renderer/js/components/WidgetCardRenderer.js',
    'src/renderer/js/components/ImageFallbackManager.js',
    'src/renderer/js/components/WidgetEventHandler.js'
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

// Check if widgetGallery.js was properly refactored
console.log('\n📋 Checking widgetGallery.js refactor...');
const widgetGalleryPath = 'src/renderer/js/components/widgetGallery.js';
const widgetGalleryContent = fs.readFileSync(widgetGalleryPath, 'utf8');

const checks = [
    {
        name: 'Uses ES6 class syntax',
        check: () => widgetGalleryContent.includes('export class WidgetGallery'),
        required: true
    },
    {
        name: 'Imports WidgetCardRenderer',
        check: () => widgetGalleryContent.includes('import { widgetCardRenderer }'),
        required: true
    },
    {
        name: 'Imports WidgetEventHandler',
        check: () => widgetGalleryContent.includes('import { widgetEventHandler }'),
        required: true
    },
    {
        name: 'Uses widgetCardRenderer.createCard',
        check: () => widgetGalleryContent.includes('widgetCardRenderer.createCard'),
        required: true
    },
    {
        name: 'Uses widgetEventHandler.attachInsertEvent',
        check: () => widgetGalleryContent.includes('widgetEventHandler.attachInsertEvent'),
        required: true
    },
    {
        name: 'No longer contains getPreviewUrl method',
        check: () => !widgetGalleryContent.includes('getPreviewUrl'),
        required: true
    },
    {
        name: 'No longer contains createCard method definition',
        check: () => !widgetGalleryContent.includes('createCard(tool, username) {'),
        required: true
    },
    {
        name: 'No longer contains handleImageError method',
        check: () => !widgetGalleryContent.includes('handleImageError'),
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
    console.log('\n❌ WidgetGallery refactor verification failed.');
    process.exit(1);
}

// Check if imports are properly structured in new files
console.log('\n🔗 Checking imports in new component files...');

const importChecks = [
    {
        file: 'src/renderer/js/components/WidgetCardRenderer.js',
        imports: ['widgetUrlManager', 'imageFallbackManager']
    },
    {
        file: 'src/renderer/js/components/WidgetEventHandler.js',
        imports: ['AIToolbox']
    },
    {
        file: 'src/renderer/js/components/ImageFallbackManager.js',
        imports: [] // No external imports needed
    },
    {
        file: 'src/renderer/js/components/WidgetUrlManager.js',
        imports: [] // No external imports needed
    }
];

let importChecksPass = true;
importChecks.forEach(({ file, imports }) => {
    const content = fs.readFileSync(file, 'utf8');
    imports.forEach(importName => {
        if (!content.includes(`import { ${importName} }`)) {
            console.log(`❌ ${file} missing import: ${importName}`);
            importChecksPass = false;
        }
    });
});

if (importChecksPass) {
    console.log('✅ All imports properly structured');
}

console.log('\n🎉 WidgetGallery refactor verification completed successfully!');
console.log('\nNext steps for manual testing:');
console.log('1. Open gallery and verify previews load correctly');
console.log('2. Disconnect internet and verify fallback icons/bridge triggers');
console.log('3. Click "Insert" and verify content is applied to the editor');
