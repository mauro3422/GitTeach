import { INTERNAL_COMPONENT_DESCRIPTIONS } from '../PipelineConstants.js';
import { ThemeManager } from '../../../core/ThemeManager.js';
import { DESIGNER_CONSTANTS } from './DesignerConstants.js';

export const UIDrawerRenderer = {
    /**
     * Render the messaging view into the drawer
     */
    render(drawer, node, onSave, onDiscard) {
        if (!drawer || !node) return;

        // Header HTML (Using reuse pattern from DrawerManager)
        const headerHtml = `
            <div class="drawer-header">
                <span class="drawer-icon">${node.icon || '📝'}</span>
                <div class="drawer-title-group">
                    <div class="drawer-title" id="drawer-title-text" title="Double-click to rename">${node.label}</div>
                    <div class="drawer-subtitle">${node.sublabel || 'Logical Agent'}</div>
                </div>
                <button class="drawer-close" id="drawer-close">×</button>
            </div>
        `;

        // Internal Components (Folders/Classes)
        const componentsHtml = (node.internalClasses && node.internalClasses.length > 0)
            ? `
                <div class="drawer-section internal-components" style="margin-bottom: 20px;">
                    <h4>🏗️ INTERNAL COMPONENTS / DIRECTORIES</h4>
                    <ul class="components-list" id="drawer-components-list">
                        ${this._renderInternalComponents(drawer, node)}
                    </ul>
                </div>
            `
            : '';

        // Description Section - Try to find fallback in constants if empty
        const effectiveDescription = (node.description && node.description.trim() !== "")
            ? node.description
            : (INTERNAL_COMPONENT_DESCRIPTIONS[node.label] || "");

        const descriptionHtml = effectiveDescription
            ? `
                <div class="drawer-section node-description" style="margin-bottom: 20px; border-bottom: 1px solid ${ThemeManager.colors.glassBorderSubtle}; padding-bottom: 15px;">
                    <p style="font-size: 13px; color: ${ThemeManager.colors.drawerTextDim}; line-height: 1.5; font-style: italic; margin: 0;">
                        ${effectiveDescription}
                    </p>
                </div>
            `
            : '';

        // Parenting Section (Only for non-containers)
        let parentingHtml = '';
        if (!node.isRepoContainer) {
            const allNodes = drawer.allNodes || {};
            const containers = Object.values(allNodes).filter(n => n.isRepoContainer && n.id !== node.id);

            parentingHtml = `
                <div class="drawer-section node-parenting" style="margin-bottom: 20px;">
                    <h4>📦 BOX PARENT</h4>
                    <select id="node-parent-select" style="width: 100%; background: ${ThemeManager.colors.drawerBg}; border: 1px solid ${ThemeManager.colors.drawerBorder}; border-radius: 6px; padding: 10px; color: ${ThemeManager.colors.text}; font-family: var(--font-mono), monospace; outline: none;">
                        <option value="">(None - Independent)</option>
                        ${containers.map(c => `<option value="${c.id}" ${node.parentId === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        // Content HTML
        const contentHtml = `
            <div class="drawer-content">
                ${node.isStickyNote ? `<div style="background: ${ThemeManager.colors.error}; color: white; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-weight: bold;">⚠️ ERROR: INLINE EDITOR FAILED. Using fallback drawer.</div>` : ''}
                ${descriptionHtml}
                ${parentingHtml}
                ${componentsHtml}
                <div class="drawer-section">
                    <h4>Internal Notes / Debugging</h4>
                    <textarea id="node-message-input" placeholder="Escribe aquí tus dudas o notas de debugging...">${node.message || ''}</textarea>
                </div>
            </div>
        `;

        // Footer HTML
        const footerHtml = `
            <div class="drawer-footer" style="padding: 20px; border-top: 1px solid ${ThemeManager.colors.glassBorderSubtle}; display: flex; justify-content: flex-end; gap: 12px;">
                <button id="modal-cancel" style="background: ${ThemeManager.colors.drawerBorder}; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Discard</button>
                <button id="modal-save" style="background: ${ThemeManager.colors.success}; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Save Message</button>
            </div>
        `;

        drawer.innerHTML = `
            ${headerHtml}
            ${contentHtml}
            ${footerHtml}
        `;

        // Bind Events
        const closeBtn = drawer.querySelector('#drawer-close');
        const cancelBtn = drawer.querySelector('#modal-cancel');
        const saveBtn = drawer.querySelector('#modal-save');
        const textarea = drawer.querySelector('#node-message-input');

        if (closeBtn) closeBtn.onclick = onDiscard;
        if (cancelBtn) cancelBtn.onclick = onDiscard;

        // Handle double-click to rename title
        const titleText = drawer.querySelector('#drawer-title-text');
        let currentLabel = node.label;

        if (titleText) {
            titleText.ondblclick = () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentLabel;
                input.className = 'drawer-title-input';
                input.style.cssText = `
                    background: ${ThemeManager.colors.drawerBg};
                    border: 1px solid ${ThemeManager.colors.primary};
                    color: ${ThemeManager.colors.textBright};
                    font-size: ${DESIGNER_CONSTANTS.TYPOGRAPHY.BASE_FONT_SIZE}px;
                    font-weight: 600;
                    padding: 2px 4px;
                    border-radius: 4px;
                    width: 100%;
                    outline: none;
                `;

                titleText.innerHTML = '';
                titleText.appendChild(input);
                input.focus();

                const finishNaming = () => {
                    const val = input.value.trim();
                    if (val) {
                        currentLabel = val;
                        titleText.textContent = val;
                    } else {
                        titleText.textContent = currentLabel;
                    }
                };

                input.onblur = finishNaming;
                input.onkeydown = (e) => {
                    if (e.key === 'Enter') finishNaming();
                    if (e.key === 'Escape') {
                        titleText.textContent = currentLabel;
                    }
                };
            };
        }

        if (saveBtn) saveBtn.onclick = () => {
            const parentId = drawer.querySelector('#node-parent-select')?.value || null;
            onSave(textarea.value, parentId, currentLabel);
        };

        // Autofocus without scrolling the viewport
        requestAnimationFrame(() => {
            if (textarea) textarea.focus({ preventScroll: true });
        });
    },

    /**
     * Partial update for internal components only
     */
    refreshInternalComponents(drawer, node) {
        const list = drawer.querySelector('#drawer-components-list');
        if (list) {
            list.innerHTML = this._renderInternalComponents(drawer, node);
        }
    },

    /**
     * Sub-renderer for internal components
     * @private
     */
    _renderInternalComponents(drawer, node) {
        if (!node.internalClasses) return '';

        // Filter out folders/paths
        const blueprintClasses = node.internalClasses.filter(c => !c.includes('/'));

        if (blueprintClasses.length === 0) return '';

        const allNodes = drawer.allNodes || {};
        const nodeMap = new Map(); // Label -> Node
        Object.values(allNodes).forEach(n => {
            if (n.label) nodeMap.set(n.label.trim().toLowerCase(), n);
        });

        // Inventory Logic:
        // - HIDE if it exists as a node ELSEWHERE (different parent)
        // - SHOW with ✅ if it's a child node of THIS box
        // - SHOW with ⚙️ if it's still just a blueprint (not on canvas)
        const inventory = blueprintClasses.map(c => {
            const normalized = c.trim().toLowerCase();
            const physicalNode = nodeMap.get(normalized);

            if (physicalNode) {
                // If it's a node but belongs to ANOTHER parent, we hide it from this inventory
                if (physicalNode.parentId !== node.id) {
                    return null;
                }
                // If it's a child of this box, show as extracted
                return { name: c, status: 'extracted' };
            }
            // Not on canvas yet
            return { name: c, status: 'blueprint' };
        }).filter(Boolean);

        if (inventory.length === 0) {
            return '<li style="color: #666; font-style: italic; padding: 10px;">No components in this scope.</li>';
        }

        return inventory.map(item => {
            const desc = INTERNAL_COMPONENT_DESCRIPTIONS[item.name] || 'Arquitectura interna de bajo nivel.';

            // User requested to remove the green checkmark and the "(Extracted)" label
            const isExtracted = item.status === 'extracted';
            const icon = isExtracted ? '' : '<span style="font-size: 12px;">⚙️</span>';
            const style = isExtracted ? `color: ${ThemeManager.colors.success}; opacity: 0.8;` : '';

            return `
                <li title="${desc}" style="padding: 4px 8px; margin: 4px 0; display: flex; align-items: center; gap: 8px; ${style}">
                    ${icon}
                    <code>${item.name}</code>
                </li>
            `;
        }).join('');
    }
};
