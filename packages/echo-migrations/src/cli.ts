import { runMigrationsAsync } from '@0x/migrations';
//@ts-ignore
import { EchoProvider, utils, echojslib } from 'echo-web3';
import * as yargs from 'yargs';
import { JSONRPCRequestPayload } from 'ethereum-types';


//TODO publish echo-web3 to npm and set it as dependency
const args = yargs
    .option('ws-url', {
        describe: 'Enter ECHO ws host',
        type: 'string',
        demandOption: true,
    })
    .option('from', {
        describe: 'ECHO account from whitch to deploy contracts',
        type: 'string',
        demandOption: true,
    })
    .option('mul-addr', {
        describe: 'the second address for AssetProxyOwner multisign. The first account will be "from"',
        type: 'string',
        demandOption: true,
    })
    .option('pk', {
        describe: 'Private key for the `from` address in WIF format',
        type: 'string',
        demandOption: true,
    })
    .example(
        'node cli.js --mul-addr 1.2.12 --from 1.2.10 --pk 5KkYp8QdQBaRmLqLz7WVrGjzkt7E13qVcr7cpdLowgJ1mjRyDx2 --ws-url ws://127.0.0.1:6311',
        'Full usage example',
    ).argv;

const PRIVATE_KEY_WIF = args.pk;
const FROM = '0x' + utils.addressUtils.addressToShortMemo(args.from);
const ADDRESSES = [FROM, '0x' + utils.addressUtils.addressToShortMemo(args.mulAddr)];
const ECHO_HOST = args.wsUrl; 

const echoProvider = new EchoProvider(ECHO_HOST)
const privateKey = echojslib.crypto.PrivateKey.fromWif(PRIVATE_KEY_WIF);

class FakeProvider {
    sendAsync(payload: JSONRPCRequestPayload, cb: (err: Error | null, data?: any) => void) {
        const { method, params, id } = payload;

        switch (method) {
            case 'eth_accounts': return cb(null, this._createJsonRpcResponse(id, ADDRESSES));
            case 'eth_sendTransaction':
                // console.log('TCL: FakeProvider -> sendAsync -> params', params);

                const { operationId, options } = utils.transactionUtils.mapEthTxToEcho(params[0], { id: '1.3.0' });
                const tx = echoProvider.echo.createTransaction()
                    .addOperation(operationId, options);

                return tx.sign(privateKey)
                    .then(() => {
                        tx.broadcast().then((broadcastResult: { block_num: number, trx_num: number}[]) => {
                            const [{ block_num: blockNumber, trx_num: txIndex }] = broadcastResult;

                            const txHash = '0x' + utils.transactionUtils.encodeTxHash(blockNumber, txIndex, operationId);
                            return cb(null, this._createJsonRpcResponse(id, txHash))
                        }).catch((err: Error) => {
                            console.log(' FakeProvider -> sendAsync -> error', err);
                            return cb(err);
                        })
                    })
                    .catch((err: Error) => {
                        console.log('FakeProvider -> sendAsync -> error', err);
                        return cb(err);
                    })

            default:
                echoProvider.sendAsync(payload, cb)
        }
    }

    _createJsonRpcResponse(id: number, result: any, error?: any) {
        return {
            id,
            jsonrpc: '2.0',
            ...error ? { error } : { result }
        };
    };
}
(async () => {
    await echoProvider.init();
    const res = await runMigrationsAsync(new FakeProvider(), { from: FROM })
    console.log('Addresses', res);
    process.exit(1);
})().catch((err: Error) => {
    console.log(err);
    process.exit(1);
});
