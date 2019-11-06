import * as _ from 'lodash';

export interface ContractAddresses {
    erc20Proxy: string;
    erc721Proxy: string;
    zrxToken: string;
    etherToken: string;
    exchange: string;
    assetProxyOwner: string;
    forwarder: string;
    orderValidator: string;
    dutchAuction: string;
    coordinatorRegistry: string;
    coordinator: string;
}

export enum NetworkId {
    Mainnet = 1,
    Ropsten = 3,
    Rinkeby = 4,
    Kovan = 42,
    Ganache = 50,
    Local = 228,
}

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

const networkToAddresses: { [networkId: number]: ContractAddresses } = {
    1: {
        exchange: '0x080bf510fcbf18b91105470639e9561022937712',
        erc20Proxy: '0x95e6f48254609a6ee006f7d493c8e5fb97094cef',
        erc721Proxy: '0xefc70a1b18c432bdc64b596838b4d138f6bc6cad',
        forwarder: '0x76481caa104b5f6bccb540dae4cefaf1c398ebea',
        orderValidator: '0xa09329c6003c9a5402102e226417738ee22cf1f2',
        zrxToken: '0xe41d2489571d322189246dafa5ebde1f4699f498',
        etherToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        assetProxyOwner: '0xdffe798c7172dd6deb32baee68af322e8f495ce0',
        dutchAuction: '0xa3856622276a64fee0f17f67329fac24368d4aae',
        coordinatorRegistry: '0x45797531b873fd5e519477a070a955764c1a5b07',
        coordinator: '0xa14857e8930acd9a882d33ec20559beb5479c8a6',
    },
    3: {
        erc20Proxy: '0xb1408f4c245a23c31b98d2c626777d4c0d766caa',
        erc721Proxy: '0xe654aac058bfbf9f83fcaee7793311dd82f6ddb4',
        zrxToken: '0xff67881f8d12f372d91baae9752eb3631ff0ed00',
        etherToken: '0xc778417e063141139fce010982780140aa0cd5ab',
        exchange: '0xbff9493f92a3df4b0429b6d00743b3cfb4c85831',
        assetProxyOwner: '0xf5fa5b5fed2727a0e44ac67f6772e97977aa358b',
        forwarder: '0x1ebdc9758e85c1c6a85af06cc96cf89000a31913',
        orderValidator: '0x90431a90516ab49af23a0530e04e8c7836e7122f',
        dutchAuction: '0xe5f862f7811af180990025b6259b02feb0a0b8dc',
        coordinatorRegistry: '0x403cc23e88c17c4652fb904784d1af640a6722d9',
        coordinator: '0x2ba02e03ee0029311e0f43715307870a3e701b53',
    },
    4: {
        exchange: '0xbff9493f92a3df4b0429b6d00743b3cfb4c85831',
        erc20Proxy: '0x2f5ae4f6106e89b4147651688a92256885c5f410',
        erc721Proxy: '0x7656d773e11ff7383a14dcf09a9c50990481cd10',
        zrxToken: '0x8080c7e4b81ecf23aa6f877cfbfd9b0c228c6ffa',
        etherToken: '0xc778417e063141139fce010982780140aa0cd5ab',
        assetProxyOwner: '0xe1703da878afcebff5b7624a826902af475b9c03',
        forwarder: '0x1ebdc9758e85c1c6a85af06cc96cf89000a31913',
        orderValidator: '0x0c5173a51e26b29d6126c686756fb9fbef71f762',
        dutchAuction: '0xe5f862f7811af180990025b6259b02feb0a0b8dc',
        coordinatorRegistry: '0x1084b6a398e47907bae43fec3ff4b677db6e4fee',
        coordinator: '0x2ba02e03ee0029311e0f43715307870a3e701b53',
    },
    228: {
        erc20Proxy: '0x010000000000000000000000000000000000005b',
        erc721Proxy: '0x010000000000000000000000000000000000005c',
        zrxToken: '0x010000000000000000000000000000000000005d',
        etherToken: '0x010000000000000000000000000000000000005e',
        exchange: '0x010000000000000000000000000000000000005f',
        assetProxyOwner: '0x010000000000000000000000000000000000006a',
        forwarder: '0x0100000000000000000000000000000000000067',
        orderValidator: '0x0100000000000000000000000000000000000068',
        dutchAuction: '0x0100000000000000000000000000000000000069',
        coordinatorRegistry: '0x010000000000000000000000000000000000006b',
        coordinator: '0x010000000000000000000000000000000000006c'
    }
};

/**
 * Used to get addresses of contracts that have been deployed to either the
 * Ethereum mainnet or a supported testnet. Throws if there are no known
 * contracts deployed on the corresponding network.
 * @param networkId The desired networkId.
 * @returns The set of addresses for contracts which have been deployed on the
 * given networkId.
 */
export function getContractAddressesForNetworkOrThrow(networkId: NetworkId): ContractAddresses {
    if (networkToAddresses[networkId] === undefined) {
        throw new Error(`Unknown network id (${networkId}). No known 0x contracts have been deployed on this network.`);
    }
    return networkToAddresses[networkId];
}
