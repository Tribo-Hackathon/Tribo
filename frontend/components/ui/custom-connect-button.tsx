"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { ChevronDown, Wallet } from "lucide-react";
import Image from "next/image";

export function CustomConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Ensure the component is mounted before rendering
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button
                    onClick={openConnectModal}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    size="default"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    variant="destructive"
                    size="default"
                  >
                    Wrong network
                  </Button>
                );
              }

              return (
                <div className="flex gap-2">
                  {/* Chain button (optional - can be hidden) */}
                  {chain.hasIcon && (
                    <Button
                      onClick={openChainModal}
                      variant="outline"
                      size="default"
                      className="px-3"
                    >
                      {chain.iconUrl && (
                        <Image
                          alt={chain.name ?? "Chain icon"}
                          src={chain.iconUrl}
                          width={16}
                          height={16}
                          className="w-4 h-4"
                        />
                      )}
                    </Button>
                  )}

                  {/* Account button */}
                  <Button
                    onClick={openAccountModal}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    size="default"
                  >
                    <div className="flex items-center gap-2">
                      {/* Avatar */}
                      <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs">
                        {account.ensAvatar ? (
                          <Image
                            alt={account.ensName ?? account.address}
                            src={account.ensAvatar}
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-purple-600" />
                        )}
                      </div>

                      {/* Address/ENS name */}
                      <span className="font-medium">{account.displayName}</span>

                      {/* Balance (optional) */}
                      {account.displayBalance && (
                        <span className="text-purple-100 text-sm hidden sm:inline">
                          {account.displayBalance}
                        </span>
                      )}

                      {/* Dropdown arrow */}
                      <ChevronDown className="w-4 h-4 text-purple-200" />
                    </div>
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
