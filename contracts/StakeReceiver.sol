pragma solidity ^0.4.3;

import "./std/SafeMath.sol";

/**
    @title StakeReceiver
    @dev Basic implementation of a ownership stake receiver
 */
contract StakeReceiver {

    using SafeMath for uint256;

    address public poolOwners;
    mapping(address => uint256) public stakes;

    constructor(address _poolOwners) public {
        require(_poolOwners != address(0), "PoolOwners address must be set");
        poolOwners = _poolOwners;
    }

    function onOwnershipStake(address _sender, uint _value, bytes _data) public {
        require(msg.sender == poolOwners, "Sender must be PoolOwners contract");
        stakes[_sender] = stakes[_sender].add(_value);
    }

    function onOwnershipStakeRemoval(address _sender, uint _value, bytes _data) public {
        require(msg.sender == poolOwners, "Sender must be PoolOwners contract");
        stakes[_sender] = stakes[_sender].sub(_value);
        if (stakes[_sender] == 0) {
            delete stakes[_sender];
        }
    }
}