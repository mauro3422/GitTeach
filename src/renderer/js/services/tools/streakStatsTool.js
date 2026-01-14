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
        const url = `https://streak-stats.demolab.com/?user=${username}&theme=${theme}&t=${Date.now()}`;

        // Verificar disponibilidad (3s timeout)
        const isUp = await this.isWidgetAvailable(url);

        let markdown;
        if (isUp) {
            markdown = `[![GitHub Streak](${url})](https://git.io/streak-stats)`;
        } else {
            markdown = `![Streak Stats Unavailable](https://img.shields.io/badge/Streak_Stats-Temporarily_Unavailable-inactive?style=flat-square&logo=github)`;
        }

        return {
            success: true,
            content: markdown,
            details: isUp ? "Racha (streak) insertada." : "Servicio Streak Stats no disponible (fallback activado)."
        };
    }
}
