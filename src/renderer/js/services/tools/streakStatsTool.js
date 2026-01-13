import { BaseTool } from './baseTool.js';

export class StreakStatsTool extends BaseTool {
    constructor() {
        super(
            'streak_stats',
            'Streak Stats',
            'Muestra la racha actual de contribuciones (días seguidos).',
            ["Pon mi racha de días", "Muestra mi streak", "Cuántos días seguidos llevo?"],
            { theme: 'Theme name' }
        );
    }

    async execute(params, username) {
        const theme = params.theme || 'default';
        const markdown = `[![GitHub Streak](https://streak-stats.demolab.com/?user=${username}&theme=${theme}&t=${Date.now()})](https://git.io/streak-stats)`;

        return { success: true, content: markdown, details: "Racha (streak) insertada." };
    }
}
