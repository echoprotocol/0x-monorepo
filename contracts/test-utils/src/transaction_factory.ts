import { generatePseudoRandomSalt, transactionHashUtils } from '@0x/order-utils';
import { SignatureType, SignedZeroExTransaction } from '@0x/types';

import { AbstractFactory } from './abstract_factory';

export class TransactionFactory extends AbstractFactory {
    private readonly _signerBuff: Buffer;
    private readonly _exchangeAddress: string;
    constructor(privateKey: Buffer, exchangeAddress: string) {
        super(privateKey);
        this._exchangeAddress = exchangeAddress;
        this._signerBuff = Buffer.from(this.signerAddress.slice(2), 'hex');
    }
    public newSignedTransaction(
        data: string,
        signatureType: SignatureType = SignatureType.EthSign,
        from?: string,
    ): SignedZeroExTransaction {
        const salt = generatePseudoRandomSalt();
        const signerAddress = `0x${this._signerBuff.toString('hex')}`;
        const transaction = {
            salt,
            signerAddress,
            data,
            verifyingContractAddress: this._exchangeAddress,
        };
        const transactionHashBuffer = transactionHashUtils.getTransactionHashBuffer(transaction);
        const signature = this._signMessage(transactionHashBuffer, signatureType, from);
        const signedTransaction = {
            ...transaction,
            signature: `0x${signature.toString('hex')}`,
        };
        return signedTransaction;
    }
}
