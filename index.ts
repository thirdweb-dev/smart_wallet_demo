import { config } from "dotenv";
import { CommonSymbolSchema, ThirdwebSDK } from "@thirdweb-dev/sdk";
import { SmartWallet, SmartWalletConfig } from "@thirdweb-dev/wallets";
import { LocalWalletNode } from "@thirdweb-dev/wallets/evm/wallets/local-wallet-node";
import {
  BaseGoerli,
  CeloAlfajoresTestnet,
  Goerli,
  Mumbai,
  OptimismGoerli,
  ScrollAlphaTestnet,
  Sepolia,
} from "@thirdweb-dev/chains";
import {
  batchTransaction,
  claimCeloToken,
  claimERC721Token,
  claimMumbaiNFT,
  claimSepoliaNFT,
  claimToken,
  playCatAttack,
} from "./sdk-calls";

config();

// Put your chain here
const chain = Goerli;
// Put your thirdweb secret key here (or in .env)
const secretKey = process.env.THIRDWEB_API_KEY as string;

// Factory addresses for each chain
const factories = {
  [Goerli.chainId]: "0xd559b9e1d3214179b8D5d177beCBd4eEB827Db6f",
  [BaseGoerli.chainId]: "0x88d9A32D459BBc7B77fc912d9048926dEd78986B",
  [OptimismGoerli.chainId]: "0x54ec360704b2e9E4e6499a732b78094D6d78e37B",
  [ScrollAlphaTestnet.chainId]: "0x2eaDAa60dBB74Ead3E20b23E4C5A0Dd789932846",
  [Mumbai.chainId]: "0x272A90FF4403473d766127A3CCB7ff1d9E7d45A2",
  [Sepolia.chainId]: "0x295E69d392fcED5dc22d4767D86351CF2862145b",
  [CeloAlfajoresTestnet.chainId]: "0xE646849d679602F2588CA8eEDf0b261B1aB085AF",
};

const main = async () => {
  try {
    const factoryAddress = factories[chain.chainId];
    console.log("Running on", chain.slug, "with factory", factoryAddress);
    // Local signer
    let localWallet = new LocalWalletNode({
      chain,
    });
    await localWallet.loadOrCreate({
      strategy: "privateKey",
      encryption: false,
    });
    const personalWalletAddress = await localWallet.getAddress();
    console.log("Local signer addr:", personalWalletAddress);

    // Create the AA provider
    const config: SmartWalletConfig = {
      chain,
      gasless: true,
      factoryAddress,
      secretKey: secretKey,
      bundlerUrl: `https://${chain.slug}.bundler-staging.thirdweb.com`,
      paymasterUrl: `https://${chain.slug}.bundler-staging.thirdweb.com`,
    };

    // connect the smart wallet
    const smartWallet = new SmartWallet(config);
    await smartWallet.connect({
      personalWallet: localWallet,
    });

    const isWalletDeployed = await smartWallet.isDeployed();
    console.log(`Is smart wallet deployed?`, isWalletDeployed);

    // now use the SDK normally
    const sdk = await ThirdwebSDK.fromWallet(smartWallet, chain);
    const smartWalletAddress = await sdk.wallet.getAddress();
    console.log("Smart Account addr:", smartWalletAddress);
    console.log("native balance:", (await sdk.wallet.balance()).displayValue);

    console.log("Executing contract call via SDK...");
    switch (chain.chainId as number) {
      case Goerli.chainId:
        await claimToken(sdk);
        await batchTransaction(smartWallet, sdk);
        break;
      case OptimismGoerli.chainId:
        await claimERC721Token(sdk);
        break;
      case BaseGoerli.chainId:
        await playCatAttack(sdk, personalWalletAddress);
        break;
      case Mumbai.chainId:
        await claimMumbaiNFT(sdk);
        break;
      case Sepolia.chainId:
        await claimSepoliaNFT(sdk);
        break;
      case CeloAlfajoresTestnet.chainId:
        await claimCeloToken(sdk);
        break;
    }
  } catch (e) {
    console.error("Something went wrong: ", await e);
  }
};

main();
