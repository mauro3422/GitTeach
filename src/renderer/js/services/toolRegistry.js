/**
 * ToolRegistry - The master catalog of tools.
 * Centralizes decoupled tool loading (SOLID).
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
import { SkillsTool } from './tools/skillsTool.js';
import { ThemeManagerTool } from './tools/themeManagerTool.js';
import { ProjectShowcaseTool } from './tools/projectShowcaseTool.js';
import { ReadabilityAuditorTool } from './tools/readabilityAuditorTool.js';
import { ReadFileTool } from './tools/readFileTool.js';
import { QueryMemoryTool } from './tools/queryMemoryTool.js';
import { QueryTechnicalMetricsTool } from './tools/queryTechnicalMetricsTool.js';
import { QueryThematicAnalysisTool } from './tools/queryThematicAnalysisTool.js';
import { GenerateProfileReadmeTool } from './tools/generateProfileReadmeTool.js';

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
    new SkillsTool(),
    new ThemeManagerTool(),
    new ProjectShowcaseTool(),
    new ReadabilityAuditorTool(),
    new ReadFileTool(),
    new QueryMemoryTool(),
    new QueryTechnicalMetricsTool(),
    new QueryThematicAnalysisTool(),
    new GenerateProfileReadmeTool()
];

export const ToolRegistry = {
    tools: activeTools,

    getAIInstructions() {
        return this.tools.map(t => {
            const params = Object.keys(t.schema).length > 0
                ? ` (Parameters: ${JSON.stringify(t.schema)})`
                : '';
            return `- ${t.id}: ${t.description}${params}`;
        }).join('\n');
    },

    getById(id) {
        return this.tools.find(t => t.id === id) || null;
    }
};

