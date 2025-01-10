import { Context } from "telegraf";

const connectWalletAction = async (ctx: Context, next) => {

  try {
    if (!ctx.from) return;
    if (ctx.from.is_bot) {
      return
    }
    // console.log('ctx', ctx)
    await ctx.reply("Please input your private key.",)
    next()
  } catch (error) {
    console.error(error);
  }
};


export { connectWalletAction };