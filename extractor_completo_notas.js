/**
 * Sistema para extraer todas las notas del diseñador
 * Este script busca en todos los nodos del sistema para encontrar mensajes/notas
 */

function extractAllNotes() {
    console.log('=== EXTRACTOR DE NOTAS DEL SISTEMA ===\n');
    
    // Verificar si estamos en el contexto correcto
    if (typeof DesignerStore === 'undefined') {
        console.log('ERROR: DesignerStore no está disponible.');
        console.log('Este script debe ejecutarse en la consola del navegador donde está abierto el diseñador.');
        return;
    }
    
    const nodes = DesignerStore.state.nodes;
    const nodesWithMessages = [];
    
    // Buscar todos los nodos que tengan mensajes o texto
    for (const [id, node] of Object.entries(nodes)) {
        if (node.message || node.text || node.isStickyNote) {
            nodesWithMessages.push({
                id: id,
                label: node.label,
                message: node.message || '',
                text: node.text || '',
                isStickyNote: node.isStickyNote || false,
                isRepoContainer: node.isRepoContainer || false,
                parentId: node.parentId || null,
                position: { x: node.x, y: node.y }
            });
        }
    }
    
    console.log(`Se encontraron ${nodesWithMessages.length} nodos con notas/mensajes:\n`);
    
    // Buscar específicamente el contenedor "Content Auditor"
    const contentAuditor = Object.values(nodes).find(node => 
        node.label && node.label.toLowerCase().includes('content auditor')
    );
    
    if (contentAuditor) {
        console.log(`🎯 CONTENEDOR CONTENT AUDITOR ENCONTRADO:`);
        console.log(`   ID: ${contentAuditor.id}`);
        console.log(`   Etiqueta: ${contentAuditor.label}`);
        console.log(`   Posición: (${contentAuditor.x}, ${contentAuditor.y})\n`);
        
        // Buscar nodos hijos del Content Auditor
        const childrenOfAuditor = nodesWithMessages.filter(node => 
            node.parentId === contentAuditor.id
        );
        
        if (childrenOfAuditor.length > 0) {
            console.log(`   📝 NOTAS ENCONTRADAS DENTRO DEL CONTENT AUDITOR:`);
            childrenOfAuditor.forEach((node, index) => {
                console.log(`     ${index + 1}. ${node.label} (ID: ${node.id})`);
                if (node.message) console.log(`        Mensaje: "${node.message}"`);
                if (node.text) console.log(`        Texto: "${node.text}"`);
                console.log(`        Tipo: ${node.isStickyNote ? 'Sticky Note' : 'Mensaje de Nodo'}`);
            });
        } else {
            console.log(`   ℹ️  No se encontraron notas específicas dentro del Content Auditor.`);
            
            // Pero mostrar todos sus nodos hijos (aunque no tengan mensajes)
            const allChildrenOfAuditor = Object.values(nodes).filter(node => 
                node.parentId === contentAuditor.id
            );
            
            if (allChildrenOfAuditor.length > 0) {
                console.log(`   ℹ️  El contenedor tiene ${allChildrenOfAuditor.length} nodos hijos:`);
                allChildrenOfAuditor.forEach((node, index) => {
                    console.log(`     ${index + 1}. ${node.label} (ID: ${node.id}) - Sin mensaje/nota`);
                });
            }
        }
        console.log('');
    } else {
        console.log('⚠️  No se encontró el contenedor "Content Auditor" en el sistema.\n');
    }
    
    // Mostrar todas las notas encontradas en el sistema
    if (nodesWithMessages.length > 0) {
        console.log('📋 TODAS LAS NOTAS ENCONTRADAS EN EL SISTEMA:');
        nodesWithMessages.forEach((node, index) => {
            const parentLabel = node.parentId ? (nodes[node.parentId]?.label || 'Desconocido') : 'Ninguno';
            console.log(`\n${index + 1}. ${node.label} (ID: ${node.id})`);
            console.log(`   Tipo: ${node.isStickyNote ? 'Sticky Note' : 'Mensaje de Nodo'}`);
            if (node.message) console.log(`   Mensaje: "${node.message}"`);
            if (node.text) console.log(`   Texto: "${node.text}"`);
            console.log(`   Contenedor Padre: ${parentLabel} (ID: ${node.parentId || 'N/A'})`);
            console.log(`   Posición: (${node.position.x}, ${node.position.y})`);
        });
    } else {
        console.log('❌ No se encontraron notas en ningún nodo del sistema.');
    }
    
    console.log('\n=== FIN DEL EXTRACTOR ===');
    
    // Devolver las notas para posible uso posterior
    return nodesWithMessages;
}

// Ejecutar la función
const todasLasNotas = extractAllNotes();

// Opcional: Guardar las notas en una variable global para inspección
if (typeof window !== 'undefined') {
    window.todasLasNotasDelSistema = todasLasNotas;
}