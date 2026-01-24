# 🔴 PHASE 1 - Issue #6: Camera State Synchronization (CRITICAL)

**Status:** IN PROGRESS
**Complexity:** HIGH (2 hours estimated)
**Blocker For:** Phase 2 + Phase 3 (all resize/interaction work)
**Priority:** MUST FIX before moving forward

---

## 🔍 Problem Analysis

### The Duality Problem

Camera state is stored in **TWO PLACES**:
1. **DesignerStore.state.navigation** - Single Source of Truth (SSOT)
   - `state.navigation.panOffset = { x, y }`
   - `state.navigation.zoomScale = number`
   - Subscribe-able, reactive, renders on change

2. **PanZoomHandler** - Local state (must sync manually)
   - `this.panOffset = { x, y }` (local copy)
   - `this.zoomScale = number` (local copy)
   - Used during pan/zoom interactions
   - **PROBLEM: Not automatically synced with Store**

### Why This Is Critical

- When PanZoomHandler updates camera, **DesignerStore doesn't know**
- Geometry calculations use Store's zoom, visual use Handler's zoom
- They can diverge → Hit-testing breaks, visual misalignment
- Resize, pan, zoom become unreliable at different scales

---

## 📋 Audit Checklist

### Step 1: List All Camera State Mutations

**File:** `src/renderer/js/views/pipeline/designer/interaction/PanZoomHandler.js`

Find these methods and their mutations:
- [ ] `this.zoomScale = ...` (direct assignment - UNSAFE)
- [ ] `this.panOffset = ...` (direct assignment - UNSAFE)
- [ ] Any method that modifies `this.state`

### Step 2: Find All Synchronization Points

Methods that SHOULD update DesignerStore but might not:
- [ ] `setZoom(zoomScale)`
- [ ] `pan(deltaX, deltaY)`
- [ ] `centerOnNode(node, bounds, drawerWidth)`
- [ ] Any interactive zoom method
- [ ] Any interactive pan method

### Step 3: Identify Store Update Locations

Where Store is properly synced:
- [ ] `DesignerController._executeRender()` - reads from Store (CORRECT)
- [ ] Check if any PanZoomHandler method calls `DesignerStore.setState()`
- [ ] Count how many places **don't** sync

---

## 🔧 Implementation Plan

### Phase 1A: Audit PanZoomHandler.js

**File Path:** `src/renderer/js/views/pipeline/designer/interaction/PanZoomHandler.js`

Read the entire file and document:

```
MUTATION LOCATIONS:
1. Line XXX: this.zoomScale = value
   - Method: _____
   - Synced? YES/NO
   - Fix: ______

2. Line XXX: this.panOffset = value
   - Method: _____
   - Synced? YES/NO
   - Fix: ______

[Continue for all mutations...]
```

### Phase 1B: Update Each Mutation Point

For each unsynchronized mutation, apply this pattern:

**BEFORE:**
```javascript
setZoom(zoomScale) {
    this.zoomScale = zoomScale;
}
```

**AFTER:**
```javascript
setZoom(zoomScale) {
    this.zoomScale = zoomScale;
    // SYNC: Update Store so all systems use same zoom
    DesignerStore.setState({
        navigation: {
            panOffset: this.panOffset,
            zoomScale: this.zoomScale
        }
    });
    console.log('[PanZoomHandler] Synced zoom to Store:', zoomScale);
}
```

### Phase 1C: Verify DesignerController Usage

**File:** `src/renderer/js/views/pipeline/designer/DesignerController.js`

Method: `_executeRender()`

Check:
```javascript
// Should read from Store (CORRECT)
let navState = DesignerInteraction.state;  // ← Must be Store's state
```

Verify `DesignerInteraction.state` getter returns `DesignerStore.state.navigation`

### Phase 1D: Add Defensive Checks

In critical geometry methods, add assertions:

**File:** `src/renderer/js/views/pipeline/designer/GeometryUtils.js`

```javascript
calculateBounds(node, zoomScale) {
    // DEFENSIVE: Verify zoom consistency
    const storeZoom = DesignerStore.state.navigation.zoomScale;
    if (Math.abs(zoomScale - storeZoom) > 0.01) {
        console.warn('[GeometryUtils] Zoom mismatch!',
            'passed:', zoomScale,
            'store:', storeZoom);
    }
    // Continue with calculation...
}
```

---

## 🧪 Testing Strategy

### Manual Test Cases

1. **Zoom Consistency Test**
   - Start at 1.0x zoom
   - Zoom to 2.0x with scroll wheel
   - Check: `DesignerStore.state.navigation.zoomScale === 2.0` ✅
   - Check: PanZoomHandler internal zoom equals Store zoom

2. **Pan Consistency Test**
   - Pan canvas by dragging
   - Check: `DesignerStore.state.navigation.panOffset` updated ✅
   - Check: Visual matches Store state

3. **Hit-Testing at Different Zoom**
   - Zoom to 0.5x
   - Try to click node
   - Should detect correctly (uses Store zoom)
   - Check console for no zoom mismatches

4. **Resize at Different Zoom**
   - Zoom to 3.0x
   - Try to resize node
   - Resize handles should be accurate
   - Check: ResizeHandler uses correct zoom from Store

### Automated Test

Run existing tests to ensure no regressions:
```bash
npm run test:run
```

Expected: 129 passing (same as before)

---

## 📍 Files to Modify

1. **PanZoomHandler.js** - Main work (add sync calls)
   - Estimated: 8-10 mutation points
   - 1-2 lines per mutation
   - Total: ~15-20 lines added

2. **DesignerInteraction.js** - Verify state getter (might be OK)
   - Estimated: 0-3 lines (might not need changes)

3. **GeometryUtils.js** - Add defensive checks (optional)
   - Estimated: 2-3 checks added for safety
   - Total: ~10-15 lines

4. **CLAUDE.md** - Update documentation
   - Mark Issue #6 as FIXED
   - Remove from fragility points (resolved)

---

## 🎯 Success Criteria

Issue #6 is COMPLETE when:

- [ ] All PanZoomHandler mutations call DesignerStore.setState()
- [ ] No direct assignment to `this.zoomScale` or `this.panOffset` without sync
- [ ] All geometry calculations use Store's zoomScale (not local)
- [ ] All 129 tests still pass
- [ ] No zoom mismatch warnings in console
- [ ] Resize/pan/zoom work correctly at 0.1x, 0.5x, 1.0x, 2.0x, 3.0x zoom
- [ ] CLAUDE.md updated to reflect fix

---

## ⏱️ Time Breakdown

- **Audit PanZoomHandler.js:** 30 minutes
- **Add sync calls:** 30 minutes
- **Verify DesignerInteraction:** 15 minutes
- **Add defensive checks:** 15 minutes
- **Testing + fixing regressions:** 30 minutes
- **Documentation:** 15 minutes

**Total: ~2 hours**

---

## 🔗 Related Issues

- Quick Win #3: validateAndCleanup() - Already done ✅
- Quick Win #6: Documented camera sync issue - Already done ✅
- Issue #7: Error Boundary (depends on this)
- Issue #8: Resize State Stuck (depends on this)
- Phase 2 entirely depends on this fix

---

## 📝 Context for Next Session

If context restarts:
1. This file contains the full plan
2. Look for `PanZoomHandler.js` mutations
3. For each mutation: add DesignerStore.setState() sync
4. Run tests to verify no regressions
5. Move to Issue #7

**Current Status:** Ready to start audit phase
**Next Step:** Read PanZoomHandler.js completely and document all mutations
