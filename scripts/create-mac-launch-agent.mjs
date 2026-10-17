import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [appDir, nodeBin, dataDir, plistPath] = process.argv.slice(2);
if (!appDir || !nodeBin || !dataDir || !plistPath) {
  console.error('Faltan rutas para configurar el inicio en Mac.');
  process.exit(1);
}

const xml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const item = (value) => `<string>${xml(value)}</string>`;
const args = ['/usr/bin/caffeinate', '-is', nodeBin, path.join(appDir, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3000'];
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.tiempoconia.studio</string>
<key>ProgramArguments</key><array>${args.map(item).join('')}</array>
<key>WorkingDirectory</key>${item(appDir)}
<key>EnvironmentVariables</key><dict>
<key>DATA_DIR</key>${item(dataDir)}
<key>NODE_ENV</key><string>production</string>
</dict>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
<key>StandardOutPath</key>${item(path.join(dataDir, 'server.log'))}
<key>StandardErrorPath</key>${item(path.join(dataDir, 'server.error.log'))}
</dict></plist>
`;
mkdirSync(path.dirname(plistPath), { recursive: true });
writeFileSync(plistPath, plist, { mode: 0o600 });
