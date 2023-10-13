const TelegramBot = require('node-telegram-bot-api');
const token = '6461556392:AAEECLgnBQWKCMoahhH2HEe4U5dFQme7yPQ';

const mongoose = require('mongoose');
const Plant = require('./database');
const axios = require('axios');

const serverURL = 'http://localhost:27017';
const myPlantsURL = `${serverURL}/myPlants`;
const addPlantURL = `${serverURL}/addPlant`;
const remindersURL = `${serverURL}/reminders`;

const bot = new TelegramBot(token, { polling: true });

const mainMenuKeyboard = {
    keyboard: [
        [{ text: 'Додати рослину' }],
        [{ text: 'Мої рослини' }, { text: 'Мої нагадування' }],
        [{ text: 'Справка про користування ботом' }]
    ],
    resize_keyboard: true
};

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Виберіть опцію:', { reply_markup: mainMenuKeyboard });
});

bot.onText(/Додати рослину/, (msg) => {
    const chatId = msg.chat.id;
    const plantData = {};

    bot.sendMessage(chatId, 'Введіть назву рослини:');

    bot.once('text', (msg) => {
        plantData.name = msg.text;

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

                        bot.sendMessage(chatId, 'Надішліть фото рослини:');

                        bot.once('photo', async (msg) => {
                            // Отримання фото рослини
                            const photo = msg.photo;
                            const photoUrl = photo[photo.length - 1].file_id;

                            plantData.photoURL = photoUrl;

                            // Надсилання даних на сервер
                            try {
                                const response = await axios.post(addPlantURL, plantData);
                                bot.sendMessage(chatId, response.data);
                            } catch (error) {
                                bot.sendMessage(chatId, `Помилка: ${error}`);
                            }

                            // Надіслати клавіатуру з головними кнопками після додавання рослини
                            bot.sendMessage(chatId, 'Виберіть опцію:', { reply_markup: mainMenuKeyboard });
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

bot.onText(/Мої рослини/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const response = await axios.get(myPlantsURL);
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
    } catch (error) {
        bot.sendMessage(chatId, `Помилка: ${error}`);
    }
});

bot.onText(/Редагувати рослину/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Введіть номер рослини, яку ви хочете редагувати:');
});

const editingPlant = {};

let isEditing = false;  // Глобальна змінна для відстеження стану редагування

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    // Перевірка введеного користувачем номера рослини для редагування
    if (/^\d+$/.test(messageText)) {
        const plantIndex = parseInt(messageText) - 1;
        try {
            const response = await axios.get(myPlantsURL);
            const plants = response.data;

            if (plantIndex >= 0 && plantIndex < plants.length) {
                const plant = plants[plantIndex];
                editingPlant[chatId] = plant;  // Збереження обраної рослини для редагування

                // Оновлений код: перевірка на існування рослини перед виведенням інформації
                if (plant) {
                    bot.sendMessage(chatId, `Обрана рослина для редагування:\nНазва: ${plant.name}\nБіологічна назва: ${plant.scientificName}\nПолив (дні): ${plant.wateringInterval}\nУмови проростання: ${plant.germinationConditions}\nОстанній полив: ${plant.lastWatered}\nФото: ${plant.photoURL}\n\nВведіть нову інформацію для редагування у відповідному форматі (наприклад, "назва: Нова рослина").`);
                } else {
                    bot.sendMessage(chatId, 'Помилка: Рослина для редагування не знайдена.');
                }
            } else {
                bot.sendMessage(chatId, 'Невірний номер рослини. Спробуйте ще раз.');
            }
        } catch (error) {
            bot.sendMessage(chatId, `Помилка: ${error}`);
        }
    } else {
        // Перевірка чи триває редагування рослини
        if (isEditing) {
            // Редагування рослини
            const selectedPlant = editingPlant[chatId];
            if (selectedPlant) {
                const updatedPlantData = parseUserInput(messageText);
                await updatePlantInfo(selectedPlant._id, updatedPlantData);

                bot.sendMessage(chatId, 'Інформацію про рослину оновлено.');
                isEditing = false;  // Закінчено редагування
            } else {
                bot.sendMessage(chatId, 'Необрана рослина для редагування. Виберіть рослину для редагування спочатку.');
            }
        } else {
            // Реакція на звичайне повідомлення від користувача
        }
    }
});

async function updatePlantInfo(plantId, updatedData) {
    try {
        const response = await axios.put(`${serverURL}/updatePlant/${plantId}`, updatedData);
        return response.data;
    } catch (error) {
        throw new Error(`Помилка оновлення інформації про рослину: ${error.message}`);
    }
}


// Функція для розбору введеної користувачем інформації
function parseUserInput(input) {
    const data = {};
    const lines = input.split('\n');
    lines.forEach(line => {
        const [key, value] = line.split(':').map(item => item.trim());
        data[key.toLowerCase()] = value;
    });
    return data;
}

bot.onText(/Видалити рослину/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Введіть номер рослини, яку ви хочете видалити:');
});

bot.onText(/Мої нагадування/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        const response = await axios.get(remindersURL);
        const reminders = response.data;

        if (reminders.length === 0) {
            bot.sendMessage(chatId, 'У вас немає наявних нагадувань.');
        } else {
            const reminderList = reminders.map((reminder, index) => {
                return `${index + 1}. ${reminder.text}`;
            }).join('\n');
            bot.sendMessage(chatId, `Наявні нагадування:\n${reminderList}`);
        }
    } catch (error) {
        bot.sendMessage(chatId, `Помилка: ${error}`);
    }
});

bot.onText(/Справка про користування ботом/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
Справка про користування ботом:

1. *Додати рослину*: Дозволяє вам додати нову рослину та вказати її параметри.
2. *Мої рослини*: Переглянути список доданих рослин.
3. *Мої нагадування*: Переглянути наявні нагадування.
4. *Справка про користування ботом*: Показати цей текст з інструкціями.

Для отримання інформації про кожну команду введіть /help_команда.
Наприклад, /help_додатирослину для отримання довідки щодо команди "Додати рослину".
  `;
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});
