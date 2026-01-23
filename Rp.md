Centralización del Estado de Interacción
Este plan describe la unificación de los estados de 
hover
, 
select
, 
drag
, 
resize
 y panning dentro del 
DesignerStore
. Actualmente, estos estados están dispersos entre varios managers y estrategias, lo que genera inconsistencias y dificulta la reactividad.

Problemas Identificados y Soluciones
Inconsistencia en Hover: 
HoverManager
 tiene su propio 
hoveredNodeId
 mientras que 
DesignerStore
 tiene otro.
Solución: Mover la verdad única al Store. 
HoverManager
 despachará acciones al Store.
Estado "Ciego" para Renderers: Los renderers no pueden saber fácilmente si algo se está arrastrando o redimensionando sin acceder a la instancia de DesignerInteraction.
Solución: Incluir draggingNodeId, resizingNodeId y isPanning en DesignerStore.state.interaction.
Gestión de Cursores Dispersa: Varios archivos intentan cambiar canvas.style.cursor.
Solución: Centralizar la lógica del cursor en DesignerInteraction basándose en el estado unificado del Store.
Cancelación inconsistente: Presionar Esc puede que cancele una estrategia pero no limpie el estado en el Store.
Solución: Un método InteractionStore.cancel() que limpie todo el slice de interacción de forma atómica.
Falta de Trazabilidad: El historial de undo/redo no sabe qué estaba haciendo el usuario durante un movimiento.
Solución: Aunque no guardaremos cada píxel de movimiento en el historial, el estado activo del Store permitirá mejores diagnósticos y validaciones.
Acoplamiento en VisualStateManager: Actualmente depende de un objeto "Frankenstein" construido a mano en cada frame.
Solución: VisualStateManager consumirá directamente el slice interaction del Store.
Dificultad en Tests: Mockear la interacción requiere instanciar 4 clases diferentes.
Solución: Los tests podrán verificar el estado del Store para validar si un click resultó en el hover/selection correcto.
Redundancia de onUpdate: Cada manager llama a un callback de actualización.
Solución: El canvas se suscribirá a los cambios en el slice de interacción del Store.
Pan/Zoom Desincronizado: El estado de cámara vive sólo en el handler.
Solución: Mover panOffset y zoomScale al Store (o asegurar una fachada bidireccional perfecta).
Race Conditions: Dos managers podrían intentar poner flags de estado conflictivos.
Solución: El Store actuará como árbitro, permitiendo solo un modo de interacción mayor a la vez (Drag OR Resize OR Draw).
Cambios Propuestos
Componentes de Interacción
[MODIFY] 
DesignerStore.js
Expandir state.interaction para incluir:
interaction: {
    hoveredNodeId: null,
    selectedNodeId: null,
    selectedConnectionId: null,
    draggingNodeId: null,
    resizingNodeId: null,
    isPanning: false,
    activeMode: 'IDLE', // 'IDLE', 'DRAG', 'RESIZE', 'DRAW', 'PAN'
    camera: { panOffset: { x: 0, y: 0 }, zoomScale: 1.0 }
}
Agregar métodos setHover, setDragging, setResizing, setCamera.
[MODIFY] 
DesignerInteraction.js
Simplificar 
getInteractionState()
 para que devuelva DesignerStore.state.interaction.
Asegurar que los movimientos de mouse actualicen el Store.
[MODIFY] 
HoverManager.js
Eliminar this.hoveredNodeId local.
Llamar a DesignerStore.setInteractionState({ hoveredNodeId: ... }).
[MODIFY] 
PanZoomHandler.js
Sincronizar this.state.panOffset/zoomScale con 
DesignerStore
.
[MODIFY] 
ResizeHandler.js
Actualizar resizingNodeId en el Store al empezar/terminar.
[MODIFY] 
DragStrategy.js
Actualizar draggingNodeId en el Store.
Plan de Verificación
Pruebas Automatizadas
Correr 
tests_real/interaction_integrity.test.js
 para asegurar que la selección y el hover siguen funcionando.
Crear un nuevo test tests/interaction_store.test.js que verifique la sincronización del Store durante el drag/resize.
Verificación Manual
Verificar que el cursor cambie correctamente al entrar/salir de nodos.
Asegurar que el zoom siga siendo fluido (monitorear si el overhead del Store afecta el performance del Pan).