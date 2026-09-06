// CaçaOferta — build da extensão Chrome (Manifest V3).
// Compila content script e service worker (IIFE) e a UI (side panel + popup),
// depois copia manifest.json, ícones e content.css para dist/.
import { spawn } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = join(root, 'dist');
const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js');

function copyDirContents(source, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(source)) {
    const from = join(source, entry);
    const to = join(dest, entry);
    if (statSync(from).isDirectory()) {
      copyDirContents(from, to);
    } else {
      cpSync(from, to);
    }
  }
}

function runVite(configFile) {
  return new Promise((resolveBuild, rejectBuild) => {
    const child = spawn(process.execPath, [viteBin, 'build', '--config', join(root, configFile)], {
      stdio: 'inherit',
      cwd: root,
    });
    child.on('close', (code) => {
      if (code === 0) resolveBuild();
      else rejectBuild(new Error(`Vite falhou em ${configFile} (exit code ${code}).`));
    });
    child.on('error', rejectBuild);
  });
}

async function main() {
  await runVite('vite.content.config.ts');
  await runVite('vite.background.config.ts');
  await runVite('vite.ui.config.ts');

  copyFileSync(join(root, 'manifest.json'), join(dist, 'manifest.json'));
  copyFileSync(join(root, 'src', 'content', 'content.css'), join(dist, 'content.css'));
  copyDirContents(join(root, 'public'), dist);

  console.log('[CaçaOferta] Extensão compilada em', dist);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});