import { BaseTool } from './baseTool.js';

export class TechStackTool extends BaseTool {
    constructor() {
        super(
            'tech_stack',
            'Tech Stack Badge Row',
            'Fila visual de iconos y tecnologías.',
            ["Muestra mi stack tecnológico", "Pon mis badges de lenguajes", "Qué tecnologías uso"],
            {}
        );
    }

    async execute(params, username) {
        const markdown = `### 🛠️ Tech Stack\n\n![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?logo=javascript&logoColor=black) ![Electron](https://img.shields.io/badge/-Electron-47848F?logo=electron&logoColor=white)`;

        return {
            success: true,
            content: markdown,
            details: "Tech stack insertado correctamente."
        };
    }
}
