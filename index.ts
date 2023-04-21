import { config } from "dotenv";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import {
  getAssociatedAccounts,
  isAccountIdAvailable,
  SmartWallet,
  SmartWalletConfig,
} from "@thirdweb-dev/wallets";
import { DeviceWalletNode } from "@thirdweb-dev/wallets/evm/wallets/device-walllet-node";
import { Goerli, Mumbai } from "@thirdweb-dev/chains";

config();

const claimNFT = async (sdk: ThirdwebSDK) => {
  const contract = await sdk.getContract(
    "0xD170A53dADb19f62C78AB9982236857B71dbc83A" // mumbai
  );
  console.log("claiming nft");
  const tx = await contract.erc1155.claim(0, 1);
  console.log("claimed nft", tx.receipt.transactionHash);
};

const claimToken = async (sdk: ThirdwebSDK) => {
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
};

const main = async () => {
  try {
    // Local signer
    const chain = Goerli;
    const factoryAddress = "0xe448A5878866dD47F61C6654Ee297631eEb98966"; // v0.6 entrypoint
    const accountId = "username3";

    let localWallet = new DeviceWalletNode({
      chain,
    });
    await localWallet.loadOrCreate({
      strategy: "mnemonic",
      encryption: false,
    });
    console.log("Local signer addr:", await localWallet.getAddress());

    // AA Config
    // const stackup_key = process.env.STACKUP_KEY as string;
    // const pimlico_key = process.env.PIMLICO_KEY as string;
    // const pimlicoUrl = `https://api.pimlico.io/v1/${chain.slug}/rpc?apikey=${pimlico_key}`;

    const stagingUrl = `https://${chain.slug}.bundler-staging.thirdweb.com`;

    // Create the AA provider
    const config: SmartWalletConfig = {
      chain,
      gasless: true,
      factoryAddress,
      thirdwebApiKey: "",
      bundlerUrl: stagingUrl,
      paymasterUrl: stagingUrl,
    };

    const accounts = await getAssociatedAccounts(
      localWallet,
      factoryAddress,
      chain
    );
    console.log(`Found ${accounts.length} accounts for local signer`, accounts);

    const isAccountAvailable = await isAccountIdAvailable(
      accountId,
      factoryAddress,
      chain
    );
    console.log(`Is ${accountId} available?`, isAccountAvailable);

    const smartWallet = new SmartWallet(config);
    await smartWallet.connect({
      personalWallet: localWallet,
      accountId,
    });

    // now use the SDK normally
    const sdk = await ThirdwebSDK.fromWallet(smartWallet, chain);

    console.log("Smart Account addr:", await sdk.wallet.getAddress());
    console.log("balance:", (await sdk.wallet.balance()).displayValue);

    await claimToken(sdk);

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
