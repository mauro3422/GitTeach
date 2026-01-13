/**
 * DropdownComponent - Gestiona la interactividad de los menús desplegables.
 * Sigue el principio de Responsabilidad Única.
 */
export const DropdownComponent = {
    init(buttonId, menuId) {
        const btn = document.getElementById(buttonId);
        const menu = document.getElementById(menuId);

        if (!btn || !menu) {
            console.warn(`[DropdownComponent] No se encontraron elementos para: ${buttonId} o ${menuId}`);
            return;
        }

        // Toggle al hacer clic en el botón
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && e.target !== btn) {
                menu.classList.add('hidden');
            }
        });

        // Prevenir cierre al hacer clic dentro del menú (opcional)
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
};
