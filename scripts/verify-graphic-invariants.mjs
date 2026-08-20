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
    const expectedFamilies = ['chart', 'counters', 'generic', 'geometry', 'grid', 'number-line', 'ratio-model'];
    const svgs = [...document.querySelectorAll('.wb-page svg.math-graphic')];

    if (svgs.length === 0) failures.push('No normalized mathematical SVG graphics were found.');
    if (document.documentElement.dataset.graphicsNormalized !== 'true') failures.push('Graphics normalizer did not report completion.');
    if (Number(document.documentElement.dataset.graphicsCount || 0) !== svgs.length) failures.push('Graphics count metadata differs from rendered SVG count.');

    const familyCounts = Object.fromEntries(expectedFamilies.map((family) => [family, 0]));
    let missingViewBox = 0;
    let invalidViewBox = 0;
    let missingPrecision = 0;
    let missingAspectRatio = 0;
    let labelsOutside = 0;
    let textCollisions = 0;
    let primitiveOutside = 0;
    let namedSegmentMeasurementLabels = 0;
    const labelOutsideDetails = [];
    const collisionDetails = [];
    const undersizedInstructional = [];
    const namedSegmentMeasurementDetails = [];

    const overlapRatio = (a, b) => {
      const left = Math.max(a.left, b.left);
      const right = Math.min(a.right, b.right);
      const top = Math.max(a.top, b.top);
      const bottom = Math.min(a.bottom, b.bottom);
      const area = Math.max(0, right - left) * Math.max(0, bottom - top);
      const minArea = Math.min(Math.max(1, a.width * a.height), Math.max(1, b.width * b.height));
      return area / minArea;
    };

    for (const [index, svg] of svgs.entries()) {
      const graphicNumber = index + 1;
      const family = svg.getAttribute('data-graphic-family') || '';
      const graphicLabel = svg.getAttribute('aria-label') || '';
      if (!(family in familyCounts)) failures.push(`Graphic ${graphicNumber} has unknown family: ${family || 'missing'}.`);
      else familyCounts[family] += 1;

      const viewBox = svg.getAttribute('viewBox');
      if (!viewBox) {
        missingViewBox += 1;
        continue;
      }
      const parts = viewBox.trim().split(/[ ,]+/).map(Number);
      if (parts.length !== 4 || !parts.every(Number.isFinite) || !(parts[2] > 0) || !(parts[3] > 0)) invalidViewBox += 1;
      if (svg.getAttribute('shape-rendering') !== 'geometricPrecision' || svg.getAttribute('text-rendering') !== 'geometricPrecision') missingPrecision += 1;
      if (svg.getAttribute('preserveAspectRatio') !== 'xMidYMid meet') missingAspectRatio += 1;

      const outer = svg.getBoundingClientRect();
      const texts = [...svg.querySelectorAll('text')].filter((node) => {
        const r = node.getBoundingClientRect();
        return r.width > 1 && r.height > 1;
      });
      for (const text of texts) {
        const r = text.getBoundingClientRect();
        if (r.left < outer.left - 3 || r.right > outer.right + 3 || r.top < outer.top - 3 || r.bottom > outer.bottom + 3) {
          labelsOutside += 1;
          labelOutsideDetails.push({ graphic: graphicNumber, family, text: (text.textContent || '').trim(), ariaLabel: graphicLabel.slice(0, 100) });
        }
      }
      for (let i = 0; i < texts.length; i++) {
        const a = texts[i].getBoundingClientRect();
        for (let j = i + 1; j < texts.length; j++) {
          const b = texts[j].getBoundingClientRect();
          const ratio = overlapRatio(a, b);
          if (ratio > 0.55) {
            textCollisions += 1;
            collisionDetails.push({
              graphic: graphicNumber,
              family,
              a: (texts[i].textContent || '').trim(),
              b: (texts[j].textContent || '').trim(),
              overlap: Math.round(ratio * 1000) / 1000,
              ariaLabel: graphicLabel.slice(0, 100),
            });
          }
        }
      }

      for (const node of svg.querySelectorAll('circle,ellipse,rect,line,polygon,polyline,path')) {
        const r = node.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.left < outer.left - 4 || r.right > outer.right + 4 || r.top < outer.top - 4 || r.bottom > outer.bottom + 4) primitiveOutside += 1;
      }

      const context = `${svg.parentElement?.className || ''} ${graphicLabel}`;
      const instructional = /graph-container|bar-chart-container|number-line-container|bags-illustration|geometry|geo-|svg-center|משולש|מלבן|טרפז|ציר מספרים|דיאגרמ/.test(context);
      if (instructional && outer.width < 115 && outer.height < 55) {
        undersizedInstructional.push({ graphic: graphicNumber, family, width: Math.round(outer.width), height: Math.round(outer.height), ariaLabel: graphicLabel.slice(0, 100) });
      }
    }

    if (missingViewBox) failures.push(`${missingViewBox} normalized SVG(s) are missing viewBox.`);
    if (invalidViewBox) failures.push(`${invalidViewBox} SVG(s) have invalid viewBox values.`);
    if (missingPrecision) failures.push(`${missingPrecision} SVG(s) are missing geometric precision rendering.`);
    if (missingAspectRatio) failures.push(`${missingAspectRatio} SVG(s) are missing canonical preserveAspectRatio.`);
    if (labelsOutside) failures.push(`${labelsOutside} SVG text label(s) extend outside their rendered graphic bounds: ${JSON.stringify(labelOutsideDetails)}.`);
    if (textCollisions) failures.push(`${textCollisions} severe SVG text-to-text collision(s) detected: ${JSON.stringify(collisionDetails)}.`);
    if (primitiveOutside) failures.push(`${primitiveOutside} SVG primitive(s) extend outside their rendered graphic bounds.`);
    if (undersizedInstructional.length) failures.push(`Instructional graphics are optically undersized: ${JSON.stringify(undersizedInstructional)}.`);
    for (const family of expectedFamilies) if (familyCounts[family] === 0) failures.push(`No rendered graphics found for expected family: ${family}.`);

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

    const grids = [...document.querySelectorAll('svg[data-graphic-family="grid"]')];
    for (const [index, svg] of grids.entries()) {
      const vb = svg.viewBox.baseVal;
      if (!(vb.width > 0 && vb.height > 0)) failures.push(`Grid ${index + 1} has invalid logical dimensions.`);
      const structural = [...svg.querySelectorAll('rect,line,polygon,polyline,path')];
      if (structural.length < 2) failures.push(`Grid ${index + 1} has insufficient vector structure (${structural.length} structural primitive(s)).`);
    }

    const geometry = [...document.querySelectorAll('svg[data-graphic-family="geometry"]')];
    for (const [index, svg] of geometry.entries()) {
      const rendered = svg.getBoundingClientRect();
      if (!(rendered.width > 0 && rendered.height > 0)) failures.push(`Geometry ${index + 1} has zero rendered size.`);
      const rightAngles = [...svg.querySelectorAll('rect')].filter((r) => Number(r.getAttribute('width')) <= 15 && Number(r.getAttribute('height')) <= 15);
      if (rightAngles.some((r) => !(Number(r.getAttribute('width')) > 0 && Number(r.getAttribute('height')) > 0))) failures.push(`Geometry ${index + 1} contains invalid right-angle marker.`);
      for (const text of svg.querySelectorAll('text')) {
        const value = (text.textContent || '').trim();
        if (/^[A-Z]{2}\s*=\s*\S+/.test(value)) {
          namedSegmentMeasurementLabels += 1;
          namedSegmentMeasurementDetails.push({ geometry: index + 1, text: value, ariaLabel: (svg.getAttribute('aria-label') || '').slice(0, 100) });
        }
      }
    }
    if (namedSegmentMeasurementLabels) {
      failures.push(`${namedSegmentMeasurementLabels} geometry measurement label(s) include a segment name instead of value-only notation: ${JSON.stringify(namedSegmentMeasurementDetails)}.`);
    }

    return {
      status: failures.length ? 'fail' : 'pass',
      failures,
      graphicsCount: svgs.length,
      familyCounts,
      missingViewBox,
      invalidViewBox,
      missingPrecision,
      missingAspectRatio,
      labelsOutside,
      labelOutsideDetails,
      textCollisions,
      collisionDetails,
      primitiveOutside,
      undersizedInstructional,
      namedSegmentMeasurementLabels,
      namedSegmentMeasurementDetails,
      windowDiagramChecked: Boolean(windowSvg),
      chartCount: charts.length,
      gridCount: grids.length,
      geometryCount: geometry.length,
      numberLineCount: numberLines.length,
      counterCircleCount: counters.length,
    };
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}