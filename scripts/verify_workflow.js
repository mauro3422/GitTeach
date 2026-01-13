const fs = require('fs');
const path = require('path');
const https = require('https');

// Config
const TOKEN_PATH = path.join(process.env.APPDATA, 'giteach', 'token.json');
const USERNAME = 'mauro3422'; // Hardcoded for verification as per user context
const REPO_NAME = USERNAME;

function log(msg) {
    console.log(`[VERIFY] ${msg}`);
}

async function request(url, method, body, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: url,
            method: method,
            headers: {
                'User-Agent': 'GitTeach-Verify',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                log(`${method} ${url} -> Status: ${res.statusCode}`);
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(json);
                    } else {
                        resolve({ error: json.message || 'Unknown Error', status: res.statusCode });
                    }
                } catch (e) {
                    resolve({ error: 'Invalid JSON', raw: data });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    // 1. Load Token
    if (!fs.existsSync(TOKEN_PATH)) {
        log('❌ Token not found at ' + TOKEN_PATH);
        return;
    }
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    const token = tokenData.access_token;
    log('✅ Token loaded.');

    // 2. Check Repo Existence
    log(`Checking if repo ${REPO_NAME}/${REPO_NAME} exists...`);
    const repoCheck = await request(`/repos/${USERNAME}/${REPO_NAME}`, 'GET', null, token);

    if (repoCheck.error) {
        log('⚠️ Repo not found. Attempting CREATE...');
        const createRes = await request('/user/repos', 'POST', {
            name: REPO_NAME,
            description: 'Verification Repo',
            auto_init: true,
            private: false
        }, token);

        if (createRes.error) {
            log('❌ Failed to create repo: ' + createRes.error);
            return;
        }
        log('✅ Repo created. Waiting 5 seconds for propagation...');
        await new Promise(r => setTimeout(r, 5000));
    } else {
        log('✅ Repo exists.');
    }

    // 3. Create Workflow File
    log('Attempting to create/update workflow file...');
    const content = 'name: Snake\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v2';

    // Check for existing file SHA
    let sha = null;
    const fileCheck = await request(`/repos/${USERNAME}/${REPO_NAME}/contents/.github/workflows/snake.yml`, 'GET', null, token);
    if (!fileCheck.error && fileCheck.sha) {
        sha = fileCheck.sha;
        log('ℹ️ Existing file found, updating (SHA: ' + sha.substring(0, 7) + ')');
    }

    const putRes = await request(`/repos/${USERNAME}/${REPO_NAME}/contents/.github/workflows/snake.yml`, 'PUT', {
        message: 'Verify Snake Workflow',
        content: Buffer.from(content).toString('base64'),
        sha: sha
    }, token);

    if (putRes.error) {
        log('❌ Failed to create workflow: ' + putRes.error);
    } else {
        log('✅ Workflow created successfully!');
        log('URL: ' + putRes.content.html_url);
    }
}

run();
