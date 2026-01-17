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
                try {
                    const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', { headers: headers() });
                    if (!res.ok) return [];
                    const repos = await res.json();
                    return Array.isArray(repos) ? repos.slice(0, 10) : [];
                } catch (e) { return []; }
            },
            getProfileReadme: async (u) => {
                try {
                    const res = await fetch(`https://api.github.com/repos/${u}/${u}/readme`, { headers: headers() });
                    if (!res.ok) return "";
                    const data = await res.json();
                    return Buffer.from(data.content, 'base64').toString('utf8');
                } catch (e) { return ""; }
            },
            getRepoTree: async (u, r) => {
                try {
                    const treeRes = await fetch(`https://api.github.com/repos/${u}/${r}/git/trees/main?recursive=1`, { headers: headers() });
                    if (!treeRes.ok) {
                        if (masterRes.ok) {
                            const data = await masterRes.json();
                            // TRACER LIMIT: Slice to 15 files max to emulate "10x10" quick mode
                            if (data.tree) data.tree = data.tree.slice(0, 15);
                            return data;
                        }
                    } else {
                        const data = await treeRes.json();
                        // TRACER LIMIT: Slice to 15 files max to emulate "10x10" quick mode
                        if (data.tree) data.tree = data.tree.slice(0, 15);
                        return data;
                    }
                } catch (e) { }
                return { tree: [] };
            },
            _getFileMetadata: async (u, r, p) => {
                try {
                    // Fetch the last commit for this specific file path to get its last modified date
                    const res = await fetch(`https://api.github.com/repos/${u}/${r}/commits?path=${p}&per_page=1`, { headers: headers() });
                    if (!res.ok) return null;
                    const commits = await res.json();
                    if (Array.isArray(commits) && commits.length > 0) {
                        return {
                            last_modified: commits[0].commit.committer.date,
                            author: commits[0].commit.committer.name,
                            sha: commits[0].sha
                        };
                    }
                } catch (e) { }
                return null;
            },
            getFileContent: async (u, r, p) => {
                try {
                    const res = await fetch(`https://api.github.com/repos/${u}/${r}/contents/${p}`, { headers: headers() });
                    if (!res.ok) return { message: 'Not Found' };
                    const data = await res.json();

                    // Fetch metadata using internal headers
                    try {
                        const mRes = await fetch(`https://api.github.com/repos/${u}/${r}/commits?path=${p}&per_page=1`, { headers: headers() });
                        if (mRes.ok) {
                            const commits = await mRes.json();
                            if (Array.isArray(commits) && commits.length > 0) {
                                data.file_meta = {
                                    last_modified: commits[0].commit.committer.date,
                                    author: commits[0].commit.committer.name,
                                    sha: commits[0].sha
                                };
                            }
                        }
                    } catch (me) { }

                    return data;
                } catch (e) { return { message: e.message }; }
            },
            logToTerminal: () => { },
            checkAuth: async () => ({ login: 'mauro3422', token: authToken }),
            getRawFileByPath: async (u, r, p) => {
                try {
                    const res = await fetch(`https://api.github.com/repos/${u}/${r}/contents/${p}`, { headers: headers() });
                    if (!res.ok) return "";
                    const data = await res.json();
                    return Buffer.from(data.content, 'base64').toString('utf8');
                } catch (e) { return ""; }
            },
            getUserCommits: async () => [],
            getCommitDiff: async () => ({ files: [] })
        };
    }
}
