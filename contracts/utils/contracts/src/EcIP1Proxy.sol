pragma solidity ^0.5.5;

contract IEcIP1Mapper {
 	function cover(bytes32 message, uint8 recID, bytes32 r, bytes32 s) public view returns (address signer);
}

contract EcIP1Proxy {
    IEcIP1Mapper private mapper;

    constructor(address _mapper) public { mapper = IEcIP1Mapper(_mapper); }

    function ecrecover(bytes32 message, uint8 recID, bytes32 r, bytes32 s) internal view returns (address signer) {
        return mapper.cover(message, recID, r, s);
    }
}
