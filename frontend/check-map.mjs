import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  const pageErrors = [];
  const consoleMessages = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      errors.push(`[Console Error] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    pageErrors.push(`[Page Error] ${error.message}`);
  });

  const requestErrors = [];
  page.on('requestfailed', request => {
    requestErrors.push(`[Request Failed] ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
    
    await new Promise(r => setTimeout(r, 1000));
    
    const html = await page.content();
    const isLogin = html.includes('Iniciar sesión') || html.includes('Bienvenido');
    console.log('Login page loaded:', isLogin);
    
    await page.fill('input[name="email"]', 'admin@ecocusco.pe');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('Dashboard', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));
    
    const htmlAfterLogin = await page.content();
    console.log('--- After login ---');
    console.log('Map div present:', htmlAfterLogin.includes('class="map"') || htmlAfterLogin.includes('class="map "'));
    console.log('leaflet-container present:', htmlAfterLogin.includes('leaflet-container'));
    console.log('leaflet-tile present:', htmlAfterLogin.includes('leaflet-tile'));
    console.log('leaflet-marker present:', htmlAfterLogin.includes('leaflet-marker'));
    
    const mapElements = await page.evaluate(() => {
      const mapDiv = document.querySelector('.map');
      if (!mapDiv) return { exists: false };
      return {
        exists: true,
        innerHTMLLength: mapDiv.innerHTML.length,
        childCount: mapDiv.children.length,
        hasLeafletContainer: mapDiv.classList.contains('leaflet-container'),
        classList: Array.from(mapDiv.classList),
      };
    });
    console.log('Map element details:', JSON.stringify(mapElements, null, 2));
    
    const leafletTiles = await page.evaluate(() => {
      const tiles = document.querySelectorAll('.leaflet-tile');
      const images = document.querySelectorAll('.leaflet-tile img');
      return {
        tileCount: tiles.length,
        imgCount: images.length,
        imgSrcs: Array.from(images).slice(0, 3).map(img => img.src),
        imgComplete: Array.from(images).slice(0, 3).map(img => img.complete),
      };
    });
    console.log('Leaflet tiles:', JSON.stringify(leafletTiles, null, 2));
    
    const markerIcons = await page.evaluate(() => {
      const markers = document.querySelectorAll('.leaflet-marker-icon');
      const broken = Array.from(markers).filter(m => m.tagName === 'IMG' && !m.complete);
      const imgs = Array.from(markers).filter(m => m.tagName === 'IMG');
      return {
        markerCount: markers.length,
        imgCount: imgs.length,
        brokenCount: broken.length,
        srcs: imgs.slice(0, 5).map(img => img.src),
      };
    });
    console.log('Marker icons:', JSON.stringify(markerIcons, null, 2));
    
    console.log('\n--- Console messages:', consoleMessages.length, '---');
    consoleMessages.forEach(m => console.log('  -', m));
    console.log('Console errors:', errors.length);
    errors.forEach(e => console.log('  -', e));
    console.log('Page errors:', pageErrors.length);
    pageErrors.forEach(e => console.log('  -', e));
    console.log('Request failures:', requestErrors.length);
    requestErrors.forEach(e => console.log('  -', e));
    
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
})();
