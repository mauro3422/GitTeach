/**
 * AIToolbox - Ayudante para la manipulación de la interfaz y utilidades.
 * Ahora desacoplado de la lógica de las herramientas (SOLID).
 */
export const AIToolbox = {
    /**
     * Inserta contenido markdown al inicio del editor.
     * @param {string} content 
     */
    applyContent(content) {
        const editor = document.getElementById('readme-editor');
        if (!editor) return false;

        const currentContent = editor.value;
        editor.value = content + '\n\n' + currentContent;

        // Notificar al sistema del cambio
        editor.dispatchEvent(new Event('input'));
        return true;
    },

    /**
     * Reemplaza el contenido completo (Edición de IA)
     * @param {string} newContent 
     */
    applyMagicEdit(newContent) {
        const editor = document.getElementById('readme-editor');
        if (!editor) return { success: false, details: "Editor no encontrado." };

        editor.value = newContent;
        editor.dispatchEvent(new Event('input'));
        return { success: true, details: "Contenido reemplazado completamente." };
    }
};
