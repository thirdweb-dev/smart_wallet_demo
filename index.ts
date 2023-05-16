import { config } from "dotenv";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import {
  getAllSmartWallets,
  isSmartWalletDeployed,
  SmartWallet,
  SmartWalletConfig,
} from "@thirdweb-dev/wallets";
import { LocalWalletNode } from "@thirdweb-dev/wallets/evm/wallets/local-wallet-node";
import {
  BaseGoerli,
  Goerli,
  Mumbai,
  OptimismGoerli,
  ScrollAlphaTestnet,
  Sepolia,
} from "@thirdweb-dev/chains";
import {
  batchTransaction,
  claimERC721Token,
  claimMumbaiNFT,
  claimSepoliaNFT,
  claimToken,
  playCatAttack,
} from "./sdk-calls";

config();

// Put your chain here
const chain = Mumbai;
// Put your thirdweb API key here (or in .env)
const thirdwebApiKey = process.env.THIRDWEB_API_KEY as string;

// Factory addresses for each chain
const factories = {
  [Goerli.chainId]: "0xd559b9e1d3214179b8D5d177beCBd4eEB827Db6f",
  [BaseGoerli.chainId]: "0x88d9A32D459BBc7B77fc912d9048926dEd78986B",
  [OptimismGoerli.chainId]: "0x54ec360704b2e9E4e6499a732b78094D6d78e37B",
  [ScrollAlphaTestnet.chainId]: "0x2eaDAa60dBB74Ead3E20b23E4C5A0Dd789932846",
  [Mumbai.chainId]: "0x272A90FF4403473d766127A3CCB7ff1d9E7d45A2",
  [Sepolia.chainId]: "0x9D4409c65AC036860F5CAAF34D5b69ae324A7075",
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
      strategy: "mnemonic",
      encryption: false,
    });
    const personalWalletAddress = await localWallet.getAddress();
    console.log("Local signer addr:", personalWalletAddress);

    // Create the AA provider
    const config: SmartWalletConfig = {
      chain,
      gasless: true,
      factoryAddress,
      thirdwebApiKey,
    };

    const accounts = await getAllSmartWallets(
      chain,
      factoryAddress,
      personalWalletAddress
    );
    console.log(`Found accounts for local signer`, accounts);

    const isWalletDeployed = await isSmartWalletDeployed(
      chain,
      factoryAddress,
      personalWalletAddress
    );
    console.log(`Is smart wallet deployed?`, isWalletDeployed);

    // connect the smart wallet
    const smartWallet = new SmartWallet(config);
    await smartWallet.connect({
      personalWallet: localWallet,
    });

    // now use the SDK normally
    const sdk = await ThirdwebSDK.fromWallet(smartWallet, chain);
    console.log("Smart Account addr:", await sdk.wallet.getAddress());
    console.log("balance:", (await sdk.wallet.balance()).displayValue);

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
    }
  } catch (e) {
    console.error("Something went wrong: ", await e);
  }
};

main();
