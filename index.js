const TelegramBot = require('node-telegram-bot-api');
const token = '6461556392:AAEECLgnBQWKCMoahhH2HEe4U5dFQme7yPQ';

const bot = new TelegramBot(token, { polling: true });

const keyboard = {
    reply_markup: {
        keyboard: [
            ['Додати рослину'],
            ['Мої рослини'],
            ['Мої нагадування'],
            ['Справка про користування ботом']
        ],
        resize_keyboard: true
    }
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = 'Вітаю! Це ваш бот для нагадування про полив та ухід за рослинами.';
    bot.sendMessage(chatId, welcomeMessage, keyboard);
});

// ... Решта коду

