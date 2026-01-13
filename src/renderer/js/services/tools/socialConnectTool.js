import { BaseTool } from './baseTool.js';

export class SocialConnectTool extends BaseTool {
    constructor() {
        super(
            'social_connect',
            'Social Connect Bar',
            'Genera una fila de iconos sociales (LinkedIn, Twitter, Portfolio, etc.).',
            ["Añade mis redes sociales", "Pon mi LinkedIn y Twitter", "Barra de contacto"],
            {
                linkedin: 'LinkedIn username',
                twitter: 'Twitter username',
                portfolio: 'Portfolio URL'
            }
        );
    }

    async execute(params, username) {
        let badges = [];

        if (params.twitter) {
            badges.push(`[![Twitter](https://img.shields.io/badge/Twitter-%231DA1F2.svg?logo=Twitter&logoColor=white)](https://twitter.com/${params.twitter})`);
        }
        if (params.linkedin) {
            badges.push(`[![LinkedIn](https://img.shields.io/badge/LinkedIn-%230077B5.svg?logo=linkedin&logoColor=white)](https://linkedin.com/in/${params.linkedin})`);
        }
        if (params.portfolio) {
            badges.push(`[![Portfolio](https://img.shields.io/badge/Portfolio-%23E4405F.svg?logo=About.me&logoColor=white)](${params.portfolio})`);
        }

        if (badges.length === 0) {
            return { success: false, details: "No proporcionaste ninguna red social para añadir." };
        }

        const markdown = `### 🔗 Connect with me\n\n${badges.join(' ')}`;

        return {
            success: true,
            content: markdown,
            details: "Barra de redes sociales generada con éxito."
        };
    }
}
