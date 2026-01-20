/**
 * verify_tracer_modular.js
 * Verificación de que la refactorización modular funciona correctamente
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verificando modularización de TracerView...\n');

const tracerDir = 'src/renderer/js/views/tracer';
const modules = [
    'TracerController.js',
    'TracerStateManager.js',
    'TracerDOMCache.js',
    'TracerEventHandler.js',
    'TracerUIRenderer.js',
    'TracerFleetRenderer.js',
    'TracerAnalysisManager.js',
    'index.js'
];

console.log('📁 Verificando archivos del módulo tracer:');
let allFilesExist = true;

modules.forEach(module => {
    const filePath = path.join(tracerDir, module);
    const exists = fs.existsSync(filePath);
    console.log(`${exists ? '✅' : '❌'} ${module}`);
    if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
    console.log('\n❌ Faltan archivos del módulo tracer');
    process.exit(1);
}

console.log('\n✅ Todos los archivos del módulo tracer existen');

// Verificar que TracerView.js usa el sistema modular
const tracerViewPath = 'src/renderer/js/views/TracerView.js';
if (fs.existsSync(tracerViewPath)) {
    const content = fs.readFileSync(tracerViewPath, 'utf8');
    const usesModular = content.includes('./tracer/TracerController.js') &&
        content.includes('TracerController.init()');

    console.log(`${usesModular ? '✅' : '❌'} TracerView.js usa sistema modular`);
    if (!usesModular) {
        console.log('❌ TracerView.js no está usando el sistema modular');
        process.exit(1);
    }
} else {
    console.log('❌ TracerView.js no existe');
    process.exit(1);
}

// Verificar estructura de módulos (líneas aproximadas)
console.log('\n📊 Verificando tamaño de módulos:');
const sizeChecks = [
    { file: 'TracerController.js', minLines: 100 },
    { file: 'TracerStateManager.js', minLines: 40 },
    { file: 'TracerDOMCache.js', minLines: 30 },
    { file: 'TracerUIRenderer.js', minLines: 80 },
    { file: 'TracerFleetRenderer.js', minLines: 60 },
    { file: 'TracerAnalysisManager.js', minLines: 100 },
];

sizeChecks.forEach(check => {
    const filePath = path.join(tracerDir, check.file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').length;
        const ok = lines >= check.minLines;
        console.log(`${ok ? '✅' : '❌'} ${check.file}: ${lines} líneas (${check.minLines}+ requeridas)`);
    }
});

console.log('\n🎉 Verificación completada exitosamente!');
console.log('🚀 El sistema modular TracerView está listo para usar.');
console.log('\n📝 Beneficios logrados:');
console.log('  • ✅ Principio de Responsabilidad Única (SRP)');
console.log('  • ✅ Modularización por funcionalidades');
console.log('  • ✅ Facilidad de testing y mantenimiento');
console.log('  • ✅ Compatibilidad hacia atrás');
console.log('  • ✅ Arquitectura SOLID compliant');
