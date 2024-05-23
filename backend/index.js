const dotenv = require("dotenv");

dotenv.config();

const { ENTRYPOINT_ADDRESS_V07, createSmartAccountClient } = require("permissionless");

const { signerToSafeSmartAccount } = require("permissionless/accounts");
const {
	createPimlicoBundlerClient,
	createPimlicoPaymasterClient,
} = require("permissionless/clients/pimlico");
const { createPublicClient, getContract, http, parseEther } = require("viem")
const { sepolia } = require("viem/chains");
const { privateKeyToAccount } = require("viem/accounts");

const PIMLICO_API_KEY = process.env.PIMLICO_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const publicClient = createPublicClient({
	transport: http("https://rpc.ankr.com/eth_sepolia"),
})
 
const paymasterClient = createPimlicoPaymasterClient({
	transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`),
	entryPoint: ENTRYPOINT_ADDRESS_V07,
})
 
const pimlicoBundlerClient = createPimlicoBundlerClient({
	transport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`),
	entryPoint: ENTRYPOINT_ADDRESS_V07,
})

 
const signer = privateKeyToAccount(PRIVATE_KEY);

(async () => {
    const safeAccount = await signerToSafeSmartAccount(publicClient, {
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        signer: signer,
        saltNonce: 0n, // optional
        safeVersion: "1.4.1",
    })
    
    console.log(safeAccount.address); // Safe address
    
    const smartAccountClient = createSmartAccountClient({
        account: safeAccount,
        entryPoint: ENTRYPOINT_ADDRESS_V07,
        chain: sepolia,
        bundlerTransport: http(`https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`),
        middleware: {
            sponsorUserOperation: paymasterClient.sponsorUserOperation, // optional
            gasPrice: async () => (await pimlicoBundlerClient.getUserOperationGasPrice()).fast, // if using pimlico bundler
        },
    });
    const txHash = await smartAccountClient.sendTransaction({
        to: "0xc8c8B0d99dd1E70aDa58F9fcb949D17D38E7C760",
        value: parseEther("0.001"),
    });
    console.log(txHash);
    const data = await pimlicoBundlerClient.waitForUserOperationReceipt({ hash: txHash });
    console.log(data);
})().then(console.log).catch(console.error);
