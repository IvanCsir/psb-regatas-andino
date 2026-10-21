/**
 * Script de compilación y empaquetado para Club Regatas Andino Hockey Web App
 * Une los módulos limpios de /src/js y /src/css en app.js y styles.css listos para Vercel
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const srcJsDir = path.join(rootDir, 'src', 'js');
const srcCssDir = path.join(rootDir, 'src', 'css');
const outJsFile = path.join(rootDir, 'app.js');
const outCssFile = path.join(rootDir, 'styles.css');

function build() {
  const startTime = Date.now();
  console.log('📦 [BUILD] Iniciando compilación de módulos...');

  // 1. Compilar JavaScript
  const jsFiles = fs.readdirSync(srcJsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  let jsOutput = `/**\n * Web Citaciones y Evaluaciones Físicas - Club Regatas Andino\n * Compilado automáticamente desde /src/js/\n * Última actualización: ${new Date().toISOString()}\n */\n\n`;

  for (const file of jsFiles) {
    const filePath = path.join(srcJsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    jsOutput += `// ============================================================================\n`;
    jsOutput += `// MÓDULO: ${file}\n`;
    jsOutput += `// ============================================================================\n\n`;
    jsOutput += content.trim() + '\n\n';
  }

  fs.writeFileSync(outJsFile, jsOutput, 'utf8');

  // Validar sintaxis con Node.js
  try {
    execSync(`node --check "${outJsFile}"`, { stdio: 'pipe' });
    console.log(`✅ [JS] app.js generado y validado con éxito (${jsFiles.length} módulos, ${jsOutput.split('\n').length} líneas).`);
  } catch (err) {
    console.error('❌ [JS] Error de sintaxis en app.js compilado:', err.message);
    process.exit(1);
  }

  // 2. Compilar CSS
  const cssFiles = fs.readdirSync(srcCssDir)
    .filter(f => f.endsWith('.css'))
    .sort();

  let cssOutput = `/*\n * Estilos Oficiales - Club Regatas Andino (Hockey Femenino)\n * Compilado automáticamente desde /src/css/\n * Última actualización: ${new Date().toISOString()}\n */\n\n`;

  for (const file of cssFiles) {
    const filePath = path.join(srcCssDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    cssOutput += `/* ==========================================================================\n`;
    cssOutput += `   MÓDULO: ${file}\n`;
    cssOutput += `   ========================================================================== */\n\n`;
    cssOutput += content.trim() + '\n\n';
  }

  fs.writeFileSync(outCssFile, cssOutput, 'utf8');
  console.log(`✅ [CSS] styles.css generado con éxito (${cssFiles.length} módulos, ${cssOutput.split('\n').length} líneas).`);

  // 3. Validar versión de caché (PWA Service Worker vs index.html)
  try {
    const swContent = fs.readFileSync(path.join(rootDir, 'sw.js'), 'utf8');
    const indexContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
    const swMatch = swContent.match(/CACHE_NAME\s*=\s*['"]regatas-hockey-(v[a-zA-Z0-9_\-]+)['"]/);
    const indexMatch = indexContent.match(/styles\.css\?v=([a-zA-Z0-9_\-]+)/);

    const swVer = swMatch ? swMatch[1] : 'desconocida';
    const indexVer = indexMatch ? indexMatch[1] : 'desconocida';

    const norm = s => s.toLowerCase().replace(/^v/, '').replace(/[-_]/g, '');
    console.log(`🔖 [CACHE] Versión en sw.js: ${swVer} | Versión en index.html: ${indexVer}`);
    if (swMatch && indexMatch && norm(swVer) !== norm(indexVer)) {
      console.warn(`⚠️ [CACHE WARNING] Las versiones difieren: sw.js (${swVer}) vs index.html (${indexVer}).`);
    } else {
      console.log(`✅ [CACHE] Versiones sincronizadas (${swVer}).`);
    }
  } catch (_) {}

  const elapsed = Date.now() - startTime;
  console.log(`✨ [BUILD] Compilación finalizada en ${elapsed}ms.`);
}

if (process.argv.includes('--watch')) {
  build();
  console.log('👀 Modo observador (--watch) activo. Esperando cambios en /src...');
  const watchOpts = { recursive: true };
  const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  };

  const debouncedBuild = debounce(build, 300);
  fs.watch(path.join(rootDir, 'src'), watchOpts, (eventType, filename) => {
    if (filename) {
      console.log(`🔄 Cambio detectado en: ${filename}`);
      debouncedBuild();
    }
  });
} else {
  build();
}
