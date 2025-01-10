
import { PublicKey, VersionedTransactionResponse } from "@solana/web3.js";
import { UnderlyingByteSource } from "stream/web";

export type RegisteredUser = {
  telegramUsername: string | null | undefined
  wallet: string
}
export type RegisteredCoin = {
  telegramId: string | number | undefined | null
  amount: number | undefined | null
  name: string | undefined | null
  symbol: string | undefined | null
  uri: string | undefined | null
  logoType: string | undefined | null
  description: string | undefined | null
  imageKitId: string | undefined | null
  objectId: string
  created: boolean | null | undefined
}
export type RegisteredWallet = {
  telegramId: string | number | undefined | null 
  walletCount: number | undefined | null 
  walletAmount: number | undefined | null 
}
export type RegisteredMainWallet = {
  telegramId: string | number | undefined | null 
  publickey: string[] 
  secretkey: string[] 
}
export type RegisteredMainbundleWallet = {
  telegramId: string | number | undefined | null 
  bundlepublickey: string | number | undefined | null 
  bundlesecretkey: string | number | undefined | null 
}

export type RegisteredMint = {
  telegramId: string | number | undefined | null 
  mintpublickey: string | number | undefined | null 
  mintsecretkey: string | number | undefined | null 
}

export type UserRecord = Record<string, RegisteredUser> // sort by id
export type MintwalletRecord = Record<string, RegisteredMint> // sort by id
export type CoinRecord = Record<string, RegisteredCoin> // sort by id
export type WalletRecord = Record<string, RegisteredWallet> // sort by id
export type MainWalletRecord = Record<string, RegisteredMainWallet> // sort by id
export type MainbundleWalletRecord = Record<string, RegisteredMainbundleWallet> // sort by id

export type CreateTokenMetadata = {
  name: string;
  symbol: string;
  description: string;
  file: string;
  twitter?: string;
  telegram?: string;
  website?: string;
};

export type TokenMetadata = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  showName: boolean;
  createdOn: string;
  twitter: string;
};

export type CreateEvent = {
  name: string;
  symbol: string;
  uri: string;
  mint: PublicKey;
  bondingCurve: PublicKey;
  user: PublicKey;
};

export type TradeEvent = {
  mint: PublicKey;
  solAmount: bigint;
  tokenAmount: bigint;
  isBuy: boolean;
  user: PublicKey;
  timestamp: number;
  virtualSolReserves: bigint;
  virtualTokenReserves: bigint;
  realSolReserves: bigint;
  realTokenReserves: bigint;
};

export type CompleteEvent = {
  user: PublicKey;
  mint: PublicKey;
  bondingCurve: PublicKey;
  timestamp: number;
};

export type SetParamsEvent = {
  feeRecipient: PublicKey;
  initialVirtualTokenReserves: bigint;
  initialVirtualSolReserves: bigint;
  initialRealTokenReserves: bigint;
  tokenTotalSupply: bigint;
  feeBasisPoints: bigint;
};

export interface PumpFunEventHandlers {
  createEvent: CreateEvent;
  tradeEvent: TradeEvent;
  completeEvent: CompleteEvent;
  setParamsEvent: SetParamsEvent;
}

export type PumpFunEventType = keyof PumpFunEventHandlers;

export type PriorityFee = {
  unitLimit: number;
  unitPrice: number;
};

export type TransactionResult = {
  signature?: string;
  error?: unknown;
  results?: VersionedTransactionResponse;
  success: boolean;
};
