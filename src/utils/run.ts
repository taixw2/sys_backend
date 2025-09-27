import { spawn } from 'child_process';


export function run(
  cmd: string,
  args: string[],
  options: { cwd?: string; quiet?: boolean; } = {}
): Promise<{ stdout: string; stderr: string; }> {
  const { quiet = false, cwd } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      cwd
    });

    let stdout = '';
    let stderr = '';

    if (quiet && child.stdout) {
      child.stdout.on('data', (d) => (stdout += String(d)));
    }
    if (quiet && child.stderr) {
      child.stderr.on('data', (d) => (stderr += String(d)));
    }

    child.on('error', (err) => {
      if (quiet && (stdout || stderr)) {
        console.error(`[${cmd}] stdout:\n${stdout}`);
        console.error(`[${cmd}] stderr:\n${stderr}`);
      }
      reject(err);
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        if (quiet && (stdout || stderr)) {
          console.error(`[${cmd}] stdout:\n${stdout}`);
          console.error(`[${cmd}] stderr:\n${stderr}`);
        }
        reject(new Error(`${cmd} exited with code ${code}`));
      }
    });
  });
}
