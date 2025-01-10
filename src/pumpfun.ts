import {
  Commitment,
  Connection,
  Finality,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  TransactionMessage
} from "@solana/web3.js";
import { Program, Provider } from "@coral-xyz/anchor";
import { GlobalAccount } from "./globalAccount";
import {
  CompleteEvent,
  CreateEvent,
  CreateTokenMetadata,
  PriorityFee,
  PumpFunEventHandlers,
  PumpFunEventType,
  SetParamsEvent,
  TradeEvent,
  TransactionResult,
} from "./database/types";
import {
  toCompleteEvent,
  toCreateEvent,
  toSetParamsEvent,
  toTradeEvent,
} from "./events";
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { BondingCurveAccount } from "./bondingCurveAccount";
import { BN } from "bn.js";
import bs58 from 'bs58'
import {
  DEFAULT_COMMITMENT,
  DEFAULT_FINALITY,
  calculateWithSlippageBuy,
  calculateWithSlippageSell,
  sendTx,
  buildTx
} from "./util";
import { jitoWithAxios } from "./jitoWithAxios";
import { PumpFun, IDL } from "./IDL";
import { PinataSDK } from "pinata-web3";
import dotenv from 'dotenv'
import { MainWallet } from "./database/models";
import {connection} from './constants'
import {sendBundle} from './jito-bundle/build-bundle'
import { Transfer_FEE } from "./constants";

dotenv.config();
const PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const MPL_TOKEN_METADATA_PROGRAM_ID =
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
export const GLOBAL_ACCOUNT_SEED = "global";
export const MINT_AUTHORITY_SEED = "mint-authority";
export const BONDING_CURVE_SEED = "bonding-curve";
export const METADATA_SEED = "metadata";

export const DEFAULT_DECIMALS = 6;

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_API_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

export class PumpFunSDK {
  public program: Program<PumpFun>;
  public connection: Connection;
  constructor(provider?: Provider) {
    this.program = new Program<PumpFun>(IDL as PumpFun, provider);
    this.connection = this.program.provider.connection;
  }

  async createAndBuy(
    creator: Keypair,
    mint: Keypair,
    createTokenMetadata: CreateTokenMetadata,
    buyAmountSol: bigint,
    slippageBasisPoints: bigint = BigInt(500),
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ): Promise<TransactionResult> {
    // let tokenMetadata = await this.createTokenMetadata(createTokenMetadata);
    let tokenMetadata = "https://gateway.pinata.cloud/ipfs/bafkreigk6ewglmnhkl7tg5d2dz6vcp44zhzzb6nr63pti4xyecmgm6rbqu";
    console.log('tokenMetadata', tokenMetadata)
    let createTx = await this.getCreateInstructions(
      new PublicKey(creator.publicKey),
      createTokenMetadata.name,
      createTokenMetadata.symbol,
      tokenMetadata,
      mint
    );
    
    
    // const sendSolInstruction = SystemProgram.transfer({ fromPubkey: new PublicKey(creator.publicKey), toPubkey: new PublicKey(process.env.FEE_RECEIVER || "5LjwkLsC2ExXZSkUte8NJinaX8kKXLRYVC4H4yDpNUxN"), lamports: 0.003 * LAMPORTS_PER_SOL })
    const sendSolInstruction = SystemProgram.transfer({ fromPubkey: new PublicKey(creator.publicKey), toPubkey: new PublicKey(process.env.FEE_RECEIVER || "5LjwkLsC2ExXZSkUte8NJinaX8kKXLRYVC4H4yDpNUxN"), lamports: 0.003 * 1e9 })
    let newTx = new Transaction().add(createTx);
    let transactions: VersionedTransaction[] = [];        

    if (buyAmountSol > 0) {
      const globalAccount = await this.getGlobalAccount(commitment);
      const buyAmount = globalAccount.getInitialBuyPrice(buyAmountSol);
      const buyAmountWithSlippage = calculateWithSlippageBuy(
        buyAmountSol,
        slippageBasisPoints
      );

      const creat_buyTx = await this.getBuyInstructions(
        new PublicKey(creator.publicKey),
        new PublicKey(mint.publicKey),
        globalAccount.feeRecipient,
        buyAmount,
        buyAmountWithSlippage,
        commitment
      );
      
      newTx.add(creat_buyTx);           
      newTx.add(sendSolInstruction);
      let createVersionedTx = await buildTx(
        this.connection,
        newTx,
        new PublicKey(creator.publicKey),
        [creator],
        priorityFees,
        commitment,
        finality
      );
      
      transactions.push(createVersionedTx);
      const mainBundlewallets = await MainWallet.findOne({})
      if(mainBundlewallets){
        if(mainBundlewallets.publickey && mainBundlewallets.secretkey){
          for(let i=0; i<2; i++){
            // for(let i=0; i<mainBundlewallets.publickey.length; i++){
              
            // let currentSolBalance = await connection.getBalance(new PublicKey(mainBundlewallets.publickey[i]));
            
            // const buyAmount2 = globalAccount.getInitialBuyPrice(BigInt(currentSolBalance - Transfer_FEE * LAMPORTS_PER_SOL));
            // const buyAmountWithSlippage2 = calculateWithSlippageBuy(
            //   buyAmount2,
            //   slippageBasisPoints
            // );
            // console.log(buyAmount2, "=======", buyAmountWithSlippage2);
            
            let buyers = Keypair.fromSecretKey(new Uint8Array(bs58.decode(mainBundlewallets.secretkey[i])))
                        
            const buyTx = await this.getBuyInstructions(
              new PublicKey(buyers.publicKey),
              new PublicKey(creator.publicKey),
              globalAccount.feeRecipient,
              buyAmount,
              buyAmountWithSlippage,
              commitment
            );
            let buyBundleTx = new Transaction().add(buyTx);
            let buyVersionedTx = await buildTx(
              this.connection,
              buyBundleTx,
              buyers.publicKey,
              [buyers],
              priorityFees,
              commitment,
              finality
            );
            
            transactions.push(buyVersionedTx);           
            
          }
        }
      }
    }  
  
  
  // const result = await sendTx(
  //   this.connection,
  //   newTx,
  //   new PublicKey(creator.publicKey),
  //   [creator, mint],
  //   priorityFees,
  //   commitment,
  //   finality
  // );
  
  return await sendBundle(creator, transactions);
    
  }

