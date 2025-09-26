import JavaScriptObfuscator from 'javascript-obfuscator';

const hardenedPreset = {
	compact: true,
	controlFlowFlattening: true,
	controlFlowFlatteningThreshold: 1,
	deadCodeInjection: true,
	deadCodeInjectionThreshold: 0.25,
	debugProtection: true,
	debugProtectionInterval: true,
	disableConsoleOutput: true,
	domainLock: [],
	identifierNamesGenerator: 'hexadecimal',
	identifiersPrefix: '',
	ignoreImports: false,
	log: false,
	numbersToExpressions: true,
	renameGlobals: true,
	rotateStringArray: true,
	selfDefending: true,
	shuffleStringArray: true,
	simplify: true,
	splitStrings: true,
	splitStringsChunkLength: 8,
	stringArray: true,
	stringArrayCallsTransform: true,
	stringArrayCallsTransformThreshold: 1,
	stringArrayEncoding: ['rc4'],
	stringArrayIndexesType: ['hexadecimal-number'],
	stringArrayIndexShift: true,
	stringArrayRotate: true,
	stringArrayShuffle: true,
	stringArrayWrappersCount: 3,
	stringArrayWrappersChainedCalls: true,
	stringArrayWrappersType: 'function',
	stringTextEncoding: true,
	transformObjectKeys: true,
	unicodeEscapeSequence: false,
};

const defaultPreset = {
	compact: true,
	controlFlowFlattening: false,
	deadCodeInjection: false,
	debugProtection: false,
	debugProtectionInterval: false,
	disableConsoleOutput: false,
	identifierNamesGenerator: 'hexadecimal',
	log: false,
	renameGlobals: false,
	rotateStringArray: true,
	selfDefending: false,
	simplify: true,
	splitStrings: false,
	stringArray: true,
	stringArrayEncoding: [],
	unicodeEscapeSequence: false,
};

export function createObfuscationOptions({ presetName = 'hardened', userOptions = {}, seed, overrides = {} }) {
	const base = presetName === 'hardened' ? hardenedPreset : defaultPreset;
	const options = { ...base, ...userOptions, ...overrides };
	if (typeof seed === 'number') options.seed = seed;
	return options;
}

export function obfuscateCode(sourceCode, options) {
	const result = JavaScriptObfuscator.obfuscate(sourceCode, options);
	return result.getObfuscatedCode();
}


