// Graphics.fillPoints / strokePoints only read x and y; accept plain point objects.
declare namespace Phaser.GameObjects {
  interface Graphics {
    fillPoints(points: { x: number; y: number }[], closeShape?: boolean, closePath?: boolean, endIndex?: number): this;
    strokePoints(points: { x: number; y: number }[], closeShape?: boolean, closePath?: boolean, endIndex?: number): this;
  }
}
