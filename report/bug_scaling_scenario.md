### TRIGGER (User Actions)
1. Open the Designer.
2. Observe nodes and labels at 1.0 zoom (Normal).
3. Zoom out to 0.5x, 0.3x, and 0.1x.

### EXPECTED (Correct Behavior)
✓ Text should remain legible (minimum 10-12px on screen) even at far zoom.
✓ The ratio between node circle and text should remain consistent or text should slightly over-inflate to stay readable.

### ACTUAL (Buggy Behavior)
✗ At zoom out, text becomes tiny flyspecks (< 8px).
✗ Node bodies (circles) inflate to stay visible, but text shrinks too fast, making it unreadable relative to the node.

### SCOPE (Components Involved)
Rendering:
  - [LabelRenderer.js](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/src/renderer/js/views/pipeline/LabelRenderer.js) → `drawNodeLabel()`
  - [GeometryUtils.js](file:///c:/Users/mauro/OneDrive/Escritorio/Giteach/src/renderer/js/views/pipeline/designer/GeometryUtils.js) → `getVisualScale()`
