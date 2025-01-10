import { Context, Markup } from "telegraf";
import { createCoinMarkUp } from "../models/markup.model";

const connectCoinAction = async (ctx: Context, next) => {
  try {
    if (!ctx.from) return;
    if (ctx.from.is_bot) {
      return
    }
    // console.log('ctx', ctx)
    await ctx.reply("Create Meme Coin ", createCoinMarkUp)
    next()
  } catch (error) {
    console.error(error);
  }
}

export { connectCoinAction };