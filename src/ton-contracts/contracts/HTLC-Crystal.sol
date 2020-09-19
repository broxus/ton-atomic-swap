pragma solidity >= 0.6.0;
pragma experimental ABIEncoderV2;
pragma AbiHeader expire;


/**
 * @title Hashed Timelock Contracts (HTLCs) on TON Crystal.
 *
 * This contract provides a way to create a smart contract and handle withdraw or refund scenario.
 */
contract NativeHTLC {
    uint public contractNonce;

    address target;
    address backup;
    address platform;

    uint128 feeAmount;
    uint128 amount;
    uint hashedSecret;
    uint[2] rawSecret;
    uint timeLock;

    bool withdrawn;
    bool refunded;

    modifier fundsSent() {
        require(address(this).balance >= amount);
        _;
    }

    modifier withdrawable() {
        require(withdrawn == false);
        _;
    }

    modifier onlyAfterWithdraw() {
        require(withdrawn == true);
        _;
    }

    modifier refundable() {
        require(refunded == false);
        require(withdrawn == false);
        require(timeLock <= now);
        _;
    }

    // Modifier-like functions
    function futureTimeLock(uint _time) internal view {
        require(_time > now);
    }

    function secretHashMatches(uint[2] _rawSecret) internal view {
        require(hashedSecret == uint(sha256(abi.encodePacked(_rawSecret[0], _rawSecret[1]))));
    }

    /**
     * @dev Factory sets up a new hash time lock contract and
     * providing the receiver lock terms.
     *
     * @param _target Receiver of the ETH in case of successful swap.
     * @param _backup Backup address for sending the ETH in case of
     *                  unsuccessful swap
     * @param _amount   Swap amount in Wei
     * @param _timeLock UNIX epoch seconds time that the lock expires at.
     *                  Refunds can be made after this time.
     * @param _hashedSecret A uint(sha256(secret)) hashedSecret.
     */
    constructor(
        address _target,
        address _backup,
        address _platform,
        uint128 _feeAmount,
        uint128 _amount,
        uint _timeLock,
        uint _hashedSecret
    )
    public
    {
        tvm.accept();
        futureTimeLock(_timeLock);

        target = _target;
        backup = _backup;

        platform = _platform;

        feeAmount = _feeAmount;
        amount = _amount;
        timeLock = _timeLock;
        hashedSecret = _hashedSecret;
    }

    /**
     * @dev Called when user sends coins to the address.
    */
    receive() external {}

    /**
     * @dev Called by the receiver once they know the rawSecret of the hashedSecret.
     * This will transfer the locked funds to their address.
     *
     * @param _rawSecret uint(sha256(_rawSecret)) should equal the contract hashedSecret.
     * @return bool true on success
     */
    function withdraw(uint[2] _rawSecret)
        public
        fundsSent
        withdrawable
        returns (bool)
    {
        secretHashMatches(_rawSecret);
        tvm.accept();

        rawSecret = _rawSecret;
        withdrawn = true;

        target.transfer(amount - feeAmount, false, 1);

        return true;
    }

    function withdrawFee() public onlyAfterWithdraw {
        tvm.accept();

        platform.transfer(0, false, 128);
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
        tvm.accept();
        refunded = true;

        backup.transfer(0, false, 128);

        return true;
    }

    /**
     * @dev Called by anyone to get the HTLC balance.
     * @return uint balance in nano GRAM
     */
    function getBalance() public pure returns(uint) {
        return address(this).balance;
    }

    /**
     * @dev Returns
     * @return uint balance in nano GRAM
     */
    function getAmount() external view returns(uint) {
        return amount;
    }

    function getFeeAmount() external view returns(uint) {
        return feeAmount;
    }

    /**
     * @dev Called by anyone to get the HTLC balance.
     * @return uint balance in nano GRAM
     */
    function getHashedSecret() external view returns(uint) {
        return hashedSecret;
    }

    /**
     * @dev Called by anyone to get the HTLC balance.
     * @return uint balance in nano GRAM
     */
    function getTimeLock() external view returns(uint) {
        return timeLock;
    }

    function getWithdrawn() external view returns(bool) {
        return withdrawn;
    }

    function getRefunded() external view returns(bool) {
        return refunded;
    }

    function getRawSecret() external view returns(uint[2]) {
        return rawSecret;
    }

    function getTarget() external view returns(address) {
        return target;
    }

    function getBackup() external view returns(address) {
        return backup;
    }

    function getPlatform() external view returns(address) {
        return platform;
    }
}
