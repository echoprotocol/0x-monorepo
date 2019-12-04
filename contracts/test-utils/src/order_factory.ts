import { generatePseudoRandomSalt, orderHashUtils } from '@0x/order-utils';
import { Order, SignatureType, SignedOrder } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as ethUtil from 'ethereumjs-util';

import { AbstractFactory } from './abstract_factory';
import { getLatestBlockTimestampAsync } from './block_timestamp';
import { constants } from './constants';

export class OrderFactory extends AbstractFactory {
    private readonly _defaultOrderParams: Partial<Order>;
    constructor(privateKey: Buffer, defaultOrderParams: Partial<Order>) {
        super(privateKey);
        this._defaultOrderParams = defaultOrderParams;
    }
    public async newSignedOrderAsync(
        customOrderParams: Partial<Order> = {},
        signatureType: SignatureType = SignatureType.EthSign,
        from?: string,
    ): Promise<SignedOrder> {
        const tenMinutesInSeconds = 10 * 60;
        const currentBlockTimestamp = await getLatestBlockTimestampAsync();
        const order = ({
            senderAddress: constants.NULL_ADDRESS,
            expirationTimeSeconds: new BigNumber(currentBlockTimestamp).plus(tenMinutesInSeconds),
            salt: generatePseudoRandomSalt(),
            takerAddress: constants.NULL_ADDRESS,
            ...this._defaultOrderParams,
            ...customOrderParams,
        } as any) as Order;
        const orderHashBuff = orderHashUtils.getOrderHashBuffer(order);
        const signature = this._signMessage(orderHashBuff, signatureType, from);
        const signedOrder = {
            ...order,
            signature: `0x${signature.toString('hex')}`,
        };
        return signedOrder;
    }
}
