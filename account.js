const dotenv = require("dotenv");

dotenv.config();

const {
  ENTRYPOINT_ADDRESS_V07,
} = require("permissionless");

const { signerToSafeSmartAccount } = require("permissionless/accounts");
const { createPublicClient, http } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

const PRIVATE_KEY = process.env.PRIVATE_KEY;

const publicClient = createPublicClient({
	transport: http("https://rpc.ankr.com/eth_sepolia"),
});

const signer = privateKeyToAccount(PRIVATE_KEY);

(async () => {
  const safeAccount = await signerToSafeSmartAccount(publicClient, {
    entryPoint: ENTRYPOINT_ADDRESS_V07,
    signer: signer,
    saltNonce: 0n, // optional
    safeVersion: "1.4.1",
  });

  console.log("Add this address to your portals: ", safeAccount.address); // Safe address
})()
  .then(console.log)
  .catch(console.error);
