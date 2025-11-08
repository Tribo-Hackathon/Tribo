// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {CommunityFactory} from "./CommunityFactory.sol";
import {CommunityRegistry} from "./CommunityRegistry.sol";

/// @title CommunityDeployer
/// @notice Convenience contract to deploy Factory + Registry and create a community in one call
/// This is optional when using Foundry scripts, but can be handy for on-chain meta-deployments.
contract CommunityDeployer {
    event Deployed(
        address registry,
        address factory,
        uint256 communityId,
        address nft,
        address governor,
        address timelock
    );

    /// @dev Deploys a new CommunityFactory (with no registry), creates a new Registry via the factory,
    /// and then deploys a community via `createCommunity` using the provided config.
    /// @param initialOwner Owner/admin for the created registry and factory
    /// @param cfg DeploymentConfig passed to the factory
    function deployAll(address initialOwner, CommunityFactory.DeploymentConfig calldata cfg)
        external
        returns (
            CommunityRegistry registry,
            CommunityFactory factory,
            uint256 communityId,
            address nft,
            address governor,
            address timelock
        )
    {
        factory = new CommunityFactory(initialOwner, CommunityRegistry(address(0)));
        registry = factory.createRegistryIfNone();

        (communityId, nft, governor, timelock) = factory.createCommunity(cfg);

        emit Deployed(address(registry), address(factory), communityId, nft, governor, timelock);
    }
}

