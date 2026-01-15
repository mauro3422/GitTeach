import fs from 'fs';
import { TOKEN_PATH } from './TracerContext.js';

/**
 * GithubMock - Real GitHub API wrapper for Headless execution
 * 
 * Responsabilidad: Cargar el token real del usuario y proveer
 * un objeto que simule window.githubAPI usando fetch real.
 */

export class GithubMock {
    static loadToken() {
        try {
            const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
            return tokenData.token || tokenData.access_token;
        } catch (e) {
            console.error(`[AUTH] ERROR: No token in ${TOKEN_PATH}`);
            process.exit(1);
        }
    }

    static createAPI(authToken) {
        const headers = () => ({
            'Authorization': `token ${authToken}`,
            'User-Agent': 'GitTeach-Tracer-Reality'
        });

        return {
            _headers: headers,
            listRepos: async () => {
                const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', { headers: headers() });
                const repos = await res.json();
                return Array.isArray(repos) ? repos.slice(0, 10) : [];
            },
            getProfileReadme: async (u) => {
                const res = await fetch(`https://api.github.com/repos/${u}/${u}/readme`, { headers: headers() });
                if (!res.ok) return "";
                const data = await res.json();
                return Buffer.from(data.content, 'base64').toString('utf8');
            },
            getRepoTree: async (u, r) => {
                const treeRes = await fetch(`https://api.github.com/repos/${u}/${r}/git/trees/main?recursive=1`, { headers: headers() });
                // Fallback to master if main fails
                if (!treeRes.ok) {
                    const masterRes = await fetch(`https://api.github.com/repos/${u}/${r}/git/trees/master?recursive=1`, { headers: headers() });
                    if (masterRes.ok) {
                        const data = await masterRes.json();
                        if (data.tree) data.tree = data.tree.slice(0, 10);
                        return data;
                    }
                } else {
                    const data = await treeRes.json();
                    if (data.tree) data.tree = data.tree.slice(0, 10);
                    return data;
                }
                return { tree: [] };
            },
            getFileContent: async (u, r, p) => {
                const res = await fetch(`https://api.github.com/repos/${u}/${r}/contents/${p}`, { headers: headers() });
                return await res.json();
            },
            logToTerminal: () => { },
            checkAuth: async () => ({ login: 'mauro3422', token: authToken }),
            getRawFileByPath: async (u, r, p) => {
                const res = await fetch(`https://api.github.com/repos/${u}/${r}/contents/${p}`, { headers: headers() });
                if (!res.ok) return "";
                const data = await res.json();
                return Buffer.from(data.content, 'base64').toString('utf8');
            },
            getUserCommits: async () => [],
            getCommitDiff: async () => ({ files: [] })
        };
    }
}
