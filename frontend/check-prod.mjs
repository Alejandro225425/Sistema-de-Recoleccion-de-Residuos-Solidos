import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  const pageErrors = [];
  const requestFailures = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error] ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    pageErrors.push(`[Page Error] ${error.message}`);
  });
  
  page.on('requestfailed', request => {
    requestFailures.push(`[Request Failed] ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  try {
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));
    
    await page.fill('input[name="email"]', 'admin@ecocusco.pe');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await new Promise(r => setTimeout(r, 3000));
    
    const mapElement = await page.evaluate(() => {
      const map = document.querySelector('.map');
      if (!map) return { exists: false };
      return {
        exists: true,
        hasLeafletContainer: map.classList.contains('leaflet-container'),
        classList: Array.from(map.classList),
        childElementCount: map.childElementCount,
        innerHTMLLength: map.innerHTML.length,
      };
    });
    console.log('=== Map element ===');
    console.log(JSON.stringify(mapElement, null, 2));
    
    const tileImages = await page.evaluate(() => {
      const tiles = document.querySelectorAll('.leaflet-tile');
      return Array.from(tiles).slice(0, 10).map(img => ({
        src: img.src || img.getAttribute('src'),
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      }));
    });
    console.log('=== Tile images ===');
    console.log(JSON.stringify(tileImages, null, 2));
    
    const markerIcons = await page.evaluate(() => {
      const markers = document.querySelectorAll('.leaflet-marker-icon');
      return Array.from(markers).slice(0, 8).map(m => ({
        src: m.src || m.getAttribute('src'),
        complete: m.complete,
        naturalWidth: m.naturalWidth,
        naturalHeight: m.naturalHeight,
        computedWidth: getComputedStyle(m).width,
        computedHeight: getComputedStyle(m).height,
      }));
    });
    console.log('=== Marker icons ===');
    console.log(JSON.stringify(markerIcons, null, 2));
    
    const circleMarkers = await page.evaluate(() => {
      const circles = document.querySelectorAll('.leaflet-interactive');
      return Array.from(circles).slice(0, 10).map(c => ({
        tagName: c.tagName,
        className: c.className,
      }));
    });
    console.log('=== Circle markers ===');
    console.log(JSON.stringify(circleMarkers, null, 2));
    
    console.log('=== Console errors:', errors.length, '===');
    errors.forEach(e => console.log('  -', e));
    console.log('=== Page errors:', pageErrors.length, '===');
    pageErrors.forEach(e => console.log('  -', e));
    console.log('=== Request failures:', requestFailures.length, '===');
    requestFailures.forEach(e => console.log('  -', e));
    
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
})();
