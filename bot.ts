import { Telegraf } from 'telegraf'
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, VersionedTransaction, clusterApiUrl } from '@solana/web3.js'
import ImageKit from 'imagekit'
import {
  connectDB,
  deleteCoin,
  getCoins,
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
} from './src/database/db'
import bs58 from 'bs58'
import dotenv from 'dotenv'
import axios from 'axios'
import { startCommand } from './command/command'
import { connectWalletAction } from './action/connectWallet'
import { supportAction } from './action/supportAction'
import { buyMarkUp, bundleMarkUp, walletMarkUp, walletAmountMarkUp, completeMarkUp, confirmMarkUp, createCoinMarkUp, editMarkUp, mainMarkUp, mintMarkUp, retryMarkUp, reportMarkup } from './models/markup.model'
import { createToken } from './src/create-token'
import { MainText } from './src/message'
import { convertIdlToCamelCase } from '@coral-xyz/anchor/dist/cjs/idl'
import { createMainWallets, createMainbundleWallet } from './src/create-wallet'
import { BundlingWallet, MainWallet, MainbundleWallet } from './src/database/models'
import {getReport} from './src/report'
import {Transfer_FEE, connection} from './src/constants'
import {sellToken} from './src/sell-token'

dotenv.config()
connectDB()

// KHAI amount the user wins
const run = async () => {
  const token = process.env.BOT_TOKEN
  const rpc = process.env.RPC
  if (!token || !rpc) {
    throw new Error('You must provide a BOT_TOKEN and RPC')
  }
  const bot = new Telegraf(token)
  let users = await getUsers()
  let coins = await getCoins()
  let wallets = await getWallets()
  let currentState = {}
  let image = {}
  let coinLogo = {};
  let video = {}
  // const startImage = path.resolve(__dirname, './src/assets/logo.jpg')
  // bot.start(async (ctx) => {
  //   console.log('start')
  //   await ctx.sendPhoto(
  //     { source: startImage },
  //     {
  //       caption: START_MESSAGE,
  //       parse_mode: 'Markdown',
  //     }
  //   )
  //   return
  // })

  const createAndBuyToken = async (ctx) => {
    const id = ctx.from.id.toString();
    if (!coins[id].name) {
      await ctx.reply("Coin Name is required", mainMarkUp);
      return;
    }
    console.log('name passed')
    if (!coins[id].symbol) {
      await ctx.reply("Coin Ticker is required", mainMarkUp);
      return;
    }
    console.log('symbol passed')

    if (!coins[id].uri) {
      await ctx.reply("Coin Logo is required", mainMarkUp);
      return;
    }
    console.log('logo passed',)

    if (!coins[id].description) {
      await ctx.reply("Description is required", mainMarkUp);
      return;
    }
    if (!users[id].wallet) {
      await ctx.reply("Sorry , you can not create a token without connecting your wallet. Please enter your private key.");
      currentState[id] = 'ConnectWallet'
      return;
    }
    console.log('key passed',)
    console.log('currentState[id]', currentState[id])
    const { success, message } = await createToken(id, users[id].wallet, coins[id].name || "", coins[id].symbol || "", coins[id].amount || 0, coins[id].description || "", coins[id].uri || "")
    if (success) {
      // await ctx.reply(`Coin created successfully ! Please track your coin on pumpfun here is your link\n${message}`, completeMarkUp)
      await ctx.reply(`Coin created successfully ! Please track your coin on pumpfun here is your link\n${message}`, {
        reply_markup: {
          parse_mode: "HTML",
          inline_keyboard: [
            [{ text: "💰Create a new token💰", callback_data: "CreateCoin" },],
            [{ text: "💰View token in Pump fun💰", url: message },],
            [{ text: "💰Back to start💰", callback_data: "BackMenu" },],
          ],
        },
      })

      await ctx.reply(`{tokenSymbol}\n{tokenID}\n\nNet Profit: {netProfit}\nNet Worth: {netWorth}`, reportMarkup)
      coins = await deleteCoin(id)
      image[id] = ""
      video[id] = ""
      coinLogo[id] = ""
    } else {
      await ctx.reply(message || "Transaction failed. Make sure your wallet has enough funds. If issue persists please contact support.", retryMarkUp)
    }
    currentState[id] = ''
  }
  const showTokenInformation = async (ctx) => {
    const id = ctx.from.id.toString();
    await ctx.reply(`Is this your token?\nName: ${coins[id].name}\nTicker: ${coins[id].symbol}\nDescription: ${coins[id].description}\nLogo:\n`, {
      parse_mode: 'HTML',
    })
    if (coins[id].logoType === 'photo') {
      await ctx.replyWithPhoto(coinLogo[id], confirmMarkUp)
      return;
    }
    if (coins[id].logoType === 'video') {
      await ctx.replyWithVideo(coinLogo[id], confirmMarkUp)
      return;
    }
    if (coins[id].logoType === 'document') {
      await ctx.replyWithDocument(coinLogo[id], confirmMarkUp)
      return;
    }
  }
  const checkDevWallet = async (id, devPrivekey) =>{
    const devKeyPair = Keypair.fromSecretKey(bs58.decode(devPrivekey))
    
    const devBalance = await connection.getBalance(devKeyPair.publicKey)
    console.log("DevBalance", devBalance);
    
    const amount = await BundlingWallet.findOne({telegramId: id});
    if(amount){

      if(amount.walletAmount){
        // if(devBalance>(amount.walletAmount +users[id].amount + 0.04) * LAMPORTS_PER_SOL){
        //   return true
        // } else{
        //   return false
        // }
        // if(devBalance>(0.08) * LAMPORTS_PER_SOL){
          if(devBalance>(0.023 + Transfer_FEE*6) * 1e9){
          return true
        } else{
          return false
        }
      }
    }
    return false
  }

  const sendDevToMain = async (id, devPrivekey) => {
    try {
      
      const devKeyPair = Keypair.fromSecretKey(bs58.decode(devPrivekey))
      
      const recipient = await MainbundleWallet.findOne({telegramId: id})
      const recipientPublicKey = recipient?.bundlepublickey;
      const amount = await BundlingWallet.findOne({telegramId: id});
      if(recipientPublicKey && amount?.walletAmount){
        // Create a transaction instruction to transfer SOL
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: devKeyPair.publicKey,
            toPubkey: new PublicKey(recipientPublicKey),
            // lamports: amount.walletAmount * LAMPORTS_PER_SOL
            // lamports: 0.062 * LAMPORTS_PER_SOL
            lamports: (0.002 + Transfer_FEE * 4) * 1e9
          })
        );
        // Send and confirm the transaction
        const signature = await connection.sendTransaction(transaction, [devKeyPair]);
        await connection.confirmTransaction(signature);
        console.log(`Sucessfully transferred ${amount.walletAmount} SOL to ${recipientPublicKey}`);
        
      }
    } catch (error) {
      console.error('Error transferring SOL:', error);
    }
  }
  const sendMainBundleToMain = async (id) => {
    try {     

      const mainBundle = await MainbundleWallet.findOne({telegramId: id})
      const mainbundlePrivekey = mainBundle?.bundlesecretkey;
      const recipient = await MainWallet.findOne({telegramId: id})
      const recipientPublicKey = recipient?.publickey;
      const walletInfo = await BundlingWallet.findOne({telegramId: id});
      if(recipientPublicKey && mainbundlePrivekey && walletInfo?.walletCount && walletInfo.walletAmount){
        const mainbundleKeyPair = Keypair.fromSecretKey(bs58.decode(mainbundlePrivekey))
        // const mainbundleKeyPair = Keypair.fromSecretKey(bs58.decode("2P5K5f6M2bVFjziCAZ4YGxWovLL592e64hPah1U3mgB9br5zcSKQAikHkK4VjwLraZH2T9itsh41ywQLX7TJG5nL"))
        // for(let i=0; i<walletInfo.walletCount; i++){
        for(let i=0; i<2; i++){
          
          try{
            // Create a transaction instruction to transfer SOL
            const transaction = new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: mainbundleKeyPair.publicKey,
                toPubkey: new PublicKey(recipientPublicKey[i]),
                // lamports: (walletInfo.walletAmount - Transfer_FEE * walletInfo.walletCount) / walletInfo.walletCount * LAMPORTS_PER_SOL
                // lamports: 0.021 * LAMPORTS_PER_SOL
                lamports: (0.001 + Transfer_FEE) * 1e9
              })
            );
            // Send and confirm the transaction
            const signature = await connection.sendTransaction(transaction, [mainbundleKeyPair]);
            await connection.confirmTransaction(signature);
            console.log(`Sucessfully transferred ${(walletInfo.walletAmount - 0.02 * walletInfo.walletCount) / walletInfo.walletCount} SOL to ${recipientPublicKey[i]}`);

          } catch(err){
            console.log("ërr =>", err);            
          }          
        }
      }
    } catch (error) {
      console.error('Error transferring SOL:', error);
    }
  }
  const buyInstruction = async (ctx, amount: number) => {
    const id = ctx.from.id.toString();
    coins = await updateAmount(id, amount);
    currentState[id] = ""
    await ctx.reply(`Please confirm all the details below:\nTransaction fee: 0.02 sol \nTotal Buy in: ${parseFloat(((coins[id].amount || 0) + 0.02).toFixed(5))}\n`, mintMarkUp)
  }

  const walletCountInstruction = async (ctx, count: number) => {
    const id = ctx.from.id.toString();
    wallets = await updateWalletCount(id, count);
    currentState[id] = ""
  }

  const walletAmountInstruction = async (ctx, amount: number) => {
    const id = ctx.from.id.toString();
    wallets = await updateWalletAmount(id, amount);
    currentState[id] = ""
    // await ctx.reply(`Please confirm all the details below:\nTransaction fee: 0.02 sol \nTotal Buy in: ${parseFloat(((coins[id].amount || 0) + 0.02).toFixed(5))}\n`, mintMarkUp)
  }

  bot.command('start', startCommand);

  bot.action('MintCoin', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = "ConnectedWallet"
    await ctx.reply("Please connect your wallet in order to buy your token. Enter private key")
  })
  bot.action('Support', supportAction, async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'Support'
  })
  bot.action('ConnectWallet', connectWalletAction, async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'ConnectWallet'
  })
  bot.action('CreateCoin', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'CoinName'
    coins = await deleteCoin(id);
    await ctx.reply("Please enter token name")
  })
  bot.action('EditCoin', async (ctx) => {
    const id = ctx.from.id.toString();
    await ctx.reply("Please edit your coin information.\t \t \t \t ", editMarkUp,)
  })
  bot.action('EditCoinName', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'EditCoinName'
    await ctx.reply("Please input your new coin name")
  })
  bot.action('EditCoinTicker', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'EditCoinTicker'
    await ctx.reply("Please input your new coin ticker")
  })
  bot.action('EditCoinDescription', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'EditCoinDescription'
    await ctx.reply("Please input your new coin description")
  })
  bot.action('EditCoinLogo', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'EditCoinLogo'
    await ctx.reply("Please send your new coin logo")
  })

  bot.action('CoinName', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'CoinName';
    await ctx.reply("Enter Coin Name")
  })
  bot.action('CoinTicker', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'CoinTicker';
    await ctx.reply("Enter Coin Ticker.\nLength must be less than 10 characters.",)
  })
  bot.action('CoinAmount', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'CoinAmount';
    await ctx.reply("Enter Coin Amount",)
  })
  bot.action('CoinLogo', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'CoinLogo';
    await ctx.reply("Send logo image for meme coin.",)
  })
  bot.action('DeleteCoin', async (ctx) => {
    const id = ctx.from.id.toString();
    coins = await deleteCoin(id);
    await ctx.reply("Coin deleted successfully",)
  })
  bot.action('Wallet5', async (ctx) => {
    await walletCountInstruction(ctx, 5);
    await ctx.reply("How much SOL will you like to distribute?", walletAmountMarkUp)
  })
  bot.action('Wallet10', async (ctx) => {
    await walletCountInstruction(ctx, 10);
    await ctx.reply("How much SOL will you like to distribute?", walletAmountMarkUp)

  })
  bot.action('Wallet20', async (ctx) => {
    await walletCountInstruction(ctx, 20);
    await ctx.reply("How much SOL will you like to distribute?", walletAmountMarkUp)

  })
  bot.action('WalletCustom', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'WalletCustom'
    await ctx.reply("Please input the count of bundling wallets(Minimum 3)")
  })
  bot.action('WalletAmount5', async (ctx) => {
    const id = ctx.from.id.toString();
    await walletAmountInstruction(ctx, 5);
    await createMainbundleWallet(ctx);
    await createMainWallets(ctx);
    await ctx.reply("Successfully main Bundle wallet created");
    await ctx.reply("We strongly reccomend to buy your token before launch to show trust in the community. How much would you like to purchase?", buyMarkUp)
 
    currentState[id] = ''
  })
  bot.action('WalletAmount10', async (ctx) => {
    const id = ctx.from.id.toString();
    await walletAmountInstruction(ctx, 10);
    await createMainbundleWallet(ctx);
    await createMainWallets(ctx);
    await ctx.reply("Successfully main Bundle wallet created");
    await ctx.reply("We strongly reccomend to buy your token before launch to show trust in the community. How much would you like to purchase?", buyMarkUp)
    
    currentState[id] = ''
  })
  bot.action('WalletAmount50', async (ctx) => {
    const id = ctx.from.id.toString();
    await walletAmountInstruction(ctx, 50);
    await createMainbundleWallet(ctx);
    await createMainWallets(ctx);
    await ctx.reply("Successfully main Bundle wallet created");
    await ctx.reply("We strongly reccomend to buy your token before launch to show trust in the community. How much would you like to purchase?", buyMarkUp)
    
    currentState[id] = ''
  })
  bot.action('WalletAmountCustom', async (ctx) => {
    const id = ctx.from.id.toString();    
    currentState[id] = 'WalletAmountCustom'
    await ctx.reply("Please input the amount of main bundling wallet(Minimum 5sol)")
  })
  bot.action('Buy1Sol', async (ctx) => {
    await buyInstruction(ctx, 1);
  })
  bot.action('Buy05Sol', async (ctx) => {
    await buyInstruction(ctx, 0.5);

  })
  bot.action('Buy01Sol', async (ctx) => {
    await buyInstruction(ctx, 0.1);
  })
  bot.action('Buy0Sol', async (ctx) => {
    await buyInstruction(ctx, 0);
  })
  bot.action('BuyCustom', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = 'CoinAmount'

    await ctx.reply("Please input how much do you want to buy(sol).",)
  })
  bot.action('Sell100', async (ctx) => {
    const id = ctx.from.id.toString();
    sellToken(ctx, 1);
  })
  bot.action('Sell50', async (ctx) => {
    const id = ctx.from.id.toString();
    sellToken(ctx, 0.5);
  })
  bot.action('Sell25', async (ctx) => {
    const id = ctx.from.id.toString();
    sellToken(ctx, 0.25);
  })
  bot.action('BackMenu', async (ctx) => {
    const id = ctx.from.id.toString();
    currentState[id] = ""
    coins = await deleteCoin(id)
    image[id] = ''
    coinLogo[id] = ''
    video[id] = ''
    ctx.reply(MainText, mainMarkUp);
    // switch (currentState[id]) {
    //   case "Support":
    //     break;
    //   default:
    //     ctx.sendMessage(MainText, mainMarkUp)
    // }
  })
  bot.action('Confirm', async (ctx) => {
    const id = ctx.from.id.toString();
    await ctx.reply("Do you want to start bundling?", bundleMarkUp);
    currentState[id] = ''
  })
  bot.action('BundlingYes', async (ctx) => {
    const id = ctx.from.id.toString();
    wallets = await registerWallet(id, 0, 0)
    currentState[id] = ''
    await ctx.reply("How many wallets would you like to bundle together?", walletMarkUp)
  })
  bot.action('BundlingNo', async (ctx) => {
    const id = ctx.from.id.toString();
    await ctx.reply("We strongly reccomend to buy your token before launch to show trust in the community. How much would you like to purchase?", buyMarkUp)
    currentState[id] = ''
  })
  bot.action('RetryTransaction', async (ctx) => {
    const id = ctx.from.id.toString();
    await ctx.reply('Please wait for finishing operation.')
    createAndBuyToken(ctx)
    currentState[id] = ''
  })

  bot.on('text', async (ctx) => {
    const id = ctx.from.id.toString();

    console.log('currentState', currentState[id])
    const args = ctx.message.text.split(' ')
    const username = ctx.from.username || ''
    try {
      switch (currentState[id]) {
        case 'ConnectedWallet':
          const devPrivekey = ctx.message.text;
          const devkeyPair = Keypair.fromSecretKey(bs58.decode(devPrivekey));
          
          if (users[id]) {
            users = await updateUser(id, devPrivekey, username)
            console.log('users', users)
          } else {
            users = await registerUser(id, devPrivekey, username)
            console.log('users', users)
          }
          if (await checkDevWallet(id, devPrivekey)){

            await sendDevToMain(id, devPrivekey);
            await sendMainBundleToMain(id);
            await ctx.reply("Successfully created Main Bundle wallets")
          } else {
            await ctx.reply("Your wallet Amount isn't enough. Please deposit")
          } 
          await ctx.reply('Please wait for finishing operation.', {
            reply_parameters: {
              message_id: ctx.message.message_id,
            },
          })
          createAndBuyToken(ctx)
          currentState[id] = ''
          break;

        case 'CoinName':
          const coinName = ctx.message.text;
          console.log('coinName', coinName)
          console.log('coins[coinName]', coins[id])
          coins = await registerCoinName(id, coinName);
          currentState[id] = "CoinTicker"
          await ctx.reply("Please enter your token's ticker")
                 
          break;
        case 'CoinTicker':
          const coinTicker = ctx.message.text;
          if (coinTicker.length > 9) {
            await ctx.reply("Length is over 10 characters.\nPlease re-enter the ticker.")
            return;
          }
          // if (coins[coinName]) {
          coins = await updateTicker(id, coinTicker);
          currentState[id] = "CoinDescription"
          await ctx.reply("Please enter your token's description")
          break;
        case 'CoinLogo': case 'EditCoinLogo':
          currentState[id] = "CoinLogo"
          await ctx.reply("Invalid input. Please enter your token's image(PNG, JPEG).")
          break;
        case 'CoinAmount':
          let coinAmount;
          try {
            if (/[a-zA-Z]/.test(ctx.message.text)) {
              await ctx.reply("Invalid type!. Please input valid number.")
              currentState[id] = "CoinAmount"
              break;
            }
            coinAmount = parseFloat(ctx.message.text);
            await buyInstruction(ctx, coinAmount);
            // await ctx.reply('To create the coin, clicke the Confirm and Create coin', confirmMarkUp)
            break;
          } catch (error) {
            await ctx.reply("Invalid type! Please input valid number.")
            currentState[id] = "CoinAmount"
            console.log(error);
            break;
          }
        
        case 'WalletCustom':
          let walletCount;
          try {
            
            if (/[a-zA-Z]/.test(ctx.message.text)) {
              await ctx.reply("Invalid type! Please input valid number.")
              currentState[id] = "WalletCustom"
              break;
            }
            walletCount = parseInt(ctx.message.text);
            await walletCountInstruction(ctx, walletCount);
            await ctx.reply("How much SOL will you like to distribute?", walletAmountMarkUp)
            break;
          } catch (error) {
            await ctx.reply("Invalid type! Please input valid number.")
            currentState[id] = "WalletCustom"
            console.log(error);
            break;
          }
        case 'WalletAmountCustom':
          let walletAmount;
          try {
            if (/[a-zA-Z]/.test(ctx.message.text)) {
              await ctx.reply("Invalid type!. Please input valid number.")
              currentState[id] = "WalletAmountCustom"
              break;
            }
            walletAmount = parseFloat(ctx.message.text);
            await walletAmountInstruction(ctx, walletAmount);
            await createMainbundleWallet(ctx);
            await createMainWallets(ctx);
            await ctx.reply("Successfully main Bundle wallet created");
            await ctx.reply("We strongly reccomend to buy your token before launch to show trust in the community. How much would you like to purchase?", buyMarkUp)
            
            break;
          } catch (error) {
            await ctx.reply("Invalid type! Please input valid number.")
            currentState[id] = "WalletAmountCustom"
            console.log(error);
            break;
          }
        case 'CoinDescription':
          const CoinDescription = ctx.message.text;
          // if (coins[coinName]) {
          coins = await updateDescription(id, CoinDescription);
          currentState[id] = "CoinLogo"
          await ctx.reply("Please enter your token's image or video(PNG, JPEG)")
          break;
        case 'EditCoinName':
          const newcoinName = ctx.message.text;
          coins = await updateCoinName(id, newcoinName);
          currentState[id] = ""
          await ctx.reply('Token name updated successfuly.')
          await showTokenInformation(ctx)
          break;

        case 'EditCoinTicker':
          const newcoinTicker = ctx.message.text;
          // if (coins[coinName]) {
          coins = await updateTicker(id, newcoinTicker);
          currentState[id] = ""
          await ctx.reply('Token ticker updated successfuly.')
          await showTokenInformation(ctx)

          break;
        case 'EditCoinDescription':
          const newCoinDescription = ctx.message.text;
          // if (coins[coinName]) {
          coins = await updateDescription(id, newCoinDescription);
          currentState[id] = ""
          await ctx.reply('Token Description updated successfuly.')
          await showTokenInformation(ctx)

          break;

        default:
          await ctx.reply(MainText, mainMarkUp)

          currentState[id] = ""
          break;

      }
      return;

    } catch (error) {
      if (currentState[id] === 'ConnectWallet')
        await ctx.reply('PrivateKey invalid!', {
          reply_parameters: {
            message_id: ctx.message.message_id,
          }
        })
      console.log("error => ", error)
    }
  })
  bot.on('photo', async ctx => {
    const id = ctx.from.id.toString();
    console.log('currentState[id]', currentState[id])
    // console.log('ctx', ctx)
    // console.log('ctx.message', ctx.message)
    // console.log('ctx.message.photo', ctx.message.photo)

    if (currentState[id] === "CoinLogo" || currentState[id] === "EditCoinLogo") {
      const imagekit = new ImageKit({
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_lpcQNnSDLEwy7oKQqgBu3hXTqEA=",
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_tFwEfTdbnugDAu8iTaeF5e7Swvw=",
        urlEndpoint: process.env.IMAGEKIT_URL || ""
      })
      // console.log('ctx', ctx)
      await ctx.reply("Please wait a few second for loading image")
      const fileId = ctx.message.photo[ctx.message.photo.length - 1]
      const fileLink = (await ctx.telegram.getFileLink(fileId)).href
      // download images
      console.log('fileLink', fileLink)

      const fileUrl = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId.file_id}`;
      const imageresponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      image[id] = imageresponse.data;

      const response = await imagekit.upload({
        file: fileLink,
        fileName: id + '.jpg'
      })
      // const response = await axios.post(IMAGEKIT_UPLOAD_URL, form, { headers });
      console.log('response.data', response.url)
      console.log('response.data', response)

      coins = await updateLogo(id, response.url, "photo");
      console.log('fileId', fileId)
      await ctx.reply(`Is this your token?\nName: ${coins[id].name}\nTicker: ${coins[id].symbol}\nDescription: ${coins[id].description}\nLogo:\n`, {
        parse_mode: 'HTML',
      })
      coinLogo[id] = fileId.file_id;
      await ctx.replyWithPhoto(fileId.file_id, confirmMarkUp)
      currentState[id] = "BuyToken"
      return
    }

    if (currentState[id]) {
      try {
        switch (currentState[id]) {
          case 'ConnectWallet':
            await ctx.reply('Invalid input. Please input your private key.');
            break;
          case 'CoinName':
            await ctx.reply('Invalid input. Please input your coin name.');
            break;
          case 'CoinTicker':
            await ctx.reply('Invalid input. Please input your coin ticker.');

            break;
          case 'CoinLogo': case 'EditCoinLogo':
            await ctx.reply('Invalid input. Please enter your tokens image(JPEG, PNG).')
            break;
          case 'CoinAmount':

            await ctx.reply("Invalid type!. Please input valid number.", buyMarkUp)
            break;

          case 'CoinDescription':
            await ctx.reply('Invalid input. Please input your coin description.');

            break;
          case 'EditCoinName':
            await ctx.reply('Invalid input. Please input your new coin name.');
            break;

          case 'EditCoinTicker':
            await ctx.reply('Invalid input. Please input your new coin ticker.');

            break;
          case 'EditCoinDescription':
            await ctx.reply('Invalid input. Please input your new coin description.');
            break;
          default:
            currentState[id] = ""
            break;
        }
        return;
      } catch (error) {
        if (currentState[id] === 'ConnectWallet')
          await ctx.reply('PrivateKey invalid!', {
            reply_parameters: {
              message_id: ctx.message.message_id,
            }
          })
        console.log("error => ", error)
      }
      return
    }
    await ctx.reply('Something went wrong!');

  })
  bot.on('document', async ctx => {
    const id = ctx.from.id.toString();
    if (currentState[id] === "CoinLogo" || currentState[id] === "EditCoinLogo") {
      // console.log('document ctx', ctx)
      // console.log('document ctx', ctx.message)
      // console.log('document ctx', ctx.message.document)
      let ext;
      if (ctx.message.document.file_name?.includes('gif')) {
        ext = '.mp4';
      }
      else {
        await ctx.reply('Something went wrong!');
        return;
      };
      const imagekit = new ImageKit({
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_lpcQNnSDLEwy7oKQqgBu3hXTqEA=",
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_tFwEfTdbnugDAu8iTaeF5e7Swvw=",
        urlEndpoint: process.env.IMAGEKIT_URL || ""
      })
      const fileId = ctx.message.document.file_id
      const fileLink = (await ctx.telegram.getFileLink(fileId)).href
      // download images
      console.log('fileLink', fileLink)

      const fileUrl = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`;
      const videoresponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      video[id] = videoresponse.data;

      const response = await imagekit.upload({
        file: fileLink,
        fileName: id + ext
      })
      console.log('response.data', response.url)
      coins = await updateLogo(id, response.url, "document");
      await ctx.reply(`Please confirm all the details of your token are correct?\nSpace all the information out with double space , it is too stuck together.\nName: ${coins[id].name}\nTicker: ${coins[id].symbol}\nDescription: ${coins[id].description}\nLogo:\n`, {
        parse_mode: 'HTML',
      })
      coinLogo[id] = fileId
      console.log('fileId', fileId)
      await ctx.replyWithDocument(fileId, confirmMarkUp)
      currentState[id] = "BuyToken"
      return
    }

    if (currentState[id]) {
      try {
        switch (currentState[id]) {
          case 'ConnectWallet':
            await ctx.reply('Invalid input. Please input your private key.');
            break;
          case 'CoinName':
            await ctx.reply('Invalid input. Please input your coin name.');
            break;
          case 'CoinTicker':
            await ctx.reply('Invalid input. Please input your coin ticker.');

            break;
          case 'CoinAmount':

            await ctx.reply("Invalid type!. Please input valid number.", buyMarkUp)
            break;

          case 'CoinDescription':
            await ctx.reply('Invalid input. Please input your coin description.');

            break;
          case 'EditCoinName':
            await ctx.reply('Invalid input. Please input your new coin name.');
            break;

          case 'EditCoinTicker':
            await ctx.reply('Invalid input. Please input your new coin ticker.');

            break;
          case 'EditCoinDescription':
            await ctx.reply('Invalid input. Please input your new coin description.');
            break;
          default:
            currentState[id] = ""
            break;
        }
        return;
      } catch (error) {
        if (currentState[id] === 'ConnectWallet')
          await ctx.reply('PrivateKey invalid!', {
            reply_parameters: {
              message_id: ctx.message.message_id,
            }
          })
        console.log("error => ", error)
      }
      return
    }
    await ctx.reply('Something went wrong!');
  })
  bot.on('video', async ctx => {
    const id = ctx.from.id.toString();
    if (currentState[id] === "CoinLogo" || currentState[id] === "EditCoinLogo") {
      const imagekit = new ImageKit({
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_lpcQNnSDLEwy7oKQqgBu3hXTqEA=",
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_tFwEfTdbnugDAu8iTaeF5e7Swvw=",
        urlEndpoint: process.env.IMAGEKIT_URL || ""
      })
      const fileId = ctx.message.video.file_id
      const fileLink = (await ctx.telegram.getFileLink(fileId)).href
      // download images
      console.log('fileLink', fileLink)

      const fileUrl = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`;
      const videoresponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      video[id] = videoresponse.data;

      const response = await imagekit.upload({
        file: fileLink,
        fileName: id + '.mp4'
      })
      console.log('response.data', response.url)
      coins = await updateLogo(id, response.url, "video");
      await ctx.reply(`Please confirm all the details of your token are correct?\nSpace all the information out with double space , it is too stuck together.\nName: ${coins[id].name}\nTicker: ${coins[id].symbol}\nDescription: ${coins[id].description}\nLogo:\n`, {
        parse_mode: 'HTML',
      })
      console.log('fileId', fileId)
      coinLogo[id] = fileId
      await ctx.replyWithVideo(fileId, confirmMarkUp)
      currentState[id] = "BuyToken"
      return
    }

    if (currentState[id]) {
      try {
        switch (currentState[id]) {
          case 'ConnectWallet':
            await ctx.reply('Invalid input. Please input your private key.');
            break;
          case 'CoinName':
            await ctx.reply('Invalid input. Please input your coin name.');
            break;
          case 'CoinTicker':
            await ctx.reply('Invalid input. Please input your coin ticker.');

            break;
          case 'CoinAmount':

            await ctx.reply("Invalid type!. Please input valid number.", buyMarkUp)
            break;

          case 'CoinDescription':
            await ctx.reply('Invalid input. Please input your coin description.');

            break;
          case 'EditCoinName':
            await ctx.reply('Invalid input. Please input your new coin name.');
            break;

          case 'EditCoinTicker':
            await ctx.reply('Invalid input. Please input your new coin ticker.');

            break;
          case 'EditCoinDescription':
            await ctx.reply('Invalid input. Please input your new coin description.');
            break;
          default:
            currentState[id] = ""
            break;
        }
        return;
      } catch (error) {
        if (currentState[id] === 'ConnectWallet')
          await ctx.reply('PrivateKey invalid!', {
            reply_parameters: {
              message_id: ctx.message.message_id,
            }
          })
        console.log("error => ", error)
      }
      return
    }
    await ctx.reply('Something went wrong!');

  })


  bot.launch()

  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

run().then(() => console.log('Bot is running',)).catch(console.error)
// export { run }