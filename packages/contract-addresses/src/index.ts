import * as _ from 'lodash';

export interface ContractAddresses {
    erc20Proxy: string;
    erc721Proxy: string;
    zrxToken: string;
    etherToken: string;
    webtcToken?: string;
    weethToken?: string;
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
    EchoTestnet = 103,
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
        erc20Proxy: '0x01000000000000000000000000000000000000ba',
        erc721Proxy: '0x01000000000000000000000000000000000000bb',
        zrxToken: '0x01000000000000000000000000000000000000bc',
        etherToken: '0x01000000000000000000000000000000000000bd',
        webtcToken: '0x01000000000000000000000000000000000000b8',
        weethToken: '0x01000000000000000000000000000000000000b9',
        exchange: '0x01000000000000000000000000000000000000be',
        assetProxyOwner: '0x01000000000000000000000000000000000000c9',
        forwarder: '0x01000000000000000000000000000000000000c6',
        orderValidator: '0x01000000000000000000000000000000000000c7',
        dutchAuction: '0x01000000000000000000000000000000000000c8',
        coordinatorRegistry: '0x01000000000000000000000000000000000000ca',
        coordinator: '0x01000000000000000000000000000000000000cb'
    },
    4: {
        erc20Proxy: '0x0100000000000000000000000000000000000001',
        erc721Proxy: '0x0100000000000000000000000000000000000002',
        zrxToken: '0x0100000000000000000000000000000000000003',
        etherToken: '0x0100000000000000000000000000000000000004',
        exchange: '0x0100000000000000000000000000000000000005',
        assetProxyOwner: '0x0100000000000000000000000000000000000010',
        forwarder: '0x010000000000000000000000000000000000000d',
        orderValidator: '0x010000000000000000000000000000000000000e',
        dutchAuction: '0x010000000000000000000000000000000000000f',
        coordinatorRegistry: '0x0100000000000000000000000000000000000011',
        coordinator: '0x0100000000000000000000000000000000000012'
    },
    103: {
        erc20Proxy: '0x010000000000000000000000000000000000002d',
        erc721Proxy: '0x010000000000000000000000000000000000002e',
        zrxToken: '0x010000000000000000000000000000000000002f',
        etherToken: '0x0100000000000000000000000000000000000030',
        exchange: '0x0100000000000000000000000000000000000031',
        assetProxyOwner: '0x010000000000000000000000000000000000003d',
        forwarder: '0x010000000000000000000000000000000000003a',
        orderValidator: '0x010000000000000000000000000000000000003b',
        dutchAuction: '0x010000000000000000000000000000000000003c',
        coordinatorRegistry: '0x010000000000000000000000000000000000003e',
        coordinator: '0x010000000000000000000000000000000000003f'
    },
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
