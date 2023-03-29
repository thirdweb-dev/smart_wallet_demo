import { config } from "dotenv";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { getVerifyingPaymaster } from "./lib/paymaster";
import {
  create4337Provider,
  ProviderConfig,
} from "./lib/provider";

import { createOrRecoverWallet } from "./lib/utils";

// ABIs
import TWAccountFactory from "./artifacts/TWAccountFactory.json";
import TWAccountRouter from "./artifacts/TWAccountRouter.json";

config();

const main = async () => {
  try {
    // Local signer
    let wallet = await createOrRecoverWallet();

    // AA Config
    const stackup_key = process.env.STACKUP_KEY as string;
    const entryPointAddress = "0x0576a174D229E3cFA37253523E645A78A0C91B57";
    const bundlerUrl = `https://node.stackup.sh/v1/rpc/${stackup_key}`;
    const paymasterUrl = `https://app.stackup.sh/api/v2/paymaster/payg/${stackup_key}`;

    // TODO: deploy or fetch a factory programatically for the given chain.
    // This factory is a `TWAccountFactory` deployed on Goerli.
    const factoryAddress = "0x1F648fFdDC74b9f1c273B92F2d0D9F8a3F1c844E"

    // Create the AA provider
    const config: ProviderConfig = {
      chain: "goerli",
      localSigner: wallet,
      entryPointAddress,
      bundlerUrl,
      paymasterAPI: getVerifyingPaymaster(paymasterUrl, entryPointAddress),
      factoryAddress,
      factoryAbi: TWAccountFactory.abi, 
      accountAbi: TWAccountRouter.abi,
    };
    const aaProvider = await create4337Provider(config);

    // now use the SDK normally
    const sdk = ThirdwebSDK.fromSigner(aaProvider.getSigner());

    console.log("signer addr", await wallet.getAddress());
    console.log("smart wallet addr", await sdk.wallet.getAddress());
    console.log("balance", (await sdk.wallet.balance()).displayValue);

    console.time("contract");
    const contract = await sdk.getContract(
      "0xc54414e0E2DBE7E9565B75EFdC495c7eD12D3823"
    );
    console.timeEnd("contract");
    console.time("claim");
    console.time("prepare");
    const tx = await contract.erc20.claim.prepare(1);
    tx.setOverrides({ gasLimit: 600000 });
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
