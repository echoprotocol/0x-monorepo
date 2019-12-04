pragma solidity ^0.5.5;

contract EcIP1Mapper {

    mapping (bytes32 => address) recIDPrefix2addressMap;

    event Registred(address from, address echoAddress);

    function registry(uint8 recID, bytes32 r, bytes32 s) public returns (bool succeed) {
        bytes32 message = keccak256(abi.encodePacked(msg.sender));
        uint8 expectedRecIDPrefix = uint8(message[0]) >> 2;
        uint8 actualRecIDPrefix = recID >> 2;
        require(expectedRecIDPrefix == actualRecIDPrefix, "invalid recovery id");
        uint8 v = (recID & 0x3) + 27;
        address echoAddress = ecrecover(message, v, r, s);
        bytes32 recIDPrefix2addressLink = keccak256(abi.encodePacked(actualRecIDPrefix, echoAddress));
        address _covered = recIDPrefix2addressMap[recIDPrefix2addressLink];
        require(_covered != msg.sender, "already added");
        require(_covered == address(0x0), "hash collision");
        recIDPrefix2addressMap[recIDPrefix2addressLink] = msg.sender;
        emit Registred(msg.sender, echoAddress);
        return true;
    }

    function cover(bytes32 message, uint8 recID, bytes32 r, bytes32 s) public view returns (address signer) {
        uint8 recIDPrefix = recID >> 2;
        uint8 v = (recID & 0x3) + 27;
        address echoAddress = ecrecover(message, v, r, s);
        bytes32 recIDPrefix2addressLink = keccak256(abi.encodePacked(recIDPrefix, echoAddress));
        return recIDPrefix2addressMap[recIDPrefix2addressLink];
    }

}
