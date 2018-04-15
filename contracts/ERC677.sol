pragma solidity ^0.4.2;

import './ERC20.sol';

contract ERC677 is ERC20 {
  function transferAndCall(address to, uint value, bytes data) public returns (bool success);

  event Transfer(address indexed from, address indexed to, uint value, bytes data);
}