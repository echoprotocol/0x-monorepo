import { ok } from 'assert';
import { sha3 } from 'ethereumjs-util';

/** Converts address to AddressBuffer */
export function toAddressBuffer(address: string): Buffer {
    // TODO: address can also be a echo account address (like `1.2.n`)
    ok(/^0x[\da-fA-F]{40}$/.test(address));
    return Buffer.from(address.slice(2), 'hex');
}

/** Converts Ethereum signature to EcIP-1 signature */
export function toEcIP1Signature(ethSig: Buffer, address: string): Buffer {
    ok(ethSig.length >= 65);
    // tslint:disable-next-line: no-bitwise
    const recIDPrefix = sha3(toAddressBuffer(address))[0] >> 2;
    // tslint:disable-next-line: no-bitwise
    const recID = (recIDPrefix << 2) + (ethSig[0] - 27);
    return Buffer.concat([Buffer.from([recID]), ethSig.slice(1)]);
}
