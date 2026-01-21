import { INTERNAL_COMPONENT_DESCRIPTIONS } from '../PipelineConstants.js';

export const DesignerMessageRenderer = {
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
                    <ul class="components-list">
                        ${node.internalClasses.map(c => {
                const desc = INTERNAL_COMPONENT_DESCRIPTIONS[c] || 'Arquitectura interna de bajo nivel.';
                return `<li title="${desc}"><code>${c}</code></li>`;
            }).join('')}
                    </ul>
                </div>
            `
            : '';

        // Description Section
        const descriptionHtml = node.description
            ? `
                <div class="drawer-section node-description" style="margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px;">
                    <p style="font-size: 13px; color: #8b949e; line-height: 1.5; font-style: italic; margin: 0;">
                        ${node.description}
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
                    <select id="node-parent-select" style="width: 100%; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 10px; color: #e6edf3; font-family: var(--font-mono), monospace; outline: none;">
                        <option value="">(None - Independent)</option>
                        ${containers.map(c => `<option value="${c.id}" ${node.parentId === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
                    </select>
                </div>
            `;
        }

        // Content HTML
        const contentHtml = `
            <div class="drawer-content">
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
            <div class="drawer-footer" style="padding: 20px; border-top: 1px solid rgba(255, 255, 255, 0.05); display: flex; justify-content: flex-end; gap: 12px;">
                <button id="modal-cancel" style="background: #30363d; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Discard</button>
                <button id="modal-save" style="background: #238636; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Save Message</button>
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
                    background: #0d1117;
                    border: 1px solid #2f81f7;
                    color: #fff;
                    font-size: 18px;
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
    }
};
