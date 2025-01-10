
import { MainText } from "../src/message";
import { mainMarkUp, } from "../models/markup.model";

const startCommand = async (ctx) => {
  try {
    const chatId = ctx.chat.id;

    console.log(chatId);

    const currentMessage = await ctx.reply(MainText, mainMarkUp);
    // ctx.session.prevState = "";
  } catch (error) {
    console.error(error);
  }
};

const helpCommand = (ctx) => {
  try {
    ctx.reply(
      `You can control me by sending these commands:\n\n/start - start the bot\n\n/activate - activate you account\n`
    );
  } catch (error) {
    console.error(error);
  }
};


export { startCommand, helpCommand, };
