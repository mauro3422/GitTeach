import { BaseTool } from './baseTool.js';

export class ContributionSnakeTool extends BaseTool {
    constructor() {
        super(
            'contribution_snake',
            'Contribution Snake Game',
            'Animación tipo "Snake" (serpiente) que recorre el calendario de contribuciones.',
            ["Pon el juego de la serpiente", "Quiero la snake de contribuciones", "Animación de serpiente"],
            {}
        );
    }

    async execute(params, username) {
        const markdown = `![Snake Game](https://raw.githubusercontent.com/${username}/${username}/output/github-contribution-grid-snake.svg?t=${Date.now()})`;

        return { success: true, content: markdown, details: "Animación de serpiente insertada." };
    }
}
