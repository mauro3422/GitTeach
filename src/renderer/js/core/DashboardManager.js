import { DashboardView } from '../views/dashboard.js';
import { ChatComponent } from '../components/chatComponent.js';
import { EditorComponent } from '../components/editorComponent.js';
import { DropdownComponent } from '../components/dropdownComponent.js';
import { ResizableManager } from '../utils/resizable_manager.js';
import { AgentManager } from './AgentManager.js';
import { EditorManager } from './EditorManager.js';

/**
 * DashboardManager - Orchestrates dashboard component loading and layout
 */
export class DashboardManager {
    static async load() {
        // 1. Data load in background
        await DashboardView.updateUserInfo();
        ChatComponent.init();
        EditorComponent.init();
        EditorManager.init();

        // 2. Component init
        const { sidebarManager } = await import('../components/sidebar_manager.js');
        sidebarManager.init();

        const resizable = new ResizableManager('dashboard-view');
        resizable.init();

        DropdownComponent.init('btn-user-menu', 'user-dropdown');

        // 3. Start AI Agent
        const username = DashboardView.currentUsername || 'User';
        AgentManager.start(username);
    }
}
