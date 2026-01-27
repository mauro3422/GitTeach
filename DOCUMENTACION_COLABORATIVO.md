# Sistema de Edición Colaborativa para el Diseñador de Pipeline

## Introducción

El sistema de edición colaborativa permite que múltiples usuarios trabajen simultáneamente en el mismo canvas del diseñador de pipeline. Las operaciones realizadas por un usuario se replican automáticamente en los demás clientes, permitiendo una experiencia de edición en tiempo real.

## Características

- **Edición en tiempo real**: Los cambios se propagan instantáneamente entre todos los participantes
- **Operaciones soportadas**: Añadir/eliminar nodos, mover nodos, crear/conectar conexiones, editar etiquetas
- **Historial compartido**: Todos los participantes comparten el mismo historial de operaciones
- **Identificación de usuarios**: Cada operación incluye el ID del usuario que la originó

## Instalación y Configuración

El sistema ya está integrado en el diseñador de pipeline. Solo necesitas inicializarlo:

```javascript
import { CollaborativeManager } from './src/renderer/js/views/pipeline/designer/modules/CollaborativeManager.js';

// Inicializar con un ID único para el cliente
CollaborativeManager.init('cliente-unica-id');
```

## Operaciones Disponibles

### Añadir Nodo
```javascript
// Añadir nodo regular
CollaborativeManager.addNode(false, x, y, {
    label: 'Nombre del Nodo',
    icon: '🧩',
    color: '#8b949e'
});

// Añadir contenedor
CollaborativeManager.addNode(true, x, y, {
    label: 'Contenedor',
    icon: '📦',
    color: '#3fb950',
    isRepoContainer: true
});

// Añadir nota adhesiva
CollaborativeManager.addNode(false, x, y, {
    label: 'Nota',
    icon: '📝',
    color: '#a371f7',
    isStickyNote: true
});
```

### Eliminar Nodo
```javascript
CollaborativeManager.deleteNode('id-del-nodo');
```

### Mover Nodo
```javascript
CollaborativeManager.moveNode('id-del-nodo', nuevaX, nuevaY);
```

### Conectar Nodos
```javascript
CollaborativeManager.addConnection('id-nodo-origen', 'id-nodo-destino');
```

### Eliminar Conexión
```javascript
CollaborativeManager.deleteConnection('id-de-la-conexion');
```

### Actualizar Etiqueta
```javascript
CollaborativeManager.updateLabel('id-del-nodo', 'Nueva Etiqueta');
```

## Funciones Adicionales

### Obtener Colaboradores Activos
```javascript
const colaboradores = CollaborativeManager.getActiveCollaborators();
```

### Sincronizar Estado Completo
```javascript
CollaborativeManager.syncState();
```

### Desconectar Cliente
```javascript
CollaborativeManager.disconnect();
```

## Flujo de Trabajo Colaborativo

1. Cada cliente se inicializa con un ID único
2. Los eventos de operación se propagan a través del sistema de eventos de diseñador
3. Cada cliente aplica las operaciones recibidas de otros clientes
4. El estado se mantiene sincronizado entre todos los participantes

## Seguridad y Conflicto

- El sistema incluye mecanismos para evitar conflictos de operaciones concurrentes
- Cada operación se identifica con el cliente que la originó
- Las operaciones se aplican en orden cronológico para mantener la consistencia

## Integración con Funcionalidades Existentes

- El sistema colaborativo se integra con el sistema de comandos existente (para deshacer/rehacer)
- Se mantiene la compatibilidad con el sistema de persistencia existente
- Las operaciones colaborativas se registran en el historial de comandos

## Consideraciones

- Asegúrate de usar IDs únicos para cada cliente en una sesión colaborativa
- El sistema está optimizado para un número moderado de participantes (< 10)
- Las operaciones se propagan a través de eventos locales, ideal para sesiones en la misma aplicación