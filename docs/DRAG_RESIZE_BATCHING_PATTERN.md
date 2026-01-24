# 🔄 Drag/Resize Batching Pattern - Arquitectura

**Documento:** DRAG_RESIZE_BATCHING_PATTERN.md
**Fecha:** 2026-01-24
**Status:** PRODUCCIÓN

---

## ¿QUÉ ES BATCHING?

En lugar de sincronizar el estado con Store en **cada frame** (60 veces/segundo), se acumulan los cambios localmente y se sincronizan **al final de la operación**.

```
NORMAL APPROACH (SLOW):
mouseMove event → setState() → render
mouseMove event → setState() → render  (60x/second = 60 setState calls!)
mouseMove event → setState() → render

BATCHING APPROACH (FAST):
mouseMove event → local mutation (node.x = x)
mouseMove event → local mutation (node.x = x)
mouseMove event → local mutation (node.x = x)
... (60 mutations in memory, NO Store updates)
mouseUp event → setState() with all final positions (1 Store update)
```

---

## ¿DÓNDE SE USA?

### 1. DragStrategy.js - Node Position Updates

**Location:** `DragStrategy.updateDrag()` (lines 136-160)

```javascript
const node = nodes[this.dragState.draggingNodeId];

// BATCHED MUTATION (no Store update here)
node.x = worldPos.x - this.dragState.dragOffset.x;
node.y = worldPos.y - this.dragState.dragOffset.y;

// Only synced at endDrag() (line 186)
DesignerStore.setState({ nodes: finalNodes }, 'DRAG_END');
```

**Why Safe:**
- Renderers use same `nodes` reference being mutated
- Visual feedback is immediate (mutations are rendered)
- Final sync guarantees Store consistency
- No intermediate systems read Store during drag

### 2. ResizeHandler.js - Container Resizing

**Location:** `ResizeHandler.onUpdate()` (lines 50-143)

```javascript
// BATCHED APPROACH: Update happens every frame
const nextNodes = { ...nodes };
nextNodes[node.id] = {
    ...node,
    dimensions: { w: newW, h: newH, isManual: true }
};

// BUT synced EVERY UPDATE (not batched like drag!)
DesignerStore.setState({ nodes: nextNodes }, 'RESIZE_DRAG');
```

**Why Synced Every Frame:**
- Resize bounds affect drop target detection
- Drop target check needs Store-updated bounds
- Can't batch resize like drag (more complex state)

---

## TRADE-OFF ANALYSIS

### Batching Pros
✅ 60x fewer setState() calls per second
✅ No Store update on each frame (saves CPU)
✅ Faster drag performance
✅ No render overhead from state updates

### Batching Cons
❌ Temporal inconsistency (Store != memory)
❌ If drag cancelled, local mutations are lost (acceptable)
❌ If system reads Store during drag, gets stale data
❌ Harder to debug (need to trace local mutations)

### Why It Works Today
- **Renderers don't read from Store during drag:**
  ```javascript
  // In DesignerController.render()
  const nodes = DesignerStore.state.nodes;  // Snapshot at frame start
  // DesignerCanvas uses this snapshot, not Store
  // DragStrategy also mutates this same snapshot
  // Both see consistent view ✓
  ```

- **No other system reads from Store during drag**
  - Only DragStrategy and renderer touch nodes during drag
  - PanZoomHandler reads camera (separate, unaffected)
  - InteractionHandler reads interaction state (separate)

- **Final sync is guaranteed**
  - `endDrag()` always calls `setState()` (line 186)
  - No way to exit drag without sync

---

## WHEN THIS PATTERN BREAKS

⚠️ **If you add** new code that reads `DesignerStore.state.nodes` during drag, you'll see stale positions!

### Example Breakage:
```javascript
// DON'T DO THIS in a new feature:
onMouseDrag() {
    const nodes = DesignerStore.state.nodes;  // ← Gets stale x/y!
    const draggedNode = nodes[dragId];
    console.log(draggedNode.x);  // ← Wrong during drag!
}
```

