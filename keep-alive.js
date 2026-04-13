const { spawn } = require('child_process');
const fs = require('fs');
const log = fs.openSync('/home/z/my-project/dev.log', 'a');

let child;
function start() {
  child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3000'], {
    cwd: '/home/z/my-project',
    stdio: [ 'ignore', log, log ],
    detached: false
  });
  child.on('exit', (code) => {
    fs.writeSync(log, `\n[keep-alive] Process exited with code ${code}, restarting in 2s...\n`);
    setTimeout(start, 2000);
  });
  child.on('error', (err) => {
    fs.writeSync(log, `\n[keep-alive] Error: ${err.message}\n`);
    setTimeout(start, 2000);
  });
}
start();

// Keep this process alive
process.on('SIGTERM', () => { /* ignore */ });
setInterval(() => {}, 60000);
