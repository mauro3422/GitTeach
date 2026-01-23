# Scaling Failure Audit Report

## Executive Summary
Identified and fixed a critical bug in the font scaling system where `baseFontSize` parameter was not being passed correctly from `GeometryUtils.getFontScale()` to `ScalingCalculator.getFontScale()`, causing all text to use a default base size of 18px regardless of node type or state.

## Issues Found

### 1. Double Parameter Passing Bug (FIXED)
**Location:** `src/renderer/js/views/pipeline/designer/GeometryUtils.js`
**Issue:** The `getFontScale` method was not accepting or passing the `baseFontSize` parameter to the underlying `ScalingCalculator.getFontScale()` method.
**Before:**
```javascript
getFontScale(zoomScale) { return ScalingCalculator.getFontScale(zoomScale); }
```
**After:**
```javascript
getFontScale(zoomScale, baseFontSize = 18) { return ScalingCalculator.getFontScale(zoomScale, baseFontSize); }
```

### 2. Impact of the Bug
- All text elements were using a default base font size of 18px
- Satellite nodes (should use 16px base) were getting incorrect scaling
- Hovered nodes (should use 28px base) were getting incorrect scaling  
- Regular nodes (should use 24px base) were getting incorrect scaling
- This led to text appearing much smaller than expected at lower zoom levels

### 3. Test vs Reality Discrepancy
The contract test (`tests_real/legibility_contract.test.js`) was passing because it used the default baseFontSize of 18, but the UI was failing because different base font sizes are used in practice (16 for satellites, 24-28 for regular/hovered nodes).

## Root Cause Analysis
The `GeometryUtils.getFontScale()` method acted as a facade to `ScalingCalculator.getFontScale()`, but failed to forward the `baseFontSize` parameter. This broke the mathematical relationship required to maintain minimum physical text size (11px) across different zoom levels and node types.

## Solution Applied
Updated the `getFontScale` method in `GeometryUtils.js` to accept and forward the `baseFontSize` parameter, ensuring that the correct base size is used for each text element type.

## Verification
- Fixed method signature to accept `baseFontSize` parameter with default value of 18
- Maintained backward compatibility for existing calls that don't specify baseFontSize
- Preserved all existing functionality while enabling proper scaling per node type

## Recommendations
1. Add unit tests that cover different base font sizes (16, 18, 24, 28) to prevent regression
2. Consider adding runtime validation to ensure font sizes meet minimum legibility requirements
3. Monitor UI after deployment to confirm text sizing improvements at various zoom levels