/**
 * ClassificationRules - Static dictionaries and regex patterns for file classification
 */

export const BINARY_EXTENSIONS = new Set([
    '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp',
    '.ttf', '.woff', '.woff2', '.eot', '.otf',
    '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.avi',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx'
]);

export const NOISE_EXTENSIONS = new Set([
    '.log', '.lock', '.gitignore', '.gitattributes', '.editorconfig',
    '.npmignore', '.dockerignore', '.prettierignore', '.eslintignore',
    '.txt', '.env', '.jsonl'
]);

export const NOISE_FILENAMES = new Set([
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock',
    'gemfile.lock', 'poetry.lock', 'cargo.lock', 'pubspec.lock',
    '.ds_store', 'thumbs.db', 'desktop.ini'
]);

export const CHANGELOG_PATTERNS = [
    'changelog', 'changes', 'history', 'release', 'news'
];

export const DOMAIN_PATTERNS = [
    // Testing/Scripting
    { pattern: /chromium\.launch|puppeteer|playwright|page\.goto|browser\.newPage/i, domain: 'Script/Testing' },
    { pattern: /describe\s*\(|it\s*\(|test\s*\(|expect\s*\(|jest|mocha|vitest/i, domain: 'Testing' },

    // Game Engine
    { pattern: /raylib|sfml|sdl|gameloop|update.*render|physics.*engine/i, domain: 'Game Engine' },
    { pattern: /extends\s+Node2D|extends\s+KinematicBody|func\s+_process|\.gd$/i, domain: 'Godot Game Engine' },
    { pattern: /pygame|arcade\.run|sprite\.group/i, domain: 'Game Engine (Python)' },

    // UI/Frontend
    { pattern: /react|vue|angular|svelte|usestate|useeffect|component/i, domain: 'UI/Frontend' },
    { pattern: /\<style\>|\<div\>|\<template\>/i, domain: 'UI/Web' },

    // Backend
    { pattern: /express\(|fastapi|flask|django|koa|app\.listen/i, domain: 'Backend/API' },
    { pattern: /router\.|middleware|req\s*,\s*res/i, domain: 'Backend' },

    // DevOps
    { pattern: /dockerfile|docker-compose|kubernetes|k8s|helm/i, domain: 'DevOps' },
    { pattern: /github\.com.*actions|workflow.*on:|jobs:|runs-on:/i, domain: 'CI/CD' },

    // Data
    { pattern: /pandas|numpy|tensorflow|pytorch|sklearn|matplotlib/i, domain: 'Data Science/ML' },

    // Science/Simulation
    { pattern: /molecule|atomic|physics|chemistry|formula|simulation|vsepr/i, domain: 'Science/Simulation' },

    // Business/Enterprise
    { pattern: /hospital|patient|doctor|medicina|obra\s*social|ticket|billing|invoice|payroll|inventory/i, domain: 'Business/Management' },
    { pattern: /client|customer|member|appointment|reservation|booking/i, domain: 'Enterprise/Systems' },

    // Configuration & Meta
    { pattern: /^\s*\{[\s\S]*"name"\s*:[\s\S]*"version"\s*:/i, domain: 'Configuration/Boilerplate', skipWorthy: true },
    { pattern: /antigravity_cache_summary|session_report|AI_LOG/i, domain: 'Meta/Session', skipWorthy: true }
];
