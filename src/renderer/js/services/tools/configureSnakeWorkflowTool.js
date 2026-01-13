import { BaseTool } from './baseTool.js';

export class ConfigureSnakeWorkflowTool extends BaseTool {
    constructor() {
        super(
            'configure_snake_workflow',
            'Configurar Snake (Actions)',
            'Crea automáticamente el GitHub Action necesario para generar la animación de la serpiente.',
            ["Arregla mi snake", "Configura el workflow de la serpiente", "Activar GitHub Actions"],
            {}
        );
    }

    async execute(params, username) {
        try {
            const workflowContent = `name: Generate Snake
on:
  push:
    branches: [main, master]
  schedule:
    - cron: "0 0 * * *" 
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    permissions: { contents: write }
    steps:
      - uses: actions/checkout@v2
      - uses: Platane/snk@v3
        with:
          github_user_name: \${{ github.repository_owner }}
          outputs: |
            dist/github-contribution-grid-snake.svg
            dist/github-contribution-grid-snake-dark.svg?palette=github-dark
      - uses: crazy-max/ghaction-github-pages@v3.1.0
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;
            const result = await window.githubAPI.createWorkflow(username, workflowContent);

            if (result && (result.content || result.commit)) {
                return {
                    success: true,
                    content: `![Snake Game](https://raw.githubusercontent.com/${username}/${username}/output/github-contribution-grid-snake.svg?t=${Date.now()})`,
                    details: `✅ Workflow configurado. [Ver Estado en GitHub](https://github.com/${username}/${username}/actions)`
                };
            }

            return { success: false, details: result?.error || "Error desconocido configurando workflow." };
        } catch (e) {
            return { success: false, details: e.message };
        }
    }
}
