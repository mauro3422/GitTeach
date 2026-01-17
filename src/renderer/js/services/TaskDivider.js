/**
 * TaskDivider - Utility to split massive curation tasks into parallel chunks
 */
import { Logger } from '../utils/logger.js';

export class TaskDivider {
    /**
     * Splits an array of findings into batches based on size or count
     * @param {Array} items - Items to batch
     * @param {number} maxItems - Max items per batch
     * @returns {Array<Array>}
     */
    static batchByCount(items, maxItems = 15) {
        const batches = [];
        for (let i = 0; i < items.length; i += maxItems) {
            batches.push(items.slice(i, i + maxItems));
        }
        return batches;
    }

    /**
     * Splits an array of findings into batches based on character limit
     * @param {Array} items - Items to batch (must have a property to measure)
     * @param {number} maxChars - Max characters per batch
     * @param {Function} measureFn - Function to get size of an item
     * @returns {Array<Array>}
     */
    static batchByLength(items, maxChars = 10000, measureFn = (item) => JSON.stringify(item).length) {
        const batches = [[]];
        let currentBatchSize = 0;

        items.forEach(item => {
            const itemSize = measureFn(item);
            if (currentBatchSize + itemSize > maxChars && batches[batches.length - 1].length > 0) {
                batches.push([item]);
                currentBatchSize = itemSize;
            } else {
                batches[batches.length - 1].push(item);
                currentBatchSize += itemSize;
            }
        });

        return batches;
    }

    /**
     * Compresses a text if it exceeds a threshold
     * @param {string} text - Text to compress
     * @param {number} threshold - Threshold in chars
     * @returns {string}
     */
    static smartCompress(text, threshold = 4000) {
        if (typeof text !== 'string' || !text || text.length <= threshold) return text;

        Logger.warn('TaskDivider', `Compressing text (${text.length} -> threshold ${threshold})`);

        // Basic heuristic: Keep first 30%, 40% spread ellipsis, last 30%
        const headSize = Math.floor(threshold * 0.3);
        const tailSize = Math.floor(threshold * 0.3);

        return text.substring(0, headSize) +
            "\n... [CONTENT COMPRESSED FOR CONTEXT EFFICIENCY] ...\n" +
            text.substring(text.length - tailSize);
    }
}
