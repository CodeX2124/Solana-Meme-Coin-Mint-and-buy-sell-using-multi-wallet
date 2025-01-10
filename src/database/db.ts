import mongoose, { get } from 'mongoose'
import { User, MemeCoin, BundlingWallet, MainWallet, MainbundleWallet, Mintwallet } from './models'
import { UserRecord, CoinRecord, WalletRecord, MainWalletRecord, MainbundleWalletRecord, MintwalletRecord } from './types'
import dotenv from 'dotenv'
import { exit } from 'process'
import { Wallet } from '@coral-xyz/anchor'

dotenv.config()
const DB_URL =
  process.env.DB_URL ||
  ''
// console.log('DB_URL', DB_URL)
let db
if (!DB_URL) {
  console.log("DB URL is required")
  exit(1)
}
const connectDB = async () => {
  try {
    if (db) {
      console.log('Connected to DB!!')
      return db
    }
    db = await mongoose.connect(DB_URL)
    console.log('Connected to DB', DB_URL)
    return db
  } catch (error) {
    console.log('error =>', error)
  }
}

const getUsers = async (): Promise<UserRecord> => {
  const users = await User.find({})

  const userRecord = users.reduce((acc: UserRecord, user) => {
    // console.log("acc=>", acc);
    // console.log("user=>", user);
    acc[user.telegramId.toString()] = {
      telegramUsername: user.telegramUsername,
      wallet: user.wallet,
    }
    return acc
  }, {})
  console.log('userRecord', userRecord)
  return userRecord
}
const getCoins = async (): Promise<CoinRecord> => {
  const coins = await MemeCoin.find({})
  
  const CoinRecords = coins.reduce((coin: CoinRecord, _coin) => {
    // console.log("acc=>", acc);
    // console.log("user=>", user);
    coin[_coin.telegramId.toString()] = {
      telegramId: _coin.telegramId,
      amount: _coin.amount,
      logoType: _coin.logoType,
      name: _coin.name,
      imageKitId: _coin.imageKitId,
      symbol: _coin.symbol,
      uri: _coin.logo,
      objectId: _coin._id.toString(),
      created: _coin.created,
      description: _coin.description
    }
    return coin
  }, {})
  console.log('CoinRecords', CoinRecords)
  return CoinRecords
}
const getWallets = async (): Promise<WalletRecord> => {
  const wallets = await BundlingWallet.find({})  
  const walletRecord = wallets.reduce((Bundlingwallets: WalletRecord, bundlewallet) => {
    // console.log("acc=>", acc);
    if (!Bundlingwallets[bundlewallet.telegramId.toString()]) {
      Bundlingwallets[bundlewallet.telegramId.toString()] = {
        telegramId: bundlewallet.telegramId,
        walletCount: bundlewallet.walletCount,
        walletAmount: bundlewallet.walletAmount
      } 
    }   
    return Bundlingwallets
  }, {})
  console.log('walletRecord', walletRecord)
  return walletRecord
}

const getMainWallet = async (): Promise<MainWalletRecord> => {
  const mainwallets = await MainWallet.find({})
  const mainWalletRecord = mainwallets.reduce((MainWallets: MainWalletRecord, wallet) => {
    if (!MainWallets[wallet.telegramId.toString()]){
      MainWallets[wallet.telegramId.toString()] = {
        telegramId: wallet.telegramId,
        publickey: wallet.publickey,
        secretkey: wallet.secretkey
      }
    }
    return MainWallets
  }, {})
  console.log("mainWalletRecord", mainWalletRecord);  
  return mainWalletRecord 
}

const getMintWallet = async (): Promise<MintwalletRecord> => {
  const mintwallet = await Mintwallet.find({})
  const mintwalletRecord = mintwallet.reduce((MintWallet: MintwalletRecord, wallet) => {
    if (!MintWallet[wallet.telegramId.toString()]){
      MintWallet[wallet.telegramId.toString()] = {
        telegramId: wallet.telegramId,
        mintpublickey: wallet.mintpublickey,
        mintsecretkey: wallet.mintsecretkey
      }
    }
    return MintWallet
  }, {})
  console.log("mintwalletRecord", mintwalletRecord);  
  return mintwalletRecord 
}

