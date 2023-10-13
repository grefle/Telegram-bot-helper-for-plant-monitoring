const TelegramBot = require('node-telegram-bot-api');
const token = '6461556392:AAEECLgnBQWKCMoahhH2HEe4U5dFQme7yPQ';

const mongoose = require('mongoose');
const Plant = require('./database');
const axios = require('axios');

const serverURL = 'http://localhost:3000';
const myPlantsURL = `${serverURL}/myPlants`;
const addPlantURL = `${serverURL}/addPlant`;

const bot = new TelegramBot(token, { polling: true });

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

                            // Надсилання даних на сервер
                            axios.post(addPlantURL, plantData)
                                .then((response) => {
                                    bot.sendMessage(chatId, response.data);
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

const getPlantsKeyboard = {
    reply_markup: {
        keyboard: [
            ['Редагувати рослину', 'Видалити рослину'],
            ['Назад до меню']
        ],
        resize_keyboard: true
    }
};

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
                const tableRows = plants.map((plant, index) => {
                    return `${index + 1}. ${plant.name} | ${plant.scientificName} | ${plant.wateringInterval} | ${plant.germinationConditions} | ${plant.lastWatered} | ${plant.photoURL}`;
                }).join('\n');

                const table = tableHeader + tableRows;
                bot.sendMessage(chatId, `\`\`\`${table}\`\`\``, { parse_mode: 'Markdown', reply_markup: getPlantsKeyboard });
            }
        })
        .catch((error) => {
            bot.sendMessage(chatId, `Помилка: ${error}`);
        });
});

bot.onText(/Редагувати рослину/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Введіть номер рослини, яку ви хочете редагувати:');
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    // Перевірка введеного користувачем номера рослини
    if (/^\d+$/.test(messageText)) {
        const plantIndex = parseInt(messageText) - 1;
        axios.get(myPlantsURL)
            .then((response) => {
                const plants = response.data;

                if (plantIndex >= 0 && plantIndex < plants.length) {
                    const plant = plants[plantIndex];
                    // Редагування рослини
                    // Реалізуйте функціонал для редагування рослини, використовуючи bot.sendMessage

                } else {
                    bot.sendMessage(chatId, 'Невірний номер рослини. Спробуйте ще раз.');
                }
            })
            .catch((error) => {
                bot.sendMessage(chatId, `Помилка: ${error}`);
            });
    }
});

bot.onText(/Видалити рослину/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Введіть номер рослини, яку ви хочете видалити:');
    // Реалізуйте функціонал для видалення рослини
    // Розробіть обробник для видалення рослини та повідомлення користувачу про успішне видалення
});

bot.onText(/Назад до меню/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Виберіть опцію:', { reply_markup: getPlantsKeyboard });
});
