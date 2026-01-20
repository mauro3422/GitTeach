import repoService from '../services/repoService.js';
import { IpcWrapper } from './IpcWrapper.js';

/**
 * RepoHandler - IPC bridge for listing repos, trees, and file contents.
 */
class RepoHandler {
    /**
     * Registers repository-related IPC handlers.
     * @param {Electron.IpcMain} ipcMain - The ipcMain instance.
     */
    static register(ipcMain) {
        IpcWrapper.registerHandler(
            ipcMain,
            'github:list-repos',
            () => repoService.listUserRepos(),
            'github:list-repos'
        );

        IpcWrapper.registerHandler(
            ipcMain,
            'github:get-repo-readme',
            (event, { owner, repo }) => repoService.getRepoReadme(owner, repo),
            'github:get-repo-readme'
        );

        IpcWrapper.registerHandler(
            ipcMain,
            'github:get-repo-tree',
            (event, { owner, repo, recursive }) => repoService.getRepoTree(owner, repo, recursive),
            'github:get-repo-tree'
        );

        IpcWrapper.registerHandler(
            ipcMain,
            'github:create-profile-repo',
            (event, username) => repoService.createProfileRepo(username),
            'github:create-profile-repo'
        );

        IpcWrapper.registerHandler(
            ipcMain,
            'github:create-workflow',
            (event, { username, content }) => repoService.createWorkflow(username, content),
            'github:create-workflow'
        );

        IpcWrapper.registerHandler(
            ipcMain,
            'github:get-file-content',
            (event, { owner, repo, path }) => repoService.getFileContent(owner, repo, path),
            'github:get-file-content'
        );

        console.log('[Handlers] ✅ RepoHandler registered with IpcWrapper.');
    }
}

export { RepoHandler };
