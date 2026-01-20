import http from 'http';
import url from 'url';

/**
 * AuthServer - Thin wrapper around http.createServer to listen for the GitHub callback.
 */
class AuthServer {
    constructor() {
        this.server = null;
        this.port = 3000;
        this.callbackHandler = null;
    }

    /**
     * Starts the HTTP server to listen for GitHub OAuth callback.
     * @param {Function} callbackHandler - Function to call with the authorization code
     * @returns {Promise<void>}
     */
    async startServer(callbackHandler) {
        this.callbackHandler = callbackHandler;

        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.close();
            }

            this.server = http.createServer(async (req, res) => {
                try {
                    await this.handleRequest(req, res);
                } catch (error) {
                    console.error('[AuthServer] Error handling request:', error);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                }
            });

            this.server.listen(this.port, 'localhost', () => {
                console.log(`[AuthServer] Listening on http://localhost:${this.port}/callback`);
                resolve();
            });

            this.server.on('error', (error) => {
                console.error('[AuthServer] Server error:', error);
                reject(error);
            });
        });
    }

    /**
     * Handles incoming HTTP requests.
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    async handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const queryData = parsedUrl.query;

        // Check if this is the OAuth callback
        if (parsedUrl.pathname === '/callback' && queryData.code) {
            console.log('[AuthServer] Received authorization code');

            // Send success response to browser
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<h1>Autorizado!</h1><p>Vuelve a GitTeach.</p>');

            // Call the callback handler with the code
            if (this.callbackHandler) {
                await this.callbackHandler(queryData.code);
            }

            // Close the server after handling the callback
            this.stopServer();
        } else {
            // Handle other requests or invalid callbacks
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    }

    /**
     * Stops the HTTP server.
     */
    stopServer() {
        if (this.server) {
            console.log('[AuthServer] Stopping server');
            this.server.close(() => {
                console.log('[AuthServer] Server stopped');
                this.server = null;
            });
        }
    }
}

export default AuthServer;
