/**
 * Script para que Cline lea los mensajes extraídos del canvas
 * Se ejecuta desde el lado del proyecto para obtener instrucciones del usuario
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

function readCanvasMessages() {
    try {
        // Ruta donde se guardan los mensajes (mismo que en cacheHandler.js)
        const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'giteach');
        const messagesPath = path.join(userDataPath, 'canvas_messages.json');

        console.log(`🔍 Buscando mensajes en: ${messagesPath}`);

        if (!fs.existsSync(messagesPath)) {
            console.log('❌ No se encontraron mensajes guardados');
            console.log('� El usuario debe ejecutar extractCanvasMessages() en la consola del designer primero');
            return null;
        }

        const data = fs.readFileSync(messagesPath, 'utf-8');
        const messagesData = JSON.parse(data);

        console.log(`📨 Mensajes extraídos del canvas (${messagesData.extractedAt}):`);
        console.log(`📊 Estadísticas: ${messagesData.totalMessages} mensajes, ${messagesData.canvasStats.totalNodes} nodos totales\n`);

        // Mostrar mensajes organizados
        messagesData.messages.forEach((msg, index) => {
            console.log(`${index + 1}. ${msg.type.toUpperCase()}: ${msg.nodeId}`);
            if (msg.nodeLabel) console.log(`   Label: ${msg.nodeLabel}`);
            console.log(`   "${msg.content}"`);
            if (msg.metadata) {
                console.log(`   [Metadata: ${JSON.stringify(msg.metadata)}]`);
            }
            console.log('');
        });

        return messagesData;

    } catch (error) {
        console.error('❌ Error leyendo mensajes del canvas:', error.message);
        return null;
    }
}

// Ejecutar automáticamente si se llama directamente
readCanvasMessages();

export { readCanvasMessages };
