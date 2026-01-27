/**
 * Sistema para acceder a las notas del diseñador en tiempo real
 * Este archivo proporciona funciones para leer las notas directamente del estado del diseñador
 */

// Función para encontrar el contenedor Auditor y sus nodos hijos
function findAuditorNotes() {
    // Esta función buscaría en el estado actual del diseñador
    // como se haría en el navegador
    
    console.log('Buscando notas en el contenedor Content Auditor...');
    
    // Acceder al estado del diseñador (esto se ejecutaría en el contexto del navegador)
    if (typeof DesignerStore !== 'undefined') {
        const nodes = DesignerStore.state.nodes;
        
        // Buscar el contenedor Auditor
        const auditorContainer = Object.values(nodes).find(node => 
            node.label && 
            (node.label.toLowerCase().includes('auditor') || 
             node.label.toLowerCase().includes('content auditor'))
        );
        
        if (auditorContainer) {
            console.log(`Contenedor encontrado: ${auditorContainer.label} (ID: ${auditorContainer.id})`);
            
            // Buscar nodos hijos con mensajes o texto
            const childNodes = Object.values(nodes).filter(node => 
                node.parentId === auditorContainer.id && 
                (node.message || node.text || node.isStickyNote)
            );
            
            if (childNodes.length > 0) {
                console.log(`Encontrados ${childNodes.length} nodos con contenido:`);
                childNodes.forEach(node => {
                    console.log(`- ${node.label} (ID: ${node.id})`);
                    if (node.message) console.log(`  Mensaje: "${node.message}"`);
                    if (node.text) console.log(`  Texto: "${node.text}"`);
                    if (node.isStickyNote) console.log(`  Tipo: Sticky Note`);
                });
            } else {
                console.log('No se encontraron nodos con contenido en el contenedor Auditor.');
                
                // Buscar en todos los nodos del contenedor
                const allContainerNodes = Object.values(nodes).filter(node => 
                    node.parentId === auditorContainer.id
                );
                
                console.log(`El contenedor tiene ${allContainerNodes.length} nodos hijos en total.`);
                allContainerNodes.forEach(node => {
                    console.log(`- ${node.label} (ID: ${node.id}): Sin mensaje/nota`);
                });
            }
        } else {
            console.log('No se encontró el contenedor Auditor en el estado actual.');
        }
    } else {
        console.log('DesignerStore no está disponible en este contexto.');
        console.log('Este script debe ejecutarse en el contexto del navegador donde está cargado el diseñador.');
    }
}

// Función para buscar notas en todos los nodos
function findAllNotes() {
    if (typeof DesignerStore !== 'undefined') {
        const nodes = DesignerStore.state.nodes;
        
        // Buscar todos los nodos con mensajes o texto
        const allNoteNodes = Object.values(nodes).filter(node => 
            node.message || node.text || node.isStickyNote
        );
        
        if (allNoteNodes.length > 0) {
            console.log(`Encontrados ${allNoteNodes.length} nodos con contenido:`);
            allNoteNodes.forEach(node => {
                console.log(`\n- ${node.label} (ID: ${node.id})`);
                console.log(`  Tipo: ${node.isRepoContainer ? 'Contenedor' : node.isStickyNote ? 'Sticky Note' : 'Nodo Regular'}`);
                if (node.message) console.log(`  Mensaje: "${node.message}"`);
                if (node.text) console.log(`  Texto: "${node.text}"`);
                if (node.parentId) {
                    const parentNode = nodes[node.parentId];
                    console.log(`  Padre: ${parentNode ? parentNode.label : 'Desconocido'}`);
                }
            });
        } else {
            console.log('No se encontraron nodos con contenido en el sistema.');
        }
    } else {
        console.log('DesignerStore no está disponible en este contexto.');
    }
}

// Si estamos en el navegador y el diseñador está cargado, ejecutar la búsqueda
if (typeof window !== 'undefined' && typeof DesignerStore !== 'undefined') {
    console.log('=== Sistema de Búsqueda de Notas Activo ===');
    findAuditorNotes();
    console.log('');
    findAllNotes();
} else {
    console.log('Para usar este sistema, debes ejecutar este código en la consola del navegador');
    console.log('donde está abierto el diseñador de pipeline.');
    console.log('');
    console.log('Instrucciones:');
    console.log('1. Abre el diseñador de pipeline en tu navegador');
    console.log('2. Abre la consola del desarrollador (F12)');
    console.log('3. Copia y pega este código en la consola');
    console.log('4. Presiona Enter para ejecutarlo');
}