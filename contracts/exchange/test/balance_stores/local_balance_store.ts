import { DevUtilsContract } from '@0x/contracts-dev-utils';
import { AssetProxyId } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { BalanceStore } from './balance_store';

export class LocalBalanceStore extends BalanceStore {
    /**
     * Creates a new balance store based on an existing one.
     * @param balanceStore Existing balance store whose values should be copied.
     */
    public static create(devUtils: DevUtilsContract, sourceBalanceStore?: BalanceStore): LocalBalanceStore {
        const localBalanceStore = new LocalBalanceStore(devUtils);
        if (sourceBalanceStore !== undefined) {
            localBalanceStore.copyBalancesFrom(sourceBalanceStore);
        }
        return localBalanceStore;
    }

    /**
     * Constructor.
     */
    public constructor(private readonly _devUtils: DevUtilsContract) {
        super();
    }

    /**
     * Transfers assets from `fromAddress` to `toAddress`.
     * @param fromAddress Sender of asset(s)
     * @param toAddress Receiver of asset(s)
     * @param amount Amount of asset(s) to transfer
     * @param assetData Asset data of assets being transferred.
     */
    public async transferAssetAsync(fromAddress: string, toAddress: string, amount: BigNumber, assetData: string): Promise<void> {
        if (fromAddress === toAddress) {
            return;
        }
        const assetProxyId = await this._devUtils.decodeAssetProxyId.callAsync(assetData);
        switch (assetProxyId) {
            case AssetProxyId.ERC20: {
                const [proxyId, assetAddress ] = await this._devUtils.decodeERC20AssetData.callAsync(assetData); // tslint:disable-line-no-unused-variable
                const fromBalances = this._balances.erc20[fromAddress];
                const toBalances = this._balances.erc20[toAddress];
                fromBalances[assetAddress] = fromBalances[assetAddress].minus(amount);
                toBalances[assetAddress] = toBalances[assetAddress].plus(amount);
                break;
            }
            case AssetProxyId.ERC721: {
                const [proxyId, assetAddress, tokenId] = await this._devUtils.decodeERC721AssetData.callAsync(assetData); // tslint:disable-line-no-unused-variable
                const fromTokens = this._balances.erc721[fromAddress][assetAddress];
                const toTokens = this._balances.erc721[toAddress][assetAddress];
                if (amount.gte(1)) {
                    const tokenIndex = _.findIndex(fromTokens, t => t.eq(tokenId));
                    if (tokenIndex !== -1) {
                        fromTokens.splice(tokenIndex, 1);
                        toTokens.push(new BigNumber(tokenId));
                    }
                }
                break;
            }
            case AssetProxyId.ERC1155: {
                const [proxyId, assetAddress, tokenIds, tokenValues] = await this._devUtils.decodeERC1155AssetData.callAsync(assetData); // tslint:disable-line-no-unused-variable
                const fromBalances = this._balances.erc1155[fromAddress][assetAddress];
                const toBalances = this._balances.erc1155[toAddress][assetAddress];
                for (const i of _.times(tokenIds.length)) {
                    const tokenId = tokenIds[i];
                    const tokenValue = tokenValues[i];
                    const tokenAmount = amount.times(tokenValue);
                    if (tokenAmount.gt(0)) {
                        const tokenIndex = _.findIndex(fromBalances.nonFungible, t => t.eq(tokenId));
                        if (tokenIndex !== -1) {
                            // Transfer a non-fungible.
                            fromBalances.nonFungible.splice(tokenIndex, 1);
                            toBalances.nonFungible.push(tokenId);
                        } else {
                            // Transfer a fungible.
                            const _tokenId = tokenId.toString(10);
                            fromBalances.fungible[_tokenId] = fromBalances.fungible[_tokenId].minus(tokenAmount);
                            toBalances.fungible[_tokenId] = toBalances.fungible[_tokenId].plus(tokenAmount);
                        }
                    }
                }
                // sort NFT's by name
                toBalances.nonFungible.sort();
                break;
            }
            case AssetProxyId.MultiAsset: {
                const [proxyId, amounts, nestedAssetData]  = await this._devUtils.decodeMultiAssetData.callAsync(assetData); // tslint:disable-line-no-unused-variable
                for (const i of _.times(amounts.length)) {
                    const nestedAmount = amount.times(amounts[i]);
                    const _nestedAssetData = nestedAssetData[i];
                    await this.transferAssetAsync(fromAddress, toAddress, nestedAmount, _nestedAssetData);
                }
                break;
            }
            case AssetProxyId.StaticCall:
                // Do nothing
                break;
            default:
                throw new Error(`Unhandled asset proxy ID: ${assetProxyId}`);
        }
    }
}
