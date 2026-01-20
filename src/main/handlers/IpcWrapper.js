/**
 * IpcWrapper - A utility to wrap async IPC calls, providing standardized error logging and consistent error response formats.
 */
class IpcWrapper {
    /**
     * Wraps an async IPC handler function with standardized error handling.
     * @param {Function} handlerFn - The async handler function to wrap
     * @param {string} handlerName - Name of the handler for logging
     * @returns {Function} The wrapped handler function
     */
    static wrap(handlerFn, handlerName = 'unknown') {
        return async (event, ...args) => {
            try {
                console.log(`[IpcWrapper] Executing ${handlerName}`);
                const result = await handlerFn(event, ...args);
                console.log(`[IpcWrapper] ${handlerName} completed successfully`);
                return result;
            } catch (error) {
                console.error(`[IpcWrapper] ${handlerName} failed:`, error.message);
                console.error(`[IpcWrapper] ${handlerName} stack:`, error.stack);

                // Return standardized error response
                return {
                    error: error.message,
                    handler: handlerName,
                    timestamp: new Date().toISOString()
                };
            }
        };
    }

    /**
     * Wraps an async IPC handler function and returns empty data on error for specific cases.
     * @param {Function} handlerFn - The async handler function to wrap
     * @param {string} handlerName - Name of the handler for logging
     * @param {any} defaultData - Default data to return on error (optional)
     * @returns {Function} The wrapped handler function
     */
    static wrapWithDefault(handlerFn, handlerName = 'unknown', defaultData = []) {
        return async (event, ...args) => {
            try {
                console.log(`[IpcWrapper] Executing ${handlerName}`);
                const result = await handlerFn(event, ...args);
                console.log(`[IpcWrapper] ${handlerName} completed successfully`);
                return result;
            } catch (error) {
                console.warn(`[IpcWrapper] ${handlerName} failed:`, error.message);

                // Return standardized error response with default data
                return {
                    error: error.message,
                    data: defaultData,
                    handler: handlerName,
                    timestamp: new Date().toISOString()
                };
            }
        };
    }

    /**
     * Registers an IPC handler with automatic wrapping.
     * @param {Electron.IpcMain} ipcMain - The ipcMain instance
     * @param {string} channel - IPC channel name
     * @param {Function} handlerFn - The handler function
     * @param {string} handlerName - Name for logging
     * @param {boolean} useDefaultOnError - Whether to return default data on error
     * @param {any} defaultData - Default data for error cases
     */
    static registerHandler(ipcMain, channel, handlerFn, handlerName, useDefaultOnError = false, defaultData = []) {
        const wrappedHandler = useDefaultOnError
            ? this.wrapWithDefault(handlerFn, handlerName, defaultData)
            : this.wrap(handlerFn, handlerName);

        ipcMain.handle(channel, wrappedHandler);
        console.log(`[IpcWrapper] Registered handler: ${channel} (${handlerName})`);
    }
}

export { IpcWrapper };
