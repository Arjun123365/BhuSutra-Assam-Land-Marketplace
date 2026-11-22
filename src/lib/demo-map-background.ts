// Original decorative artwork, not surveyed geography, roads or cadastral records.
// Painted locally so map browsing never depends on a tile service or network cache.
export const demoMapNotice = "Illustrative demo map — not an official cadastral map";

export function paintDemoMapTile(context: CanvasRenderingContext2D, size: number, x: number, y: number) {
  const greens = ["#eaf2e5", "#e2eddd", "#edf4e9", "#e5efdf"];
  context.fillStyle = "#f3f7ef";
  context.fillRect(0, 0, size, size);
  const cell = size / 4;
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      const shade = ((x * 7 + y * 11 + row * 3 + column) % greens.length + greens.length) % greens.length;
      const left = column * cell + 3;
      const top = row * cell + 3;
      context.fillStyle = greens[shade];
      context.fillRect(left, top, cell - 6, cell - 6);
      context.strokeStyle = "#d2e1cb";
      context.lineWidth = 0.6;
      context.strokeRect(left, top, cell - 6, cell - 6);
      context.beginPath();
      for (let line = 12; line < cell - 6; line += 12) {
        context.moveTo(left + 3, top + line);
        context.lineTo(left + cell - 9, top + line);
      }
      context.stroke();
    }
  }
}
