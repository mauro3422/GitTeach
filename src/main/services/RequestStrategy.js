/**
 * RequestStrategy - Generic fetch logic with retries and specialized headers.
 */
export class RequestStrategy {
    constructor(githubClient) {
        this.githubClient = githubClient;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.timeout = 10000; // 10 seconds
    }

    /**
     * Execute a request with retry logic
     */
    async execute(requestConfig, retryCount = 0) {
        try {
            const response = await this.makeRequest(requestConfig);

            // Handle rate limiting
            if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
                const resetTime = response.headers.get('x-ratelimit-reset');
                if (resetTime && retryCount < this.maxRetries) {
                    const waitTime = (parseInt(resetTime) * 1000) - Date.now();
                    if (waitTime > 0) {
                        console.log(`[RequestStrategy] Rate limited, waiting ${waitTime}ms`);
                        await this.delay(waitTime);
                        return this.execute(requestConfig, retryCount + 1);
                    }
                }
            }

            // Handle server errors with retry
            if (response.status >= 500 && retryCount < this.maxRetries) {
                console.log(`[RequestStrategy] Server error ${response.status}, retrying...`);
                await this.delay(this.retryDelay * (retryCount + 1));
                return this.execute(requestConfig, retryCount + 1);
            }

            return response;

        } catch (error) {
            if (retryCount < this.maxRetries && this.shouldRetry(error)) {
                console.log(`[RequestStrategy] Request failed, retrying... (${retryCount + 1}/${this.maxRetries})`);
                await this.delay(this.retryDelay * (retryCount + 1));
                return this.execute(requestConfig, retryCount + 1);
            }
            throw error;
        }
    }

    /**
     * Make the actual HTTP request
     */
    async makeRequest(requestConfig) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            // Prepare headers based on the URL domain
            const headers = this.buildHeaders(requestConfig);

            const response = await fetch(requestConfig.url, {
                method: requestConfig.method || 'GET',
                headers: headers,
                body: requestConfig.body ? JSON.stringify(requestConfig.body) : undefined,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response;

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Build appropriate headers based on the request URL
     */
    buildHeaders(requestConfig) {
        const baseHeaders = {
            'User-Agent': 'GitTeach/1.0.0',
            ...requestConfig.headers
        };

        // Check if this is a GitHub URL
        const url = new URL(requestConfig.url);
        const isGitHubUrl = url.hostname.includes('github.com') || url.hostname.includes('api.github.com');

        if (isGitHubUrl) {
            // Add GitHub-specific headers and authorization
            baseHeaders['Accept'] = 'application/vnd.github.v3+json';
            if (this.githubClient && this.githubClient.token) {
                baseHeaders['Authorization'] = `token ${this.githubClient.token}`;
            }
        } else {
            // For non-GitHub URLs (like localhost AI servers), add minimal headers
            baseHeaders['Accept'] = 'application/json';
            // Authorization is optional for non-GitHub URLs
        }

        return baseHeaders;
    }

    /**
     * Determine if an error should trigger a retry
     */
    shouldRetry(error) {
        // Retry on network errors, timeouts, but not on auth errors
        if (error.name === 'AbortError') return true; // Timeout
        if (error.code === 'ECONNRESET') return true; // Connection reset
        if (error.code === 'ENOTFOUND') return true; // DNS resolution failed
        if (error.code === 'ECONNREFUSED') return true; // Connection refused

        return false;
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Set retry configuration
     */
    setRetryConfig(maxRetries, retryDelay, timeout) {
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.timeout = timeout;
    }
}
