
import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import yargs from 'yargs';
import pc from 'picocolors';
import { hideBin } from 'yargs/helpers';
import { createObfuscationOptions, obfuscateCode } from '../src/obfuscate.js';
import { maybePack } from '../src/packer.js';
import { createLogger } from '../src/logger.js';

function resolvePath(p) {
	if (!p) return p;
	return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

async function loadConfig(configPath) {
	if (!configPath) return null;
	const full = resolvePath(configPath);
	if (!(await fs.pathExists(full))) {
		throw new Error(`Config not found: ${full}`);
	}
	const raw = await fs.readFile(full, 'utf8');
	try {
		return JSON.parse(raw);
	} catch (e) {
		throw new Error(`Invalid JSON in config ${full}: ${(e && e.message) || e}`);
	}
}

async function findInputs(input, includeAll, excludeGlobs) {
	const isDir = input ? (await fs.pathExists(input)) && (await fs.stat(input)).isDirectory() : false;
	if (!input || isDir) {
		const patterns = [];
		if (input) {
			patterns.push(path.join(input, '**/*'));
		} else {
			patterns.push('**/*');
		}
		const extensions = includeAll ? ['**/*'] : ['**/*.js', '**/*.mjs', '**/*.cjs'];
		const finalPatterns = patterns.flatMap((base) => extensions.map((ext) => path.join(base, ext)));
		const files = await fg(finalPatterns, { ignore: ['**/node_modules/**', ...(excludeGlobs || [])], dot: false, onlyFiles: true });
		return files;
	}

	const isFile = await fs.pathExists(input);
	if (isFile) return [input];
	const files = await fg([input], { ignore: ['**/node_modules/**', ...(excludeGlobs || [])], dot: false, onlyFiles: true });
	return files;
}

async function ensureOutDir(outDir) {
	const dir = outDir ? resolvePath(outDir) : path.resolve(process.cwd(), 'dist');
	await fs.ensureDir(dir);
	return dir;
}

async function processOneFile(filePath, outDir, options, pack) {
	const rel = path.relative(process.cwd(), filePath);
	const outPath = path.join(outDir, rel);
	await fs.ensureDir(path.dirname(outPath));
	const source = await fs.readFile(filePath, 'utf8');
	const obfuscated = obfuscateCode(source, options);
	const finalCode = pack ? maybePack(obfuscated) : obfuscated;
	await fs.writeFile(outPath, finalCode, 'utf8');
	return { input: rel, output: path.relative(process.cwd(), outPath), bytesIn: Buffer.byteLength(source), bytesOut: Buffer.byteLength(finalCode) };
}

async function main() {
	const argv = await yargs(hideBin(process.argv))
		.scriptName('comet-obfuscator')
		.usage('$0 [options]')
		.option('input', { alias: 'i', type: 'string', describe: 'Input file, directory, or glob. Default: cwd' })
		.option('outDir', { alias: 'o', type: 'string', describe: 'Output directory. Default: dist', default: 'dist' })
		.option('config', { alias: 'c', type: 'string', describe: 'Path to JSON config for javascript-obfuscator options' })
		.option('preset', { alias: 'p', type: 'string', choices: ['default', 'hardened'], default: 'hardened', describe: 'Obfuscation preset' })
		.option('pack', { type: 'boolean', default: false, describe: 'Apply extra packer layer on top of obfuscation' })
		.option('all', { type: 'boolean', default: false, describe: 'Include all files (not only *.js,*.mjs,*.cjs)' })
		.option('exclude', { type: 'array', describe: 'Glob patterns to exclude (repeatable)', default: [] })
		.option('seed', { type: 'number', describe: 'Seed for obfuscator randomness' })
		.option('controlFlow', { type: 'boolean', describe: 'Force controlFlowFlattening on/off (overrides preset)' })
		.option('renameGlobals', { type: 'boolean', describe: 'Force renameGlobals on/off (overrides preset)' })
		.option('silent', { type: 'boolean', default: false, describe: 'Suppress all output (no hints)' })
		.help()
		.version()
		.strict()
		.parse();

	const logger = createLogger(argv.silent);

	const inputPath = argv.input ? resolvePath(argv.input) : process.cwd();
	const outDir = await ensureOutDir(argv.outDir);
	const userConfig = await loadConfig(argv.config).catch((e) => {
		logger.error(e.message);
		process.exitCode = 1;
		return null;
	});
	if (argv.config && !userConfig) return;

	const options = createObfuscationOptions({
		presetName: argv.preset,
		userOptions: userConfig || {},
		seed: typeof argv.seed === 'number' ? argv.seed : undefined,
		overrides: {
			...(argv.controlFlow !== undefined ? { controlFlowFlattening: argv.controlFlow } : {}),
			...(argv.renameGlobals !== undefined ? { renameGlobals: argv.renameGlobals } : {}),
		},
	});

	logger.info(`${pc.cyan('Input:')} ${inputPath}`);
	logger.info(`${pc.cyan('Output:')} ${outDir}`);
	logger.info(`${pc.cyan('Preset:')} ${argv.preset}${argv.pack ? pc.dim(' + packer') : ''}`);

	const files = await findInputs(inputPath, !!argv.all, argv.exclude?.map(String));
	if (!files.length) {
		logger.warn('No files matched. Nothing to do.');
		return;
	}

	const start = Date.now();
	let processed = 0;
	let inBytes = 0;
	let outBytes = 0;
	for (const file of files) {
		try {
			const result = await processOneFile(file, outDir, options, argv.pack);
			processed += 1;
			inBytes += result.bytesIn;
			outBytes += result.bytesOut;
			logger.success(`${pc.dim(result.input)} -> ${result.output}`);
		} catch (e) {
			logger.error(`Failed ${file}: ${(e && e.message) || e}`);
		}
	}
	const ms = Date.now() - start;
	logger.info(`${pc.green(`Done`)} ${processed} file(s) in ${ms}ms  (${(inBytes/1024).toFixed(1)}KB -> ${(outBytes/1024).toFixed(1)}KB)`);
}

main().catch((e) => {
	logger.error(e && e.stack ? e.stack : String(e));
	process.exit(1);
});


