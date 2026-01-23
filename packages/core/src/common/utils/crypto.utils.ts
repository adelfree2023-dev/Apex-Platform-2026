import * as crypto from 'crypto';

/**
 * 🔒 S7: Generate secure hash for passwords (PBKDF2)
 */
export async function generateSecureHash(text: string, salt?: string): Promise<string> {
    const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
    const iterations = 100000;
    const keylen = 64;

    return new Promise((resolve, reject) => {
        crypto.pbkdf2(text, generatedSalt, iterations, keylen, 'sha512', (err, derivedKey) => {
            if (err) reject(err);
            resolve(`${generatedSalt}:${derivedKey.toString('hex')}`);
        });
    });
}

/**
 * 🔒 S7: Verify secure hash
 */
export async function verifySecureHash(text: string, hashWithSalt: string): Promise<boolean> {
    if (!hashWithSalt || !hashWithSalt.includes(':')) return false;

    const [salt, hash] = hashWithSalt.split(':');
    const iterations = 100000;
    const keylen = 64;

    return new Promise((resolve, reject) => {
        crypto.pbkdf2(text, salt, iterations, keylen, 'sha512', (err, derivedKey) => {
            if (err) reject(err);
            // Fix: Explicitly cast to any to resolve Buffer/Uint8Array type mismatch in TS
            const match = crypto.timingSafeEqual(
                Buffer.from(derivedKey.toString('hex')) as any,
                Buffer.from(hash) as any
            );
            resolve(match);
        });
    });
}
