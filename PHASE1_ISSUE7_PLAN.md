# ⚠️ PHASE 1 - Issue #7: Error Boundary for Render Loop

**Status:** READY TO START
**Complexity:** MEDIUM (1 hour estimated)
**Time:** ~1 hour
**Priority:** HIGH - Prevents render crashes
**After:** Issue #6 ✅ COMPLETE

---

## 🔍 Problem

### Current State
```javascript
_executeRender() {
    // If ANY error here, entire frame crashes
    // No recovery possible
    // User sees blank/frozen canvas
    DesignerCanvas.render(
        this.canvas.width, this.canvas.height,
        DesignerStore.state.nodes,
        navState,
        DesignerStore.state.connections,
        ...
    );
}
```

**Issues:**
1. Single error crashes entire render loop
2. No partial recovery (render what's possible)
3. Hard failures, no graceful degradation
4. Difficult to debug render errors

---

## 🎯 Solution Approach

### Level 1: Top-Level Render Boundary
**File:** `DesignerController.js:258-300`

```javascript
_executeRender() {
    try {
        // Main render operation
        DesignerCanvas.render(...);
    } catch (e) {
        console.error('[DesignerController] Render failed:', e);
        // Fallback: render minimal grid
        this.renderFallback();
    }
}

renderFallback() {
    // Minimal fallback rendering
    const ctx = this.canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // Optionally: draw grid
}
```

### Level 2: Individual Renderer Boundaries
**Files:** `NodeRenderer.js`, `ConnectionRenderer.js`, `ContainerRenderer.js`

```javascript
// BEFORE
static render(ctx, nodes, camera) {
    Object.values(nodes).forEach(node => {
        // Draw node - if error, everything stops
        this.drawNode(ctx, node, camera);
    });
}

// AFTER
static render(ctx, nodes, camera) {
    Object.values(nodes).forEach(node => {
        try {
            this.drawNode(ctx, node, camera);
        } catch (e) {
            console.warn(`[NodeRenderer] Failed to render node ${node.id}:`, e);
            // Continue to next node
        }
    });
}
```

### Level 3: Canvas Operations
**File:** `DesignerCanvas.js`

```javascript
// For each drawing operation
try {
    ctx.drawImage(image, x, y);
} catch (e) {
    console.warn('[CanvasOp] drawImage failed:', e);
    // Continue (skip this element)
}
```

---

## 📋 Implementation Checklist

### Step 1: Top-Level Boundary (15 minutes)
- [ ] Wrap `DesignerCanvas.render()` in try-catch
- [ ] Log error details
- [ ] Provide fallback rendering
- [ ] Test: Force error in render, verify fallback shows

**File:** `DesignerController.js`

```javascript
_executeRender() {
    try {
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // ... nav state setup ...

        // PROTECTED: Main render
        DesignerCanvas.render(...);
    } catch (e) {
        console.error('[DesignerController] Critical render error:', e);
        console.error('[DesignerController] Stack:', e.stack);
        // Fallback
        this._renderErrorFallback(e);
    }
}

_renderErrorFallback(error) {
    const ctx = this.canvas.getContext('2d');
    // Black screen
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Error message
    ctx.fillStyle = '#ff4444';
    ctx.font = '16px monospace';
    ctx.fillText('Render Error - Check Console', 20, 30);
    ctx.fillText(error.message.substring(0, 60), 20, 60);
}
```

### Step 2: Node Renderer Boundary (15 minutes)
- [ ] Wrap node rendering loop in try-catch
- [ ] Log which node failed
- [ ] Continue to next node
- [ ] Test: Corrupt a node, verify others render

**File:** `NodeRenderer.js` - `render()` method

```javascript
static render(ctx, nodes, camera, interactionState) {
    Object.values(nodes).forEach(node => {
        try {
            if (node.isStickyNote) {
                this.drawStickyNote(ctx, node, camera, interactionState);
            } else if (node.isRepoContainer) {
                this.drawContainer(ctx, node, camera, interactionState);
            } else {
                this.drawNode(ctx, node, camera, interactionState);
            }
        } catch (e) {
            console.warn(`[NodeRenderer] Failed to render node ${node.id}:`, e.message);
            // Continue to next node
        }
    });
}
```

### Step 3: Connection Renderer Boundary (15 minutes)
- [ ] Wrap connection rendering loop in try-catch
- [ ] Log which connection failed
- [ ] Continue to next connection
- [ ] Test: Corrupt connection data, verify nodes still render

**File:** `ConnectionRenderer.js` - `render()` method

```javascript
static render(ctx, connections, nodes, camera, activeConnId) {
    connections.forEach(conn => {
        try {
            const fromNode = nodes[conn.from];
            const toNode = nodes[conn.to];

            if (!fromNode || !toNode) {
                console.warn(`[ConnectionRenderer] Invalid connection: ${conn.from} → ${conn.to}`);
                return;
            }

            this.drawConnection(ctx, conn, fromNode, toNode, camera, activeConnId);
        } catch (e) {
            console.warn(`[ConnectionRenderer] Failed to render connection ${conn.from}→${conn.to}:`, e.message);
            // Continue
        }
    });
}
```

### Step 4: Canvas Operations (10 minutes)
- [ ] Review low-level canvas operations
- [ ] Add try-catch for drawImage, fillText, etc. (if needed)
- [ ] Most are already safe, but image loads can fail

**File:** `DesignerCanvas.js` - GridRenderer

```javascript
// If using drawImage for textures
try {
    ctx.drawImage(patternImage, x, y);
} catch (e) {
    console.warn('[GridRenderer] drawImage failed:', e);
    // Fallback: draw simple grid pattern
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();
}
```

### Step 5: Testing (10 minutes)
- [ ] Inject error in NodeRenderer, verify fallback shows
- [ ] Inject error in ConnectionRenderer, verify rest renders
- [ ] Test error logging
- [ ] Verify no infinite error loops

---

## 🧪 Test Cases

### Test 1: NodeRenderer Error
```javascript
// Simulate error
NodeRenderer.drawNode = () => {
    throw new Error('Test error');
};

// Result: Should see other nodes render ✅
```

### Test 2: Critical Error
```javascript
// Simulate error in main render
DesignerCanvas.render = () => {
    throw new Error('Critical');
};

// Result: Should see fallback error message ✅
```

### Test 3: Connection Error
```javascript
// Corrupt connection data
connections.push({ from: 'invalid', to: 'missing' });

// Result: Should skip bad connection, render others ✅
```

---

## 📊 Expected Outcome

**Before:**
```
Error in NodeRenderer
    → Crash entire render
    → Blank canvas
    → User confused
```

**After:**
```
Error in NodeRenderer
    → Log warning
    → Skip that node
    → Render other nodes ✅
    → User sees most UI ✅
    → Error visible in console ✅
```

---

## 📁 Files to Modify

| File | Changes | Time |
|------|---------|------|
| `DesignerController.js` | Top-level try-catch + fallback | 15m |
| `NodeRenderer.js` | Per-node try-catch | 15m |
| `ConnectionRenderer.js` | Per-connection try-catch | 15m |
| `DesignerCanvas.js` | Optional: low-level safety | 10m |

**Total: ~55 minutes**

---

## 🎯 Success Criteria

- [ ] Render errors don't crash app ✅
- [ ] Fallback UI shows on critical error ✅
- [ ] Partial rendering works (some nodes skip) ✅
- [ ] All errors logged with stack traces ✅
- [ ] No infinite error loops ✅
- [ ] 129 tests still pass ✅
- [ ] Canvas remains responsive ✅

---

## 🔗 Dependencies

- Requires: Issue #6 ✅ COMPLETE
- Blocks: Issue #8 (can proceed independently)
- Phase 2 benefit: Better error handling

---

## 📝 Context for Next Step

If context restarts:
1. This is Issue #7 (Error Boundary)
2. Estimated time: 1 hour
3. Files to modify: DesignerController, NodeRenderer, ConnectionRenderer
4. Pattern: try-catch around render operations
5. Fallback: Show error message, skip bad elements

**Status:** Ready to implement
**Next:** Start with DesignerController top-level boundary
