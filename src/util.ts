import {
  Commitment,
  ComputeBudgetProgram,
  Connection,
  Finality,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SendTransactionError,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  VersionedTransactionResponse,
} from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { PriorityFee, TransactionResult } from "./database/types";
import { getAssociatedTokenAddressSync, getTransferFeeAmount } from "@solana/spl-token";
import fs from 'fs'
import { sha256 } from "js-sha256";
export const DEFAULT_COMMITMENT: Commitment = "finalized";
export const DEFAULT_FINALITY: Finality = "finalized";

export const calculateWithSlippageBuy = (
  amount: bigint,
  basisPoints: bigint
) => {
  return amount + (amount * basisPoints) / BigInt(10000);
};

export const calculateWithSlippageSell = (
  amount: bigint,
  basisPoints: bigint
) => {
  return amount - (amount * basisPoints) / BigInt(10000);
};

export async function sendTx(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  signers: Keypair[],
  priorityFees?: PriorityFee,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<TransactionResult> {
  let newTx = new Transaction();

  if (priorityFees) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: priorityFees.unitLimit,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFees.unitPrice,
    });
    newTx.add(modifyComputeUnits);
    newTx.add(addPriorityFee);
  }

  newTx.add(tx);
  const { blockhash } = await connection.getLatestBlockhash();
  newTx.recentBlockhash = blockhash;
  newTx.feePayer = payer
  console.log("Estimated Fee", await newTx.getEstimatedFee(connection))

  let versionedTx = await buildVersionedTx(connection, payer, newTx, commitment);
  versionedTx.sign(signers);

  try {
    const sig = await connection.sendTransaction(versionedTx, {
      skipPreflight: false,
    });
    console.log("sig:", `https://solscan.io/tx/${sig}`);

    // let txResult = await getTxDetails(connection, sig, commitment, finality);
    // if (!txResult) {
    //   return {
    //     success: false,
    //     error: "Transaction failed",
    //   };
    // }
    return {
      success: true,
      signature: sig,
      // results: txResult,
    };
  } catch (e) {
    if (e instanceof SendTransactionError) {
      let ste = e as SendTransactionError;
      // console.log(await ste?.getLogs(connection));
    } else {
      console.error(e);
    }
    return {
      error: e,
      success: false,
    };
  }
}

export async function buildTx(
  connection: Connection,
  tx: Transaction,
  payer: PublicKey,
  signers: Keypair[],
  priorityFees?: PriorityFee,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<VersionedTransaction> {
  let newTx = new Transaction();

  if (priorityFees) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: priorityFees.unitLimit,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFees.unitPrice,
    });
    newTx.add(modifyComputeUnits);
    newTx.add(addPriorityFee);
  }
  newTx.add(tx);
  let versionedTx = await buildVersionedTx(connection, payer, newTx, commitment);
  versionedTx.sign(signers);
  return versionedTx;
}


export const buildVersionedTx = async (
  connection: Connection,
  payer: PublicKey,
  tx: Transaction,
  commitment: Commitment = DEFAULT_COMMITMENT
): Promise<VersionedTransaction> => {
  const blockHash = (await connection.getLatestBlockhash(commitment))
    .blockhash;

  let messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockHash,
    instructions: tx.instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

export const getTxDetails = async (
  connection: Connection,
  sig: string,
  commitment: Commitment = DEFAULT_COMMITMENT,
  finality: Finality = DEFAULT_FINALITY
): Promise<VersionedTransactionResponse | null> => {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: sig,
    },
    commitment
  );

  return connection.getTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: finality,
  });
};



export function getOrCreateKeypair(dir: string, keyName: string): Keypair {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const authorityKey = dir + "/" + keyName + ".json";
  if (fs.existsSync(authorityKey)) {
    const data: {
      secretKey: string;
      publicKey: string;
    } = JSON.parse(fs.readFileSync(authorityKey, "utf-8"));
    return Keypair.fromSecretKey(bs58.decode(data.secretKey));
  } else {
    const keypair = Keypair.generate();
    keypair.secretKey;
    fs.writeFileSync(
      authorityKey,
      JSON.stringify({
        secretKey: bs58.encode(keypair.secretKey),
        publicKey: keypair.publicKey.toBase58(),
      })
    );
    return keypair;
  }
}

export const printSOLBalance = async (
  connection: Connection,
  pubKey: PublicKey,
  info: string = ""
) => {
  const balance = await connection.getBalance(pubKey);
  console.log(
    `${info ? info + " " : ""}${pubKey.toBase58()}:`,
    // balance / LAMPORTS_PER_SOL,
    balance / 1e9,
    `SOL`
  );
};

export const getSPLBalance = async (
  connection: Connection,
  mintAddress: PublicKey,
  pubKey: PublicKey,
  allowOffCurve: boolean = false
) => {
  try {
    let data = getAssociatedTokenAddressSync(mintAddress, pubKey, allowOffCurve);
    const balance = await connection.getTokenAccountBalance(data, "confirmed");
    return balance.value.uiAmount;
  } catch (e) { }
  return null;
};

export const printSPLBalance = async (
  connection: Connection,
  mintAddress: PublicKey,
  user: PublicKey,
  info: string = ""
) => {
  const balance = await getSPLBalance(connection, mintAddress, user);
  if (balance === null) {
    console.log(
      `${info ? info + " " : ""}${user.toBase58()}:`,
      "No Account Found"
    );
  } else {
    console.log(`${info ? info + " " : ""}${user.toBase58()}:`, balance);
  }
};

export const baseToValue = (base: number, decimals: number): number => {
  return base * Math.pow(10, decimals);
};

export const valueToBase = (value: number, decimals: number): number => {
  return value / Math.pow(10, decimals);
};

//i.e. account:BondingCurve
export function getDiscriminator(name: string) {
  return sha256.digest(name).slice(0, 8);
}