const baseFontSize = 24;
const zooms = [2.0, 1.0, 0.5, 0.3, 0.2, 0.1];
const powers = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

console.log('Scaling Matrix (Screen Pixels)');
console.log('--------------------------------------------------------------------------------');
const header = 'Zoom | ' + powers.map(p => `P=${p.toFixed(1)}`).join(' | ');
console.log(header);
console.log('-'.repeat(header.length));

zooms.forEach(zoom => {
    let row = `${zoom.toFixed(1).padEnd(4)} | `;
    powers.forEach(p => {
        const vScale = Math.pow(1 / zoom, p);
        const screenFont = baseFontSize * vScale * zoom;
        row += `${screenFont.toFixed(1).padStart(5)}px | `;
    });
    console.log(row);
});

console.log('--------------------------------------------------------------------------------');
console.log('Target: Minimum 10px - 12px at Zoom 0.2');
