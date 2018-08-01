pragma solidity ^0.4.3;

import "./std/Ownable.sol";
import "./std/ERC677.sol";
import "./std/SafeMath.sol";

import "./lib/ItMap.sol";

/**
    @title PoolOwners, the crowdsale contract for LinkPool ownership
 */
contract PoolOwners is Ownable {

    using SafeMath for uint256;
    using itmap for itmap.itmap;

    struct Owner {
        uint256 key;
        uint256 percentage;
        uint256 shareTokens;
        mapping(address => uint256) balance;
    }
    mapping(address => Owner) public owners;

    struct Distribution {
        address token;
        uint256 amount;
        uint256 owners;
        uint256 claimed;
        mapping(address => bool) claimedAddresses;
    }
    mapping(uint256 => Distribution) public distributions;

    mapping(address => uint256) public tokenBalance;
    mapping(address => uint256) public totalReturned;

    mapping(address => bool) private whitelist;

    itmap.itmap ownerMap;
    
    uint256 public totalContributed     = 0;
    uint256 public totalOwners          = 0;
    uint256 public totalDistributions   = 0;
    bool    public distributionActive   = false;
    uint256 public distributionMinimum  = 20 ether;
    uint256 public precisionMinimum     = 0.04 ether;
    bool    public locked               = false;
    address public wallet;

    bool    private contributionStarted = false;
    uint256 private minimumContribution = 0.2 ether;
    uint256 private valuation           = 4000 ether;
    uint256 private hardCap             = 1000 ether;

    event Contribution(address indexed sender, uint256 share, uint256 amount);
    event ClaimedTokens(address indexed owner, address indexed token, uint256 amount, uint256 claimedStakers, uint256 distributionId);
    event TokenDistributionActive(address indexed token, uint256 amount, uint256 distributionId, uint256 amountOfOwners);
    event TokenWithdrawal(address indexed token, address indexed owner, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner, uint256 amount);
    event TokenDistributionComplete(address indexed token, uint256 amountOfOwners);

    modifier onlyWhitelisted() {
        require(whitelist[msg.sender]);
        _;
    }

    /**
        @dev Constructor set set the wallet initally
        @param _wallet Address of the ETH wallet
     */
    constructor(address _wallet) public {
        require(_wallet != address(0));
        wallet = _wallet;
    }

    /**
        @dev Fallback function, redirects to contribution
        @dev Transfers tokens to LP wallet address
     */
    function() public payable {
        require(whitelist[msg.sender], "You are not whitelisted");
        contribute(msg.sender, msg.value); 
        wallet.transfer(msg.value);
    }

    /**
        @dev Manually set a contribution, used by owners to increase owners amounts
        @param _sender The address of the sender to set the contribution for you
        @param _amount The amount that the owner has sent
     */
    function setContribution(address _sender, uint256 _amount) public onlyOwner() { contribute(_sender, _amount); }

    /**
        @dev Registers a new contribution, sets their share
        @param _sender The address of the wallet contributing
        @param _amount The amount that the owner has sent
     */
    function contribute(address _sender, uint256 _amount) private {
        require(!locked, "Crowdsale period over, contribution is locked");
        require(!distributionActive, "Cannot contribute when distribution is active");
        require(contributionStarted, "Contribution phase hasn't started");
        require(_amount >= minimumContribution, "Amount needs to be above the minimum contribution");
        require(hardCap >= _amount, "Your contribution is greater than the hard cap");
        require(_amount % minimumContribution == 0, "Your amount isn't divisible by the minimum contribution");
        require(hardCap >= totalContributed.add(_amount), "Your contribution would cause the total to exceed the hardcap");

        totalContributed = totalContributed.add(_amount);
        uint256 share = percent(_amount, valuation, 5);

        Owner storage o = owners[_sender];
        if (o.percentage != 0) { // Existing owner
            o.shareTokens = o.shareTokens.add(_amount);
            o.percentage = o.percentage.add(share);
        } else { // New owner
            require(ownerMap.insert(totalOwners, uint(_sender)) == false);
            o.key = totalOwners;
            totalOwners += 1;
            o.shareTokens = _amount;
            o.percentage = share;
        }

        if (!whitelist[msg.sender]) {
            whitelist[msg.sender] = true;
        }

        emit Contribution(_sender, share, _amount);
    }

    /**
        @dev Whitelist a wallet address
        @param _owner Wallet of the owner
     */
    function whitelistWallet(address _owner) external onlyOwner() {
        require(!locked, "Can't whitelist when the contract is locked");
        require(_owner != address(0), "Empty address");
        whitelist[_owner] = true;
    }

    /**
        @dev Start the distribution phase
     */
    function startContribution() external onlyOwner() {
        require(!contributionStarted, "Contribution has started");
        contributionStarted = true;
    }

    /**
        @dev Manually set a share directly, used to set the LinkPool members as owners
        @param _owner Wallet address of the owner
        @param _value The equivalent contribution value
     */
    function setOwnerShare(address _owner, uint256 _value) public onlyOwner() {
        require(!locked, "Can't manually set shares, it's locked");
        require(!distributionActive, "Cannot set owners share when distribution is active");

        Owner storage o = owners[_owner];
        if (o.shareTokens == 0) {
            whitelist[_owner] = true;
            ownerMap.insert(totalOwners, uint(_owner));
            totalOwners += 1;
        }
        o.shareTokens = _value;
        o.percentage = percent(_value, valuation, 5);
    }

    /**
        @dev Transfer part or all of your ownership to another address
        @param _receiver The address that you're sending to
        @param _amount The amount of ownership to send, for your balance refer to `ownerShareTokens`
     */
    function sendOwnership(address _receiver, uint256 _amount) public onlyWhitelisted() {
        Owner storage o = owners[msg.sender];
        Owner storage r = owners[_receiver];

        require(o.shareTokens > 0, "You don't have any ownership");
        require(o.shareTokens >= _amount, "The amount exceeds what you have");
        require(!distributionActive, "Distribution cannot be active when sending ownership");
        require(_amount % precisionMinimum == 0, "Your amount isn't divisible by the minimum precision amount");

        o.shareTokens = o.shareTokens.sub(_amount);

        if (o.shareTokens == 0) {
            o.percentage = 0;
            require(ownerMap.remove(o.key) == true);
        } else {
            o.percentage = percent(o.shareTokens, valuation, 5);
        }
        if (r.shareTokens == 0) {
            whitelist[_receiver] = true;
            ownerMap.insert(totalOwners, uint(_receiver));
            totalOwners += 1;
        }
        r.shareTokens = r.shareTokens.add(_amount);
        r.percentage = r.percentage.add(percent(_amount, valuation, 5));

        emit OwnershipTransferred(msg.sender, _receiver, _amount);
    }

    /**
        @dev Lock the contribution/shares methods
     */
    function lockShares() public onlyOwner() {
        require(!locked, "Shares already locked");
        locked = true;
    }

    /**
        @dev Start the distribution phase in the contract so owners can claim their tokens
        @param _token The token address to start the distribution of
     */
    function distributeTokens(address _token) public onlyWhitelisted() {
        require(!distributionActive, "Distribution is already active");
        distributionActive = true;

        ERC677 erc677 = ERC677(_token);

        uint256 currentBalance = erc677.balanceOf(this) - tokenBalance[_token];
        require(currentBalance > distributionMinimum, "Amount in the contract isn't above the minimum distribution limit");

        totalDistributions++;
        Distribution storage d = distributions[totalDistributions]; 
        d.owners = ownerMap.size();
        d.amount = currentBalance;
        d.token = _token;
        d.claimed = 0;
        totalReturned[_token] += currentBalance;

        emit TokenDistributionActive(_token, currentBalance, totalDistributions, d.owners);
    }

    /**
        @dev Claim tokens by a owner address to add them to their balance
        @param _owner The address of the owner to claim tokens for
     */
    function claimTokens(address _owner) public {
        Owner storage o = owners[_owner];
        Distribution storage d = distributions[totalDistributions]; 

        require(o.shareTokens > 0, "You need to have a share to claim tokens");
        require(distributionActive, "Distribution isn't active");
        require(!d.claimedAddresses[_owner], "Tokens already claimed for this address");

        address token = d.token;
        uint256 tokenAmount = d.amount.mul(o.percentage).div(100000);
        o.balance[token] = o.balance[token].add(tokenAmount);
        tokenBalance[token] = tokenBalance[token].add(tokenAmount);

        d.claimed++;
        d.claimedAddresses[_owner] = true;

        emit ClaimedTokens(_owner, token, tokenAmount, d.claimed, totalDistributions);

        if (d.claimed == d.owners) {
            distributionActive = false;
            emit TokenDistributionComplete(token, totalOwners);
        }
    }

    /**
        @dev Withdraw tokens from your contract balance
        @param _token The token address for token claiming
        @param _amount The amount of tokens to withdraw
     */
    function withdrawTokens(address _token, uint256 _amount) public {
        require(_amount > 0, "You have requested for 0 tokens to be withdrawn");

        Owner storage o = owners[msg.sender];
        Distribution storage d = distributions[totalDistributions]; 

        if (distributionActive && !d.claimedAddresses[msg.sender]) {
            claimTokens(msg.sender);
        }
        require(o.balance[_token] >= _amount, "Amount requested is higher than your balance");

        o.balance[_token] = o.balance[_token].sub(_amount);
        tokenBalance[_token] = tokenBalance[_token].sub(_amount);

        ERC677 erc677 = ERC677(_token);
        require(erc677.transfer(msg.sender, _amount) == true);

        emit TokenWithdrawal(_token, msg.sender, _amount);
    }

    /**
        @dev Set the minimum amount to be of transfered in this contract to start distribution
        @param _minimum The minimum amount
     */
    function setDistributionMinimum(uint256 _minimum) public onlyOwner() {
        distributionMinimum = _minimum;
    }

    /**
        @dev Set the wallet address to receive the crowdsale contributions
        @param _wallet The wallet address
     */
    function setEthWallet(address _wallet) public onlyOwner() {
        wallet = _wallet;
    }

    /**
        @dev Returns whether the address is whitelisted
        @param _owner The address of the owner
     */
    function isWhitelisted(address _owner) public view returns (bool) {
        return whitelist[_owner];
    }

    /**
        @dev Returns the contract balance of the sender for a given token
        @param _token The address of the ERC token
     */
    function getOwnerBalance(address _token) public view returns (uint256) {
        Owner storage o = owners[msg.sender];
        return o.balance[_token];
    }

    /**
        @dev Returns a owner, all the values in the struct
        @param _owner Address of the owner
     */
    function getOwner(address _owner) public view returns (uint256, uint256, uint256) {
        Owner storage o = owners[_owner];
        return (o.key, o.shareTokens, o.percentage);
    }

    /**
        @dev Returns the current amount of active owners, ie share above 0
     */
    function getCurrentOwners() public view returns (uint) {
        return ownerMap.size();
    }

    /**
        @dev Returns owner address based on the key
        @param _key The key of the address in the map
     */
    function getOwnerAddress(uint _key) public view returns (address) {
        return address(ownerMap.get(_key));
    }

    /**
        @dev Returns whether a owner has claimed their tokens
        @param _owner The address of the owner
        @param _dId The distribution id
     */
    function hasClaimed(address _owner, uint256 _dId) public view returns (bool) {
        Distribution storage d = distributions[_dId]; 
        return d.claimedAddresses[_owner];
    }

    /**
        @dev Credit to Rob Hitchens: https://stackoverflow.com/a/42739843
     */
    function percent(uint numerator, uint denominator, uint precision) private pure returns (uint quotient) {
        uint _numerator = numerator * 10 ** (precision+1);
        uint _quotient = ((_numerator / denominator) + 5) / 10;
        return ( _quotient);
    }
}