const getMainbundleWallet = async (): Promise<MainbundleWalletRecord> => {
  const mainbundlewallets = await MainbundleWallet.find({})
  const mainBundleWalletRecord = mainbundlewallets.reduce((MainBundleWallets: MainbundleWalletRecord, mainwallet) => {
    if (!MainBundleWallets[mainwallet.telegramId.toString()]){
      MainBundleWallets[mainwallet.telegramId.toString()] = {
        telegramId: mainwallet.telegramId,
        bundlepublickey: mainwallet.bundlepublickey,
        bundlesecretkey: mainwallet.bundlesecretkey
      }
    }
    return MainBundleWallets
  }, {})
  console.log("mainBundleWalletRecord", mainBundleWalletRecord);  
  return mainBundleWalletRecord 
}
const registerUser = async (
  id: string,
  wallet: string,
  telegramUsername: string
): Promise<UserRecord> => {
  try {
    const user = await User.findOne({ telegramId: id })
    if (user) {
      user.wallet = wallet
      user.telegramUsername = telegramUsername
      await user.save()
      return await getUsers()
    }
    const newUser = new User({
      telegramId: id,
      telegramUsername: telegramUsername,
      wallet: wallet,
    })

    const savedUser = await newUser.save()
    return await getUsers()
  } catch (error) {
    console.log('error =>', error)
    return await getUsers()
  }
}
const registerCoinName = async (
  telegramId: string,
  coinname: string,
): Promise<CoinRecord> => {
  try {
    const coin = await MemeCoin.findOne({ name: coinname })

    if (coin) {
      return await getCoins()
    }
    const newCoin = await new MemeCoin({
      name: coinname,
      telegramId: telegramId,
    }).save()
    console.log('newCoin', newCoin)
    return await getCoins()
  } catch (error) {
    console.log('error =>', error)
    return await getCoins()
  }
}
const registerWallet = async (
  id: string,
  count: number,
  amount: number
) : Promise<WalletRecord> => {
  try{
    const wallet = await BundlingWallet.findOne({telegramId: id})
    console.log(wallet);
    if (wallet) {
      wallet.walletAmount = amount
      wallet.walletCount = count
      await wallet.save()
      return await getWallets()
    }
    const newWallet = await new BundlingWallet({
      telegramId: id,
      walletAmount: amount,
      walletCount: count
    }).save()
    console.log('newWallet', newWallet);
    
    return await getWallets()
  } catch(error){
    console.log('error ==>', error);
    return await getWallets();
  }
}
const registerMainWallet = async (
  id: string,
  publickey: string[],
  secretkey: string[]
) : Promise<MainWalletRecord> => {
  try {
    const mainWallet = await MainWallet.findOne({telegramId: id})
    if(mainWallet){
      return await getMainWallet()
    }
    const newMainWallet = new MainWallet({
      telegramId: id,
      publickey: publickey,
      secretkey: secretkey
    })
    await newMainWallet.save()
    return await getMainWallet()
  } catch(err){
    console.log('error =>', err)
    return await getMainWallet()
  }
}

const registerMainBundleWallet = async (
  id: string,
  publickey: string,
  secretkey: string
) : Promise<MainbundleWalletRecord> => {
  try {
    const mainbundleWallet = await MainbundleWallet.findOne({telegramId: id})
    if(mainbundleWallet){      
      return await getMainbundleWallet()
    }
    const newMainBundleWallet = new MainbundleWallet({
      telegramId: id,
      bundlepublickey: publickey,
      bundlesecretkey: secretkey
    })
    await newMainBundleWallet.save()
    
    return await getMainbundleWallet()
  } catch(err){
    console.log('error =>', err)
    return await getMainbundleWallet()
  }
}

const registerMintWallet = async (
  id: string,
  mintpublickey: string,
  mintsecretkey: string
) : Promise<MintwalletRecord> => {
  try{
    const wallet = await Mintwallet.findOne({telegramId: id})
    console.log(wallet);
    if (wallet) {
      return await getMintWallet()
    }
    const newWallet = await new BundlingWallet({
      telegramId: id,
      mintpublickey: mintpublickey,
      mintsecretkey: mintsecretkey
    }).save()
        
    return await getMintWallet()
  } catch(error){
    console.log('error ==>', error);
    return await getMintWallet();
  }
}
const updateUser = async (
  id: string,
  wallet: string,
  telegramUsername: string
): Promise<UserRecord> => {
  try {
    await User.findOneAndUpdate(
      { telegramId: id },
      {
        wallet: wallet,
        telegramUsername: telegramUsername,
      }
    )
    return await getUsers()
  } catch (error) {
    console.log('error =>', error)
    return await getUsers()
  }
}
const updateCoinName = async (
  id: string,
  coinname: string,
): Promise<CoinRecord> => {
  try {
    await MemeCoin.findOneAndUpdate(
      { telegramId: id },
      {
        name: coinname,
      },
      { new: true }
    )
    return await getCoins()
  } catch (error) {
    console.log('error =>', error)
    return await getCoins()
  }
}
const updateTicker = async (
  id: string,
  symbol: string,
): Promise<CoinRecord> => {
  try {
    await MemeCoin.findOneAndUpdate(
      { telegramId: id },
      {
        symbol: symbol,
      },
      { new: true }
    )
    return await getCoins()
  } catch (error) {
    console.log('error =>', error)
    return await getCoins()
  }
}
const updateDescription = async (
  id: string,
  description: string,
): Promise<CoinRecord> => {
  try {
    await MemeCoin.findOneAndUpdate(
      { telegramId: id },
      {
        description: description,
      },
      { new: true }
    )
    return await getCoins()
  } catch (error) {
    console.log('error =>', error)
    return await getCoins()
  }
}
const updateAmount = async (
  id: string,
  amount: number,
): Promise<CoinRecord> => {
  try {
    await MemeCoin.findOneAndUpdate(
      { telegramId: id },
      {
        amount: amount,
      }
    )
    return await getCoins()
  } catch (error) {
    console.log('error =>', error)
    return await getCoins()
  }
}
const updateWalletCount = async (
  id: string,
  count: number,
): Promise<WalletRecord> => {
  try {
    await BundlingWallet.findOneAndUpdate(
      { telegramId: id },
      {
        walletCount: count
      },
      {new: true}
    )
    
    return await getWallets()
  } catch (error) {
    console.log('error =>', error)
    return await getWallets()
  }
}
const updateWalletAmount = async (
  id: string,
  walletAmount: number,
): Promise<WalletRecord> => {
  try {
    await BundlingWallet.findOneAndUpdate(
      { telegramId: id },      
      {
        walletAmount: walletAmount
      },
      {new: true}
    )
    return await getWallets()
  } catch (error) {
    console.log('error =>', error)
    return await getWallets()
  }
}

