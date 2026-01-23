# Canvas Context Property Assignments Catalog

This document catalogs all direct assignments to canvas context properties in the `src/renderer/js/views/pipeline/designer/renderers/` directory.

## ConnectionRenderer.js

### ctx.strokeStyle
- **Assignment**: `ctx.strokeStyle = isSelected ? ThemeManager.colors.connectionActive : ThemeManager.colors.connection;`
- **Source**: `ThemeManager.colors.connectionActive` or `ThemeManager.colors.connection`

### ctx.lineWidth  
- **Assignment**: `ctx.lineWidth = isSelected ? 4.0 : 2.5;`
- **Source**: Literal numeric values (4.0 or 2.5)

### ctx.globalAlpha
- **Assignment**: `ctx.globalAlpha = isSelected ? 1.0 : 0.9;`
- **Source**: Literal numeric values (1.0 or 0.9)

### ctx.shadowBlur
- **Assignment**: `ctx.shadowBlur = isSelected ? ThemeManager.effects.shadow.glow.blur * 1.5 : ThemeManager.effects.shadow.glow.blur;`
- **Source**: `ThemeManager.effects.shadow.glow.blur` multiplied by 1.5 or directly

### ctx.shadowColor
- **Assignment**: `ctx.shadowColor = isSelected ? ThemeManager.colors.connectionActive : ThemeManager.colors.connection;`
- **Source**: `ThemeManager.colors.connectionActive` or `ThemeManager.colors.connection`

### ctx.fillStyle
- **Assignment**: `ctx.fillStyle = isSelected ? ThemeManager.colors.connectionActive : ThemeManager.colors.connection;`
- **Source**: `ThemeManager.colors.connectionActive` or `ThemeManager.colors.connection`

### ctx.strokeStyle (active connection)
- **Assignment**: `ctx.strokeStyle = ThemeManager.colors.primary;`
- **Source**: `ThemeManager.colors.primary`

### ctx.lineWidth (active connection)
- **Assignment**: `ctx.lineWidth = 2;`
- **Source**: Literal numeric value (2)

### ctx.setLineDash
- **Assignment**: `ctx.setLineDash([5, 5]);`
- **Source**: Literal array of numbers ([5, 5])

### ctx.globalAlpha (active connection)
- **Assignment**: `ctx.globalAlpha = 0.7;`
- **Source**: Literal numeric value (0.7)

## ContainerRenderer.js

### ctx.font
- **Assignment**: `ctx.font = `${worldFontSize}px ${ThemeManager.colors.fontMono}`;`
- **Source**: Template string combining `worldFontSize` variable and `ThemeManager.colors.fontMono`

### ctx.fillStyle (text rendering)
- **Assignment**: `ctx.fillStyle = ThemeManager.colors.text;`
- **Source**: `ThemeManager.colors.text`

### ctx.textAlign
- **Assignment**: `ctx.textAlign = 'left';`
- **Source**: Literal string ('left')

### ctx.textBaseline
- **Assignment**: `ctx.textBaseline = 'top';`
- **Source**: Literal string ('top')

## GridRenderer.js

### ctx.strokeStyle
- **Assignment**: `ctx.strokeStyle = ThemeManager.colors.gridLine;`
- **Source**: `ThemeManager.colors.gridLine`

### ctx.lineWidth
- **Assignment**: `ctx.lineWidth = 1 / camera.zoomScale;`
- **Source**: Expression using `camera.zoomScale`

## NodeRenderer.js

### ctx.globalAlpha
- **Assignment**: `ctx.globalAlpha = visual.opacity;`
- **Source**: `visual.opacity` property

### ctx.shadowBlur
- **Assignment**: `ctx.shadowBlur = 25 * visual.glowIntensity;`
- **Source**: Expression multiplying 25 by `visual.glowIntensity`

### ctx.shadowColor
- **Assignment**: `ctx.shadowColor = visual.state === VisualStateManager.STATES.SELECTED ? ThemeManager.colors.primary : (color || ThemeManager.colors.accent);`
- **Source**: `ThemeManager.colors.primary` or `color` variable or `ThemeManager.colors.accent`

### ctx.strokeStyle (selection ring)
- **Assignment**: `ctx.strokeStyle = ThemeManager.colors.primary;`
- **Source**: `ThemeManager.colors.primary`

### ctx.lineWidth (selection ring)
- **Assignment**: `ctx.lineWidth = visual.borderWidth / zoom;`
- **Source**: Expression dividing `visual.borderWidth` by `zoom`

## TextRenderer.js

### ctx.font
- **Assignment**: `ctx.font = font;` (when font contains 'px')
- **Source**: `font` parameter passed to function

### ctx.font (alternative)
- **Assignment**: `ctx.font = `${lineHeight}px ${font}`;`
- **Source**: Template string combining `lineHeight` and `font` parameters

### ctx.fillStyle
- **Assignment**: `ctx.fillStyle = color;`
- **Source**: `color` parameter passed to function

### ctx.textAlign
- **Assignment**: `ctx.textAlign = align;`
- **Source**: `align` parameter passed to function

### ctx.textBaseline
- **Assignment**: `ctx.textBaseline = 'top';`
- **Source**: Literal string ('top')

### ctx.font (tooltip)
- **Assignment**: `ctx.font = `${fontSize}px ${this.FONTS.UI}`;`
- **Source**: Template string combining `fontSize` and `this.FONFS.UI`

### ctx.shadowBlur (tooltip)
- **Assignment**: `ctx.shadowBlur = 15;`
- **Source**: Literal numeric value (15)

### ctx.shadowColor (tooltip)
- **Assignment**: `ctx.shadowColor = ThemeManager.effects.shadow.md.color;`
- **Source**: `ThemeManager.effects.shadow.md.color`

### ctx.fillStyle (tooltip)
- **Assignment**: `ctx.fillStyle = bgColor;`
- **Source**: `bgColor` parameter passed to function

### ctx.strokeStyle (tooltip)
- **Assignment**: `ctx.strokeStyle = borderColor;`
- **Source**: `borderColor` parameter passed to function

### ctx.lineWidth (tooltip)
- **Assignment**: `ctx.lineWidth = 2;`
- **Source**: Literal numeric value (2)

### ctx.shadowBlur (reset)
- **Assignment**: `ctx.shadowBlur = 0;`
- **Source**: Literal numeric value (0)

### ctx.fillStyle (text)
- **Assignment**: `ctx.fillStyle = textColor;`
- **Source**: `textColor` parameter passed to function

### ctx.textAlign (text)
- **Assignment**: `ctx.textAlign = 'left';`
- **Source**: Literal string ('left')

### ctx.textBaseline (text)
- **Assignment**: `ctx.textBaseline = 'top';`
- **Source**: Literal string ('top')

## UIRenderer.js

No direct assignments to ctx properties found in this file.

## Summary

The following canvas context properties are assigned values in the renderer files:
- `ctx.strokeStyle` - Used for connection lines and selection rings
- `ctx.lineWidth` - Used for connection line thickness and selection rings
- `ctx.globalAlpha` - Used for transparency effects
- `ctx.shadowBlur` - Used for glow effects
- `ctx.shadowColor` - Used for glow colors
- `ctx.fillStyle` - Used for filling shapes and text
- `ctx.font` - Used for text rendering
- `ctx.textAlign` - Used for text alignment
- `ctx.textBaseline` - Used for text baseline positioning
- `ctx.setLineDash` - Used for dashed line patterns

Most values come from ThemeManager properties, ensuring consistent theming across the application.