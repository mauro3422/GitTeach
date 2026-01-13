import { BaseTool } from './baseTool.js';

export class WelcomeHeaderTool extends BaseTool {
    constructor() {
        super(
            'welcome_header',
            'Welcome Header Animado',
            'Cabecera de bienvenida dinámica con texto.',
            ["Pon un banner de bienvenida", "Quiero un header que diga Hola", "Cabecera animada tipo shark"],
            {
                type: 'Style (waving, wave, egg, shark, rect)',
                color: 'Hex color or "auto"',
                text: 'The text to display',
                fontSize: 'Font size in px (default 60)'
            }
        );
    }

    async execute(params, username) {
        const type = params.type || 'waving';
        const color = this.getColor(params.color);
        const text = encodeURIComponent(params.text || `Welcome to ${username} Profile`);
        const fontSize = params.fontSize || '60';

        const markdown = `![Welcome](https://capsule-render.vercel.app/api?type=${type}&color=${color}&height=200&section=header&text=${text}&fontSize=${fontSize})`;

        return {
            success: true,
            content: markdown,
            details: `Header de bienvenida (${type}) generado correctamente.`
        };
    }
}
