/**
 * Estructura de carpetas propuesta para las herramientas de la IA:
 * 
 * /src/renderer/js/tools/
 *    ├── banners/
 *    │   ├── stats.js
 *    │   ├── welcome.js
 *    │   └── tech.js
 *    ├── widgets/
 *    │   ├── activity.js
 *    │   └── repo_card.js
 *    └── registry.js (Autocarga)
 */

// Ejemplo de una herramienta (banner/stats.js)
export const statsTool = {
    id: 'github_stats',
    name: 'GitHub Stats Banner',
    description: 'Muestra estadísticas generales de tu perfil.',
    render: (username) => `![Stats](https://github-readme-stats.vercel.app/api?username=${username}&show_icons=true)`,
    category: 'banners'
};
