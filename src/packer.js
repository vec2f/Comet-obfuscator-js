import crypto from 'crypto';

function xorBuffer(buffer, key) {
	const out = Buffer.allocUnsafe(buffer.length);
	for (let i = 0; i < buffer.length; i += 1) {
		out[i] = buffer[i] ^ key[i % key.length];
	}
	return out;
}

function createRuntime(keyHex, payloadBase64) {
	return `(()=>{const k=Buffer.from('${keyHex}','hex');const b=Buffer.from('${payloadBase64}','base64');const o=Buffer.allocUnsafe(b.length);for(let i=0;i<b.length;i++){o[i]=b[i]^k[i%k.length]}const c=o.toString('utf8');(0,eval)(c)})()`;
}

export function maybePack(code) {
	const key = crypto.randomBytes(16);
	const payload = xorBuffer(Buffer.from(code, 'utf8'), key);
	return createRuntime(key.toString('hex'), payload.toString('base64'));
}


