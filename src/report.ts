import {Connection, clusterApiUrl, Transaction} from '@solana/web3.js'
import {
    getUsers,
    getWallets,
    registerCoinName,
    registerUser,
    updateAmount,
    registerWallet,
    updateWalletCount,
    updateWalletAmount,
    updateCoinName,
    updateDescription,
    updateLogo,
    updateTicker,
    updateUser,
  } from './database/db'
  import { BundlingWallet, MainWallet, MainbundleWallet, MemeCoin } from './database/models'
import { connection } from './constants'



export const getReport = async (id, tokenID, mintAddress) => {

    const walletInfo = await BundlingWallet.findOne({telegramId: id});
    const devWallet = await MemeCoin.findOne({telegramId: id});
    if(walletInfo?.walletCount && walletInfo.walletAmount && devWallet?.amount){       
                        
          try{
            const totalRevenue = walletInfo.walletAmount - 0.02 * walletInfo.walletCount * 2 ;
            const initialInvestment =  devWallet?.amount;
            const netProfit = totalRevenue - initialInvestment;
            let users = getUsers()
            const walletBalance = connection.getBalance(users[id].wallet)
            
          } catch(err){
            console.log("err =>", err);            
          }          
        
      }
}