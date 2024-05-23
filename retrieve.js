const dotenv = require("dotenv");

dotenv.config();

const { getContract } = require('viem');
const PortalABI = require('./abi');
const { createPublicClient, http } = require("viem");

const publicClient = createPublicClient({
	transport: http("https://rpc.ankr.com/eth_sepolia"),
})


const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const FILE_ID = process.env.FILE_ID;

const contract = getContract({
  address: CONTRACT_ADDRESS,
  abi: PortalABI,
  client: publicClient,
});

(async () => {
  const fileData = await contract.read.files([FILE_ID]);
  console.log({
    metadataIPFSHash: fileData[0],
    contentIPFSHash: fileData[1],
    gateIPFSHash: fileData[2],
    fileType: fileData[3] === 0 ? 'public' : 'private',
  });
})();
