/**
 * Script para leer las notas del contenedor "Auditor" en el diseñador de pipeline
 * Este script busca específicamente las notas que dejaste en el contenedor Content Auditor
 */

import { NotesExtractor } from './src/renderer/js/views/pipeline/designer/modules/NotesExtractor.js';

// Leer todos los nodos con mensajes/notas en el contenedor de auditoría
console.log('=== Buscando nodos con mensajes/notas en el contenedor de Auditoría ===');
const auditorNodes = NotesExtractor.readAuditorNotes();

if (auditorNodes.length > 0) {
    console.log('\n=== Detalles de los nodos encontrados ===');
    auditorNodes.forEach((node, index) => {
        const details = NotesExtractor.getNodeDetails(node);
        console.log(`\n${index + 1}. Nodo encontrado:`);
        console.log(`   ID: ${details.id}`);
        console.log(`   Etiqueta: ${details.label}`);
        console.log(`   Tipo: ${details.isStickyNote ? 'Sticky Note' : 'Mensaje de Nodo'}`);
        if (details.text) {
            console.log(`   Texto: "${details.text}"`);
        }
        if (details.message) {
            console.log(`   Mensaje: "${details.message}"`);
        }
        console.log(`   Contenedor Padre: ${details.parentContainer?.label || 'Ninguno'}`);
        console.log(`   Nodo Raíz: ${details.rootNode.label}`);
    });
} else {
    console.log('\nNo se encontraron nodos con mensajes/notas en el contenedor de auditoría.');
    console.log('Intentando buscar en todos los nodos del sistema...');

    // Buscar en todos los nodos del sistema
    const allNoteSources = NotesExtractor.readAllNoteSources();

    if (allNoteSources.length > 0) {
        console.log(`\nSe encontraron ${allNoteSources.length} nodos con mensajes o notas en total en el sistema.`);
    } else {
        console.log('No se encontraron nodos con mensajes o notas en ningún lugar del sistema.');
    }
}

// También buscar nodos específicos que puedan estar relacionados con comentarios tuyos
console.log('\n=== Buscando nodos con contenido específico ===');
const possibleKeywords = ['mensaje', 'nota', 'comentario', 'deja', 'aquí', 'dije', 'recuerda', 'atención', 'importante'];

for (const keyword of possibleKeywords) {
    const foundNode = NotesExtractor.findNodeByContent(keyword);
    if (foundNode) {
        console.log(`\nEncontrado nodo con palabra clave "${keyword}":`);
        console.log(`   Etiqueta: "${foundNode.label}"`);
        if (foundNode.text) {
            console.log(`   Texto: "${foundNode.text}"`);
        }
        if (foundNode.message) {
            console.log(`   Mensaje: "${foundNode.message}"`);
        }
        console.log(`   Tipo: ${foundNode.isStickyNote ? 'Sticky Note' : 'Mensaje de Nodo'}`);
        console.log(`   En contenedor: ${foundNode.parentContainer?.label || 'Ninguno'}`);
        console.log(`   Nodo raíz: ${foundNode.rootNode.label}`);
        break; // Mostrar solo la primera coincidencia significativa
    }
}