export type ChapterBox = { top: number; bottom: number };

/**
 * Which chapter is the reader on? The one whose box contains the reading line
 * (a fraction of the viewport height down from the top). If the line falls in
 * a gap between chapters, the chapter whose nearest edge is closest wins.
 * With nothing measured, the first chapter is active.
 */
export function pickActiveChapter(boxes: ChapterBox[], viewportHeight: number, lineRatio = 0.45): number {
  if (boxes.length === 0) return 0;
  const line = viewportHeight * lineRatio;
  const containing = boxes.findIndex((box) => box.top <= line && box.bottom > line);
  if (containing !== -1) return containing;

  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  boxes.forEach((box, index) => {
    const distance = line < box.top ? box.top - line : line - box.bottom;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}
