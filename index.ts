import { config } from "dotenv";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { deployAccountFactory } from "./lib/provider-utils";
import { createOrRecoverWallet } from "./lib/utils";
import { SmartWallet, SmartWalletConfig } from "./lib/wallet";

config();

const main = async () => {
  try {
    // Local signer
    let localWallet = await createOrRecoverWallet();
    console.log("Local signer addr:", await localWallet.getAddress());

    // AA Config
    const stackup_key = process.env.STACKUP_KEY as string;

    // NOTE: This is the old entrypoint address. The latest one is 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789.
    // But the paymaster does not support the latest version yet.
    // const entryPointAddress = "0x0576a174D229E3cFA37253523E645A78A0C91B57";

    // TODO: deploy or fetch a factory programatically for the given chain.
    // This factory is a `TWAccountFactory` deployed on Goerli.
    const factoryAddress = "0x717ae3154b0AA1b783544E161F4A95B92B11d830";

    // Create the AA provider
    const config: SmartWalletConfig = {
      apiKey: stackup_key,
      chain: "goerli",
      gasless: true,
      factoryAddress,
    };

    const goerliReadOnlySDK = new ThirdwebSDK("goerli");
    const factoryContract = await goerliReadOnlySDK.getContract(factoryAddress);
    const accounts = await factoryContract.events.getEvents("AccountCreated", {
      filters: {
        accountAdmin: localWallet.address,
      },
    });
    console.log(
      `Found ${accounts.length} accounts for local signer`,
      accounts.map((a) => a.data.account)
    );

    const smartWallet = SmartWallet.fromLocalWallet(
      config,
      localWallet,
      "my_username6"
    );

    // now use the SDK normally
    const sdk = await ThirdwebSDK.fromWallet(smartWallet, "goerli");

    console.log("Smart Account addr:", await sdk.wallet.getAddress());
    console.log("balance:", (await sdk.wallet.balance()).displayValue);

    console.time("contract");
    const contract = await sdk.getContract(
      "0xc54414e0E2DBE7E9565B75EFdC495c7eD12D3823"
    );
    console.timeEnd("contract");

    const tokenBalance = await contract.erc20.balance();
    console.log("token balance:", tokenBalance.displayValue);
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
