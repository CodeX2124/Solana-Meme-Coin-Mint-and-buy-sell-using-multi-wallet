import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction, VersionedTransaction, clusterApiUrl } from '@solana/web3.js'
import { BundlingWallet, MainWallet, MainbundleWallet } from './database/models'
import bs58 from 'bs58';
import { registerMainWallet, updateMainWallet, registerMainBundleWallet, updateMainBundleWallet} from './database/db';

const createMainWallets = async (ctx) => {
    let publickeys: string[] = [];
    let secretkeys: string[] = [];
    const id = ctx.from.id.toString();
    const wallet = await BundlingWallet.findOne({ telegramId:id });
    if (wallet) {
        if(wallet.walletCount){
            for(let i=0; i<wallet.walletCount; i++)
                {
    
                    // Generate a new keypair (wallet)
                    const keypair = Keypair.generate();
                    publickeys.push(keypair.publicKey.toString())
                    secretkeys.push(bs58.encode(keypair.secretKey))                    
                }
            registerMainWallet(id, publickeys, secretkeys);
            updateMainWallet(id, publickeys, secretkeys);
            console.log("Public Key:", publickeys);
            console.log("Private Key:", secretkeys);
        } 
    } else {
        console.log('No wallet found with that telegramId.');
    }

}

const createMainbundleWallet = async (ctx) => {
    const id = ctx.from.id.toString();
    // Generate a new keypair (wallet)
    const keypair = Keypair.generate();
    const mainBundlepublicKey = keypair.publicKey.toString();
    const mainBundlesecretKey = bs58.encode(keypair.secretKey);
    registerMainBundleWallet(id, mainBundlepublicKey, mainBundlesecretKey);
    updateMainBundleWallet(id, mainBundlepublicKey, mainBundlesecretKey);
    console.log("mainbundle Public Key:", mainBundlepublicKey);
    console.log("mainbundle Private Key:", mainBundlesecretKey);
}

export {
    createMainWallets,
    createMainbundleWallet
};