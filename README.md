# LinkPool Owners Contract

This contract suite manages the distribution of shares from the makers fees inside LinkPool and manage our public share sale. Contributors can send link to this contract for % percentage share based on a 1000 ETH hard-cap valued at 25%.

- **Hard Cap:** 1000 ETH
- **Valuation:** 4000 ETH
- **Minimum Stake:** 0.2 ETH (0.005% of valuation)
- **Total Share of Creators:** 75%

Once contributed, the digital agreement is locked and you will recieve that share for the lifetime of LinkPool. Fees earned by the LinkPool platform are transfered to this suite.

This contract is token agnostic and can support management and distribution of any ERC20 token, but natively uses ERC677 (LINK).

## Contract Usage

There are four main events within the owners contract:

- Contribution
- Distribution of Tokens
- Token Withdrawal
- Ownership Transfer

#### Contribution
Contribution is called by the fallback function.

Method Signature:
```
function contribute(address sender) internal payable;
```

Usage:
```js
web3.eth.sendTransaction({
    from: accounts[1],
    to: PoolOwners.address,
    value: web3.toWei(5, 'ether'),
    gas: 100000
});
```

#### Distribution of Tokens
Distribution of the token balance within the contract. Token address can be specified, allowing contract to be token agnostic.

Method Signature:
```
function distributeTokens(address token) public onlyPoolOwner();
```

Usage:
```js
await poolOwners.distributeTokens(LinkToken.address, { from: accounts[1] });
```

#### Token Withdrawal
Withdrawal of token balance for a single owner to their own wallet.

Method Signature:
```
function withdrawTokens(address token, uint256 amount) public onlyPoolOwner();
```

Usage:
```js
await poolOwners.withdrawTokens(LinkToken.address, ownerBalance, { from: accounts[1] });
```

#### Transfer Ownership
Allows an owner/contributor of LinkPool to transfer part or all of their ownership to a different address.

Method Signature:
```
function transferOwnership(address receiver, uint256 amount) public onlyPoolOwner();
```

Usage:
```js
await poolOwners.transferOwnership(accounts[3], web3.toWei(500, 'ether'), { from: accounts[1] });
```


## Development

Requires v8 of NodeJS or later.

#### Install

```
npm install -g truffle ganache-cli
npm install
```

#### TestRPC
To create your own local test instance (50 accounts needed):
```
ganache-cli -a 50
```

#### Test Execution

```
truffle migrate --reset
trufle test
```

This should result in something similar to:
```
  Contract: PoolOwners
    ✓ creators should make up of 75% of the share holding (49ms)
    ✓ should be able to whitelist all accounts contributing (6272ms)
    ✓ shouldn't be allowed to contribute if not whitelisted (257ms)
    ✓ shouldn't be allowed to contribute if the phase isn't active (195ms)
    ✓ shouldn't be able to contribute an amount which isn't divisible by 0.2 ETH (337ms)
    ✓ a minimum contribution of 0.2 ETH should result in a 0.005% share (331ms)
    ✓ a contribution of 16 ETH should result in a 0.4% share (349ms)
    ✓ a contribution of 20 ETH should result in a 0.5% share (345ms)
    ✓ a contribution of 13.6 ETH should result in a 0.34% share (333ms)
    ✓ a contributor should be able to contribute multiple times (303ms)
    ✓ should increment total contributed when contributions are made
    ✓ should be able to contribute up until 1000 ETH (12901ms)
    ✓ should proportionately distribute 100 tokens to all 43 contributors (3360ms)
    ✓ should proportionately distribute 5000 tokens to all 43 contributors (3693ms)
    ✓ should allow everyone to withdraw half of all their tokens (16927ms)
    ✓ should be able to transfer 12.5% ownership to another address (350ms)
    ✓ should proportionately distribute 5000.1234567 tokens to all 43 contributors (3458ms)
    ✓ should allow everyone to withdraw all their tokens (16438ms)
    ✓ should be able to lock the shares inside the contract (285ms)
    ✓ shouldn't allow a contributor to withdraw more tokens than their balance (118ms)
    ✓ shouldn't allow contributors to call set owner share (96ms)
    ✓ shouldn't allow an non-owner to withdraw (106ms)
    ✓ shouldn't be able to contribute after the hard cap has been reached (273ms)
```

### About

Made for [LinkPool](https://linkpool.io), the decentralised trust-less network of ChainLink nodes.

