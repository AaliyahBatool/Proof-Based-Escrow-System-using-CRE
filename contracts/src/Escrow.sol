// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FundToken} from "./FundToken.sol";

contract Escrow {
    enum State{
        CREATED,
        LOCKED,
        PROOF_SUBMITTED,
        APPROVED,
        REJECTED,
        RELEASED
    }

    struct EscrowData{
        uint256 id;
        address beneficiary;
        uint256 amount;
        string proofRef;
        State state;
    }

    mapping(uint256 => EscrowData) public escrows;
    uint256 public escrowCounter;

    address public admin;
    address public workflowAddress;
    FundToken public token;

    //events
    event EscrowCreated(uint256 indexed escrowId, address indexed beneficiary, uint256 amount);
    event ProofSubmitted(uint256 escrowId, string proofRef);
    event EscrowApproved(uint256 indexed escrowId);
    event EscrowRejected(uint256 indexed escrowId);
    event FundsReleased(uint256 indexed escrowId);

    //modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyWorkflow() {
        require(msg.sender == workflowAddress, "Not workflow");
        _;
    }

    //constructor
    constructor(address tokenAddress) {
        admin = msg.sender;
        token = FundToken(tokenAddress);
    }

    //admin setter
    function setWorkflowAddress(address _workflow) external onlyAdmin {
        workflowAddress = _workflow;
    }

    //create escrow
    function createEscrow(address beneficiary, uint256 amount) external onlyAdmin {
        require(amount > 0, "Amount must be > 0");
        require(beneficiary != address(0), "Invalid beneficiary");

        escrowCounter++;

        //transfer tokens from admin to this contract
        require(token.transferFrom(msg.sender, address(this), amount),
        "Token transfer failed"
        );

        escrows[escrowCounter] = EscrowData({
            id : escrowCounter,
            beneficiary: beneficiary,
            amount: amount,
            proofRef: "",
            state: State.LOCKED
        });

        emit EscrowCreated(escrowCounter, beneficiary, amount);
    }

    //submit proof
    function submitProof(uint256 escrowId, string calldata proofRef) external {
        EscrowData storage escrow = escrows[escrowId];

        require(msg.sender == escrow.beneficiary, "Not beneficiary");
        require(escrow.state == State.LOCKED, "Invalid state");

        escrow.proofRef = proofRef;
        escrow.state = State.PROOF_SUBMITTED;

        emit ProofSubmitted((escrowId), proofRef);
    }

    //approve
    function approveEscrow(uint256 escrowId) external onlyWorkflow {
        EscrowData storage escrow = escrows[escrowId];

        require(escrow.state == State.PROOF_SUBMITTED, "Invalid state");

        escrow.state = State.APPROVED;

        emit EscrowApproved(escrowId);
    }

    //reject
    function rejectEscrow(uint256 escrowId) external onlyWorkflow {
        EscrowData storage escrow = escrows[escrowId];

        require(escrow.state == State.PROOF_SUBMITTED, "Invalid state");

        escrow.state = State.REJECTED;

        emit EscrowRejected(escrowId);
    }

    //release funds
    function releaseFunds(uint256 escrowId) external {
        EscrowData storage escrow = escrows[escrowId];

        require(msg.sender == escrow.beneficiary, "Not beneficiary");
        require(escrow.state == State.APPROVED, "Not approved");

        escrow.state = State.RELEASED;

        require(
            token.transfer(escrow.beneficiary, escrow.amount),
            "Token tranfer failed"
        );

        emit FundsReleased(escrowId);
    }
}