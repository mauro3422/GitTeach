import { BaseTool } from './baseTool.js';

export class ProfileViewsTool extends BaseTool {
    constructor() {
        super(
            'profile_views',
            'Contador de Visitas',
            'Un badge simple que cuenta cuántas veces han visto el perfil.',
            ["Pon un contador de visitas", "Cuánta gente me ve?", "Views counter"],
            { color: 'Hex color name (blue, green, brightgreen)' }
        );
    }

    async execute(params, username) {
        const color = params.color || 'blue';
        const markdown = `![Visitor Count](https://komarev.com/ghpvc/?username=${username}&color=${color})`;

        return { success: true, content: markdown, details: "Contador de visitas insertado." };
    }
}
