import { AbstractFactory } from '@0x/contracts-test-utils';
import { SignatureType, SignedZeroExTransaction } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as ethUtil from 'ethereumjs-util';

import { hashUtils, SignedCoordinatorApproval } from './index';

export class ApprovalFactory extends AbstractFactory {
    private readonly _verifyingContractAddress: string;

    constructor(privateKey: Buffer, verifyingContractAddress: string) {
        super(privateKey);
        this._verifyingContractAddress = verifyingContractAddress;
    }

    public newSignedApproval(
        transaction: SignedZeroExTransaction,
        txOrigin: string,
        approvalExpirationTimeSeconds: BigNumber,
        signatureType: SignatureType = SignatureType.EthSign,
        from?: string,
    ): SignedCoordinatorApproval {
        const approvalHashBuff = hashUtils.getApprovalHashBuffer(
            transaction,
            this._verifyingContractAddress,
            txOrigin,
            approvalExpirationTimeSeconds,
        );
        const signatureBuff = this._signMessage(approvalHashBuff, signatureType, from);
        const signedApproval = {
            txOrigin,
            transaction,
            approvalExpirationTimeSeconds,
            signature: ethUtil.addHexPrefix(signatureBuff.toString('hex')),
        };
        return signedApproval;
    }
}
