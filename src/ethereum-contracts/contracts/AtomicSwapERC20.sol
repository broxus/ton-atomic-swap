pragma solidity ^0.5.4;

import './utils/SafeMath.sol';
import "./interfaces/IToken.sol";

/**
 * @title Hashed Timelock Contracts for using with ERC20.
 */
contract AtomicSwapERC20 {
    using SafeMath for uint256;
    using UniversalERC20 for IToken;

    address public target;
    address public backup;
    address public platform;

    address public token;

    uint public feeAmount;
    uint public amount;
    uint public hashedSecret;
    uint[2] public rawSecret;
    uint public timeLock;

    bool public withdrawn;
    bool public refunded;

    function contractBalance() view public returns(uint) {
        return IToken(token).universalBalanceOf(address(this));
    }

    modifier fundsSent() {
        require(contractBalance() >= amount, "Balance is not enough");
        _;
    }

    modifier futureTimeLock(uint _time) {
        require(_time > now, "Timelock is not in the future");
        _;
    }

    modifier secretHashMatches(uint[2] memory _rawSecret) {
        require(hashedSecret == uint(sha256(abi.encodePacked(_rawSecret[0], _rawSecret[1]))), "Secret not matches the hash");
        _;
    }

    modifier withdrawable() {
        require(withdrawn == false, "Contract already withdrawed");
        _;
    }

    modifier refundable() {
        require(refunded == false, "Contract already refunded");
        require(withdrawn == false, "Contract already withdrawed");
        require(timeLock <= now, "Too early to call the refund");
        _;
    }

    /**
     * @dev Factory sets up a new hash time lock contract and
     * providing the receiver lock terms.
     *
     * @param _target Receiver of the token in case of successful swap.
     * @param _backup Backup address for sending the token in case of
     *                  unsuccessful swap
     * @param _token Token address
     * @param _amount   Swap amount
     * @param _timeLock UNIX epoch seconds time that the lock expires at.
     *                  Refunds can be made after this time.
     * @param _hashedSecret A uint(sha256(secret)) hashedSecret.
     */
    constructor(
        address _target,
        address _backup,
        address _platform,
        address _token,
        uint _feeAmount,
        uint _amount,
        uint _timeLock,
        uint _hashedSecret
    )
    public
    futureTimeLock(_timeLock)
    {
        target = _target;
        backup = _backup;
        token = _token;
        platform = _platform;

        feeAmount = _feeAmount;
        amount = _amount;
        timeLock = _timeLock;
        hashedSecret = _hashedSecret;
    }

    /**
     * @dev Called by the receiver once they know the rawSecret of the hashedSecret.
     * This will transfer the locked funds to their address.
     *
     * @param _rawSecret uint(sha256(_rawSecret)) should equal the contract hashedSecret.
     * @return bool true on success
     */
    function withdraw(uint[2] memory _rawSecret)
    public
    fundsSent
    secretHashMatches(_rawSecret)
    withdrawable
    returns (bool)
    {
        rawSecret = _rawSecret;
        withdrawn = true;

        // Calculate the platform fee before the withdraw
        uint platformFee = contractBalance().sub(amount).add(feeAmount);

        IToken(token).universalTransfer(target, amount.sub(feeAmount));

        if (platformFee > 0) {
            IToken(token).universalTransfer(platform, platformFee);
        }

        return true;
    }

    /**
     * @dev Called by the sender if there was no withdraw AND the time lock has
     * expired. This will refund the contract amount.
     *
     * @return bool true on success
     */
    function refund()
    external
    fundsSent
    refundable
    returns (bool)
    {
        refunded = true;

        IToken(token).universalTransfer(backup, contractBalance());

        return true;
    }
}

