import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * import-integrity.test.js
 * Scans all files in the designer directory and verifies that local imports exist.
 */
describe('Import Integrity Audit', () => {
    const designerPath = path.resolve(__dirname, '../src/renderer/js/views/pipeline/designer');

    const getAllFiles = (dirPath, arrayOfFiles = []) => {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            if (fs.statSync(dirPath + "/" + file).isDirectory()) {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
            } else if (file.endsWith('.js')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        });

        return arrayOfFiles;
    };

    const designerFiles = getAllFiles(designerPath);

    designerFiles.forEach((file) => {
        const relativePath = path.relative(designerPath, file);

        it(`should have valid imports in ${relativePath}`, () => {
            const content = fs.readFileSync(file, 'utf8');
            const importRegex = /import\s+(?:.*from\s+)?['"](\.\/|\.\.\/)(.*\.js)['"]/g;
            let match;

            while ((match = importRegex.exec(content)) !== null) {
                const importPath = match[1] + match[2];
                const absoluteImportPath = path.resolve(path.dirname(file), importPath);

                const exists = fs.existsSync(absoluteImportPath);
                if (!exists) {
                    throw new Error(`Broken import in ${relativePath}: ${importPath} -> ${absoluteImportPath} not found`);
                }
                expect(exists).toBe(true);
            }
        });
    });
});