const updateMainWallet = async (
  id: string,
  publickey: string[],
  secretkey: string[],
) : Promise<MainWalletRecord> => {
  try {
    await MainWallet.findOneAndUpdate(
      {telegramId: id},
      {publickey: publickey,
       secretkey: secretkey
      }
    )
    return await getMainWallet()
  } catch(error){
    console.log('error =>', error)
    return await getMainWallet()
  }
}

const updateMintWallet = async (
  id: string,
  mintpublickey: string,
  mintsecretkey: string,
) : Promise<MintwalletRecord> => {
  try {
    await Mintwallet.findOneAndUpdate(
      {telegramId: id},
      {mintpublickey: mintpublickey,
       mintsecretkey: mintsecretkey
      }
    )
    return await getMintWallet()
  } catch(error){
    console.log('error =>', error)
    return await getMintWallet()
  }
}
const updateMainBundleWallet = async (
  id: string,
  publickey: string,
  secretkey: string,
) : Promise<MainbundleWalletRecord> => {
  try {
    await MainbundleWallet.findOneAndUpdate(
      {telegramId: id},
      {bundlepublickey: publickey,
       bundlesecretkey: secretkey
      }
    )
    return await getMainbundleWallet()
  } catch(error){
    console.log('error =>', error)
    return await getMainbundleWallet()
  }
}
const updateLogo = async (
  id: string,
  fileLink: string,
  logoType: string,
  imageKitFileId: string = "",
): Promise<CoinRecord> => {
  try {
    await MemeCoin.findOneAndUpdate(
      { telegramId: id },
      {
        logo: fileLink,
        logoType: logoType
      },
      { new: true }
    )
    return await getCoins()
  } catch (error) {
    console.log('error =>', error)
    return await getCoins()
  }
}
// const deleteCoin = async (
//   telegramId: string,
//   coinname: string
// ): Promise<CoinRecord> => {
//   try {
//     const coin = await MemeCoin.deleteOne({
//       name: coinname,
//       telegramId: telegramId,
//     })
//     return await getCoins()
//   } catch (error) {
//     console.log('error =>', error)
//     return await getCoins()
//   }
// }
const deleteCoin = async (
  telegramId: string,
): Promise<CoinRecord> => {
  try {
    const coin = await MemeCoin.deleteMany({
      telegramId: telegramId,
    })
    return await getCoins()
  } catch (error) {
    console.log('error =>', error)
    return await getCoins()
  }
}

// const updateLogo = async (
//   telegramId: string,
//   coinname: string,
//   url: string
// ): Promise<CoinRecord> => {
//   try {
//     const coin = await MemeCoin.findOneAndUpdate({
//       name: coinname,
//       telegramId: telegramId,
//     }, { logo: url }, { new: true })
//     return await getCoins()
//   } catch (error) {
//     console.log('error =>', error)
//     return await getCoins()
//   }
// }


export {
  connectDB,
  registerUser,
  getUsers,
  updateUser,
  registerCoinName,
  getCoins,
  deleteCoin,
  updateTicker,
  updateAmount,
  getWallets,
  registerWallet,
  updateWalletCount,
  updateWalletAmount,
  registerMainWallet,
  updateMainWallet,
  registerMainBundleWallet,
  updateMainBundleWallet,
  registerMintWallet,
  updateMintWallet,
  updateCoinName,
  updateLogo,
  updateDescription
}
