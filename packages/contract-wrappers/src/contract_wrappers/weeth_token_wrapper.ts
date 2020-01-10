import { WEETHContract, WEETHEventArgs, WEETHEvents } from '@0x/abi-gen-wrappers';
import { WEETH } from '@0x/contract-artifacts';
import { schemas } from '@0x/json-schemas';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { ContractAbi, LogWithDecodedArgs } from 'ethereum-types';
import * as _ from 'lodash';

import { BlockRange, ContractWrappersError, EventCallback, IndexedFilterValues, TransactionOpts } from '../types';
import { assert } from '../utils/assert';
import { utils } from '../utils/utils';

import { ContractWrapper } from './contract_wrapper';
import { ERC20TokenWrapper } from './erc20_token_wrapper';

/**
 * This class includes all the functionality related to interacting with a wrapped Ether ERC20 token contract.
 * The caller can convert ETH into the equivalent number of wrapped ETH ERC20 tokens and back.
 */
export class WEETHTokenWrapper extends ContractWrapper {
    public abi: ContractAbi = WEETH.compilerOutput.abi;
    private readonly _weethTokenContractsByAddress: {
        [address: string]: WEETHContract;
    } = {};
    private readonly _erc20TokenWrapper: ERC20TokenWrapper;
    /**
     * Instantiate WEETHTokenWrapper.
     * @param web3Wrapper Web3Wrapper instance to use
     * @param networkId Desired networkId
     * @param erc20TokenWrapper The ERC20TokenWrapper instance to use
     * @param blockPollingIntervalMs The block polling interval to use for active subscriptions
     */
    constructor(
        web3Wrapper: Web3Wrapper,
        networkId: number,
        erc20TokenWrapper: ERC20TokenWrapper,
        blockPollingIntervalMs?: number,
    ) {
        super(web3Wrapper, networkId, blockPollingIntervalMs);
        this._erc20TokenWrapper = erc20TokenWrapper;
    }
    /**
     * Deposit ETH into the Wrapped ETH smart contract and issues the equivalent number of wrapped ETH tokens
     * to the depositor address. These wrapped ETH tokens can be used in 0x trades and are redeemable for 1-to-1
     * for ETH.
     * @param   weethTokenAddress   WEETHToken address you wish to deposit into.
     * @param   amountInWei         Amount of ETH in Wei the caller wishes to deposit.
     * @param   depositor           The hex encoded user Ethereum address that would like to make the deposit.
     * @param   txOpts              Transaction parameters.
     * @return Transaction hash.
     */
    public async depositAsync(
        weethTokenAddress: string,
        amountInWei: BigNumber,
        depositor: string,
        txOpts: TransactionOpts = {},
    ): Promise<string> {
        assert.isETHAddressHex('etherTokenAddress', weethTokenAddress);
        assert.isValidBaseUnitAmount('amountInWei', amountInWei);
        await assert.isSenderAddressAsync('depositor', depositor, this._web3Wrapper);
        const normalizedWEETHTokenAddress = weethTokenAddress.toLowerCase();
        const normalizedDepositorAddress = depositor.toLowerCase();

        const ethBalanceInWei = await this._web3Wrapper.getBalanceInWeiAsync(normalizedDepositorAddress, '1.3.1');
        assert.assert(ethBalanceInWei.gte(amountInWei), ContractWrappersError.InsufficientEthBalanceForDeposit);

        const weethContract = await this._getWEETHTokenContractAsync(normalizedWEETHTokenAddress);
        const txHash = await weethContract.deposit.sendTransactionAsync(
            utils.removeUndefinedProperties({
                from: normalizedDepositorAddress,
                value: amountInWei,
                gas: txOpts.gasLimit,
                gasPrice: txOpts.gasPrice,
                nonce: txOpts.nonce,
                asset_id: '1.3.1',
            }),
        );
        return txHash;
    }
    /**
     * Withdraw ETH to the withdrawer's address from the wrapped ETH smart contract in exchange for the
     * equivalent number of wrapped ETH tokens.
     * @param   etherTokenAddress   EtherToken address you wish to withdraw from.
     * @param   amountInWei  Amount of ETH in Wei the caller wishes to withdraw.
     * @param   withdrawer   The hex encoded user Ethereum address that would like to make the withdrawal.
     * @param   txOpts       Transaction parameters.
     * @return Transaction hash.
     */
    public async withdrawAsync(
        weethTokenAddress: string,
        amountInWei: BigNumber,
        withdrawer: string,
        txOpts: TransactionOpts = {},
    ): Promise<string> {
        assert.isValidBaseUnitAmount('amountInWei', amountInWei);
        assert.isETHAddressHex('etherTokenAddress', weethTokenAddress);
        await assert.isSenderAddressAsync('withdrawer', withdrawer, this._web3Wrapper);
        const normalizedWEETHTokenAddress = weethTokenAddress.toLowerCase();
        const normalizedWithdrawerAddress = withdrawer.toLowerCase();

        const WETHBalanceInBaseUnits = await this._erc20TokenWrapper.getBalanceAsync(
            normalizedWEETHTokenAddress,
            normalizedWithdrawerAddress,
        );
        assert.assert(
            WETHBalanceInBaseUnits.gte(amountInWei),
            ContractWrappersError.InsufficientWEthBalanceForWithdrawal,
        );

        const weethContract = await this._getWEETHTokenContractAsync(normalizedWEETHTokenAddress);
        const txHash = await weethContract.withdraw.sendTransactionAsync(
            amountInWei,
            utils.removeUndefinedProperties({
                from: normalizedWithdrawerAddress,
                gas: txOpts.gasLimit,
                gasPrice: txOpts.gasPrice,
                nonce: txOpts.nonce,
                asset_id: '1.3.1',
            }),
        );
        return txHash;
    }
    /**
     * Gets historical logs without creating a subscription
     * @param   etherTokenAddress   An address of the ether token that emitted the logs.
     * @param   eventName           The ether token contract event you would like to subscribe to.
     * @param   blockRange          Block range to get logs from.
     * @param   indexFilterValues   An object where the keys are indexed args returned by the event and
     *                              the value is the value you are interested in. E.g `{_owner: aUserAddressHex}`
     * @return  Array of logs that match the parameters
     */
    public async getLogsAsync<ArgsType extends WEETHEventArgs>(
        weethTokenAddress: string,
        eventName: WEETHEvents,
        blockRange: BlockRange,
        indexFilterValues: IndexedFilterValues,
    ): Promise<Array<LogWithDecodedArgs<ArgsType>>> {
        assert.isETHAddressHex('etherTokenAddress', weethTokenAddress);
        const normalizedEtherTokenAddress = weethTokenAddress.toLowerCase();
        assert.doesBelongToStringEnum('eventName', eventName, WEETHEvents);
        assert.doesConformToSchema('blockRange', blockRange, schemas.blockRangeSchema);
        assert.doesConformToSchema('indexFilterValues', indexFilterValues, schemas.indexFilterValuesSchema);
        const logs = await this._getLogsAsync<ArgsType>(
            normalizedEtherTokenAddress,
            eventName,
            blockRange,
            indexFilterValues,
            WEETH.compilerOutput.abi,
        );
        return logs;
    }
    /**
     * Subscribe to an event type emitted by the Token contract.
     * @param   etherTokenAddress   The hex encoded address where the ether token is deployed.
     * @param   eventName           The ether token contract event you would like to subscribe to.
     * @param   indexFilterValues   An object where the keys are indexed args returned by the event and
     *                              the value is the value you are interested in. E.g `{_owner: aUserAddressHex}`
     * @param   callback            Callback that gets called when a log is added/removed
     * @param   isVerbose           Enable verbose subscription warnings (e.g recoverable network issues encountered)
     * @return Subscription token used later to unsubscribe
     */
    public subscribe<ArgsType extends WEETHEventArgs>(
        weethTokenAddress: string,
        eventName: WEETHEvents,
        indexFilterValues: IndexedFilterValues,
        callback: EventCallback<ArgsType>,
        isVerbose: boolean = false,
    ): string {
        assert.isETHAddressHex('etherTokenAddress', weethTokenAddress);
        const normalizedEtherTokenAddress = weethTokenAddress.toLowerCase();
        assert.doesBelongToStringEnum('eventName', eventName, WEETHEvents);
        assert.doesConformToSchema('indexFilterValues', indexFilterValues, schemas.indexFilterValuesSchema);
        assert.isFunction('callback', callback);
        const subscriptionToken = this._subscribe<ArgsType>(
            normalizedEtherTokenAddress,
            eventName,
            indexFilterValues,
            WEETH.compilerOutput.abi,
            callback,
            isVerbose,
        );
        return subscriptionToken;
    }
    /**
     * Cancel a subscription
     * @param   subscriptionToken Subscription token returned by `subscribe()`
     */
    public unsubscribe(subscriptionToken: string): void {
        assert.isValidSubscriptionToken('subscriptionToken', subscriptionToken);
        this._unsubscribe(subscriptionToken);
    }
    /**
     * Cancels all existing subscriptions
     */
    public unsubscribeAll(): void {
        super._unsubscribeAll();
    }
    private async _getWEETHTokenContractAsync(weethTokenAddress: string): Promise<WEETHContract> {
        let weethTokenContract = this._weethTokenContractsByAddress[weethTokenAddress];
        if (weethTokenContract !== undefined) {
            return weethTokenContract;
        }
        const contractInstance = new WEETHContract(
            weethTokenAddress,
            this._web3Wrapper.getProvider(),
            this._web3Wrapper.getContractDefaults(),
        );
        weethTokenContract = contractInstance;
        this._weethTokenContractsByAddress[weethTokenAddress] = weethTokenContract;
        return weethTokenContract;
    }
}