  async buy(
    buyer: Keypair,
    mint: PublicKey,
    buyAmountSol: bigint,
    slippageBasisPoints: bigint = BigInt(500),
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ): Promise<TransactionResult> {
    let buyTx = await this.getBuyInstructionsBySolAmount(
      buyer.publicKey,
      mint,
      buyAmountSol,
      slippageBasisPoints,
      commitment
    );

    let buyResults = await sendTx(
      this.connection,
      buyTx,
      buyer.publicKey,
      [buyer],
      priorityFees,
      commitment,
      finality
    );
    return buyResults;
  }

  async sell(
    seller: Keypair,
    mint: PublicKey,
    sellTokenAmount: bigint,
    slippageBasisPoints: bigint = BigInt(500),
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ): Promise<TransactionResult> {
    let sellTx = await this.getSellInstructionsByTokenAmount(
      seller.publicKey,
      mint,
      sellTokenAmount,
      slippageBasisPoints,
      commitment
    );

    let sellResults = await sendTx(
      this.connection,
      sellTx,
      seller.publicKey,
      [seller],
      priorityFees,
      commitment,
      finality
    );
    return sellResults;
  }

  //create token instructions
  async getCreateInstructions(
    creator: PublicKey,
    name: string,
    symbol: string,
    uri: string,
    mint: Keypair
  ) {
    const mplTokenMetadata = new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID);

    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(METADATA_SEED),
        mplTokenMetadata.toBuffer(),
        mint.publicKey.toBuffer(),
      ],
      mplTokenMetadata
    );

    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint.publicKey,
      this.getBondingCurvePDA(mint.publicKey),
      true
    );

    return this.program.methods
      .create(name, symbol, uri)
      .accounts({
        mint: mint.publicKey,
        associatedBondingCurve: associatedBondingCurve,
        metadata: metadataPDA,
        user: creator,
      })
      .signers([mint])
      .transaction();
  }

  async getBuyInstructionsBySolAmount(
    buyer: PublicKey,
    mint: PublicKey,
    buyAmountSol: bigint,
    slippageBasisPoints: bigint = BigInt(500),
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {
    let bondingCurveAccount = await this.getBondingCurveAccount(
      mint,
      commitment
    );
    if (!bondingCurveAccount) {
      throw new Error(`Bonding curve account not found: ${mint.toBase58()}`);      
    }

    let buyAmount = bondingCurveAccount.getBuyPrice(buyAmountSol);
    // let buyAmount = BigInt(1);
    let buyAmountWithSlippage = calculateWithSlippageBuy(
      buyAmountSol,
      slippageBasisPoints
    );

    let globalAccount = await this.getGlobalAccount(commitment);

    return await this.getBuyInstructions(
      buyer,
      mint,
      globalAccount.feeRecipient,
      buyAmount,
      buyAmountWithSlippage
    );
  }

  //buy
  async getBuyInstructions(
    buyer: PublicKey,
    mint: PublicKey,
    feeRecipient: PublicKey,
    amount: bigint,
    solAmount: bigint,
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {
    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint,
      this.getBondingCurvePDA(mint),
      true
    );

    const associatedUser = await getAssociatedTokenAddress(mint, buyer, false);

    let transaction = new Transaction();

    try {
      await getAccount(this.connection, associatedUser, commitment);
    } catch (e) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          buyer,
          associatedUser,
          buyer,
          mint
        )
      );
    }

    transaction.add(
      await this.program.methods
        .buy(new BN(amount.toString()), new BN(solAmount.toString()))
        .accounts({
          feeRecipient: feeRecipient,
          mint: mint,
          associatedBondingCurve: associatedBondingCurve,
          associatedUser: associatedUser,
          user: buyer,
        })
        .transaction()
    );

    return transaction;
  }

  //sell
  async getSellInstructionsByTokenAmount(
    seller: PublicKey,
    mint: PublicKey,
    sellTokenAmount: bigint,
    slippageBasisPoints: bigint = BigInt(500),
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {
    let bondingCurveAccount = await this.getBondingCurveAccount(
      mint,
      commitment
    );
    if (!bondingCurveAccount) {
      throw new Error(`Bonding curve account not found: ${mint.toBase58()}`);
    }

    let globalAccount = await this.getGlobalAccount(commitment);

    let minSolOutput = bondingCurveAccount.getSellPrice(
      sellTokenAmount,
      globalAccount.feeBasisPoints
    );

    let sellAmountWithSlippage = calculateWithSlippageSell(
      minSolOutput,
      slippageBasisPoints
    );

    return await this.getSellInstructions(
      seller,
      mint,
      globalAccount.feeRecipient,
      sellTokenAmount,
      sellAmountWithSlippage
    );
  }

  async getSellInstructions(
    seller: PublicKey,
    mint: PublicKey,
    feeRecipient: PublicKey,
    amount: bigint,
    minSolOutput: bigint
  ) {
    const associatedBondingCurve = await getAssociatedTokenAddress(
      mint,
      this.getBondingCurvePDA(mint),
      true
    );

    const associatedUser = await getAssociatedTokenAddress(mint, seller, false);

    let transaction = new Transaction();

    transaction.add(
      await this.program.methods
        .sell(new BN(amount.toString()), new BN(minSolOutput.toString()))
        .accounts({
          feeRecipient: feeRecipient,
          mint: mint,
          associatedBondingCurve: associatedBondingCurve,
          associatedUser: associatedUser,
          user: seller,
        })
        .transaction()
    );

    return transaction;
  }

  async getBondingCurveAccount(
    mint: PublicKey,
    commitment: Commitment = DEFAULT_COMMITMENT
  ) {
    const tokenAccount = await this.connection.getAccountInfo(
      this.getBondingCurvePDA(mint),
      commitment
    );
    if (!tokenAccount) {
      console.log("NULLLLLLLLLLLL");      
      return null;
    }
    return BondingCurveAccount.fromBuffer(tokenAccount!.data);
  }

  async getGlobalAccount(commitment: Commitment = DEFAULT_COMMITMENT) {
    const [globalAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(GLOBAL_ACCOUNT_SEED)],
      new PublicKey(PROGRAM_ID)
    );

    const tokenAccount = await this.connection.getAccountInfo(
      globalAccountPDA,
      commitment
    );

    return GlobalAccount.fromBuffer(tokenAccount!.data);
  }

  getBondingCurvePDA(mint: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(BONDING_CURVE_SEED), mint.toBuffer()],
      this.program.programId
    )[0];
  }

  async createTokenMetadata(create: CreateTokenMetadata) {
    const metadataURI = {
      "name": create.name,
      "symbol": create.symbol,
      "description": create.description,
      "image": create.file
    }

    const jsonFileName = `tokenData${create.name}.json`;
    const blob = new Blob([Buffer.from(JSON.stringify(metadataURI, null, 2))], { type: "application/json" });
    const file = new File([blob], jsonFileName, { type: "text/json" });
    
    const upload = await pinata.upload.file(file)
    const metadata = upload.IpfsHash;

    return `${process.env.IPFS_URL}/${metadata}`;
    
  }
  
  //EVENTS
  addEventListener<T extends PumpFunEventType>(
    eventType: T,
    callback: (
      event: PumpFunEventHandlers[T],
      slot: number,
      signature: string
    ) => void
  ) {
    return this.program.addEventListener(
      eventType,
      (event: any, slot: number, signature: string) => {
        let processedEvent;
        switch (eventType) {
          case "createEvent":
            processedEvent = toCreateEvent(event as CreateEvent);
            callback(
              processedEvent as PumpFunEventHandlers[T],
              slot,
              signature
            );
            break;
          case "tradeEvent":
            processedEvent = toTradeEvent(event as TradeEvent);
            callback(
              processedEvent as PumpFunEventHandlers[T],
              slot,
              signature
            );
            break;
          case "completeEvent":
            processedEvent = toCompleteEvent(event as CompleteEvent);
            callback(
              processedEvent as PumpFunEventHandlers[T],
              slot,
              signature
            );
            console.log("completeEvent", event, slot, signature);
            break;
          case "setParamsEvent":
            processedEvent = toSetParamsEvent(event as SetParamsEvent);
            callback(
              processedEvent as PumpFunEventHandlers[T],
              slot,
              signature
            );
            break;
          default:
            console.error("Unhandled event type:", eventType);
        }
      }
    );
  }

  removeEventListener(eventId: number) {
    this.program.removeEventListener(eventId);
  }
}
