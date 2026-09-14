// Lee .env (no versionado) y genera src/environments/environment.ts.
// Se corre solo antes de `ng serve` / `ng build` (ver hooks prestart/prebuild en package.json).
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = value;
  }
  return env;
}

const rootDir = path.join(__dirname, '..');
const env = loadEnvFile(path.join(rootDir, '.env'));

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter((key) => !env[key]);

if (missing.length > 0) {
  console.error(
    `Falta(n) ${missing.join(', ')} en tu archivo .env (en la raíz del proyecto).\n` +
      'Copiá .env.example a .env y completalo con los datos de tu proyecto de Supabase (Project Settings > Data API).'
  );
  process.exit(1);
}

const outDir = path.join(rootDir, 'src', 'environments');
fs.mkdirSync(outDir, { recursive: true });

const fileContent = `// Generado automáticamente por scripts/generate-env.js a partir de .env — NO editar a mano ni commitear.
export const environment = {
  production: false,
  supabaseUrl: '${env.SUPABASE_URL}',
  supabaseAnonKey: '${env.SUPABASE_ANON_KEY}',
};
`;

fs.writeFileSync(path.join(outDir, 'environment.ts'), fileContent);
console.log('OK: src/environments/environment.ts generado a partir de .env');
