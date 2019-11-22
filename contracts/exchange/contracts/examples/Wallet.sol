/*

  Copyright 2018 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.5.5;

import "../src/interfaces/IWallet.sol";
import "@0x/contracts-utils/contracts/src/LibBytes.sol";


contract Wallet is 
    IWallet
{
    using LibBytes for bytes;

    // The owner of this wallet.
    // solhint-disable-next-line var-name-mixedcase
    address internal WALLET_OWNER;

    /// @dev constructs a new `Wallet` with a single owner.
    /// @param walletOwner The owner of this wallet.
    constructor (address walletOwner) public {
        WALLET_OWNER = walletOwner;
    }

    /// @dev Validates an EIP712 signature.
    ///      The signer must match the owner of this wallet.
    /// @param hash Message hash that is signed.
    /// @param eip712Signature Proof of signing.
    /// @return Validity of signature.
    function isValidSignature(
        bytes32 hash,
        bytes calldata eip712Signature
    )
        external
        view
        returns (bool isValid)
    {
        require(
            eip712Signature.length == 64,
            "LENGTH_64_REQUIRED"
        );
        return edverify(WALLET_OWNER, abi.encodePacked(hash), eip712Signature);
    }
}
