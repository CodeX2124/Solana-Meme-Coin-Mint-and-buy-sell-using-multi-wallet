import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction, VersionedTransaction, clusterApiUrl } from '@solana/web3.js'
import bs58 from 'bs58'

import { PinataSDK } from 'pinata-web3'
import dotenv from "dotenv";
import { resolve } from 'path';
import { AnchorProvider } from '@coral-xyz/anchor';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { PumpFunSDK, DEFAULT_DECIMALS } from './pumpfun'
import {
	getOrCreateKeypair,
	getSPLBalance,
	printSOLBalance,
	printSPLBalance,
} from "./util";
dotenv.config();
import {connection} from './constants'
import { registerMintWallet, updateMintWallet } from './database/db';
// const IPFS_URL = process.env.IPFS_URL
// const PINATA_API_JWT = process.env.PINATA_API_JWT
const SLIPPAGE_BASIS_POINTS = BigInt(100);

// const pinata = new PinataSDK({
// 	pinataJwt: PINATA_API_JWT,
// 	pinataGateway: "silver-cheap-cephalopod-886.mypinata.cloud",
// });

const createToken = async (
	id: string,
	secretKey: string,
	coinname: string,
	symbol: string,
	amount: number,
	description: string,
	uri: string,
) => {
	

	const signerKeyPair = Keypair.fromSecretKey(
		bs58.decode(secretKey)
	); //Payer

	let wallet = new NodeWallet(signerKeyPair); //note this is not used
	const provider = new AnchorProvider(connection, wallet, {
		commitment: "finalized",
	});

	const mintKeypair = Keypair.generate();
	registerMintWallet(id, "", "")
	updateMintWallet(id, mintKeypair.publicKey.toString(), mintKeypair.secretKey.toString())
	await printSOLBalance(
		connection,
		signerKeyPair.publicKey,
		"Mint Account keypair"
	);

	let sdk = new PumpFunSDK(provider);

	let globalAccount = await sdk.getGlobalAccount();
	console.log(globalAccount);

	let currentSolBalance = await connection.getBalance(signerKeyPair.publicKey);
	console.log("currentSolBalance", currentSolBalance)
	// if (amount > 0) {
	// if (currentSolBalance < 20000000 + LAMPORTS_PER_SOL * amount) {
	// if (currentSolBalance < 20000000 + LAMPORTS_PER_SOL * 0.01) {
		if (currentSolBalance < 20000000 + 1e9 * 0.001) {
		console.log(
			"Please send some SOL to the your account:",
			signerKeyPair.publicKey.toBase58()
		);
		// return { success: false, message: `Please send some ${(20000000 + LAMPORTS_PER_SOL * amount) / LAMPORTS_PER_SOL} SOL to the your account(private key)` };
		return { success: false, message: `Please send some ${(20000000 + 1e9 * amount) / 1e9} SOL to the your account(private key)` };
	}
	// }
	// if (currentSolBalance == 0) {
	// 	console.log(
	// 		"Please send some SOL to your wallet:",
	// 		signerKeyPair.publicKey.toBase58()
	// 	);
	// 	return { success: false, message: "Please send some SOL to the your account(private key)" };

	// }
	console.log("Mint public key:", mintKeypair.publicKey.toBase58());
	console.log(await sdk.getGlobalAccount());

	let boundingCurveAccount = await sdk.getBondingCurveAccount(mintKeypair.publicKey);

	if (!boundingCurveAccount) {
		// let tokenMetadata = {
		// 	name: coinname,
		// 	symbol: symbol,
		// 	description: description,
		// 	file: uri
		// };
		let tokenMetadata = {
			name: "Dragon",
			symbol: "Coin",
			description: "Dragon Meme Coin",
			file: "https://ik.imagekit.io/MemeCoin/6696765084_uppc3VGGQ.jpg"
		};
		console.log('tokenMetadata', tokenMetadata)
		console.log('amount', amount)
		let createResults = await sdk.createAndBuy(
			signerKeyPair,
			mintKeypair,
			tokenMetadata,
			// BigInt(amount * LAMPORTS_PER_SOL),
			// BigInt(0.001 * LAMPORTS_PER_SOL),
			BigInt(0.001 * 1e9),
			SLIPPAGE_BASIS_POINTS,
			{
				unitLimit: 250000,
				unitPrice: 250000,
			},
		);

		if (createResults.success) {
			console.log("Success:", `https://pump.fun/${mintKeypair.publicKey.toBase58()}`);
			console.log("Success:", `${createResults.signature}`);
			console.log(' mintKeypair.publicKey', mintKeypair.publicKey)
			console.log('signerKeyPair.publicKey', signerKeyPair.publicKey)
			await new Promise(resolve => setTimeout(resolve, 5000))
			const balance = await getSPLBalance(connection, mintKeypair.publicKey, signerKeyPair.publicKey);
			console.log('balance', balance)
			boundingCurveAccount = await sdk.getBondingCurveAccount(mintKeypair.publicKey);
			console.log("Bonding curve after create and buy", boundingCurveAccount);
			if (amount > 0) {
				return { success: true, message: `https://pump.fun/${mintKeypair.publicKey.toBase58()}\nYour token balance is ${balance ?? 0}${symbol}` }
			}
			else {
				return { success: true, message: `${createResults.signature}\nYour token balance is ${balance ?? 0}\u0020 ${symbol}` }
			}
		}
		return { success: false, message: null }
	} else {
		console.log("boundingCurveAccount", boundingCurveAccount);
		console.log("Success:", `https://pump.fun/${mintKeypair.publicKey.toBase58()}`);
		printSPLBalance(connection, mintKeypair.publicKey, signerKeyPair.publicKey);
		return { success: false, message: null }
	}

	// const metadataURI = {
	// 	"name": coinname,
	// 	"symbol": symbol,
	// 	"description": description,
	// 	"image": uri
	// }

	// console.log("metadataURI", metadataURI);

	// const jsonFileName = `tokenData${id}.json`;
	// const blob = new Blob([Buffer.from(JSON.stringify(metadataURI, null, 2))], { type: "application/json" });
	// const file = new File([blob], jsonFileName, { type: "text/json" });
	// const upload = await pinata.upload.file(file)
	// const metadata = upload.IpfsHash;
	// console.log('metadata', metadata)
	// console.log('amount', amount)
	// try {
	// 	const response = await fetch("https://pumpportal.fun/api/trade-local", {
	// 		method: "POST",
	// 		headers: {
	// 			"Content-Type": "application/json",
	// 		},
	// 		body: JSON.stringify({
	// 			publicKey: signerKeyPair.publicKey.toBase58(),
	// 			action: "create",
	// 			tokenMetadata: {
	// 				name: coinname,
	// 				symbol: symbol,
	// 				uri: `${IPFS_URL}/${metadata}`,
	// 			},
	// 			mint: mintKeypair.publicKey.toBase58(),
	// 			denominatedInSol: "true",
	// 			amount: amount,
	// 			slippage: 5,
	// 			priorityFee: 0.00005,
	// 			pool: "pump",
	// 		}),
	// 	});
	// 	console.log('`${IPFS_URL}/${metadata}`', `${IPFS_URL}/${metadata}`)
	// 	if (!response.ok) {
	// 		const errorText = await response.text();
	// 		throw new Error(
	// 			`Transaction creation failed: ${response.status} - ${errorText}`
	// 		);
	// 	}
	// 	const data = await response.arrayBuffer();
	// 	console.log('data', data)
	// 	// console.log('data', await response.json())
	// 	const tx = VersionedTransaction.deserialize(new Uint8Array(data));
	// 	tx.sign([mintKeypair, signerKeyPair]);
	// 	let signature;
	// 	let success = false;
	// 	while (success == false) {
	// 		try {
	// 			signature = await connection.sendTransaction(tx);
	// 			success = true;
	// 			await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before retrying

	// 		} catch (error) {
	// 			console.log(error)
	// 			await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before retrying

	// 		}
	// 	}
	// 	console.log('signature', signature)
	// 	console.log('mintKeypair.publicKey.toBase58()', mintKeypair.publicKey.toBase58())

	// 	return { success: true, message: `https://pump.fun/${mintKeypair.publicKey.toBase58()}` }
	// } catch (error) {
	// 	console.log("Error in createTokenWithMetadata:", error);
	// 	console.log(`Token creation failed: ${error.message}`);
	// } finally {
	// 	return { success: false, message: null }
	// }
}


export { createToken }
