import { SignatureType } from '@0x/types';
import * as ethUtil from 'ethereumjs-util';

import { toEcIP1Signature } from './ecip1_utils';

export const signingUtils = {
    signMessage(message: Buffer, privateKey: Buffer, signatureType: SignatureType, from: string): Buffer {
        if (signatureType === SignatureType.EthSign) {
            const prefixedMessage = ethUtil.hashPersonalMessage(message);
            const ecSignature = ethUtil.ecsign(prefixedMessage, privateKey);
            const signature = Buffer.concat([
                ethUtil.toBuffer(ecSignature.v),
                ecSignature.r,
                ecSignature.s,
                ethUtil.toBuffer(signatureType),
            ]);
            return toEcIP1Signature(signature, from);
        } else if (signatureType === SignatureType.EIP712) {
            const ecSignature = ethUtil.ecsign(message, privateKey);
            const signature = Buffer.concat([
                ethUtil.toBuffer(ecSignature.v),
                ecSignature.r,
                ecSignature.s,
                ethUtil.toBuffer(signatureType),
            ]);
            return toEcIP1Signature(signature, from);
        } else {
            throw new Error(`${signatureType} is not a valid signature type`);
        }
    },
};
