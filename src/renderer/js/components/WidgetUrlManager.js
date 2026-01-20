export class WidgetUrlManager {
    static getPreviewUrl(tool, username) {
        // Mapeo de herramientas a URLs de previsualización reales/estáticas
        const previews = {
            'github_stats': `https://github-readme-stats-sigma-five.vercel.app/api?username=${username}&show_icons=true&theme=tokyonight&hide_rank=true&hide_title=true`,
            'top_langs': `https://github-readme-stats-sigma-five.vercel.app/api/top-langs/?username=${username}&layout=compact&theme=tokyonight&hide_title=true`,
            'github_trophies': `https://github-profile-trophy-alpha.vercel.app/?username=${username}&theme=tokyonight&margin-w=5`,
            'streak_stats': `https://github-readme-streak-stats.herokuapp.com/?user=${username}&theme=tokyonight&hide_border=true`,
            'activity_graph': `https://github-readme-activity-graph.vercel.app/graph?username=${username}&theme=tokyonight&hide_border=true&area=true`,
            'contribution_snake': `https://raw.githubusercontent.com/${username}/${username}/output/github-contribution-grid-snake.svg`,
            'tech_stack': 'https://skillicons.dev/icons?i=js,react,node,html,css,git,tailwind,electron&perline=8',
            'skills': 'https://skillicons.dev/icons?i=js,react,node,html,css,git,tailwind,electron&perline=8',
            'profile_views': `https://komarev.com/ghpvc/?username=${username}&color=green`,
            'social_connect': `https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white`,
            'project_showcase': `https://github-readme-stats-sigma-five.vercel.app/api/pin/?username=${username}&repo=${username}&theme=tokyonight`,
            'welcome_header': `https://capsule-render.vercel.app/api?type=wave&color=auto&height=120&text=GitTeach&fontSize=50`
        };

        return previews[tool.id] || null;
    }
}

export const widgetUrlManager = new WidgetUrlManager();
