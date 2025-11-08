// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {CommunityGovernor} from "../CommunityGovernor.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

contract GovernorDeployer {
    function deploy(
        IVotes token,
        uint48 votingDelay,
        uint32 votingPeriod,
        uint256 proposalThreshold,
        uint256 quorumNumerator
    ) external returns (CommunityGovernor gov) {
        gov = new CommunityGovernor(token, votingDelay, votingPeriod, proposalThreshold, quorumNumerator);
    }
}

