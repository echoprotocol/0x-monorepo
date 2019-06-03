import { ERC20ProxyContract, ERC20Wrapper, ERC721ProxyContract, ERC721Wrapper } from '@0x/contracts-asset-proxy';
import { DummyERC20TokenContract } from '@0x/contracts-erc20';
import { DummyERC721TokenContract } from '@0x/contracts-erc721';
import { ExchangeContract, ExchangeWrapper } from '@0x/contracts-exchange';
import {
    chaiSetup,
    constants,
    OrderFactory,
    OrderStatus,
    provider,
    txDefaults,
    web3Wrapper,
} from '@0x/contracts-test-utils';
import { BlockchainLifecycle } from '@0x/dev-utils';
import { assetDataUtils, orderHashUtils } from '@0x/order-utils';
import { SignedOrder } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as chai from 'chai';
import * as _ from 'lodash';

import { artifacts, DevUtilsContract } from '../src';

chaiSetup.configure();
const expect = chai.expect;
const blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

describe('DevUtils', () => {
    let makerAddress: string;
    let takerAddress: string;
    let owner: string;
    let erc20AssetData: string;
    let erc20AssetData2: string;
    let erc721AssetData: string;
    let zrxAssetData: string;

    let erc20Token: DummyERC20TokenContract;
    let erc20Token2: DummyERC20TokenContract;
    let zrxToken: DummyERC20TokenContract;
    let erc721Token: DummyERC721TokenContract;
    let exchange: ExchangeContract;
    let devUtils: DevUtilsContract;
    let erc20Proxy: ERC20ProxyContract;
    let erc721Proxy: ERC721ProxyContract;

    let signedOrder: SignedOrder;
    let orderFactory: OrderFactory;

    const tokenId = new BigNumber(123456789);

    before(async () => {
        await blockchainLifecycle.startAsync();
    });
    after(async () => {
        await blockchainLifecycle.revertAsync();
    });

    before(async () => {
        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        const usedAddresses = ([owner, makerAddress, takerAddress] = _.slice(accounts, 0, 3));

        const erc20Wrapper = new ERC20Wrapper(provider, usedAddresses, owner);
        const erc721Wrapper = new ERC721Wrapper(provider, usedAddresses, owner);

        const numDummyErc20ToDeploy = 3;
        [erc20Token, zrxToken, erc20Token2] = await erc20Wrapper.deployDummyTokensAsync(
            numDummyErc20ToDeploy,
            constants.DUMMY_TOKEN_DECIMALS,
        );
        erc20Proxy = await erc20Wrapper.deployProxyAsync();

        [erc721Token] = await erc721Wrapper.deployDummyTokensAsync();
        erc721Proxy = await erc721Wrapper.deployProxyAsync();

        zrxAssetData = assetDataUtils.encodeERC20AssetData(zrxToken.address);
        exchange = await ExchangeContract.deployFrom0xArtifactAsync(
            artifacts.Exchange,
            provider,
            txDefaults,
            zrxAssetData,
        );
        const exchangeWrapper = new ExchangeWrapper(exchange, provider);
        await exchangeWrapper.registerAssetProxyAsync(erc20Proxy.address, owner);
        await exchangeWrapper.registerAssetProxyAsync(erc721Proxy.address, owner);
        await erc20Proxy.addAuthorizedAddress.awaitTransactionSuccessAsync(exchange.address, { from: owner });
        await erc721Proxy.addAuthorizedAddress.awaitTransactionSuccessAsync(exchange.address, { from: owner });

        devUtils = await DevUtilsContract.deployFrom0xArtifactAsync(
            artifacts.DevUtils,
            provider,
            txDefaults,
            exchange.address,
            zrxAssetData,
        );

        erc20AssetData = assetDataUtils.encodeERC20AssetData(erc20Token.address);
        erc20AssetData2 = assetDataUtils.encodeERC20AssetData(erc20Token2.address);
        erc721AssetData = assetDataUtils.encodeERC721AssetData(erc721Token.address, tokenId);
        const defaultOrderParams = {
            ...constants.STATIC_ORDER_PARAMS,
            exchangeAddress: exchange.address,
            makerAddress,
            feeRecipientAddress: constants.NULL_ADDRESS,
            makerAssetData: erc20AssetData,
            takerAssetData: erc20AssetData2,
        };
        const privateKey = constants.TESTRPC_PRIVATE_KEYS[accounts.indexOf(makerAddress)];
        orderFactory = new OrderFactory(privateKey, defaultOrderParams);
    });

    beforeEach(async () => {
        await blockchainLifecycle.startAsync();
    });
    afterEach(async () => {
        await blockchainLifecycle.revertAsync();
    });

    describe('getAssetProxyAddress', () => {
        it('should return the address of registered proxies', async () => {
            const erc20ProxyAddress = await devUtils.getAssetProxyAddress.callAsync(erc20AssetData);
            const erc721ProxyAddress = await devUtils.getAssetProxyAddress.callAsync(erc721AssetData);
            expect(erc20ProxyAddress).to.equal(erc20Proxy.address);
            expect(erc721ProxyAddress).to.equal(erc721Proxy.address);
        });
        it('should return the null address if the assetProxy does not exist', async () => {
            const invalidAssetData = '0x01020304';
            const assetProxyAddress = await devUtils.getAssetProxyAddress.callAsync(invalidAssetData);
            expect(assetProxyAddress).to.equal(constants.NULL_ADDRESS);
        });
    });
    describe('getTransferableAssetAmount', () => {
        it('should return the balance when balance < allowance', async () => {
            const balance = new BigNumber(123);
            const allowance = new BigNumber(456);
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.setBalance.sendTransactionAsync(makerAddress, balance),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.approve.sendTransactionAsync(erc20Proxy.address, allowance, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const transferableAmount = await devUtils.getTransferableAssetAmount.callAsync(
                erc20AssetData,
                makerAddress,
            );
            expect(transferableAmount).to.bignumber.equal(balance);
        });
        it('should return the allowance when allowance < balance', async () => {
            const balance = new BigNumber(456);
            const allowance = new BigNumber(123);
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.setBalance.sendTransactionAsync(makerAddress, balance),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.approve.sendTransactionAsync(erc20Proxy.address, allowance, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const transferableAmount = await devUtils.getTransferableAssetAmount.callAsync(
                erc20AssetData,
                makerAddress,
            );
            expect(transferableAmount).to.bignumber.equal(allowance);
        });
    });
    describe('getOrderRelevantState', () => {
        beforeEach(async () => {
            signedOrder = await orderFactory.newSignedOrderAsync();
        });
        it('should return the correct orderInfo when the order is valid', async () => {
            const [orderInfo] = await devUtils.getOrderRelevantState.callAsync(signedOrder, signedOrder.signature);
            expect(orderInfo.orderHash).to.equal(orderHashUtils.getOrderHashHex(signedOrder));
            expect(orderInfo.orderStatus).to.equal(OrderStatus.Fillable);
            expect(orderInfo.orderTakerAssetFilledAmount).to.bignumber.equal(constants.ZERO_AMOUNT);
        });
        it('should return isValidSignature=true when the signature is valid', async () => {
            const [, , isValidSignature] = await devUtils.getOrderRelevantState.callAsync(
                signedOrder,
                signedOrder.signature,
            );
            expect(isValidSignature).to.equal(true);
        });
        it('should return isValidSignature=false when the signature is invalid', async () => {
            const invalidSignature = '0x01';
            const [, , isValidSignature] = await devUtils.getOrderRelevantState.callAsync(
                signedOrder,
                invalidSignature,
            );
            expect(isValidSignature).to.equal(false);
        });
        it('should return a fillableTakerAssetAmount of 0 when no balances or allowances are insufficient', async () => {
            const [, fillableTakerAssetAmount] = await devUtils.getOrderRelevantState.callAsync(
                signedOrder,
                signedOrder.signature,
            );
            expect(fillableTakerAssetAmount).to.bignumber.equal(constants.ZERO_AMOUNT);
        });
        it('should return a fillableTakerAssetAmount of 0 when fee balances/allowances are insufficient', async () => {
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.setBalance.sendTransactionAsync(makerAddress, signedOrder.makerAssetAmount),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerAssetAmount, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const [, fillableTakerAssetAmount] = await devUtils.getOrderRelevantState.callAsync(
                signedOrder,
                signedOrder.signature,
            );
            expect(fillableTakerAssetAmount).to.bignumber.equal(constants.ZERO_AMOUNT);
        });
        it('should return the correct fillableTakerAssetAmount when fee balances/allowances are partially sufficient', async () => {
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.setBalance.sendTransactionAsync(makerAddress, signedOrder.makerAssetAmount),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerAssetAmount, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const divisor = 4;
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.setBalance.sendTransactionAsync(
                    makerAddress,
                    signedOrder.makerFee.dividedToIntegerBy(divisor),
                ),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerFee, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const [, fillableTakerAssetAmount] = await devUtils.getOrderRelevantState.callAsync(
                signedOrder,
                signedOrder.signature,
            );
            expect(fillableTakerAssetAmount).to.bignumber.equal(
                signedOrder.takerAssetAmount.dividedToIntegerBy(divisor),
            );
        });
        it('should return the correct fillableTakerAssetAmount when non-fee balances/allowances are partially sufficient', async () => {
            const divisor = 4;
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.setBalance.sendTransactionAsync(
                    makerAddress,
                    signedOrder.makerAssetAmount.dividedToIntegerBy(divisor),
                ),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerAssetAmount, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.setBalance.sendTransactionAsync(makerAddress, signedOrder.makerFee),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerFee, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const [, fillableTakerAssetAmount] = await devUtils.getOrderRelevantState.callAsync(
                signedOrder,
                signedOrder.signature,
            );
            expect(fillableTakerAssetAmount).to.bignumber.equal(
                signedOrder.takerAssetAmount.dividedToIntegerBy(divisor),
            );
        });
        it('should return a fillableTakerAssetAmount of 0 when non-fee balances/allowances are insufficient', async () => {
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.setBalance.sendTransactionAsync(makerAddress, signedOrder.makerFee),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerFee, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const [, fillableTakerAssetAmount] = await devUtils.getOrderRelevantState.callAsync(
                signedOrder,
                signedOrder.signature,
            );
            expect(fillableTakerAssetAmount).to.bignumber.equal(constants.ZERO_AMOUNT);
        });
        it('should return a fillableTakerAssetAmount equal to the takerAssetAmount when the order is unfilled and balances/allowances are sufficient', async () => {
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.setBalance.sendTransactionAsync(makerAddress, signedOrder.makerAssetAmount),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerAssetAmount, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.setBalance.sendTransactionAsync(makerAddress, signedOrder.makerFee),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerFee, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const [, fillableTakerAssetAmount] = await devUtils.getOrderRelevantState.callAsync(
                signedOrder,
                signedOrder.signature,
            );
            expect(fillableTakerAssetAmount).to.bignumber.equal(signedOrder.takerAssetAmount);
        });
        it('should return the correct fillableTakerAssetAmount when balances/allowances are partially sufficient and makerAsset=makerFeeAsset', async () => {
            signedOrder = await orderFactory.newSignedOrderAsync({
                makerAssetData: zrxAssetData,
                makerAssetAmount: new BigNumber(10),
                takerAssetAmount: new BigNumber(20),
                makerFee: new BigNumber(40),
            });
            const transferableMakerAssetAmount = new BigNumber(10);
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.setBalance.sendTransactionAsync(makerAddress, transferableMakerAssetAmount),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.approve.sendTransactionAsync(erc20Proxy.address, transferableMakerAssetAmount, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const expectedFillableTakerAssetAmount = transferableMakerAssetAmount
                .times(signedOrder.takerAssetAmount)
                .dividedToIntegerBy(signedOrder.makerAssetAmount.plus(signedOrder.makerFee));
            const [, fillableTakerAssetAmount] = await devUtils.getOrderRelevantState.callAsync(
                signedOrder,
                signedOrder.signature,
            );
            expect(fillableTakerAssetAmount).to.bignumber.equal(expectedFillableTakerAssetAmount);
        });
        it('should return the correct fillabeTakerassetAmount when makerAsset balances/allowances are sufficient and there are no maker fees', async () => {
            signedOrder = await orderFactory.newSignedOrderAsync({ makerFee: constants.ZERO_AMOUNT });
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.setBalance.sendTransactionAsync(makerAddress, signedOrder.makerAssetAmount),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerAssetAmount, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const [, fillableTakerAssetAmount] = await devUtils.getOrderRelevantState.callAsync(
                signedOrder,
                signedOrder.signature,
            );
            expect(fillableTakerAssetAmount).to.bignumber.equal(signedOrder.takerAssetAmount);
        });
        it('should return a fillableTakerAssetAmount when the remaining takerAssetAmount is less than the transferable amount', async () => {
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.setBalance.sendTransactionAsync(makerAddress, signedOrder.makerAssetAmount),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerAssetAmount, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.setBalance.sendTransactionAsync(makerAddress, signedOrder.makerFee),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerFee, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token2.setBalance.sendTransactionAsync(takerAddress, signedOrder.takerAssetAmount),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token2.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.takerAssetAmount, {
                    from: takerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.setBalance.sendTransactionAsync(takerAddress, signedOrder.takerFee),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.takerFee, {
                    from: takerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const takerAssetFillAmount = signedOrder.takerAssetAmount.dividedToIntegerBy(4);
            await exchange.fillOrder.awaitTransactionSuccessAsync(
                signedOrder,
                takerAssetFillAmount,
                signedOrder.signature,
                { from: takerAddress },
            );
            const [, fillableTakerAssetAmount] = await devUtils.getOrderRelevantState.callAsync(
                signedOrder,
                signedOrder.signature,
            );
            expect(fillableTakerAssetAmount).to.bignumber.equal(
                signedOrder.takerAssetAmount.minus(takerAssetFillAmount),
            );
        });
    });
    describe('getOrderRelevantStates', async () => {
        it('should return the correct information for multiple orders', async () => {
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.setBalance.sendTransactionAsync(makerAddress, signedOrder.makerAssetAmount),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await erc20Token.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerAssetAmount, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.setBalance.sendTransactionAsync(makerAddress, signedOrder.makerFee),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            await web3Wrapper.awaitTransactionSuccessAsync(
                await zrxToken.approve.sendTransactionAsync(erc20Proxy.address, signedOrder.makerFee, {
                    from: makerAddress,
                }),
                constants.AWAIT_TRANSACTION_MINED_MS,
            );
            const signedOrder2 = await orderFactory.newSignedOrderAsync({ makerAssetData: erc721AssetData });
            const invalidSignature = '0x01';
            await exchange.cancelOrder.awaitTransactionSuccessAsync(signedOrder2, { from: makerAddress });
            const [
                ordersInfo,
                fillableTakerAssetAmounts,
                isValidSignature,
            ] = await devUtils.getOrderRelevantStates.callAsync(
                [signedOrder, signedOrder2],
                [signedOrder.signature, invalidSignature],
            );
            expect(ordersInfo[0].orderHash).to.equal(orderHashUtils.getOrderHashHex(signedOrder));
            expect(ordersInfo[1].orderHash).to.equal(orderHashUtils.getOrderHashHex(signedOrder2));
            expect(ordersInfo[0].orderStatus).to.equal(OrderStatus.Fillable);
            expect(ordersInfo[1].orderStatus).to.equal(OrderStatus.Cancelled);
            expect(ordersInfo[0].orderTakerAssetFilledAmount).to.bignumber.equal(constants.ZERO_AMOUNT);
            expect(ordersInfo[1].orderTakerAssetFilledAmount).to.bignumber.equal(constants.ZERO_AMOUNT);
            expect(fillableTakerAssetAmounts[0]).to.bignumber.equal(signedOrder.takerAssetAmount);
            expect(fillableTakerAssetAmounts[1]).to.bignumber.equal(constants.ZERO_AMOUNT);
            expect(isValidSignature[0]).to.equal(true);
            expect(isValidSignature[1]).to.equal(false);
        });
    });
});
// tslint:disable:max-file-line-count
