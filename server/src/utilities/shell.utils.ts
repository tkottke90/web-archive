import childProcess from 'child_process';
import { BaseError } from './errors.util';

export interface CmdOutput {
  label: string;
  code: number;
  command: string;
  stdErr: string[];
  stdOut: string[];
  success: boolean;
}

/**
 * Creates a string from the given value wrapped in single quotes,
 * Bash understands this as a raw string and wont try and interpret
 * the contents.
 */
export function escapedValue(value: string | number | boolean) {
  return `'${value}'`;
}

export async function spawnCommand(
  label: string,
  command: string,
  args: string[],
  options?: childProcess.SpawnOptionsWithoutStdio
) {
  const stdOut: string[] = [];
  const stdErr: string[] = [];

  return new Promise<CmdOutput>((resolve, reject) => {
    const scriptShell = childProcess.spawn(command, args, {
      env: process.env,
      ...options
    });

    scriptShell.stdout.on('data', (data: Buffer) =>
      stdOut.push(data.toString())
    );

    scriptShell.stderr.on('data', (data: Buffer) =>
      stdErr.push(data.toString())
    );

    scriptShell.on('error', (err: Error) => {
      reject(
        new BaseError(`DOWNLOAD_SCRIPT_ERROR: ${err.message}`, { stdErr })
      );
    });

    scriptShell.on('close', (code: number) => {
      resolve({
        label,
        command: `${command} ${args.join(' ')}`,
        success: code === 0,
        code,
        stdOut,
        stdErr
      });
    });
  });
}
