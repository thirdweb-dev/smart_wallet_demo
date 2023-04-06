import { config } from "dotenv";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { deploySimpleAccountFactory } from "./lib/provider-utils";
import { createOrRecoverWallet } from "./lib/utils";
import { SmartWallet, SmartWalletConfig } from "./lib/wallet";

config();

const main = async () => {
  try {
    // Local signer
    let localWallet = await createOrRecoverWallet();

    // AA Config
    const stackup_key = process.env.STACKUP_KEY as string;
    const entryPointAddress = "0x0576a174D229E3cFA37253523E645A78A0C91B57";

    // deploy the account factory if not there already
    // TODO where does this fit in the flow?
    const factoryAddress = await deploySimpleAccountFactory(
      "goerli",
      entryPointAddress
    );

    // Create the AA provider
    const config: SmartWalletConfig = {
      apiKey: stackup_key,
      chain: "goerli",
      gasless: true,
      factoryAddress,
    };
    const smartWallet = SmartWallet.fromLocalWallet(config, localWallet);

    // now use the SDK normally
    const sdk = await ThirdwebSDK.fromWallet(smartWallet, "goerli");

    console.log("signer addr", await localWallet.getAddress());
    console.log("smart wallet addr", await sdk.wallet.getAddress());
    console.log("balance", (await sdk.wallet.balance()).displayValue);

    console.time("contract");
    const contract = await sdk.getContract(
      "0xc54414e0E2DBE7E9565B75EFdC495c7eD12D3823"
    );
    console.timeEnd("contract");

    const tokenBalance = await contract.erc20.balance();
    console.log("token balance", tokenBalance.displayValue);
    console.time("claim");
    console.time("prepare");
    const tx = await contract.erc20.claim.prepare(1);
    console.timeEnd("prepare");
    console.time("send");
    const t = await tx.send();
    console.timeEnd("send");
    console.log("op sent", t.hash);
    console.time("wait for confirmation");
    const receipt = await t.wait();
    console.timeEnd("wait for confirmation");
    console.timeEnd("claim");
    console.log("claimed", receipt.transactionHash);

    // NOTES:
    // cost ~0.01 eth to create the account
    // first tx threw a timeout when creating account + doing the tx
    // erc721 claim didnt work because SimpleAccount doesnt implement ERC721Receiver
    // erc20 claim timed out the first time but actually went through, second one worked as expected
    // adds latency to the already slow goerli tx

    console.log("Done!");
  } catch (e) {
    console.error("Something went wrong: ", await e);
  }
};

main();
