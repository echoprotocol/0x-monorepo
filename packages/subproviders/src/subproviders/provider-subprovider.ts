import { JSONRPCRequestPayload } from 'ethereum-types';
import { Web3Wrapper } from '@0x/web3-wrapper';
import JsonRpcError = require('json-rpc-error');
import { SupportedProvider, ZeroExProvider } from 'ethereum-types';
import { providerUtils } from '@0x/utils';

import { Callback, ErrorCallback } from '../types';

import { Subprovider } from './subprovider';

/**
 * This class implements the [web3-provider-engine](https://github.com/MetaMask/provider-engine) subprovider interface.
 * It forwards on JSON RPC requests to the supplied `rpcUrl` endpoint
 */
export class ProviderSubprovider extends Subprovider {

    private readonly _web3Wrapper: Web3Wrapper;
    private readonly _provider: ZeroExProvider;

    /**
     * @param rpcUrl URL to the backing Ethereum node to which JSON RPC requests should be sent
     * @param requestTimeoutMs Amount of miliseconds to wait before timing out the JSON RPC request
     */
    constructor(supportedProvider: SupportedProvider) {
        super();
        const provider = providerUtils.standardizeOrThrow(supportedProvider);
        this._web3Wrapper = new Web3Wrapper(provider);
        this._provider = provider;
    }
    /**
     * This method conforms to the web3-provider-engine interface.
     * It is called internally by the ProviderEngine when it is this subproviders
     * turn to handle a JSON RPC request.
     * @param payload JSON RPC payload
     * @param _next Callback to call if this subprovider decides not to handle the request
     * @param end Callback to call if subprovider handled the request and wants to pass back the request.
     */
    // tslint:disable-next-line:prefer-function-over-method async-suffix
    public async handleRequest(payload: JSONRPCRequestPayload, _next: Callback, end: ErrorCallback): Promise<void> {
        this._provider.sendAsync(payload, (err, jsonRpcPayload) => {
            if (err || !jsonRpcPayload) return end(err)
            if (jsonRpcPayload.error) return end(new JsonRpcError.InternalError(jsonRpcPayload.error.message))
            end(null, jsonRpcPayload.result);
        })
    }
}
