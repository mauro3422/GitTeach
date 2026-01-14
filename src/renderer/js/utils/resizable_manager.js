/**
 * ResizableManager - Clase encargada de gestionar el redimensionamiento de paneles.
 * Sigue el principio de Responsabilidad Única (SOLID).
 */
export class ResizableManager {
    constructor(layoutId) {
        this.layout = document.getElementById(layoutId);
        this.isResizing = false;
        this.currentResizer = null;
    }

    init() {
        const leftResizer = document.getElementById('resizer-left');
        const rightResizer = document.getElementById('resizer-right');

        if (leftResizer) this.setupResizer(leftResizer, 'left');
        if (rightResizer) this.setupResizer(rightResizer, 'right');

        // Eventos globales para el movimiento
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', () => this.stopResizing());
    }

    setupResizer(resizer, type) {
        resizer.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            this.currentResizer = type;
            resizer.classList.add('active');
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });
    }

    onMouseMove(e) {
        if (!this.isResizing) return;

        const containerWidth = window.innerWidth;
        const x = e.clientX;

        // Recuperamos el template actual del grid (Rail[0] Sidebar[1] Resizer[2] Main[3] Resizer[4] Chat[5])
        const columns = this.layout.style.gridTemplateColumns
            ? this.layout.style.gridTemplateColumns.split(' ')
            : ['60px', '280px', '4px', '1fr', '4px', '350px'];

        if (this.currentResizer === 'left') {
            // Ajustar el Sidebar (Columna 1) - Rail es Columna 0
            const sidebarWidth = x - 60; // Descontamos el rail
            const newWidth = Math.max(200, Math.min(600, sidebarWidth));
            columns[1] = `${newWidth}px`;
        } else if (this.currentResizer === 'right') {
            // Ajustar panel derecho (Columna 5)
            const distFromRight = containerWidth - x;
            const newWidth = Math.max(150, Math.min(550, distFromRight));
            columns[5] = `${newWidth}px`;
        }

        this.layout.style.gridTemplateColumns = columns.join(' ');

    }

    stopResizing() {
        if (!this.isResizing) return;

        this.isResizing = false;
        document.querySelectorAll('.resizer').forEach(r => r.classList.remove('active'));
        document.body.style.cursor = 'default';
        this.currentResizer = null;
    }
}
