import * as crypto from 'crypto';
import {randomBytes} from "node:crypto";

export class SecurityUtils {

    static toSHA256(str: string): string {
        const hash = crypto.createHash('sha256');
        hash.update(str);
        return hash.digest('hex');
    }

    static randomToken(): string {
        const bytes = randomBytes(32);
        return bytes.toString('hex');
    }
}