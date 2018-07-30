pragma solidity ^0.4.3;

import "./std/Ownable.sol";
import "./std/ERC677.sol";
import "./std/SafeMath.sol";

/**
    @title PoolOwners, the crowdsale contract for LinkPool ownership
 */
contract PoolOwners is Ownable {

    using SafeMath for uint256;

    mapping(uint256 => address) public ownerAddresses;
    mapping(address => uint256) public ownerPercentages;
    mapping(address => uint256) public ownerShareTokens;
    mapping(address => uint256) public tokenBalance;
    mapping(address => uint256) public totalReturned;
    mapping(address => uint256) public amountAtDistribution;
    mapping(uint256 => mapping(address => bool)) public claimedOwners;

    mapping(address => bool) private whitelist;
    mapping(address => mapping(address => uint256)) private balances;

    uint256 public ownersAtDistribution = 0;
    uint256 public totalClaimedOwners   = 0;
    uint256 public totalContributed     = 0;
    uint256 public totalOwners          = 0;
    uint256 public totalDistributions   = 0;
    uint256 public distributionMinimum  = 20 ether;
    uint256 public precisionMinimum     = 0.04 ether;
    address public wallet;

    bool    private contributionStarted = false;
    bool    private distributionActive  = false;
    uint256 private minimumContribution = 0.2 ether;
    uint256 private valuation           = 4000 ether;
    uint256 private hardCap             = 1000 ether;
    bool    private locked              = false;

    event Contribution(address indexed sender, uint256 share, uint256 amount);
    event ClaimedTokens(address indexed owner, address indexed token, uint256 amount, uint256 claimedStakers, uint256 distributionId);
    event TokenDistributionActive(address indexed token, uint256 amount, uint256 distributionId);
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
        @dev Manually set a contribution, used by owners to increase contributors amounts
        @param _sender The address of the sender to set the contribution for you
        @param _amount The amount that the contributor has sent
     */
    function setContribution(address _sender, uint256 _amount) public onlyOwner() { contribute(_sender, _amount); }

    /**
        @dev Registers a new contribution, sets their share
        @param _sender The address of the wallet contributing
        @param _amount The amount that the contributor has sent
     */
    function contribute(address _sender, uint256 _amount) internal {
        require(!locked, "Crowdsale period over, contribution is locked");
        require(!distributionActive, "Cannot contribute when distribution is active");
        require(contributionStarted, "Contribution phase hasn't started");
        require(_amount >= minimumContribution, "Amount needs to be above the minimum contribution");
        require(hardCap >= _amount, "Your contribution is greater than the hard cap");
        require(_amount % minimumContribution == 0, "Your amount isn't divisible by the minimum contribution");
        require(hardCap >= totalContributed.add(_amount), "Your contribution would cause the total to exceed the hardcap");

        totalContributed = totalContributed.add(_amount);
        uint256 share = percent(_amount, valuation, 5);

        if (ownerPercentages[_sender] != 0) { // Existing contributor
            ownerShareTokens[_sender] = ownerShareTokens[_sender].add(_amount);
            ownerPercentages[_sender] = share.add(ownerPercentages[_sender]);
        } else { // New contributor
            ownerAddresses[totalOwners] = _sender;
            totalOwners += 1;
            ownerPercentages[_sender] = share;
            ownerShareTokens[_sender] = _amount;
        }

        if (!whitelist[msg.sender]) {
            whitelist[msg.sender] = true;
        }

        emit Contribution(_sender, share, _amount);
    }

    /**
        @dev Whitelist a wallet address
        @param _contributor Wallet of the contributor
     */
    function whitelistWallet(address _contributor) external onlyOwner() {
        require(_contributor != address(0), "Empty address");
        whitelist[_contributor] = true;
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

        if (ownerShareTokens[_owner] == 0) {
            whitelist[_owner] = true;
            ownerAddresses[totalOwners] = _owner;
            totalOwners += 1;
        }
        ownerShareTokens[_owner] = _value;
        ownerPercentages[_owner] = percent(_value, valuation, 5);
    }

    /**
        @dev Transfer part or all of your ownership to another address
        @param _receiver The address that you're sending to
        @param _amount The amount of ownership to send, for your balance refer to `ownerShareTokens`
     */
    function sendOwnership(address _receiver, uint256 _amount) public onlyWhitelisted() {
        require(ownerShareTokens[msg.sender] > 0, "You don't have any ownership");
        require(ownerShareTokens[msg.sender] >= _amount, "The amount exceeds what you have");
        require(!distributionActive, "Distribution cannot be active when sending ownership");
        require(_amount % precisionMinimum == 0, "Your amount isn't divisible by the minimum precision amount");

        ownerShareTokens[msg.sender] = ownerShareTokens[msg.sender].sub(_amount);

        if (ownerShareTokens[msg.sender] == 0) {
            ownerPercentages[msg.sender] = 0;
        } else {
            ownerPercentages[msg.sender] = percent(ownerShareTokens[msg.sender], valuation, 5);
        }
        if (ownerShareTokens[_receiver] == 0) {
            whitelist[_receiver] = true;
            ownerAddresses[totalOwners] = _receiver;
            totalOwners += 1;
        }
        ownerShareTokens[_receiver] = ownerShareTokens[_receiver].add(_amount);
        ownerPercentages[_receiver] = ownerPercentages[_receiver].add(percent(_amount, valuation, 5));

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

        ownersAtDistribution = totalOwners;
        amountAtDistribution[_token] = currentBalance;

        totalClaimedOwners = 0;
        totalDistributions += 1;
        totalReturned[_token] += currentBalance;

        emit TokenDistributionActive(_token, currentBalance, totalDistributions);
    }

    /**
        @dev Claim tokens by a owner address to add them to their balance
        @param _token The token address for token claiming
        @param _owner The address of the owner to claim tokens for
     */
    function claimTokens(address _token, address _owner) public {
        require(whitelist[_owner], "Owner address isn't whitelisted");
        require(distributionActive, "Distribution isn't active");
        require(!claimedOwners[totalDistributions][_owner], "Tokens already claimed for this address");

        if (ownerShareTokens[_owner] > 0) {
            uint256 tokenAmount = amountAtDistribution[_token].mul(ownerPercentages[_owner]).div(100000);
            balances[_owner][_token] = balances[_owner][_token].add(tokenAmount);
            tokenBalance[_token] = tokenBalance[_token].add(tokenAmount);
        }

        totalClaimedOwners += 1;
        claimedOwners[totalDistributions][_owner] = true;

        emit ClaimedTokens(_owner, _token, tokenAmount, totalClaimedOwners, totalDistributions);

        if (totalClaimedOwners == totalOwners) {
            distributionActive = false;
            emit TokenDistributionComplete(_token, totalOwners);
        }
    }

    /**
        @dev Withdraw tokens from your contract balance
        @param _token The token address for token claiming
        @param _amount The amount of tokens to withdraw
     */
    function withdrawTokens(address _token, uint256 _amount) public {
        require(_amount > 0, "You have requested for 0 tokens to be withdrawn");

        if (distributionActive && !claimedOwners[totalDistributions][msg.sender]) {
            claimTokens(_token, msg.sender);
        }
        require(balances[msg.sender][_token] >= _amount, "Amount requested is higher than your balance");

        balances[msg.sender][_token] = SafeMath.sub(balances[msg.sender][_token], _amount);
        tokenBalance[_token] = SafeMath.sub(tokenBalance[_token], _amount);

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
        @param _contributor The address of the contributor
     */
    function isWhitelisted(address _contributor) public view returns (bool) {
        return whitelist[_contributor];
    }

    /**
        @dev Returns the contract balance of the sender for a given token
        @param _token The address of the ERC token
     */
    function getOwnerBalance(address _token) public view returns (uint256) {
        return balances[msg.sender][_token];
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