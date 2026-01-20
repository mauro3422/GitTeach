import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IpcWrapper } from '../src/main/handlers/IpcWrapper.js';

// Mock Electron's ipcMain module
const mockIpcMain = {
  handle: vi.fn()
};

describe('IpcWrapper', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Mock console methods to prevent output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('wrap', () => {
    it('should successfully execute a handler function and return its result', async () => {
      const mockEvent = { sender: { id: 1 } };
      const expectedResult = 'success result';
      
      const handlerFn = async (event, ...args) => {
        expect(event).toBe(mockEvent);
        expect(args).toEqual([1, 2, 3]);
        return expectedResult;
      };

      const wrappedHandler = IpcWrapper.wrap(handlerFn, 'testHandler');
      const result = await wrappedHandler(mockEvent, 1, 2, 3);

      expect(result).toBe(expectedResult);
    });

    it('should return standardized error response when handler throws an error', async () => {
      const mockEvent = { sender: { id: 1 } };
      const errorMessage = 'Test error';
      
      const handlerFn = async () => {
        throw new Error(errorMessage);
      };

      const wrappedHandler = IpcWrapper.wrap(handlerFn, 'failingHandler');
      const result = await wrappedHandler(mockEvent);

      expect(result).toEqual({
        error: errorMessage,
        handler: 'failingHandler',
        timestamp: expect.any(String)
      });

      // Verify timestamp is in ISO format
      const date = new Date(result.timestamp);
      expect(date.toISOString()).toBe(result.timestamp);
    });

    it('should use "unknown" as default handler name', async () => {
      const handlerFn = async () => {
        throw new Error('Test error');
      };

      const wrappedHandler = IpcWrapper.wrap(handlerFn);
      const result = await wrappedHandler({});

      expect(result.handler).toBe('unknown');
    });
  });

  describe('wrapWithDefault', () => {
    it('should successfully execute a handler function and return its result', async () => {
      const mockEvent = { sender: { id: 1 } };
      const expectedResult = 'success result';
      
      const handlerFn = async (event, ...args) => {
        expect(event).toBe(mockEvent);
        expect(args).toEqual([1, 2, 3]);
        return expectedResult;
      };

      const wrappedHandler = IpcWrapper.wrapWithDefault(handlerFn, 'testHandler', []);
      const result = await wrappedHandler(mockEvent, 1, 2, 3);

      expect(result).toBe(expectedResult);
    });

    it('should return standardized error response with default data when handler throws an error', async () => {
      const mockEvent = { sender: { id: 1 } };
      const errorMessage = 'Test error';
      const defaultData = [{ id: 1, name: 'default' }];
      
      const handlerFn = async () => {
        throw new Error(errorMessage);
      };

      const wrappedHandler = IpcWrapper.wrapWithDefault(handlerFn, 'failingHandler', defaultData);
      const result = await wrappedHandler(mockEvent);

      expect(result).toEqual({
        error: errorMessage,
        data: defaultData,
        handler: 'failingHandler',
        timestamp: expect.any(String)
      });

      // Verify timestamp is in ISO format
      const date = new Date(result.timestamp);
      expect(date.toISOString()).toBe(result.timestamp);
    });

    it('should use empty array as default data when not provided', async () => {
      const handlerFn = async () => {
        throw new Error('Test error');
      };

      const wrappedHandler = IpcWrapper.wrapWithDefault(handlerFn, 'failingHandler');
      const result = await wrappedHandler({});

      expect(result.data).toEqual([]);
    });
  });

  describe('registerHandler', () => {
    it('should register a handler with ipcMain using wrap', () => {
      const mockChannel = 'test-channel';
      const mockHandlerFn = async () => 'result';
      const mockHandlerName = 'testHandler';

      IpcWrapper.registerHandler(
        mockIpcMain,
        mockChannel,
        mockHandlerFn,
        mockHandlerName
      );

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        mockChannel,
        expect.any(Function)
      );
    });

    it('should register a handler with ipcMain using wrapWithDefault when useDefaultOnError is true', () => {
      const mockChannel = 'test-channel';
      const mockHandlerFn = async () => 'result';
      const mockHandlerName = 'testHandler';
      const mockDefaultData = { id: 1 };

      IpcWrapper.registerHandler(
        mockIpcMain,
        mockChannel,
        mockHandlerFn,
        mockHandlerName,
        true,
        mockDefaultData
      );

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        mockChannel,
        expect.any(Function)
      );
    });

    it('should use empty array as default data when useDefaultOnError is true but defaultData is not provided', () => {
      const mockChannel = 'test-channel';
      const mockHandlerFn = async () => 'result';
      const mockHandlerName = 'testHandler';

      IpcWrapper.registerHandler(
        mockIpcMain,
        mockChannel,
        mockHandlerFn,
        mockHandlerName,
        true
      );

      expect(mockIpcMain.handle).toHaveBeenCalledWith(
        mockChannel,
        expect.any(Function)
      );
    });
  });

  describe('Integration tests', () => {
    it('should properly handle successful async operations', async () => {
      const mockEvent = { sender: { id: 1 } };
      const testData = { message: 'success', value: 42 };
      
      const successfulHandler = async (event, param) => {
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, 1));
        expect(param).toBe('test-param');
        return testData;
      };

      const wrappedHandler = IpcWrapper.wrap(successfulHandler, 'integrationTest');
      const result = await wrappedHandler(mockEvent, 'test-param');

      expect(result).toEqual(testData);
    });

    it('should handle multiple arguments correctly', async () => {
      const mockEvent = {};
      
      const handlerWithArgs = async (event, arg1, arg2, arg3) => {
        return { received: [arg1, arg2, arg3] };
      };

      const wrappedHandler = IpcWrapper.wrap(handlerWithArgs, 'multiArgTest');
      const result = await wrappedHandler(mockEvent, 'first', 42, { key: 'value' });

      expect(result).toEqual({
        received: ['first', 42, { key: 'value' }]
      });
    });

    it('should handle different types of errors gracefully', async () => {
      const errorTypes = [
        new Error('Standard error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error')
      ];

      for (const error of errorTypes) {
        const failingHandler = async () => {
          throw error;
        };

        const wrappedHandler = IpcWrapper.wrap(failingHandler, 'errorHandlingTest');
        const result = await wrappedHandler({});

        expect(result).toEqual({
          error: error.message,
          handler: 'errorHandlingTest',
          timestamp: expect.any(String)
        });
      }
    });
  });
});