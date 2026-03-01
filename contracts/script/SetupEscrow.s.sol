// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {FundToken} from "../src/FundToken.sol";
import {Escrow} from "../src/Escrow.sol";

contract SetupEscrow is Script {
    address constant TOKEN   = 0xE26212119267aA5b29576e4042aC1bdc65Aff6cD;
    address constant ESCROW  = 0xd1a9CBC265aD9c7812a1a4D25c2356B733b5e379;

    function run() external {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");

        vm.startBroadcast();

        FundToken token = FundToken(TOKEN);
        Escrow escrow = Escrow(ESCROW);

        token.approve(ESCROW, 1 ether);
        console.log("Approved token spend");

        escrow.createEscrow(deployer, 1 ether);
        uint256 escrowId = escrow.escrowCounter();
        console.log("Escrow created with ID:", escrowId);

        escrow.submitProof(escrowId, "ipfs://valid-proof");
        console.log("Proof submitted for escrow:", escrowId);
        console.log("Now run the simulator with this escrow ID:", escrowId);

        vm.stopBroadcast();
    }
}