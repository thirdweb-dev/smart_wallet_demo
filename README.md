## Usage

Install dependencies:

```bash
npm install # npm
yarn # yarn
```

- Run the project:

```bash
npm run dev # npm
yarn dev # yarn
```

## Configuration

The things to change to switch the type of smart wallets deployed are in `index.ts`:

```ts
const chain = Goerli; // your chain
const factoryAddress = "0x..."; // your own factory address
const accountId = "..."; // a username, email, etc
```

## Contract Requirements:

For the current scripts:

- `AccountFactory` should have a `function createAccount(address owner,uint256 salt)` that deploys a new `Account` contract. [See sample implementation](https://github.com/eth-infinitism/account-abstraction/blob/develop/contracts/samples/SimpleAccountFactory.sol#L28)

- `Account` should extend [BaseAccount](https://github.com/eth-infinitism/account-abstraction/blob/develop/contracts/core/BaseAccount.sol) and have a simple `function execute(address dest, uint256 value, bytes calldata func)` to execute transactions.

This is all changeable, and can easily changed in the script if needed in `lib/account.ts`
