// Reports which required tools are installed. Read-only; changes nothing.
import { spawnSync } from 'node:child_process';
const tools = [
  ['node', ['--version'], true],
  ['npm', ['--version'], true],
  ['git', ['--version'], true],
  ['docker', ['--version'], true],
  ['docker', ['compose', 'version'], true],
  ['psql', ['--version'], false],
];
let missingRequired = false;
for (const [cmd, args, required] of tools) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: true });
  const label = [cmd, ...args.slice(0, 1)].join(' ');
  if (r.error || r.status !== 0) {
    console.log(`${required ? 'MISSING ' : 'optional'}  ${label}`);
    if (required) missingRequired = true;
  } else {
    console.log(`ok        ${label.padEnd(18)} ${r.stdout.trim().split('\n')[0]}`);
  }
}
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) { console.log('Node >= 20 required'); missingRequired = true; }
process.exit(missingRequired ? 1 : 0);
