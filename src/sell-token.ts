import { Keypair, PublicKey, Commitment } from '@solana/web3.js';
import { MainbundleWallet, MainWallet, Mintwallet } from './database/models'
import bs58 from 'bs58';
import {connection} from './constants'
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { VersionedTransaction } from '@solana/web3.js';
import {PumpFunSDK} from './pumpfun'
import { AnchorProvider } from '@coral-xyz/anchor';

export const DEFAULT_COMMITMENT: Commitment = "finalized";
const sellToken = async (ctx, rate) => {
    const id = ctx.from.id.toString()
    const mintwallet = await Mintwallet.findOne({telegramId: id});
    if(mintwallet && mintwallet.mintsecretkey){
        const mintKeypair = Keypair.fromSecretKey(bs58.decode(mintwallet.mintsecretkey))
        const bundlewallets = await MainWallet.findOne({telegramId: id})
        if(bundlewallets && bundlewallets.publickey){
            for(let i=0; i<= bundlewallets.publickey.length; i++){
                const associatedTokenAddress = await getAssociatedTokenAddress(mintKeypair.publicKey, new PublicKey(bundlewallets.publickey[i]))
                const amount = await (await getAccount(connection, associatedTokenAddress)).amount
                if(amount>0){
                    console.log("Coin Balance", amount);
                    let sellTransactions: VersionedTransaction[] = [];
                    
                    let sdk = new PumpFunSDK();
                    const globalAccount = await sdk.getGlobalAccount(DEFAULT_COMMITMENT);
                    const sellTx = await sdk.getSellInstructions(
                        new PublicKey(bundlewallets.publickey[i]),
                        mintKeypair.publicKey,
                        globalAccount.feeRecipient,
                        BigInt(amount),
                        BigInt(500) //minSolOutput
                    )                  
                }
                else{
                    ctx.reply("There is no coins, Please check")
                }
            }
        }
    }
}

export {
    sellToken
}