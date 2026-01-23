# Scaling Deep Audit Report

## Overview
This report analyzes the font scaling implementation in the LabelRenderer and NodeRenderer components to identify potential issues with font size calculation and rendering in world vs screen coordinates.

## Findings

### 1. Argument Order Verification
- **LabelRenderer.drawNodeLabel signature**: `(ctx, node, x, y, isHovered, zoomScale = 1, dynamicRadius = null, vScale = 1)`
- **Call in NodeRenderer**: `LabelRenderer.drawNodeLabel(ctx, node, x, y, visual.state === VisualStateManager.STATES.HOVERED, zoom, radius, fScale)`

The arguments are correctly matched:
- `zoom` → `zoomScale`
- `radius` → `dynamicRadius` 
- `fScale` → `vScale`

### 2. Font Scaling Calculation Issue
The core issue identified is related to how font sizes are handled in transformed contexts:

#### Current Implementation Flow:
1. `worldFontSize = baseFontSize * fScale` is calculated in `LabelRenderer.js`
2. `ctx.font = 'bold ${worldFontSize}px ${ThemeManager.colors.fontMono}'` sets the font
3. Drawing occurs inside `camera.apply(ctx)` which performs `ctx.scale(zoom, zoom)`
4. Result: Font is effectively rendered as `worldFontSize * zoom` pixels on screen

#### Expected vs Actual Behavior:
The `getFontScale` function calculates scaling with the expectation that the resulting font size will be affected by the camera transformation. The comment in the code confirms this:
```javascript
// (fontSize * scale * zoom) = MIN_PHYSICAL_TEXT_SIZE
```

However, this creates a double-scaling effect:
- First, font size is inflated by `fScale` to compensate for zoom
- Then, the camera transformation scales everything by `zoom` again

### 3. Potential Browser Compatibility Issue
There's a potential issue with how different browsers handle `ctx.font` values when transformations are applied. The canvas specification states that when you set a font size in pixels (e.g., `20px Arial`) and then apply a scale transformation, the font size should be scaled by that factor. This means the font inflation algorithm might not work as expected across all browsers.

### 4. Parameter Naming Confusion
In `NodeRenderer.js`, the variable `fScale` (font scale) is passed as the `vScale` parameter to `drawNodeLabel`. This creates confusion as the parameter names suggest different purposes, though functionally they may serve similar roles.

### 5. xScale/yScale Swapping
No evidence found of xScale and yScale being swapped anywhere in the codebase. The scaling system appears to use uniform scaling (same scale for x and y) through the zoom property.

## Recommendations

### Immediate Actions:
1. **Clarify parameter naming**: Rename `vScale` to something more descriptive or ensure consistent usage between `fScale` and `vScale` concepts.

2. **Test font rendering behavior**: Verify how different browsers handle font sizes when canvas transformations are applied to ensure consistent visual scaling.

### Potential Fixes:
1. **Alternative font sizing approach**: Instead of setting font size in world coordinates and letting camera transform scale it, consider calculating the final screen pixel size directly:
   ```javascript
   // Instead of: worldFontSize = baseFontSize * fScale
   // Then applying camera transform which scales by zoom again
   
   // Consider: screenFontSize = baseFontSize * fScale (already accounting for zoom)
   // And don't let camera transform affect font size
   ```

2. **Context isolation**: Wrap font drawing operations in additional save/restore calls to temporarily counteract the zoom scaling for text only.

## Conclusion
The font scaling system has a potential double-scaling issue where font sizes are calculated to compensate for zoom but then get scaled again by the camera transformation. This may lead to fonts appearing larger than intended at high zoom levels or smaller than intended at low zoom levels, depending on how the browser handles the canvas font scaling interaction.