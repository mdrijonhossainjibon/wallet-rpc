import { TypeApiPromise } from 'API_CALL';
import { sendTransaction, sendTransactionSui } from 'lib/sendTransaction';
import TelegramBot, { Message } from 'node-telegram-bot-api';

// Replace 'YOUR_TOKEN' with your actual bot token
const botToken =  '6314185706:AAF-Z1j1pe3CCDhcHxbWmfSqGuxzcshpGKk';
//'6513589857:AAHBHCj1Z_M_4OMEYjWS147V7rnmCx9q_P0' 
// Create a new instance of TelegramBot with your bot token
const bot = new TelegramBot(botToken, { polling: true });

// Listen for the /start command
// Store the user's current state
const userState: any = {};

interface userState {

}


// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Initialize user state
    userState[chatId] = {};

    // Send a welcome message and ask for the public key
    bot.sendMessage(chatId, "Hello! I'm cc_payment bot. How can I assist you?", {
        reply_to_message_id: msg.message_id,
        reply_markup: {
            keyboard: [
                [{ text: 'Gas ⛽️' }, { text: 'Main Menu 🏠' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
});




const contractAddress: Record<string, string> = {
    'Dzook': '0xda879470d70845Da9efbD4884C8149a6Df4e50A1',
    'VivaFTN': '0xf93d24c03344b5e697ad83d59caa1c5817973365',
    'OCEAN': '0xa8816d3a6e3136e86bc2873b1f94a15cadc8af2703c075f2d546c2ae367f4df9::ocean::OCEAN'
};


 
 



type NetworkType = 'FTN' | 'SUI';
let result: any

bot.on('message', async (msg: Message) => {

    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === 'Gas ⛽️') {
        bot.sendMessage(chatId, "Select your network:", {
            reply_markup: {
                keyboard: [
                    [{ text: 'FTN' }, { text: 'SUI' }],
                    [{ text: 'Back 🔙' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }, reply_to_message_id: msg.message_id
        }).then((sentMessage) => {
            bot.onReplyToMessage(sentMessage.chat.id, sentMessage.message_id, async (networkReply) => {
                const network = networkReply.text as NetworkType;

                bot.sendMessage(chatId, `You selected: ${network}. Please enter the address:`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' }).then((addressMessage) => {
                    bot.onReplyToMessage(addressMessage.chat.id, addressMessage.message_id, async (addressReply) => {
                        const address = addressReply.text;

                        try {
                            if (network === 'FTN') {
                                await sendFTN(address as string, addressMessage);
                            } else if (network === 'SUI') {
                                //await sendSUI(address as string, addressMessage);
                            }
                        } catch (error: any) {
                            await bot.sendMessage(chatId, `Error processing address: ${error.message}`, { reply_to_message_id: msg.message_id });
                        }
                    });
                });
            });
        }).catch(error => {
            bot.sendMessage(chatId, `Error displaying network selection: ${error.message}`, { reply_to_message_id: msg.message_id });
        });
    } else if (text === 'Main Menu 🏠') {
        bot.sendMessage(chatId, "Returning to Main Menu 🏠.", {
            reply_markup: {
                keyboard: [
                    [{ text: 'Gas ⛽️' }, { text: 'Main Menu 🏠' }],
                    [{ text: 'Send ✔️' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }, reply_to_message_id: msg.message_id
        }).catch(error => {
            bot.sendMessage(chatId, `Error displaying main menu: ${error.message}`, { reply_to_message_id: msg.message_id });
        });
    } else if (text === 'Back 🔙') {
        bot.sendMessage(chatId, "Going back 🔙.", {
            reply_markup: {
                keyboard: [
                    [{ text: 'Gas ⛽️' }, { text: 'Main Menu 🏠' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }, reply_to_message_id: msg.message_id
        }).catch(error => {
            bot.sendMessage(chatId, `Error going back: ${error.message}`, { reply_to_message_id: msg.message_id });
        });
    } else if (text === 'Send ✔️') {
        bot.sendMessage(chatId, "Select your network:", {
            reply_markup: {
                keyboard: [
                    [{ text: 'FTN' }, { text: 'SUI' }],
                    [{ text: 'Back 🔙' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }, reply_to_message_id: msg.message_id
        }).then((promptNetwork) => {
            bot.onReplyToMessage(promptNetwork.chat.id, promptNetwork.message_id, async (networkReply) => {
                const network = networkReply.text as NetworkType;

                const promptPrivateKey = await bot.sendMessage(chatId, "Please enter the private key", {
                    reply_markup: { remove_keyboard: true }, reply_to_message_id: msg.message_id
                });

                bot.onReplyToMessage(promptPrivateKey.chat.id, promptPrivateKey.message_id, async (privateKeyReply) => {
                    const privateKey = privateKeyReply.text;
                    let Transaction: any;

                    try {
                        if (network === 'FTN') {
                            Transaction = new sendTransaction('https://rpc2.bahamut.io', privateKey as string);
                        } else if (network === 'SUI') {
                            Transaction = new sendTransactionSui(privateKey as string);
                        }
                    } catch (error: any) {
                        return bot.sendMessage(chatId, `Error initiating transaction: ${error.message}`, { reply_to_message_id: msg.message_id });
                    }

                    const promptRecipient = await bot.sendMessage(chatId, "Please enter the recipient's address", {
                        reply_markup: { remove_keyboard: true }, reply_to_message_id: msg.message_id
                    });

                    bot.onReplyToMessage(promptRecipient.chat.id, promptRecipient.message_id, async (recipientReply) => {
                        const recipient = recipientReply.text;
                        const promptAmount = await bot.sendMessage(chatId, "Please enter the amount to send", {
                            reply_markup: { remove_keyboard: true }, reply_to_message_id: msg.message_id
                        });

                        const SELECT = (network: NetworkType) => {
                            if (network === 'SUI') {
                                return [[{ text: 'Sui' }, { text: 'OCEAN' }],[{ text: 'Back 🔙' }]];
                            }
                            return [[{ text: 'Dzook' }, { text: 'VivaFTN' }], [{ text: 'FTN' }],[{ text: 'Back 🔙' }]];
                        };
                        

                        bot.onReplyToMessage(promptAmount.chat.id, promptAmount.message_id, async (amountReply) => {
                            const amount = amountReply.text;
                            const promptSymbol = await bot.sendMessage(chatId, "Please enter the symbol", {
                                reply_markup: { keyboard: SELECT(network) , 
                                resize_keyboard: true,
                                one_time_keyboard: true }, reply_to_message_id: msg.message_id
                            });

                            bot.onReplyToMessage(promptSymbol.chat.id, promptSymbol.message_id, async (symbolReply) => {
                                const symbol = symbolReply.text;

                                try {
                                    if (network === 'FTN') {
                                        if (symbol === 'FTN') {
                                            result = await Transaction.Transfer(recipient as string, amount as string);
                                        } else {
                                            result = await Transaction.ERC20Transfer(recipient as string, amount as string, contractAddress[symbol as string]);
                                        }
                                        await bot.sendMessage(chatId, `Transaction initiated! ✅ [View Transaction](https://www.ftnscan.com/tx/${result.hash}) 🔗`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' , reply_markup : {
                                            keyboard : [ [{ text: 'Send ✔️' },{ text: 'Back 🔙' }] ] , resize_keyboard : true
                                        }});
                                    } else if (network === 'SUI') {
                                        if (symbol === 'OCEAN') {
                                            result = await Transaction.SuiTransferToken(recipient as string, amount as string, contractAddress[symbol as string]);
                                        } else {
                                            result = await Transaction.SuiTransfer(recipient as string, amount as string);
                                        }
                                        await bot.sendMessage(chatId, `Transaction initiated! ✅ [View Transaction](https://suiscan.xyz/mainnet/tx/${result.digest}) 🔗`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' , reply_markup : {
                                            keyboard : [ [{ text: 'Send ✔️' },{ text: 'Back 🔙' }] ], resize_keyboard : true
                                        }});
                                    }
                                } catch (error: any) {
                                    await bot.sendMessage(chatId, `Error initiating transaction: ${error.message}`, { reply_to_message_id: msg.message_id });
                                }
                            });
                        });
                    });
                });
            });
        }).catch(error => {
            bot.sendMessage(chatId, `Error displaying network selection: ${error.message}`);
        });
    }
});








async function sendFTN(to: string, msg: TelegramBot.Message , network : NetworkType) {
    const chatId = msg.chat.id;
    try {
        if (to !== null) {

            let Transaction :any
            
            if(network === 'FTN'){
                Transaction =  new sendTransaction('https://rpc2.bahamut.io', '0xe670ee1c4e039c8ca28e61d0afa621fc29ab576f14ac44e81cc15b121c8ac862');
                const { response, status } = await Transaction.Transfer(to, '0.005');
            if (status === 200) {
                if (response?.error) {
                    return await bot.sendMessage(chatId, `❌ Error: ${response.error.message}`, { reply_to_message_id: msg.message_id });
                }
                return await bot.sendMessage(chatId, `Transaction initiated! ✅ [View Transaction](https://www.ftnscan.com/tx/${response?.result}) 🔗`, {
                    reply_to_message_id: msg.message_id, parse_mode: 'Markdown', reply_markup: {
                        keyboard: [
                            [{ text: 'Gas ⛽️' }, { text: 'Main Menu 🏠' }],
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
            }


            await bot.sendMessage(chatId, `❌ Error: ${response}`, { reply_to_message_id: msg.message_id , reply_markup : {
                keyboard: [
                    [{ text: 'Gas ⛽️' }, { text: 'Main Menu 🏠' }],
                ],
                resize_keyboard: true,
                one_time_keyboard: true
            }});
            }
            if(network === 'SUI'){
                Transaction = new sendTransactionSui('suiprivkey1qp4xa6t04px6grkfqxz99s08ntl9ewjta7e7uxt0am2prxd6x9znjvqhh5d')
               const result = await Transaction.SuiTransfer(to as string, '0.01');
               await bot.sendMessage(chatId, `Transaction initiated! ✅ [View Transaction](https://suiscan.xyz/mainnet/tx/${result.digest}) 🔗`, { reply_to_message_id: msg.message_id, parse_mode: 'Markdown' , reply_markup : {
                keyboard : [ [{ text: 'Gas ⛽️' }, { text: 'Main Menu 🏠' }] ], resize_keyboard : true
            }});
            }
        }
    } catch (error: any) {
        await bot.sendMessage(chatId, `❌ Error: ${error.message}`, { reply_to_message_id: msg.message_id , reply_markup : {
            keyboard: [
                [{ text: 'Gas ⛽️' }, { text: 'Main Menu 🏠' }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        } });
    }
}