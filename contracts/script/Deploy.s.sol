// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {FundToken} from "../src/FundToken.sol";
import {Escrow} from "../src/Escrow.sol";

contract DeployScript is Script {
    function run() external {

        vm.startBroadcast();

        //deploy token
        FundToken token = new FundToken("ProgramFund", "PFUND");

        //deploy escrow contract
        Escrow escrow = new Escrow(address(token));

        //mint tokens to admin
        token.mint(msg.sender, 1000 ether);

        //approve escrow contract to pull tokens
        token.approve(address(escrow), 500 ether);

        //create escrow
        address beneficiary = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;  //dummy beneficiary
        escrow.createEscrow(
            beneficiary,
            500 ether
        );

        vm.stopBroadcast();
    }
}