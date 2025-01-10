import { PublicKey, VersionedTransaction, Keypair } from "@solana/web3.js";
// import { Bundle as JitoBundle } from 'jito-ts/dist/sdk/block-engine/types.js';
import { SearcherClient, searcherClient } from "jito-ts/dist/sdk/block-engine/searcher";
import { isError } from "jito-ts/dist/sdk/block-engine/utils";
import { blockEngineUrl, connection, bundleTxLimit } from "../constants";
import { Bundle } from "jito-ts/dist/sdk/block-engine/types";
import base58 from "bs58";
let responseBundle;

export async function sendBundle(jitoFeeKeypair: Keypair, bundledTxns: VersionedTransaction[]) {
  try {
    const searcher = searcherClient(blockEngineUrl, undefined);
    const bundle = new Bundle([], bundleTxLimit);

    const resp = await connection.getLatestBlockhash("processed");
    const _tipAccount = "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY";
    const tipAccount = new PublicKey(_tipAccount);
    console.log("tipAccount", tipAccount);
    
    bundledTxns.forEach(tx => {
        bundle.addTransactions(tx)
    })
    let maybeBundle = bundle.addTipTx(
      jitoFeeKeypair,
      100000000,
      tipAccount,
      resp.blockhash
    );

    if (isError(maybeBundle)) {
      throw maybeBundle;
    }

    const signatures = (maybeBundle as any).transactions.map(element => {
        return base58.encode(element.signatures[0]);       
    });
    console.log("bundle signatures", signatures)
    const simulateResult = await simulateTxBeforeSendBundle((maybeBundle as any).transactions);
    if (!simulateResult) {
        console.log("bundle trasactions simulate error");
        return { success: false, error: "bundle trasactions simulate error" };
    }

    console.log("bundle transaction simulate success!");
    const search = searcherClient(blockEngineUrl)
    responseBundle = await search.sendBundle(maybeBundle);
    console.log("response bundle", `https://explorer.jito.wtf/bundle/${responseBundle}`);
    const result = await onBundleResultFromConfirmTransaction(signatures);
    return result;   
  } catch (error) {
    const err = error as any;
    console.error("Error sending bundle:", err.message);
    
    if (err?.message?.includes('Bundle Dropped, no connected leader up soon')) {
      console.error("Error sending bundle: Bundle Dropped, no connected leader up soon.");
    } else {
      console.error("An unexpected error occurred:", err.message);
    }
    return { success: false, error: error.message };
  }
}

export const onBundleResult = (c: SearcherClient, id: string): Promise<number> => {
  let first = 0;
  let isResolved = false;

  return new Promise((resolve) => {
    // Set a timeout to reject the promise if no bundle is accepted within 5 seconds
    setTimeout(() => {
        if(!isResolved){
            resolve(first);
            isResolved = true
        }
    }, 30000);

    c.onBundleResult(

      (result) => {

        if (isResolved) return first;
        // clearTimeout(timeout); // Clear the timeout if a bundle is accepted

        const {bundleId, accepted} = result;
        
        if (!isResolved && bundleId.toString() === id.toString()) {

          if (accepted) {
            console.log(
              "bundle accepted, ID:",
              result.bundleId,
              " Slot: ",
              result?.accepted?.slot
            );
            first += 1;
            isResolved = true;
            resolve(first); // Resolve with 'first' when a bundle is accepted
          } else {
            console.log("bundle is Rejected:", result);
            // Do not resolve or reject the promise here
          }

        }
        return;
      },
      (e: Error) => {
        console.error("Error receiving bundle result", e);
        // Do not reject the promise here
        return;
      }
    );
  });
};

const simulateTxBeforeSendBundle = async (transactions) => {
      
  for (const tx of transactions) {
        try{

          const txid = await connection.simulateTransaction(tx, { commitment: 'finalized'});
          console.log("txid", txid);
          if (txid.value.err) {
              console.log("txid err", txid.value.err);
              return false;
          }
        } catch(err){
          console.error("Error simulating transaction:", err);
          return false;
        }
    }
    return true;
}

const onBundleResultFromConfirmTransaction = async (signatures) => {
    for (const signature of signatures) {
        try {
            const txResult = await onSignatureResult(signature);
            console.log("txResult", txResult, signature);
            if (txResult == false) return { success: false, message: "transaction confirmation error" };
        } catch (err) {
            console.log("transaction confirmation error", err);
            return { success: false, message: "transaction confirmation error" };
        }
    }
    return { success: true, signature: signatures};
}

const onSignatureResult = async (signature) => {
    console.log("OnSignature", signature);
    return new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
            console.log("transaction failed", signature);
            reject(false);
        }, 30000);
        connection.onSignature(signature, (updatedTxInfo, context) => {
            console.log("update account info", updatedTxInfo);
            clearTimeout(timeout);
            resolve(true)
        }, 'confirmed');
    });
}