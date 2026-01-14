/**
 * ToolRegistry - El catálogo maestro de herramientas.
 * Centraliza la carga de herramientas desacopladas (SOLID).
 */
import { GithubStatsTool } from './tools/githubStatsTool.js';
import { WelcomeHeaderTool } from './tools/welcomeHeaderTool.js';
import { TopLangsTool } from './tools/topLangsTool.js';
import { TechStackTool } from './tools/techStackTool.js';
import { ListReposTool } from './tools/listReposTool.js';
import { ReadRepoTool } from './tools/readRepoTool.js';
import { GitHubTrophiesTool } from './tools/githubTrophiesTool.js';
import { StreakStatsTool } from './tools/streakStatsTool.js';
import { ProfileViewsTool } from './tools/profileViewsTool.js';
import { ContributionSnakeTool } from './tools/contributionSnakeTool.js';
import { ConfigureSnakeWorkflowTool } from './tools/configureSnakeWorkflowTool.js';
import { SocialConnectTool } from './tools/socialConnectTool.js';
import { ActivityGraphTool } from './tools/activityGraphTool.js';
// AutoBioTool eliminado - redundante con el contexto del chat
import { SkillsTool } from './tools/skillsTool.js';
import { ThemeManagerTool } from './tools/themeManagerTool.js';
import { ProjectShowcaseTool } from './tools/projectShowcaseTool.js';
import { ReadabilityAuditorTool } from './tools/readabilityAuditorTool.js';

const activeTools = [
    new GithubStatsTool(),
    new WelcomeHeaderTool(),
    new TopLangsTool(),
    new TechStackTool(),
    new ListReposTool(),
    new ReadRepoTool(),
    new GitHubTrophiesTool(),
    new StreakStatsTool(),
    new ProfileViewsTool(),
    new ContributionSnakeTool(),
    new ConfigureSnakeWorkflowTool(),
    new SocialConnectTool(),
    new ActivityGraphTool(),
    // AutoBioTool eliminado - el chat ya tiene el contexto de los repos
    new SkillsTool(),
    new ThemeManagerTool(),
    new ProjectShowcaseTool(),
    new ReadabilityAuditorTool()
];

export const ToolRegistry = {
    tools: activeTools,

    getAIInstructions() {
        return this.tools.map(t => {
            const params = Object.keys(t.schema).length > 0
                ? ` (Parámetros: ${JSON.stringify(t.schema)})`
                : '';
            return `- ${t.id}: ${t.description}${params}`;
        }).join('\n');
    },

    getById(id) {
        return this.tools.find(t => t.id === id) || null;
    }
};
