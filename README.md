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
function distributeTokens(address token) public onlyPoolOwner();
```

Usage:
```js
await poolOwners.distributeTokens(LinkToken.address, { from: accounts[0] });
```

#### Claiming of Tokens
When `distributeTokens` has been called, it will mark distribution as active resulting in blocked ownership transfers. This method has to be triggered with every owner address who currently has shares, once they're all claimed it will then be marked as complete and re-open transfers of ownership.

Method Signature:
```
function claimTokens(address token) public;
```
Usage:
```js
await poolOwners.claimTokens(LinkToken.address, { from: accounts[0] });
```

#### Token Withdrawal
Withdrawal of token balance for a single owner to their own wallet.

Method Signature:
```
function withdrawTokens(address token, uint256 amount) public onlyWhitelisted();
```

Usage:
```js
await poolOwners.withdrawTokens(LinkToken.address, ownerBalance, { from: accounts[0] });
```

#### Transfer Ownership
Allows an owner/contributor of LinkPool to transfer part or all of their ownership to a different address.

Due to the limitation of the percentage precision of 5, all the transfers have to be in increments of 0.04 ether.

Method Signature:
```
function sendOwnership(address receiver, uint256 amount) public onlyWhitelisted();
```

Usage:
```js
await poolOwners.transferOwnership(accounts[3], web3.toWei(500, 'ether'), { from: accounts[0] });
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
    ✓ creators should make up of 75% of the share holding (56ms)
    ✓ should be able to whitelist all accounts contributing (9047ms)
    ✓ shouldn't be allowed to contribute if not whitelisted (305ms)
    ✓ shouldn't be allowed to contribute if the phase isn't active (262ms)
    ✓ shouldn't be able to contribute an amount which isn't divisible by 0.2 ETH (499ms)
    ✓ a minimum contribution of 0.2 ETH should result in a 0.005% share (668ms)
    ✓ a contribution of 16 ETH should result in a 0.4% share (689ms)
    ✓ a contribution of 20 ETH should result in a 0.5% share (644ms)
    ✓ a contribution of 13.6 ETH should result in a 0.34% share (653ms)
    ✓ a contributor should be able to contribute multiple times (447ms)
    ✓ should increment total contributed when contributions are made
    ✓ should be able to contribute up until 1000 ETH (23171ms)
    ✓ should proportionately distribute 100 tokens to all 43 contributors (20901ms)
    ✓ should proportionately distribute 5000 tokens to all 43 contributors (17416ms)
    ✓ should allow everyone to withdraw half of all their tokens (19930ms)
    ✓ should be able to transfer 12.5% ownership to another address (413ms)
    ✓ should be able to transfer 0.4% ownership to a new address (1043ms)
    ✓ should proportionately distribute 5000.1234567 tokens to all 43 contributors (21032ms)
    ✓ should allow tokens to be claimed when withdrawing and distribution is active (19830ms)
    ✓ should allow distribution when an owner transfers all his ownership away and then gets some back (18009ms)
    ✓ should allow everyone to withdraw all their tokens (16992ms)
    ✓ should be able to lock the shares inside the contract (330ms)
    ✓ shouldn't be able to distribute tokens under the minimum (626ms)
    ✓ shouldn't allow a contributor to withdraw more tokens than their balance (122ms)
    ✓ shouldn't allow contributors to call set owner share (115ms)
    ✓ shouldn't allow an non-owner to withdraw (125ms)
    ✓ shouldn't be able to claim tokens twice (16951ms)
    ✓ shouldn't be able to contribute after the hard cap has been reached (272ms)
```

### About

Made for [LinkPool](https://linkpool.io), the decentralised trust-less network of ChainLink nodes.

