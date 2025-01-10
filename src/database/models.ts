import mongoose from "mongoose";

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  telegramId: {
    type: String,
    required: true
  },
  telegramUsername: {
    type: String,
  },
  wallet: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
})


const MemeCoinSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  symbol: {
    type: String,
  },
  description: {
    type: String,
  },
  logo: {
    type: String
  },
  logoType: {
    type: String
  },
  imageKitId: {
    type: String
  },
  telegramId: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
  },
  created: {
    type: Boolean,
  },
  date: {
    type: Date,
    default: Date.now,
  }
})

const BundlingWalletSchema = new Schema({

  telegramId: {
    type: String,
    required: true,
  },
  walletCount: {
    type: Number,
  },
  walletAmount: {
    type: Number,
  }
})

const MainWalletSchema = new Schema({

  telegramId: {
    type: String,
    required: true,
  },
  publickey: {
    type: [String],    
  },
  secretkey: {
    type: [String]
  }
})

const MainbundleWalletSchema = new Schema({

  telegramId: {
    type: String,
    required: true,
  },
  bundlepublickey: {
    type: String,    
  },
  bundlesecretkey: {
    type: String
  }
})

const MintSchema = new Schema({
  telegramId: {
    type: String,
    required: true
  },
  mintpublickey: {
    type: String
  },
  mintsecretkey: {
    type: String
  }
})

export const User = mongoose.model('user', UserSchema);
export const MemeCoin = mongoose.model('memecoin', MemeCoinSchema);
export const BundlingWallet = mongoose.model('bundlingwallet', BundlingWalletSchema)
export const MainWallet = mongoose.model('mainwallet', MainWalletSchema)
export const MainbundleWallet = mongoose.model('mainbundlewallet', MainbundleWalletSchema)
export const Mintwallet = mongoose.model('mint', MintSchema)
