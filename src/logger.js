import pc from 'picocolors';

export function createLogger(silent = false) {
	if (silent) {
		return {
			info: () => {},
			warn: () => {},
			error: () => {},
			success: () => {},
		};
	}
	return {
		info: (msg) => console.log(pc.blue('ℹ'), msg),
		warn: (msg) => console.warn(pc.yellow('⚠'), msg),
		error: (msg) => console.error(pc.red('✖'), msg),
		success: (msg) => console.log(pc.green('✔'), msg),
	};
}


