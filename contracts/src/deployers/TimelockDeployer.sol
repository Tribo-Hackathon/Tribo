// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";

contract TimelockDeployer {
    function deploy(
        uint256 minDelay,
        address proposer,
        address admin
    ) external returns (TimelockController tl) {
        address[] memory proposers = new address[](1);
        proposers[0] = proposer;
        address[] memory executors = new address[](1);
        executors[0] = address(0);
        tl = new TimelockController(minDelay, proposers, executors, admin);
    }
}

