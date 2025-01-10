import { Context } from "telegraf";
import { supportMarkUp } from "../models/markup.model";
const supportAction = async (ctx: Context, next) => {

  try {
    if (!ctx.from) return;
    if (ctx.from.is_bot) {
      return
    }

    // console.log('ctx', ctx)
    await ctx.reply("Contact our 24 / 7 support team via email : Tokifysolona@gmail.com", supportMarkUp)

    next()
  } catch (error) {
    console.error(error);
  }
};


export { supportAction };