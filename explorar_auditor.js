/**
 * Script específico para explorar el contenedor "Auditor" y sus nodos hijos
 * Busca exhaustivamente cualquier mensaje o nota en el contenedor Content Auditor
 */

import { DesignerStore } from './src/renderer/js/views/pipeline/designer/modules/DesignerStore.js';

// Función para encontrar el contenedor Auditor
function findAuditorContainer() {
    const nodes = DesignerStore.state.nodes;
    
    // Buscar el contenedor Auditor por diferentes posibles nombres
    const possibleLabels = ['auditor', 'content auditor', 'audit'];
    
    for (const label of possibleLabels) {
        const container = Object.values(nodes).find(node => 
            node.label && 
            node.label.toLowerCase().includes(label) && 
            node.isRepoContainer
        );
        
        if (container) {
            return container;
        }
    }
    
    return null;
}

// Función para encontrar nodos hijos de un contenedor
function findChildNodes(containerId) {
    const nodes = DesignerStore.state.nodes;
    return Object.values(nodes).filter(node => node.parentId === containerId);
}

// Función para explorar recursivamente un contenedor y sus hijos
function exploreContainer(containerId, depth = 0) {
    const nodes = DesignerStore.state.nodes;
    const childNodes = Object.values(nodes).filter(node => node.parentId === containerId);
    
    const indent = '  '.repeat(depth);
    console.log(`${indent}Explorando contenedor ID: ${containerId}`);
    
    childNodes.forEach(node => {
        console.log(`${indent}  Nodo: ${node.label} (ID: ${node.id})`);
        console.log(`${indent}    Tipo: ${node.isRepoContainer ? 'Contenedor' : node.isStickyNote ? 'Nota Adhesiva' : 'Nodo Regular'}`);
        
        // Mostrar mensaje o texto si existe
        if (node.message && node.message.trim() !== '') {
            console.log(`${indent}    Mensaje: "${node.message}"`);
        }
        if (node.text && node.text.trim() !== '') {
            console.log(`${indent}    Texto: "${node.text}"`);
        }
        
        // Explorar recursivamente si es un contenedor
        if (node.isRepoContainer) {
            exploreContainer(node.id, depth + 1);
        }
    });
    
    return childNodes;
}

// Ejecutar la exploración
console.log('=== Explorando el contenedor Content Auditor y sus nodos hijos ===\n');

const auditorContainer = findAuditorContainer();

if (auditorContainer) {
    console.log(`Contenedor Auditor encontrado: ${auditorContainer.label} (ID: ${auditorContainer.id})`);
    console.log(`Posición: (${auditorContainer.x}, ${auditorContainer.y})`);
    console.log(`Es contenedor: ${auditorContainer.isRepoContainer}\n`);
    
    // Explorar el contenedor y sus hijos
    const childNodes = exploreContainer(auditorContainer.id);
    
    console.log(`\nTotal de nodos hijos encontrados: ${childNodes.length}`);
    
    // También buscar nodos específicos que podrían contener mensajes
    const nodesWithMessages = childNodes.filter(node => 
        (node.message && node.message.trim() !== '') || 
        (node.text && node.text.trim() !== '')
    );
    
    if (nodesWithMessages.length > 0) {
        console.log(`\nNodos con mensajes o texto encontrados:`);
        nodesWithMessages.forEach((node, index) => {
            console.log(`\n${index + 1}. ${node.label} (ID: ${node.id})`);
            if (node.message && node.message.trim() !== '') {
                console.log(`   Mensaje: "${node.message}"`);
            }
            if (node.text && node.text.trim() !== '') {
                console.log(`   Texto: "${node.text}"`);
            }
        });
    } else {
        console.log('\nNo se encontraron nodos con mensajes o texto en el contenedor Auditor.');
    }
} else {
    console.log('No se encontró el contenedor Auditor en el sistema.');
    
    // Como alternativa, buscar todos los nodos con mensajes en todo el sistema
    const allNodes = DesignerStore.state.nodes;
    const allNodesWithMessages = Object.values(allNodes).filter(node => 
        (node.message && node.message.trim() !== '') || 
        (node.text && node.text.trim() !== '') ||
        node.isStickyNote
    );
    
    console.log(`\nBuscando en todos los nodos del sistema...`);
    console.log(`Total de nodos con mensajes/notas/texto encontrados: ${allNodesWithMessages.length}`);
    
    allNodesWithMessages.forEach((node, index) => {
        console.log(`\n${index + 1}. ${node.label} (ID: ${node.id})`);
        console.log(`   Tipo: ${node.isRepoContainer ? 'Contenedor' : node.isStickyNote ? 'Nota Adhesiva' : 'Nodo Regular'}`);
        if (node.message && node.message.trim() !== '') {
            console.log(`   Mensaje: "${node.message}"`);
        }
        if (node.text && node.text.trim() !== '') {
            console.log(`   Texto: "${node.text}"`);
        }
        if (node.parentId) {
            const parentNode = allNodes[node.parentId];
            console.log(`   Padre: ${parentNode ? parentNode.label : 'Desconocido'} (ID: ${node.parentId})`);
        }
    });
}