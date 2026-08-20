import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const inputHtml = path.resolve(process.argv[2] || 'preview/full-workbook.html');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });

try {
  await page.goto(pathToFileURL(inputHtml).href, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.dataset.workbookReady === 'true', null, { timeout: 30_000 });
  await page.evaluate(() => document.fonts?.ready);

  const result = await page.evaluate(() => {
    const failures = [];
    const approx = (a, b, eps = 0.01) => Math.abs(Number(a) - Number(b)) <= eps;

    const windowSvg = document.querySelector('svg[aria-label^="חלון ריבועי"]');
    if (!windowSvg) {
      failures.push('Missing canonical window ratio diagram.');
    } else {
      const rects = [...windowSvg.querySelectorAll(':scope > rect')];
      const outer = rects.find((r) => approx(r.getAttribute('x'), 10) && approx(r.getAttribute('y'), 10) && approx(r.getAttribute('width'), 160) && approx(r.getAttribute('height'), 160));
      const centre = rects.find((r) => approx(r.getAttribute('x'), 50) && approx(r.getAttribute('y'), 50) && approx(r.getAttribute('width'), 80) && approx(r.getAttribute('height'), 80));
      const corners = rects.filter((r) => approx(r.getAttribute('width'), 40) && approx(r.getAttribute('height'), 40));
      if (!outer) failures.push('Window diagram outer square must remain 160×160 logical units.');
      if (!centre) failures.push('Window diagram centre square must remain 80×80 logical units.');
      if (corners.length !== 4) failures.push(`Window diagram must contain four 40×40 corner squares; found ${corners.length}.`);
      if (centre && corners.length === 4) {
        const centreArea = Number(centre.getAttribute('width')) * Number(centre.getAttribute('height'));
        const cornerArea = Number(corners[0].getAttribute('width')) * Number(corners[0].getAttribute('height'));
        if (!approx(centreArea / cornerArea, 4)) failures.push('Window centre/corner area ratio must remain 4:1.');
      }
      const pattern = windowSvg.querySelector('pattern#windowDots');
      const dot = pattern?.querySelector('circle');
      if (!pattern || !dot) failures.push('Window dotted-area pattern is missing.');
      else {
        if (!approx(pattern.getAttribute('width'), 8) || !approx(pattern.getAttribute('height'), 8)) failures.push('Window dot spacing must remain 8×8 logical units.');
        if (!approx(dot.getAttribute('r'), 1.4)) failures.push('Window dot radius must remain 1.4 logical units.');
      }
      const rendered = windowSvg.getBoundingClientRect();
      if (rendered.width < 220 || rendered.height < 220) failures.push(`Window diagram is visually undersized (${Math.round(rendered.width)}×${Math.round(rendered.height)}px).`);
      if (Math.abs(rendered.width - rendered.height) > 1) failures.push('Window diagram must render square without aspect-ratio distortion.');
    }

    const charts = [...document.querySelectorAll('svg[data-graphic-family="chart"]')];
    for (const [index, svg] of charts.entries()) {
      const vb = svg.viewBox.baseVal;
      for (const rect of svg.querySelectorAll('rect')) {
        const w = Number(rect.getAttribute('width'));
        const h = Number(rect.getAttribute('height'));
        const x = Number(rect.getAttribute('x'));
        const y = Number(rect.getAttribute('y'));
        if (![w, h, x, y].every(Number.isFinite)) continue;
        if (w <= 0 || h <= 0) failures.push(`Chart ${index + 1} contains a non-positive bar/rect.`);
        if (x < vb.x - 1 || y < vb.y - 1 || x + w > vb.x + vb.width + 1 || y + h > vb.y + vb.height + 1) failures.push(`Chart ${index + 1} contains a rect outside its viewBox.`);
      }
    }

    const numberLines = [...document.querySelectorAll('svg[data-graphic-family="number-line"]')];
    for (const [index, svg] of numberLines.entries()) {
      const circles = [...svg.querySelectorAll('circle')].map((c) => Number(c.getAttribute('cx'))).filter(Number.isFinite);
      if (circles.length >= 2 && circles.some((x, i) => i > 0 && x <= circles[i - 1])) failures.push(`Number line ${index + 1} point positions are not strictly increasing.`);
    }

    const counters = [...document.querySelectorAll('svg[data-graphic-family="counters"] circle')];
    if (counters.some((c) => !(Number(c.getAttribute('r')) > 0))) failures.push('Counter family contains a non-positive circle radius.');

    return {
      status: failures.length ? 'fail' : 'pass',
      failures,
      windowDiagramChecked: Boolean(windowSvg),
      chartCount: charts.length,
      numberLineCount: numberLines.length,
      counterCircleCount: counters.length,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
