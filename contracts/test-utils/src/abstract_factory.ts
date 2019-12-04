import { SignatureType } from '@0x/types';
import * as ethUtil from 'ethereumjs-util';

import { toAddressBuffer } from './ecip1_utils';
import { signingUtils } from './signing_utils';

export abstract class AbstractFactory {
    public readonly signerAddress: string;

    constructor(
        protected readonly _privateKey: Buffer,
    ) { this.signerAddress = `0x${ethUtil.privateToAddress(this._privateKey).toString('hex')}`; }

    public createRegistrySignature(from?: string): { recID: number; r: Buffer; s: Buffer } {
        const fromAddress = from === undefined ? this.signerAddress : from;
        const message = ethUtil.sha3(toAddressBuffer(fromAddress));
        const signature = signingUtils.signMessage(message, this._privateKey, SignatureType.EIP712, fromAddress);
        return {
            recID: signature[0],
            r: signature.slice(1, 33),
            s: signature.slice(33, 65),
        };
    }

    protected _signMessage(message: Buffer, signatureType: SignatureType, from?: string): Buffer {
        const fromAddress = from === undefined ? this.signerAddress : from;
        return signingUtils.signMessage(message, this._privateKey, signatureType, fromAddress);
    }
}
