#!/usr/bin/env node
import { logUtils } from '@0x/utils';
import * as yargs from 'yargs';
//@ts-ignore
import { EchoProvider, utils, echojslib } from 'echo-web3';
import { JSONRPCRequestPayload } from 'ethereum-types';

import { runMigrationsAsync } from './migration';

const args = yargs
    .option('rpc-url', {
        describe: 'Endpoint where backing ECHO interface is available',
        type: 'string',
        demandOption: false,
        default: 'http://localhost:8545',
    })
    .option('from', {
        describe: 'Ethereum address from which to deploy the contracts',
        type: 'string',
        demandOption: true,
    })
    .option('mul-addr', {
        describe: 'the second address for AssetProxyOwner multisign. The first account will be "from"',
        type: 'string',
        demandOption: true,
    })
    .option('pk', {
        describe: 'Private key for the `from` address',
        type: 'string',
    })
    .example(
        'node cli.js --mul-addr 0x00000000000000000000000000000000000000bd --from 0x00000000000000000000000000000000000000be --pk  5J2nyv8FX2s663MbBquxj4RgKUmFW5T9cSfyYnEpDBkmsQnQGGt --rpc-url wss://testnet.echo-dev.io/ws',
        'Full usage example',
    ).argv;


const echoProvider = new EchoProvider(args['rpc-url'])
const privateKey = echojslib.crypto.PrivateKey.fromWif(args['pk']);

class EchoRPCProvider {
    sendAsync(payload: JSONRPCRequestPayload, cb: (err: Error | null, data?: any) => void) {
        const { method, params, id } = payload;

        switch (method) {
            case 'eth_accounts': return cb(null, this._createJsonRpcResponse(id, [args['from'], args['mul-addr']]));
            case 'eth_sendTransaction':

                const { supportedAssetId } = params[0]
                const { operationId, options } = utils.transactionUtils.mapEthTxToEcho(params[0], { asset: { id: supportedAssetId || '1.3.0', value: 0 },  });
                const tx = echoProvider.echo.createTransaction()
                    .addOperation(operationId, options);

                return tx.sign(privateKey)
                    .then(() => {
                        tx.broadcast().then((broadcastResult: { block_num: number, trx_num: number }[]) => {
                            const [{ block_num: blockNumber, trx_num: txIndex }] = broadcastResult;

                            const txHash = '0x' + utils.transactionUtils.encodeTxHash(blockNumber, txIndex, operationId);
                            return cb(null, this._createJsonRpcResponse(id, txHash))
                        }).catch((err: Error) => {
                            console.log(' EchoRPCProvider -> sendAsync -> error', JSON.stringify(err, null, 1));
                            return cb(err);
                        })
                    })
                    .catch((err: Error) => {
                        console.log('EchoRPCProvider -> sendAsync -> error', err);
                        return cb(err);
                    })

            default:
                echoProvider.sendAsync(payload, cb)
        }
    }

    _createJsonRpcResponse(id: number, result: any, error?: any) {
        return { id, jsonrpc: '2.0', ...error ? { error } : { result } };
    };
}

(async () => {
    await echoProvider.init();
    const addresses = await runMigrationsAsync(new EchoRPCProvider(), { from: args['from'] })
    console.log('Addresses', addresses);
    process.exit(0);
})().catch(err => {
    logUtils.log(err);
    process.exit(1);
});