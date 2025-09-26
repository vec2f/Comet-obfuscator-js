import fs from 'fs-extra';
import path from 'path';

async function main() {
	const shebang = '#!/usr/bin/env node\n';
	const binPath = path.resolve('bin/comet-obfuscator.js');
	let content = await fs.readFile(binPath, 'utf8');
	if (!content.startsWith(shebang)) {
		content = shebang + content;
		await fs.writeFile(binPath, content, 'utf8');
	}
	await fs.chmod(binPath, 0o755);
	console.log('Built CLI:', binPath);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});


