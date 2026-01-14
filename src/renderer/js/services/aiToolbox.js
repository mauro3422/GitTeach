/**
 * AIToolbox - UI manipulation and utility helper.
 * Now decoupled from tool logic (SOLID).
 */
export const AIToolbox = {
    /**
     * Inserts markdown content at the beginning of the editor.
     * @param {string} content 
     */
    applyContent(content) {
        const editor = document.getElementById('readme-editor');
        if (!editor) return false;

        const currentContent = editor.value;
        editor.value = content + '\n\n' + currentContent;

        // Notify the system of the change
        editor.dispatchEvent(new Event('input'));
        return true;
    },

    /**
     * Replaces the entire content (AI Edition)
     * @param {string} newContent 
     */
    applyMagicEdit(newContent) {
        const editor = document.getElementById('readme-editor');
        if (!editor) return { success: false, details: "Editor not found." };

        editor.value = newContent;
        editor.dispatchEvent(new Event('input'));
        return { success: true, details: "Content replaced completely." };
    }
};
