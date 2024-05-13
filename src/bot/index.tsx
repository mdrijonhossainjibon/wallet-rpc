import { sendTransaction } from 'lib/sendTransaction';
import TelegramBot from 'node-telegram-bot-api';

// Replace 'YOUR_TOKEN' with your actual bot token
const botToken = '6314185706:AAF-Z1j1pe3CCDhcHxbWmfSqGuxzcshpGKk';

// Create a new instance of TelegramBot with your bot token
const bot = new TelegramBot(botToken, { polling: true });

// Listen for the /start command
// Store the user's current state
const userState : any = {};

interface userState {

}
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Initialize user state
    userState[chatId] = {};

    // Ask the user to enter their public key
    bot.sendMessage(chatId, "Hello! I'm cc_payment bot. How can I assist you?",{ reply_to_message_id : msg.message_id ,  });
});


const contractAddress: Record<string, string> = {
    'Dzook': '0xda879470d70845Da9efbD4884C8149a6Df4e50A1',
    'VivaFTN': '0xf93d24c03344b5e697ad83d59caa1c5817973365'
};

bot.onText(/\/send (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;

    try {
        // Check if match is not null
        if (match !== null) {

            const publicKey = match[1];
            const Transaction = new sendTransaction('https://rpc2.bahamut.io', publicKey);

            let to: string | undefined = undefined;
            let amount: string | undefined = undefined;;
            let symbol: string | undefined = undefined;

            const promptRecipient = await bot.sendMessage(chatId, `Please enter the recipient's address`, {
                reply_markup: { remove_keyboard: true },
                reply_to_message_id: msg.message_id
            });

            const replyToRecipient = async (replyMsg: TelegramBot.Message) => {
                to = replyMsg.text;
                const promptSymbol = await bot.sendMessage(chatId, `Please select a symbol`, {
                    parse_mode: 'Markdown',
                    reply_to_message_id: msg.message_id,
                    reply_markup: {
                        keyboard: [[{ text: 'Dzook' }, { text: 'VivaFTN' }]],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                    },
                });

                const replyToSymbol = async (replyMsg: TelegramBot.Message) => {
                    symbol = replyMsg.text;
                    const promptAmount = await bot.sendMessage(chatId, `Please enter the amount`, {
                        reply_markup: { remove_keyboard: true },
                        reply_to_message_id: msg.message_id
                    });

                    const replyToAmount = async (replyMsg: TelegramBot.Message) => {
                        amount = replyMsg.text;
                        // Now you have all the required parameters, you can proceed with the transaction
                        try {
                           const tx = await Transaction.ERC20Transfer(to as string, amount as string, contractAddress[symbol as string]);
                            
                           await bot.sendMessage(chatId, `Transaction initiated! ✅ ${ tx.hash }`, { reply_to_message_id: msg.message_id });
                        } catch (error: any) {
                            await bot.sendMessage(chatId, error.message, { reply_to_message_id: msg.message_id });
                        }
                    };
                    bot.onReplyToMessage(promptAmount.chat.id, promptAmount.message_id, replyToAmount);
                };
                bot.onReplyToMessage(promptSymbol.chat.id, promptSymbol.message_id, replyToSymbol);
            };
            bot.onReplyToMessage(promptRecipient.chat.id, promptRecipient.message_id, replyToRecipient);
        } else {
            // Handle the case where match is null
            await bot.sendMessage(chatId, "Invalid /send command. Please provide all required parameters.");
        }
    } catch (error: any) {
        
        await bot.sendMessage(chatId, error.message);
    }
});



bot.onText(/\/gas (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    try {
        if (match !== null) {
            const address = match[1];
            const Transaction = new sendTransaction('https://rpc2.bahamut.io', '0xe670ee1c4e039c8ca28e61d0afa621fc29ab576f14ac44e81cc15b121c8ac862');
          const { response  , status } =  await Transaction.Transfer(address, '0.005');
          if(status === 200){
           return await bot.sendMessage(chatId, 'Gas transfer initiated! ✅',{ reply_to_message_id: msg.message_id });
          }
          await bot.sendMessage(chatId, `❌ Error: ${response}`,{ reply_to_message_id: msg.message_id });
        }
    } catch (error: any) {
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`,{ reply_to_message_id: msg.message_id });
    }
});
