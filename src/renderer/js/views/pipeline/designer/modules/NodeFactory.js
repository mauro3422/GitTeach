/**
 * NodeFactory.js
 *
 * ROBUST PATTERN: Single Source of Truth for Node Creation
 *
 * Responsabilidad:
 * - Centraliza TODA la lógica de creación de nodos
 * - Garantiza que cada nodo tiene propiedades correctas
 * - Proporciona builders para diferentes tipos de nodo
 * - Validación automática
 *
 * Principios:
 * 1. ÚNICO lugar para crear nodos (nunca créalos en otro lado)
 * 2. Propiedades garantizadas (todos los nodos tienen defaults)
 * 3. Builders claros por tipo (regular, satellite, container, sticky)
 * 4. Validación al crear
 */

import { DESIGNER_CONSTANTS } from '../DesignerConstants.js';
import { ThemeManager } from '../../../../core/ThemeManager.js';

export const NodeFactory = {
    /**
     * CORE: Crea nodo regular con propiedades garantizadas
     */
    createRegularNode(options = {}) {
        const node = this._createBaseNode(options);

        // Propiedades específicas de nodo regular
        node.isRepoContainer = false;
        node.isStickyNote = false;
        node.isSatellite = options.isSatellite ?? false;

        // Asegurar dimensiones para nodos regulares
        if (!node.dimensions) {
            const { CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
            node.dimensions = {
                w: CONTAINER.DEFAULT_W,
                h: CONTAINER.DEFAULT_H,
                animW: CONTAINER.DEFAULT_W,
                animH: CONTAINER.DEFAULT_H,
                targetW: CONTAINER.DEFAULT_W,
                targetH: CONTAINER.DEFAULT_H,
                isManual: false
            };
        }

        return this._validateNode(node);
    },

    /**
     * CORE: Crea nodo satélite (cache store)
     */
    createSatelliteNode(options = {}) {
        const node = this._createBaseNode(options);

        node.isSatellite = true;
        node.isRepoContainer = false;
        node.isStickyNote = false;

        // Asegurar dimensiones para nodos satélite
        if (!node.dimensions) {
            const { CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
            node.dimensions = {
                w: CONTAINER.DEFAULT_W,
                h: CONTAINER.DEFAULT_H,
                animW: CONTAINER.DEFAULT_W,
                animH: CONTAINER.DEFAULT_H,
                targetW: CONTAINER.DEFAULT_W,
                targetH: CONTAINER.DEFAULT_H,
                isManual: false
            };
        }

        return this._validateNode(node);
    },

    /**
     * CORE: Crea nodo container
     */
    createContainerNode(options = {}) {
        const node = this._createBaseNode(options);

        node.isRepoContainer = true;
        node.isStickyNote = false;
        node.isSatellite = false;

        // Asegurar dimensiones para containers
        if (!node.dimensions) {
            const { CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
            node.dimensions = {
                w: CONTAINER.DEFAULT_W,
                h: CONTAINER.DEFAULT_H,
                animW: CONTAINER.DEFAULT_W,
                animH: CONTAINER.DEFAULT_H,
                targetW: CONTAINER.DEFAULT_W,
                targetH: CONTAINER.DEFAULT_H,
                isManual: false
            };
        }

        return this._validateNode(node);
    },

    /**
     * CORE: Crea sticky note
     */
    createStickyNote(options = {}) {
        const node = this._createBaseNode(options);

        node.isStickyNote = true;
        node.isRepoContainer = false;
        node.isSatellite = false;

        // Propiedades específicas de sticky notes
        node.text = options.text ?? '';

        // Asegurar dimensiones
        if (!node.dimensions) {
            const { STICKY_NOTE } = DESIGNER_CONSTANTS.DIMENSIONS;
            node.dimensions = {
                w: STICKY_NOTE.DEFAULT_W,
                h: STICKY_NOTE.DEFAULT_H,
                animW: STICKY_NOTE.DEFAULT_W,
                animH: STICKY_NOTE.DEFAULT_H,
                targetW: STICKY_NOTE.DEFAULT_W,
                targetH: STICKY_NOTE.DEFAULT_H,
                isManual: false
            };
        }

        return this._validateNode(node);
    },

    /**
     * PRIVATE: Crea base node con propiedades garantizadas
     */
    _createBaseNode(options = {}) {
        const id = options.id ?? `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const node = {
            // Propiedades críticas
            id,
            x: options.x ?? 0,
            y: options.y ?? 0,
            color: options.color ?? ThemeManager.colors.accent,

            // Propiedades estándar
            label: options.label ?? 'Node',
            description: options.description ?? '',
            icon: options.icon ?? '🧩',
            message: options.message ?? null,

            // Propiedades de relación
            parentId: options.parentId ?? null,

            // Propiedades de clase/tipo
            isRepoContainer: false,
            isStickyNote: false,
            isSatellite: false,

            // Propiedades internas (no serializar)
            _originalPos: null,
            _lastHoverState: null,

            // Propiedades de dimensión (default, se completan según tipo)
            dimensions: options.dimensions ?? null,

            // Propiedades extendidas
            ...options
        };

        // Sanear propiedades
        node.x = typeof node.x === 'number' ? node.x : 0;
        node.y = typeof node.y === 'number' ? node.y : 0;

        return node;
    },

    /**
     * PRIVATE: Valida que nodo tenga todas propiedades requeridas
     * SOFT validation - logs warnings but auto-fixes instead of throwing
     */
    _validateNode(node) {
        // REQUIRED fields for ALL nodes
        const required = ['id', 'x', 'y', 'label', 'icon', 'color'];
        const missing = required.filter(key => !(key in node));

        if (missing.length > 0) {
            console.warn(`[NodeFactory] Node ${node.id} missing required fields: ${missing.join(', ')}, auto-fixing...`);
            // Auto-fix missing required fields
            if (!node.id) node.id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            if (typeof node.x !== 'number') node.x = 0;
            if (typeof node.y !== 'number') node.y = 0;
            if (!node.label) node.label = 'Node';
            if (!node.icon) node.icon = '🧩';
            if (!node.color) node.color = ThemeManager.colors.accent;
        }

        // Type validation - FIX instead of THROW
        if (typeof node.id !== 'string' || !node.id) {
            console.warn(`[NodeFactory] Node ID invalid, auto-fixing...`);
            node.id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        }
        if (typeof node.x !== 'number' || typeof node.y !== 'number') {
            console.warn(`[NodeFactory] Node coordinates invalid, auto-fixing to 0,0...`);
            node.x = typeof node.x === 'number' ? node.x : 0;
            node.y = typeof node.y === 'number' ? node.y : 0;
        }

        // Type-specific validation - FIX instead of THROW
        if (node.isStickyNote) {
            if (typeof node.text !== 'string') {
                console.warn(`[NodeFactory] Sticky note ${node.id} text invalid, auto-fixing...`);
                node.text = '';
            }
        }

        if (node.isRepoContainer) {
            if (typeof node.label !== 'string' || !node.label) {
                console.warn(`[NodeFactory] Container ${node.id} label invalid, auto-fixing...`);
                node.label = 'Container';
            }
        }

        // Dimensions validation - AUTO-CREATE if missing
        if (!node.dimensions || typeof node.dimensions !== 'object') {
            console.warn(`[NodeFactory] Auto-creating missing dimensions for node ${node.id}`);
            const { STICKY_NOTE, CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
            const isSticky = node.isStickyNote;
            const defW = isSticky ? STICKY_NOTE.DEFAULT_W : CONTAINER.DEFAULT_W;
            const defH = isSticky ? STICKY_NOTE.DEFAULT_H : CONTAINER.DEFAULT_H;

            node.dimensions = {
                w: defW, h: defH,
                animW: defW, animH: defH,
                targetW: defW, targetH: defH,
                isManual: false
            };
        } else {
            // Validate dimension structure - FIX instead of THROW
            if (!('w' in node.dimensions) || !('h' in node.dimensions)) {
                console.warn(`[NodeFactory] Node ${node.id} dimensions missing w/h, auto-fixing...`);
                const { STICKY_NOTE, CONTAINER } = DESIGNER_CONSTANTS.DIMENSIONS;
                const isSticky = node.isStickyNote;
                node.dimensions.w = node.dimensions.w || (isSticky ? STICKY_NOTE.DEFAULT_W : CONTAINER.DEFAULT_W);
                node.dimensions.h = node.dimensions.h || (isSticky ? STICKY_NOTE.DEFAULT_H : CONTAINER.DEFAULT_H);
            }
        }

        return node;
    },

    /**
     * BUILDER PATTERN: Fluent API para crear nodos complejos
     */
    builder(type = 'regular') {
        return new NodeBuilder(type);
    },

    /**
     * HELPER: Clona nodo preservando identidad pero cambiando propiedades
     */
    clone(node, overrides = {}) {
        const cloned = { ...node };

        // Generar nuevo ID
        if (!overrides.id) {
            cloned.id = `${node.id}_clone_${Date.now()}`;
        }

        // Aplicar overrides
        Object.assign(cloned, overrides);

        // Validar el clon
        return this._validateNode(cloned);
    },

    /**
     * HELPER: Obtiene propiedades críticas de un nodo
     */
    getCriticalProps(node) {
        return {
            id: node.id,
            x: node.x,
            y: node.y,
            label: node.label,
            color: node.color,
            icon: node.icon,
            isRepoContainer: node.isRepoContainer,
            isStickyNote: node.isStickyNote,
            isSatellite: node.isSatellite,
            parentId: node.parentId
        };
    },

    /**
     * VALIDATION: Verifica que nodo tenga estructura correcta
     */
    isValidNode(node) {
        if (!node || typeof node !== 'object') return false;
        if (!node.id || !node.label) return false;
        if (typeof node.x !== 'number' || typeof node.y !== 'number') return false;
        if (!node.color) return false;

        return true;
    },

    /**
     * DEBUG: Imprime estructura del nodo
     */
    debugNode(node) {
        console.log(`
[NodeFactory] Node: ${node.id}
  Type: ${node.isStickyNote ? 'STICKY' : node.isRepoContainer ? 'CONTAINER' : node.isSatellite ? 'SATELLITE' : 'REGULAR'}
  Position: (${node.x.toFixed(0)}, ${node.y.toFixed(0)})
  Label: ${node.label}
  Icon: ${node.icon}
  Color: ${node.color}
  Parent: ${node.parentId ?? 'NONE'}
        `);
    }
};

/**
 * HELPER CLASS: Builder pattern para crear nodos complejos
 */
class NodeBuilder {
    constructor(type = 'regular') {
        this.type = type;
        this.options = {};
    }

    withId(id) {
        this.options.id = id;
        return this;
    }

    at(x, y) {
        this.options.x = x;
        this.options.y = y;
        return this;
    }

    labeled(label) {
        this.options.label = label;
        return this;
    }

    colored(color) {
        this.options.color = color;
        return this;
    }

    withIcon(icon) {
        this.options.icon = icon;
        return this;
    }

    described(description) {
        this.options.description = description;
        return this;
    }

    withMessage(message) {
        this.options.message = message;
        return this;
    }

    parentedTo(parentId) {
        this.options.parentId = parentId;
        return this;
    }

    withDimensions(w, h) {
        this.options.dimensions = { w, h };
        return this;
    }

    build() {
        switch (this.type) {
            case 'satellite':
                return NodeFactory.createSatelliteNode(this.options);
            case 'container':
                return NodeFactory.createContainerNode(this.options);
            case 'sticky':
                return NodeFactory.createStickyNote(this.options);
            case 'regular':
            default:
                return NodeFactory.createRegularNode(this.options);
        }
    }
}

/**
 * EXPORT: Exponer globalmente para debugging (solo en desarrollo)
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    window.NodeFactory = NodeFactory;
}
