import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeManager } from '../src/renderer/js/core/ThemeManager';

/**
 * Canvas API Integrity Test
 * 
 * Verifies that the browser/JSDOM Canvas API correctly accepts and retains
 * the values assigned by our renderers. This prevents "silent failures"
 * where an invalid string (like a CSS variable) is ignored.
 */
describe('Canvas API Integrity (Designer Area)', () => {
    let canvas;
    let ctx;

    beforeEach(() => {
        canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        ctx = canvas.getContext('2d');
    });

    describe('Text Rendering Integrity (ctx.font)', () => {
        it('should accept standard pixel-based fonts with monospace stack', () => {
            const fontStack = ThemeManager.colors.fontMono;
            const testFont = `24px ${fontStack}`;

            ctx.font = testFont;

            // Note: Browsers might normalize the font string (e.g., reordering or quoting)
            // so we check for key parts.
            expect(ctx.font).toContain('24px');
            // Check for at least one of the primary fonts in our stack
            expect(ctx.font).toMatch(/Fira Code|monospace|JetBrains Mono/);
        });

        it('should fail (revert to default) when assigned a CSS variable', () => {
            // This is a regression test for the bug we just fixed
            const initialFont = ctx.font; // Usually '10px sans-serif'
            ctx.font = '24px var(--invalid-css-var)';

            // Canvas silently ignores invalid font strings and keeps the previous/default value
            // In JSDOM/Browsers, if we set an invalid font, it doesn't change from what it was.
            // If it was default, it stays default.
            expect(ctx.font).not.toContain('var(--invalid-css-var)');
            expect(ctx.font).toBe(initialFont);
        });

        it('should handle different textAlign and textBaseline values used in renderers', () => {
            const alignments = ['left', 'center', 'right'];
            const baselines = ['top', 'middle', 'bottom', 'alphabetic'];

            alignments.forEach(align => {
                ctx.textAlign = align;
                expect(ctx.textAlign).toBe(align);
            });

            baselines.forEach(baseline => {
                ctx.textBaseline = baseline;
                expect(ctx.textBaseline).toBe(baseline);
            });
        });
    });

    describe('Style and Color Integrity', () => {
        it('should accept hex colors from ThemeManager for fillStyle and strokeStyle', () => {
            const colors = [
                ThemeManager.colors.primary,
                ThemeManager.colors.connection,
                ThemeManager.colors.text,
                '#ff0000',
                'rgb(255, 0, 0)'
            ];

            colors.forEach(color => {
                ctx.fillStyle = color;
                ctx.strokeStyle = color;

                // Canvas might convert hex to rgb/rgba strings
                // But it MUST NOT be empty or default if the color is valid
                expect(ctx.fillStyle).not.toBe('#000000'); // Default fill is usually black, but we expect it to change
                expect(ctx.strokeStyle).not.toBe('#000000');
            });
        });

        it('should correctly set globalAlpha', () => {
            const alphas = [0.0, 0.5, 0.7, 0.9, 1.0];
            alphas.forEach(alpha => {
                ctx.globalAlpha = alpha;
                expect(ctx.globalAlpha).toBeCloseTo(alpha);
            });
        });

        it('should correctly set lineWidth', () => {
            const widths = [1, 2.5, 4.0, 10];
            widths.forEach(width => {
                ctx.lineWidth = width;
                expect(ctx.lineWidth).toBe(width);
            });
        });
    });

    describe('Effects and Shadows Integrity', () => {
        it('should accept shadow configurations used in NodeRenderer/ConnectionRenderer', () => {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ff00';

            expect(ctx.shadowBlur).toBe(15);
            // Some environments might return rgba, but it should contain the green component
            expect(ctx.shadowColor).toMatch(/#00ff00|rgb\(0, 255, 0\)/);

            // Reset test
            ctx.shadowBlur = 0;
            expect(ctx.shadowBlur).toBe(0);
        });
    });

    describe('Line Dash Integrity', () => {
        it('should accept dash arrays used for active connections', () => {
            const dash = [5, 5];
            ctx.setLineDash(dash);
            expect(ctx.getLineDash()).toEqual(dash);
        });
    });
});
