import { spawn } from 'child_process';
import split2 from 'split2';
import through2 from 'through2';

export default async function executeShellCommands(commands: string) {
	return new Promise((resolve, reject) => {
		const shell = spawn('bash', ['-c', commands]);
		let output = '';
		shell.stdout.pipe(split2()).pipe(
			through2((chunk: any, enc: any, callback: any) => {
				output += chunk + '\n';
				callback();
			})
		);
		shell.stderr.pipe(split2()).pipe(
			through2((chunk: any, enc: any, callback: any) => {
				output += chunk + '\n';
				callback();
			})
		);
		shell.on('error', (error) => {
			reject(error);
		});
		shell.on('close', (code) => {
			console.log(`Exited with code ${code}`);
			if (code === 0) {
				resolve(output);
			} else {
				reject(new Error(`Exited with code ${code}: ${output}`));
			}
		});
	});
}