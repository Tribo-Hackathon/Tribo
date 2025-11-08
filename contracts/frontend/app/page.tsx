"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CustomConnectButton } from "@/components/ui/custom-connect-button";
import { useAccount } from "wagmi";
import { Users, Vote, Coins, Zap, ArrowRight, CheckCircle } from "lucide-react";
import { DiscordIcon } from "@/components/icons/discord-icon";

const features = [
  {
    icon: Users,
    title: "Create Community",
    description:
      "Set up your community in seconds with automated Discord server",
  },
  {
    icon: Coins,
    title: "NFT Access",
    description: "Launch NFTs that grant exclusive access to your community",
  },
  {
    icon: Vote,
    title: "Internal DAO",
    description:
      "Members vote, share opinions and decide the community's future",
  },
  {
    icon: DiscordIcon,
    title: "Automated Discord",
    description:
      "Complete integration with channels and bots configured automatically",
  },
];

const benefits = [
  "Shared decision making",
  "Continuous community feedback",
  "Greater sense of belonging",
  "Lower member churn",
  "New monetization opportunities",
];

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
            The new way to create,{" "}
            <span className="text-purple-600">scale</span> and{" "}
            <span className="text-purple-600">engage</span> creator communities
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            With NFTs, DAOs and automated Discord. Transform passive members
            into active co-pilots of your project.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {isConnected ? (
            <Link href="/create">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Create Community
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <CustomConnectButton />
              <span className="text-sm text-gray-500">
                Connect your wallet to get started
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Problem Section */}
      <section className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold text-gray-900">
            The Creator&apos;s Problem
          </h2>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                They get audience...
              </h3>
              <p className="text-gray-600">
                Discord and Telegram get filled with people, but empty of real
                participation.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">
                ...but not engagement
              </h3>
              <p className="text-gray-600">
                Members have no purpose, no voice and don&apos;t feel like they
                belong to something bigger.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">Our Solution</h2>
          <p className="text-xl text-gray-600">
            A complete platform to create engaged communities
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Icon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-gray-50 rounded-2xl p-8 md:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-bold text-center text-gray-900">
            How It Works
          </h2>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  Connect Wallet
                </h3>
                <p className="text-gray-600">
                  Creator connects their Web3 wallet
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  Automatic Creation
                </h3>
                <p className="text-gray-600">
                  Discord server, thematic channels, integrated bot and DAO
                  dashboard are created automatically
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  Launch NFT
                </h3>
                <p className="text-gray-600">
                  Create access NFTs that guarantee community entry and voting
                  power
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  Active Governance
                </h3>
                <p className="text-gray-600">
                  Members participate by choosing topics, deciding content and
                  voting on events
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="text-center space-y-8">
        <h2 className="text-3xl font-bold text-gray-900">Why This Matters</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Communities die when they&apos;re passive. We transform members into
          co-pilots of the creator.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 bg-white p-4 rounded-lg shadow-sm"
            >
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">{benefit}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-purple-600 text-white rounded-2xl p-8 md:p-12 text-center space-y-6">
        <h2 className="text-3xl font-bold">
          Ready to revolutionize your community?
        </h2>
        <p className="text-xl opacity-90">
          Start now and watch your members become true partners
        </p>

        {isConnected ? (
          <Link href="/create">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              Create My Community
              <Zap className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <div className="flex justify-center">
            <CustomConnectButton />
          </div>
        )}
      </section>
    </div>
  );
}
