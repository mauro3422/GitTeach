import fs from 'fs';
import path from 'path';
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
                    const response = await fetch(`https://api.github.com/user/repos?per_page=100`, {
                        headers: {
                            'Authorization': `token ${authToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const data = await response.json();

                    // Log for debug
                    try { fs.appendFileSync(path.join(process.cwd(), 'debug_network_repos.log'), `[GithubMock] listRepos: SUCCESS. Count: ${data.length}\n`); } catch (e) { }

                    return data;
                } catch (error) {
                    console.error('[GithubMock] listRepos Error:', error.message);
                    try { fs.appendFileSync(path.join(process.cwd(), 'debug_network_repos.log'), `[GithubMock] listRepos: ERROR: ${error.message}\n`); } catch (e) { }
                    return [];
                }
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
                        try { fs.appendFileSync(path.join(process.cwd(), 'debug_tree_fetch.log'), `[GithubMock] main FAIL ${r}: ${treeRes.status}\n`); } catch (e) { }
                        // Fallback to master
                        const masterRes = await fetch(`https://api.github.com/repos/${u}/${r}/git/trees/master?recursive=1`, { headers: headers() });
                        if (masterRes.ok) {
                            const data = await masterRes.json();
                            try { fs.appendFileSync(path.join(process.cwd(), 'debug_tree_fetch.log'), `[GithubMock] master SUCCESS ${r}. Files: ${data.tree?.length}\n`); } catch (e) { }
                            return data;
                        } else {
                            try { fs.appendFileSync(path.join(process.cwd(), 'debug_tree_fetch.log'), `[GithubMock] master FAIL ${r}: ${masterRes.status}\n`); } catch (e) { }
                        }
                    } else {
                        const data = await treeRes.json();
                        try { fs.appendFileSync(path.join(process.cwd(), 'debug_tree_fetch.log'), `[GithubMock] main SUCCESS ${r}. Files: ${data.tree?.length}\n`); } catch (e) { }
                        return data;
                    }
                } catch (e) {
                    try { fs.appendFileSync(path.join(process.cwd(), 'debug_tree_fetch.log'), `[GithubMock] fetch ERROR ${r}: ${e.message}\n`); } catch (e2) { }
                }
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
                    if (!res.ok) {
                        try { fs.appendFileSync(path.join(process.cwd(), 'debug_network.log'), `[GithubMock] FAIL ${p}: ${res.status}\n`); } catch (e) { }
                        return { message: 'Not Found' };
                    }
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
                                console.log(`[GithubMock] Meta for ${p}: ${data.file_meta.last_modified}`);
                            } else {
                                console.warn(`[GithubMock] No commits found for path: ${p}`);
                            }
                        } else {
                            console.error(`[GithubMock] Meta fetch failed for ${p}: ${mRes.status} ${mRes.statusText}`);
                        }
                    } catch (me) {
                        console.error(`[GithubMock] Meta fetch ERROR for ${p}:`, me.message);
                    }
                    console.log(`[GithubMock] Fetch SUCCESS for ${p}. Content Length: ${data.content ? data.content.length : 0}`);
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
