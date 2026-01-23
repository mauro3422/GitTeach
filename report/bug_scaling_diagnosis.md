# Diagnosis Report: Scaling Bug (Tiny Text)

## 📊 Findings
My replication test and math analysis confirm that the current scaling strategy is mathematically flawed for legibility at zoom levels below 0.5x.

### Current Logic (Power 0.2)
At Zoom **0.2** (Common "Far view"):
- **World Font Size**: 24 * (1/0.2)^0.2 = 24 * 1.38 = 33px.
- **Final Screen Size**: 33 * 0.2 = **6.6px**.
- **Result**: Indistinguishable "flies" on the screen (confirmed by user screenshot).

### Proposed Fix (Power 0.6)
At Zoom **0.2**:
- **World Font Size**: 24 * (1/0.2)^0.6 = 24 * 2.62 = 63px.
- **Final Screen Size**: 63 * 0.2 = **12.6px**.
- **Result**: Perfectly legible technical labels.

## 📝 Sticky Note Regression
The "Dampened" scaling I applied previously:
`worldFontSize = baseFontSize * (1 + (vScale - 1) * 0.5)`
Only provides ~10.8px at 0.5 zoom and ~6px at 0.2 zoom. 

### Recommendation
1.  **Uniform Power 0.6** for all text (Labels & Notes).
2.  **Remove dampening** for Sticky Note text.
3.  **Ensure Hit-Testing** matches the higher inflation.
