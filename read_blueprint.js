import fs from 'fs';

try {
    const blueprintPath = 'designer_blueprint.json';
    console.log('🔍 Leyendo blueprint guardado:', blueprintPath);

    if (!fs.existsSync(blueprintPath)) {
        console.log('❌ No se encontró el blueprint');
        process.exit(1);
    }

    const data = fs.readFileSync(blueprintPath, 'utf-8');
    const blueprint = JSON.parse(data);

    console.log('📨 Blueprint cargado, buscando mensajes...');

    const messages = [];

    if (blueprint.layout) {
        Object.entries(blueprint.layout).forEach(([nodeId, nodeData]) => {
            // Mensajes de sticky notes
            if (nodeData.isStickyNote && nodeData.text && nodeData.text.trim()) {
                messages.push({
                    type: 'sticky_note',
                    nodeId: nodeId,
                    content: nodeData.text.trim()
                });
            }

            // Mensajes de nodos regulares
            if (!nodeData.isStickyNote && nodeData.message && nodeData.message.trim()) {
                messages.push({
                    type: 'node_message',
                    nodeId: nodeId,
                    nodeLabel: nodeData.label,
                    content: nodeData.message.trim()
                });
            }
        });
    }

    console.log(`📝 Encontrados ${messages.length} mensajes:\n`);

    messages.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg.type.toUpperCase()}: ${msg.nodeId}`);
        if (msg.nodeLabel) console.log(`   Label: ${msg.nodeLabel}`);
        console.log(`   Contenido: "${msg.content}"`);
        console.log('');
    });

    if (messages.length === 0) {
        console.log('📭 No hay mensajes en el blueprint guardado');
    }

} catch (error) {
    console.error('❌ Error:', error.message);
}