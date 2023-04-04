import {
  BaseApiParams,
  BaseAccountAPI,
} from "@account-abstraction/sdk/dist/src/BaseAccountAPI";
import { ChainOrRpcUrl, SmartContract, ThirdwebSDK } from "@thirdweb-dev/sdk";
import {
  Signer,
  BigNumberish,
  BigNumber,
  ContractInterface,
  ethers,
} from "ethers";
import { arrayify, hexConcat } from "ethers/lib/utils";

import TWAccountRouter from "../artifacts/TWAccountRouter.json";

export interface AccountApiParams extends Omit<BaseApiParams, "provider"> {
  chain: ChainOrRpcUrl;
  localSigner: Signer;
  factoryAddress: string;
  factoryAbi?: ContractInterface;
  accountAbi?: ContractInterface;
}

export class AccountAPI extends BaseAccountAPI {
  sdk: ThirdwebSDK;
  params: AccountApiParams;
  accountContract?: SmartContract;

  constructor(params: AccountApiParams) {
    const sdk = ThirdwebSDK.fromSigner(params.localSigner, params.chain);
    super({
      ...params,
      provider: sdk.getProvider(),
    });
    this.params = params;
    this.sdk = sdk;
  }

  async getChainId() {
    return await this.provider.getNetwork().then((n) => n.chainId);
  }

  async _getAccountContract(): Promise<SmartContract> {
    if (!this.accountContract) {
      if (this.params.accountAbi) {
        this.accountContract = await this.sdk.getContract(
          await this.getAccountAddress(),
          this.params.accountAbi
        );
      } else {
        this.accountContract = await this.sdk.getContract(
          await this.getAccountAddress()
        );
      }
    }
    return this.accountContract;
  }

  async getAccountInitCode(): Promise<string> {
    let factory;
    if (this.params.factoryAbi) {
      factory = await this.sdk.getContract(
        this.params.factoryAddress,
        this.params.factoryAbi
      );
    } else {
      factory = await this.sdk.getContract(this.params.factoryAddress);
    }
    console.log("AccountAPI - Preparing account tx via factory");
    // TODO here the createAccount expects owner + salt as arguments, but could be different
    // const tx = factory.prepare("createAccount", [
    //   await this.params.localSigner.getAddress(),
    //   0, // salt
    // ]);

    const localSigner = await this.params.localSigner.getAddress();
    const salt = ethers.utils.formatBytes32String(`random-salt`); // TODO this needs to be unique AND 32 bytes...
    const initData = new ethers.utils.Interface(
      TWAccountRouter.abi
    ).encodeFunctionData("initialize", [localSigner, ""]);

    const tx = factory.prepare("createAccount", [salt, initData]);

    try {
      console.log("Cost to create account: ", await tx.estimateGasCost());
    } catch (e) {
      // TODO using the same salt twice reverts
    }

    return hexConcat([factory.getAddress(), tx.encode()]);
  }

  async getNonce(): Promise<BigNumber> {
    if (await this.checkAccountPhantom()) {
      return BigNumber.from(0);
    }
    const accountContract = await this._getAccountContract();
    return await accountContract.call("nonce");
  }

  async encodeExecute(
    target: string,
    value: BigNumberish,
    data: string
  ): Promise<string> {
    const accountContract = await this._getAccountContract();
    // TODO here execute target + value + data as arguments, but could be different depending on the ABI
    return accountContract.prepare("execute", [target, value, data]).encode();
  }

  async signUserOpHash(userOpHash: string): Promise<string> {
    return await this.params.localSigner.signMessage(arrayify(userOpHash));
  }
}
