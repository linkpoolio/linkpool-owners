# LinkPool Owners Contract

This contract suite manages the distribution of shares from the makers fees inside LinkPool and manage our public share sale. Contributors can send link to this contract for % percentage share based on a 1000 ETH hard-cap valued at 25%.

- **Hard Cap:** 1000 ETH
- **Valuation:** 4000 ETH
- **Minimum Stake:** 0.2 ETH (0.005% of valuation)
- **Total Share of Creators:** 75%

Once contributed, the digital agreement is locked and you will recieve that share for the lifetime of LinkPool. Fees earned by the LinkPool platform are transfered to this suite.

This contract is token agnostic and can support management and distribution of any ERC20 token.

**NOTE:** It is not possible to get this contract to conform to the ERC20 standard without causing issues for any application that leverages it. For example, a DEX. Reasons:
- Minimum transferrable amount of 0.04 ether. This is due to the percentage precision, as 0.04 ether is 0.001% or represented as 1 wei in the contract. If this wasn't in-place, then the total amount of ownership would decrease from 100% as division remainder by 0.04 ether would be lost.
- When distribution is active, the transferring of ownership tokens is blocked. Reasoning for the block is due to when tokens are being claimed and ownership is sent, it would skew and modify the percentages during a distribution cycle with the high chance of complete contract blocking.

## Contract Usage

There are four main events within the owners contract:

- Contribution
- Distribution of Tokens
- Claiming of tokens
- Ownership Transfer (ERC20, ERC223 similar methods included)

#### Contribution
Contribution is called by the fallback function.

Usage:
```js
web3.eth.sendTransaction({
    from: accounts[0],
    to: PoolOwners.address,
    value: web3.toWei(5, 'ether'),
    gas: 100000
});
```

#### Distribution of Tokens
Distribution of the token balance within the contract. Token address can be specified, allowing contract to be token agnostic.

Method Signature:
```
distributeTokens(address)
```

Usage:
```js
await poolOwners.distributeTokens(LinkToken.address, { from: accounts[0] });
```

#### Claiming of Tokens
When `distributeTokens` has been called, it will mark distribution as active resulting in blocked ownership transfers. This method has to be triggered with every owner address who currently has shares, once they're all claimed it will then be marked as complete and re-open transfers of ownership.

You can batch claim tokens in stages to avoid any block height issues. This is done by passing in a lower count than the size of the owners map.

Method Signature:
```
batchClaim(uint)
```
Usage:
```js
await poolOwners.batchClaim(43, { from: accounts[0] });
```

#### Transfer Ownership
Allows an owner/contributor of LinkPool to transfer part or all of their ownership to a different address.

Due to the limitation of the percentage precision of 5, all the transfers have to be in increments of 0.04 ether.

Method Signature:
```
sendOwnership(address,uint256)
```

Usage:
```js
await poolOwners.sendOwnership(accounts[3], web3.toWei(500, 'ether'), { from: accounts[0] });
```

Transferring of ownership can also be done with similar pattern to ERC20 & ERC223, for example:
```js
//ERC20-esque
await poolOwners.increaseAllowance(accounts[1], web3.toWei(500, 'ether'), { from: accounts[0] });
await poolOwners.sendOwnershipFrom(accounts[0], accounts[2], web3.toWei(500, 'ether'), { from: accounts[1] });

//ERC223-esque
await poolOwners.sendOwnershipAndCall(accounts[3], web3.toWei(500, 'ether'), "Hello world", { from: accounts[0] });
```

## Development

Requires v8 of NodeJS or later.

#### Install

```
npm install -g truffle ganache-cli
npm install
```

#### TestRPC
To create your own local test instance (300 accounts needed):
```
ganache-cli -a 300 -e 1000
```

#### Test Execution

```
truffle migrate --reset
trufle test
```

This should result in something similar to:
```
  Contract: PoolOwners
    ✓ creators should make up of 75% of the share holding (54ms)    
    ✓ should be able to whitelist all accounts contributing (5547ms)    
    ✓ shouldn't be allowed to contribute if not whitelisted (257ms)
    ✓ shouldn't be allowed to contribute if the phase isn't active (224ms)   
    ✓ shouldn't be able to contribute an amount which isn't divisible by 0.2 ETH (359ms)
    ✓ a minimum contribution of 0.2 ETH should result in a 0.005% share (255ms)
    ✓ a contribution of 16 ETH should result in a 0.4% share (399ms)    
    ✓ a contribution of 20 ETH should result in a 0.5% share (389ms)
    ✓ a contribution of 13.6 ETH should result in a 0.34% share (369ms)    
    ✓ a contributor should be able to contribute multiple times (289ms)
    ✓ should increment total contributed when contributions are made
    ✓ should be able to contribute up until 1000 ETH (14285ms)    
    ✓ shouldn't be able to distribute a non-whitelisted token (347ms)
    ✓ should proportionately distribute 100 tokens to all 43 contributors (3513ms)    
    ✓ should proportionately distribute 5000 tokens to all 43 contributors (4852ms)
    ✓ shouldn't be able to transfer ownership not adhering to the minimum precision (94ms)
    ✓ should be able to transfer 12.5% ownership to another address (233ms)
    ✓ should be able to transfer 0.4% ownership to a new address (536ms)
    ✓ should proportionately distribute 5000.1234567 tokens to all 43 contributors (3564ms)
    ✓ should allow distribution when an owner transfers all his ownership away and then gets some back (2888ms)
    ✓ shouldn't be able to contribute after the hard cap has been reached (243ms)
    ✓ should be able to lock the shares inside the contract (161ms)    
    ✓ shouldn't be able to send ownership on behalf with no allownace (78ms)
    ✓ shouldn't be able to distribute tokens under the minimum (360ms)
    ✓ shouldn't allow contributors to call set owner share (96ms)


  25 passing (40s)
```

### About

Made for [LinkPool](https://linkpool.io), the decentralised trust-less network of ChainLink nodes.

