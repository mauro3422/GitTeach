/**
 * FileContentFetcher - Shared utility for fetching and caching file content
 * Consolidates duplicated logic from CodeScanner and BackgroundAnalyzer
 * 
 * SOLID:
 * - S: Single responsibility - fetch and cache file content
 * - D: Depends on CacheRepository abstraction
 */
import { CacheRepository } from './cacheRepository.js';
import { Logger } from './logger.js';

export class FileContentFetcher {
    /**
     * Fetches file content with cache support
     * @param {Object} params - { username, repo, path, sha }
     * @param {Object} options - { forceRefresh: boolean, maxSnippetLength: number }
     * @returns {Promise<{content: string, summary: string, fromCache: boolean}|null>}
     */
    static async fetch(params, options = {}) {
        const { username, repo, path, sha } = params;
        const { forceRefresh = false, maxSnippetLength = 2000 } = options;

        // Check cache first (unless forceRefresh)
        if (!forceRefresh) {
            const needsUpdate = await CacheRepository.needsUpdate(username, repo, path, sha);
            if (!needsUpdate) {
                const cached = await CacheRepository.getFileSummary(username, repo, path);
                if (cached) {
                    Logger.cache(`Cache hit: ${repo}/${path}`, true);
                    return {
                        content: cached.contentSnippet || '',
                        summary: cached.summary || '',
                        fromCache: true
                    };
                }
            }
        }

        // Fetch from GitHub
        try {
            const contentRes = await window.githubAPI.getFileContent(username, repo, path);

            if (!contentRes || !contentRes.content) {
                Logger.warn('FileContentFetcher', `No content received for ${repo}/${path}`);
                return null;
            }

            // Decode base64 content
            const rawContent = atob(contentRes.content.replace(/\n/g, ''));
            const snippet = rawContent.substring(0, maxSnippetLength);

            return {
                content: snippet,
                sha: contentRes.sha,
                fromCache: false
            };
        } catch (error) {
            Logger.error('FileContentFetcher', `Failed to fetch ${repo}/${path}: ${error.message}`);
            return null;
        }
    }

    /**
     * Fetches and caches file content with summary
     * @param {Object} params - { username, repo, path, sha }
     * @param {Function} summarizeFn - Async function to generate summary from content
     * @returns {Promise<{content: string, summary: string, fromCache: boolean}|null>}
     */
    static async fetchAndSummarize(params, summarizeFn) {
        const { username, repo, path, sha } = params;

        // Check cache first
        const cached = await CacheRepository.getFileSummary(username, repo, path);
        if (cached && cached.summary) {
            return {
                content: cached.contentSnippet || '',
                summary: cached.summary,
                fromCache: true
            };
        }

        // Fetch content
        const result = await this.fetch(params);
        if (!result) return null;

        // Generate summary
        let summary = result.content.substring(0, 500); // Default fallback
        if (summarizeFn) {
            try {
                summary = await summarizeFn(repo, path, result.content);
            } catch (error) {
                Logger.warn('FileContentFetcher', `Summary generation failed: ${error.message}`);
            }
        }

        // Save to cache
        await CacheRepository.setFileSummary(
            username, repo, path,
            sha || result.sha,
            summary,
            result.content
        );

        return {
            content: result.content,
            summary,
            fromCache: false
        };
    }
}
