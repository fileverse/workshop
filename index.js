const dotenv = require("dotenv");

dotenv.config();

const abi = require("./abi.json");

const {
  ENTRYPOINT_ADDRESS_V07,
  createSmartAccountClient,
} = require("permissionless");

const { signerToSafeSmartAccount } = require("permissionless/accounts");
const {
  createPimlicoBundlerClient,
  createPimlicoPaymasterClient,
} = require("permissionless/clients/pimlico");
const { createPublicClient, encodeFunctionData, http } = require("viem");
const { toBytes, toHex } = require("viem");
const { sepolia } = require("viem/chains");
const { privateKeyToAccount, generatePrivateKey } = require("viem/accounts");

const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

const publicClient = createPublicClient({
	transport: http("https://rpc.ankr.com/eth_sepolia"),
})
 
const paymasterClient = createPimlicoPaymasterClient({
  transport: http(
    `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`
  ),
  entryPoint: ENTRYPOINT_ADDRESS_V07,
});

const pimlicoBundlerClient = createPimlicoBundlerClient({
  transport: http(
    `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`
  ),
  entryPoint: ENTRYPOINT_ADDRESS_V07,
});

const signer = privateKeyToAccount(PRIVATE_KEY);

async function getCallData({ metadataIPFSHash, contentIPFSHash, fileType, safeAccount }) {
  const callData = await safeAccount.encodeCallData({
    to: CONTRACT_ADDRESS,
    data: encodeFunctionData({
      abi: abi,
      functionName: "addFile",
      args: [metadataIPFSHash, contentIPFSHash, , fileType, 0],
    }),
    value: BigInt(0),
  });
  return callData;
}

(async () => {
  const safeAccount = await signerToSafeSmartAccount(publicClient, {
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    signer: signer,
    saltNonce: 0n, // optional
    safeVersion: "1.4.1",
  });

  console.log(safeAccount.address); // Safe address

  const smartAccountClient = createSmartAccountClient({
    account: safeAccount,
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    chain: sepolia,
    bundlerTransport: http(
      `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`
    ),
    middleware: {
      sponsorUserOperation: paymasterClient.sponsorUserOperation, // optional
      gasPrice: async () =>
        (await pimlicoBundlerClient.getUserOperationGasPrice()).fast, // if using pimlico bundler
    },
  });

  const callData = await getCallData({
    safeAccount,
    metadataIPFSHash: "QmSgUe8eYtxyEHwRqCZ9R4A24hJFBJeGd7133PRNzSzdgn",
    contentIPFSHash: "QmYau5W331pkHb91KM7Wi91XTniDrqdYpCc3NHwGeWB2JU",
    fileType: 0,
  });

  const gasPrices = await pimlicoBundlerClient.getUserOperationGasPrice()

  const userOperation = await smartAccountClient.prepareUserOperationRequest({
      userOperation: {
        callData, // callData is the only required field in the partial user operation
        nonce: toHex(toBytes(generatePrivateKey()).slice(0, 24), { size: 32 }),
        maxFeePerGas: gasPrices.fast.maxFeePerGas,
        maxPriorityFeePerGas: gasPrices.fast.maxPriorityFeePerGas,
      },
      account: safeAccount,
    });
  userOperation.signature = await safeAccount.signUserOperation(
    userOperation
  );
  const txnHash = await smartAccountClient.sendUserOperation({ userOperation });
  console.log(txnHash);
})()
  .then(console.log)
  .catch(console.error);
