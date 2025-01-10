const mainMarkUp = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [
      [{ text: "💰Create Token💰", callback_data: "CreateCoin" }],
      [{ text: "Support", callback_data: "Support" }]
    ],
  },
};
const supportMarkUp = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [
      [
        // { text: "👝Connect Wallet👝", callback_data: "ConnectWallet" },
        { text: "💰Create Token💰", callback_data: "CreateCoin" },
        { text: "Support", callback_data: "Support" }
      ],
      [{ text: "Back to Home", callback_data: "BackMenu" }],

    ],
  },
};
const confirmMarkUp = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [
      [{ text: "💰Edit Token💰", callback_data: "EditCoin" }],
      [{ text: "Confirm and Create coin", callback_data: "Confirm" }],
      [{ text: "Back to Home", callback_data: "BackMenu" }],

    ],
  },
};
const mintMarkUp = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [
      [{ text: "Mint Coin", callback_data: "MintCoin" }],
      [{ text: "Back to Home", callback_data: "BackMenu" }],
    ],
  },
};
const retryMarkUp = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [
      [{ text: "Retry transaction", callback_data: "RetryTransaction" }],
      [{ text: "Create new token", callback_data: "CreateCoin" }],
      [{ text: "Support", callback_data: "Support" }],
      [{ text: "Back to Home", callback_data: "BackMenu" }],
    ],
  },
};
const editMarkUp = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [
      [
        { text: "💰Edit Name💰", callback_data: "EditCoinName" },
      ],
      [
        { text: "💰Edit Ticker💰", callback_data: "EditCoinTicker" },
      ],
      [
        { text: "💰Edit Description💰", callback_data: "EditCoinDescription" },
      ],
      [
        { text: "💰Edit Image or Video💰", callback_data: "EditCoinLogo" },
      ],
      // [
      //   { text: "💰Edit Amount💰", callback_data: "EditAmount" },
      // ],
      [{ text: "Back to Home", callback_data: "BackMenu" }],
    ],
  },
};
const bundleMarkUp = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [
      [{ text: "💰Yes💰", callback_data: "BundlingYes" },],
      [{ text: "💰No💰", callback_data: "BundlingNo" },],
      // [{ text: "No thanks", callback_data: "Buy0Sol" }],
      [{ text: "Back to Home", callback_data: "BackMenu" }],
    ],
  },
};
const walletMarkUp = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [
      [{ text: "💰5💰", callback_data: "Wallet5" },],
      [{ text: "💰10💰", callback_data: "Wallet10" },],
      [{ text: "💰20💰", callback_data: "Wallet20" },],
      [{ text: "💰Custom💰", callback_data: "WalletCustom" },],
      // [{ text: "No thanks", callback_data: "Buy0Sol" }],
      [{ text: "Back to Home", callback_data: "BackMenu" }],
    ],
  },
};
const walletAmountMarkUp = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [
      [{ text: "💰5 SOL💰", callback_data: "WalletAmount5" },],
      [{ text: "💰10 SOL💰", callback_data: "WalletAmount10" },],
      [{ text: "💰50 SOL💰", callback_data: "WalletAmount50" },],
      [{ text: "💰Custom💰", callback_data: "WalletAmountCustom" },],
      // [{ text: "No thanks", callback_data: "Buy0Sol" }],
      [{ text: "Back to Home", callback_data: "BackMenu" }],
    ],
  },
};
const buyMarkUp = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [
      [
        { text: "💰1 sol💰", callback_data: "Buy1Sol" },
      ],
      [{ text: "💰0.5 sol💰", callback_data: "Buy05Sol" },],
      [{ text: "💰0.1 sol💰", callback_data: "Buy01Sol" },],
      [{ text: "💰Custom💰", callback_data: "BuyCustom" },
      ],
      // [{ text: "No thanks", callback_data: "Buy0Sol" }],
      [{ text: "Back to Home", callback_data: "BackMenu" }],
    ],
  },
};

const reportMarkup = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [
      [
        { text: "Sell 100%", callback_data: "Sell100" },
        { text: "Sell 50%", callback_data: "Sell50" },
        { text: "Sell 25%", callback_data: "Sell25" },
      ],
      [{ text: "🤑Trading Report", callback_data: "TradingReport" },],
      [{ text: "🏘Menu", callback_data: "Menu" },],
      [{ text: "🔄Refresh", callback_data: "BuyCustom" },
      ],
      // [{ text: "No thanks", callback_data: "Buy0Sol" }],
      [{ text: "Back to Home", callback_data: "BackMenu" }],
    ],
  },
};

const completeMarkUp = {
  reply_markup: {
    parse_mode: "HTML",
    inline_keyboard: [

      [{ text: "💰Create a new token💰", callback_data: "CreateCoin" },],
      [{ text: "💰View token in Pump fun💰", callback_data: "ViewPumpFun" },],
      [{ text: "💰Back to start💰", callback_data: "BackMenu" },],
    ],
  },
};

const createCoinMarkUp = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "👝Connect Wallet👝", callback_data: "ConnectWallet" },
      ],
      [
        { text: "Coin Name", callback_data: "CoinName" },
        { text: "Coin ticker", callback_data: "CoinTicker" }
      ],
      [
        { text: "Coin Amount", callback_data: "CoinAmount" },
        { text: "Coin Logo", callback_data: "CoinLogo" }
      ],
      [
        { text: "Create Coin", callback_data: "MintCoin" },
        { text: "Delete Coin", callback_data: "DeleteCoin" }
      ],
      [{ text: "Track Coin", callback_data: "TrackCoin" }],
      [{ text: "Back to Home", callback_data: "BackMenu" }],
    ],
  },
};


export {
  mainMarkUp,
  confirmMarkUp,
  supportMarkUp,
  mintMarkUp,
  createCoinMarkUp,
  buyMarkUp,
  bundleMarkUp,
  walletMarkUp,
  walletAmountMarkUp,
  completeMarkUp,
  editMarkUp,
  retryMarkUp,
  reportMarkup
};
