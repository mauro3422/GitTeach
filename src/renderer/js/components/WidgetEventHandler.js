import { AIToolbox } from '../services/aiToolbox.js';

export class WidgetEventHandler {
    static attachInsertEvent(card, tool, username) {
        const btn = card.querySelector('button');
        if (!btn) return;

        btn.onclick = async () => {
            await this.handleInsertClick(btn, tool, username);
        };
    }

    static async handleInsertClick(btn, tool, username) {
        btn.disabled = true;
        btn.textContent = '⏳...';

        try {
            const result = await tool.execute({}, username);

            if (result.success && result.content) {
                AIToolbox.applyContent(result.content);
                this.showSuccess(btn);
            } else {
                this.showError(btn);
            }
        } catch (error) {
            console.error('[WidgetEventHandler] Error executing tool:', error);
            this.showError(btn);
        }
    }

    static showSuccess(btn) {
        btn.textContent = '✅';
        setTimeout(() => {
            btn.textContent = 'Insertar';
            btn.disabled = false;
        }, 2000);
    }

    static showError(btn) {
        btn.textContent = '❌';
        setTimeout(() => {
            btn.textContent = 'Insertar';
            btn.disabled = false;
        }, 2000);
    }
}

export const widgetEventHandler = new WidgetEventHandler();