### How to Fix It:
```javascript
// OPTION A: Get from local reference
const nodes = this.controller.nodes;  // Same reference being mutated
const draggedNode = nodes[dragId];
console.log(draggedNode.x);  // ✓ Correct!

// OPTION B: Wait until drag ends
DesignerStore.subscribe('DRAG_END', (state) => {
    // Now Store is updated
});
```

---

## FUTURE ALTERNATIVES

### When to Consider Removing Batching:

1. **If performance permits:**
   - Profile shows Store updates are not bottleneck
   - Can sync on every frame without FPS drop
   - Code clarity more important than micro-optimization

2. **If more systems depend on real-time Store:**
   - Multiple systems need live node positions
   - Temporal inconsistency becomes risky
   - Better to update Store every frame

### How to Convert to Atomic Updates:

```javascript
// Current (batched):
updateDrag(worldPos) {
    const nodes = this.controller.nodes;
    const node = nodes[draggingId];
    node.x = newX;  // Local mutation
    node.y = newY;
    // No Store update
}

// Atomic (every frame):
updateDrag(worldPos) {
    const nodes = this.controller.nodes;
    const node = nodes[draggingId];

    const updatedNodes = { ...nodes };
    updatedNodes[draggingId] = { ...node, x: newX, y: newY };
    DesignerStore.setState({ nodes: updatedNodes }, 'DRAG_UPDATE');
    // ~60 setState calls/second
}
```

**Cost:** ~60 setState calls per drag second (currently 1 call at end)
**Benefit:** Store always reflects true state

---

## MONITORING & SAFETY

### How to Detect Violations:

Add this debug code to catch unintended Store reads during drag:

```javascript
// In DesignerStore.js getNode()
getNode(id) {
    const isDragging = this.state.interaction.draggingNodeId !== null;
    const node = this.state.nodes[id];

    if (isDragging && node) {
        // Check if local mutation is newer than Store
        // (only works if you track timestamps)
        console.warn('[DesignerStore] Reading node during drag:', id);
    }

    return node;
}
```

### Future Safe Pattern:

When refactoring to atomic updates:
```javascript
// Replace ALL of these:
const nodes = this.controller.nodes;
DesignerStore.state.nodes

// With:
const nodes = DesignerStore.getAllNodes();
```

Then `getAllNodes()` can enforce consistency checks.

---

## TESTING IMPLICATIONS

### What Tests Must Check:

1. **Drag produces correct final position:**
   ```javascript
   // Start drag at 100,100
   dragNode(nodeId, toX: 200, toY: 200);
   assert(DesignerStore.getNode(nodeId).x === 200);
   ```

2. **Cancellation rolls back mutations:**
   ```javascript
   const originalX = node.x;
   dragStart();
   dragUpdate(newPos);  // Local mutation
   dragCancel();        // Rollback to originalX
   // Problem: We don't rollback, we only sync at END
   ```

3. **Multiple drags work correctly:**
   ```javascript
   drag(node1, pos1); // First drag
   drag(node2, pos2); // Second drag
   // Both should end with correct positions
   ```

---

## RECOMMENDATION

✅ **Keep batching pattern for now** because:
- Performance is critical (drag must be smooth)
- No other system depends on real-time Store during drag
- Final sync is guaranteed
- Well-documented and understood

⚠️ **But monitor for:**
- New features that read Store during drag
- Performance plateaus (then revert to atomic)
- Test failures that assume Store is live updated

---

## REFERENCES

- **DragStrategy.js:** Implements batching for position updates
- **ResizeHandler.js:** Uses atomic updates (not batched)
- **DesignerController.render():** Uses snapshot pattern
- **SSOT Audit Report:** Detailed analysis in FINAL_SYSTEM_AUDIT_REPORT.md

---

**Document Version:** 1.0
**Last Updated:** 2026-01-24
**Reviewers:** System Audit
