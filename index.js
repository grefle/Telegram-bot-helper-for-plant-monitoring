const TelegramBot = require('node-telegram-bot-api');
const token = '6461556392:AAEECLgnBQWKCMoahhH2HEe4U5dFQme7yPQ';
const mongoose = require('mongoose');
const Plant = require('./database');
const axios = require('axios');

const bot = new TelegramBot(token, { polling: true });
const serverURL = 'http://localhost:3000';
const myPlantsURL = `${serverURL}/myPlants`;

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

bot.onText(/Додати рослину/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Введіть назву рослини:');

    bot.once('text', (msg) => {
        const plantData = { name: msg.text };
        bot.sendMessage(chatId, 'Введіть біологічну назву рослини:');

        bot.once('text', (msg) => {
            plantData.scientificName = msg.text;
            bot.sendMessage(chatId, 'Введіть періодичність поливання (в днях):');

            bot.once('text', (msg) => {
                plantData.wateringInterval = parseInt(msg.text);
                bot.sendMessage(chatId, 'Введіть умови проростання:');

                bot.once('text', (msg) => {
                    plantData.germinationConditions = msg.text;
                    bot.sendMessage(chatId, 'Введіть час останнього поливання (у форматі YYYY-MM-DD):');

                    bot.once('text', (msg) => {
                        plantData.lastWatered = new Date(msg.text);
                        bot.sendMessage(chatId, 'Введіть посилання на фото рослини:');

                        bot.once('text', (msg) => {
                            plantData.photoURL = msg.text;

                            // Збереження рослини в базу даних
                            const newPlant = new Plant(plantData);
                            newPlant.save()
                                .then(() => {
                                    bot.sendMessage(chatId, 'Рослину додано до бази даних.');
                                })
                                .catch((error) => {
                                    bot.sendMessage(chatId, `Помилка: ${error}`);
                                });
                        });
                    });
                });
            });
        });
    });
});

bot.onText(/Мої рослини/, (msg) => {
    const chatId = msg.chat.id;

    // Отримання інформації про рослини з сервера
    axios.get(myPlantsURL)
        .then((response) => {
            const plants = response.data;

            if (plants.length === 0) {
                bot.sendMessage(chatId, 'У вас ще немає збережених рослин.');
            } else {
                const tableHeader = 'Назва | Біологічна назва | Полив (дні) | Умови проростання | Останній полив | Фото\n';
                const tableRows = plants.map(plant => {
                    return `${plant.name} | ${plant.scientificName} | ${plant.wateringInterval} | ${plant.germinationConditions} | ${plant.lastWatered} | ${plant.photoURL}`;
                }).join('\n');

                const table = tableHeader + tableRows;
                bot.sendMessage(chatId, `\`\`\`${table}\`\`\``, { parse_mode: 'Markdown' });
            }
        })
        .catch((error) => {
            bot.sendMessage(chatId, `Помилка: ${error}`);
        });
});
