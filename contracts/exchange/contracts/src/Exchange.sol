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
pragma experimental ABIEncoderV2;

import "@0x/contracts-exchange-libs/contracts/src/LibConstants.sol";
import "./MixinExchangeCore.sol";
import "./MixinSignatureValidator.sol";
import "./MixinWrapperFunctions.sol";
import "./MixinAssetProxyDispatcher.sol";
import "./MixinTransactions.sol";
import "./MixinMatchOrders.sol";


// solhint-disable no-empty-blocks
contract Exchange is
    MixinExchangeCore,
    MixinMatchOrders,
    MixinSignatureValidator,
    MixinTransactions,
    MixinAssetProxyDispatcher,
    MixinWrapperFunctions
{
    string constant public VERSION = "3.0.0";

    // Mixins are instantiated in the order they are inherited
    constructor (bytes memory _zrxAssetData, address _EcIP1Mapper)
        public
        LibConstants(_zrxAssetData) // @TODO: Remove when we deploy.
        MixinExchangeCore()
        MixinMatchOrders()
        MixinSignatureValidator(_EcIP1Mapper)
        MixinTransactions()
        MixinAssetProxyDispatcher()
        MixinWrapperFunctions()
    {}
}
