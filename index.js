const TelegramBot = require('node-telegram-bot-api');
const token = '6461556392:AAEECLgnBQWKCMoahhH2HEe4U5dFQme7yPQ';

const bot = new TelegramBot(token, { polling: true });

const { MongoClient } = require('mongodb');
const axios = require('axios');

const serverURL = 'http://localhost:3000';
const myPlantsURL = `${serverURL}/myPlants`;
const addPlantURL = `${serverURL}/addPlant`;
const remindersURL = `${serverURL}/reminders`;

// Змінні для відстеження стану редагування та вибору рослини для редагування
let isEditing = false;
let addPlantProcess = {};  // Об'єкт для відстеження процесу додавання рослини для кожного користувача
let editingPlant = {}; // Об'єкт для зберігання обраної рослини для редагування

const mainMenuKeyboard = {
    keyboard: [
        [{ text: 'Додати рослину' }],
        [{ text: 'Мої рослини' }, { text: 'Мої нагадування' }],
        [{ text: 'Справка про користування ботом' }]
    ],
    resize_keyboard: true
};

// Обробка команди /cancel для скасування процесу додавання або редагування рослини
bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    if (editingPlant[chatId]) {
        delete editingPlant[chatId];  // Видалення обраної рослини для редагування
        bot.sendMessage(chatId, 'Редагування рослини скасовано.', { reply_markup: mainMenuKeyboard });
    } else if (addPlantProcess[chatId]) {
        delete addPlantProcess[chatId];  // Видалення процесу додавання для користувача
        bot.sendMessage(chatId, 'Процес додавання рослини скасовано.', { reply_markup: mainMenuKeyboard });
    }
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (messageText === '/start') {
        bot.sendMessage(chatId, 'Вітаю! я бот, який допоможе вам зберігати інформацію про ваші рослини! ' +
            'Будь ласка скористайтеся командою ' +
            '"Справка про користування ботом" для більш детальної інформації.\n' +
            'Будь ласка виберіть опцію:', { reply_markup: mainMenuKeyboard });
    } else if (messageText === 'Додати рослину') {
        addPlantProcess[chatId] = { step: 1, plantData: { userId: chatId } };  // Додаємо userId до plantData
        bot.sendMessage(chatId, 'Введіть назву рослини або /cancel для скасування:');
    } else if (addPlantProcess[chatId]) {
        const { step, plantData } = addPlantProcess[chatId];
        switch (step) {
            case 1:
                plantData.name = messageText;
                addPlantProcess[chatId].step = 2;
                bot.sendMessage(chatId, 'Введіть біологічну назву рослини або /cancel для скасування:');
                break;
            case 2:
                plantData.scientificName = messageText;
                addPlantProcess[chatId].step = 3;
                bot.sendMessage(chatId, 'Введіть періодичність поливання (в днях) або /cancel для скасування:');
                break;
            case 3:
                plantData.wateringInterval = parseInt(messageText);
                addPlantProcess[chatId].step = 4;
                bot.sendMessage(chatId, 'Введіть умови проростання або /cancel для скасування:');
                break;
            case 4:
                plantData.germinationConditions = messageText;
                addPlantProcess[chatId].step = 5;
                bot.sendMessage(chatId, 'Введіть час останнього поливання (у форматі YYYY-MM-DD) або /cancel для скасування:');
                break;
            case 5:
                plantData.lastWatered = new Date(messageText);
                try {
                    const response = await axios.post(addPlantURL, plantData);
                    await bot.sendMessage(chatId, response.data);
                } catch (error) {
                    await bot.sendMessage(chatId, `Помилка: ${error}`);
                }
                await bot.sendMessage(chatId, 'Виберіть опцію:', { reply_markup: mainMenuKeyboard });
                delete addPlantProcess[chatId];
                break;
        }
    } else if (isEditing && editingPlant[chatId]) {
        const updatedData = parseUserInput(messageText);
        try {
            await updatePlantInfo(editingPlant[chatId]._id, updatedData);
            await bot.sendMessage(chatId, 'Інформацію про рослину успішно оновлено.', { reply_markup: mainMenuKeyboard });
            isEditing = false;
            delete editingPlant[chatId];
        } catch (error) {
            await bot.sendMessage(chatId, `Помилка оновлення інформації про рослину: ${error.message}`, { reply_markup: mainMenuKeyboard });
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

function parseUserInput(input) {
    const data = {};
    const lines = input.split('\n');
    lines.forEach(line => {
        const [key, ...valueParts] = line.split(':').map(item => item.trim());
        const value = valueParts.join(':').trim();

        switch (key.toLowerCase()) {
            case 'назва':
                data.name = value;
                break;
            case 'біологічна назва':
                data.scientificName = value;
                break;
            case 'періодичність поливання':
                data.wateringInterval = parseInt(value, 10);
                break;
            case 'умови проростання':
                data.germinationConditions = value;
                break;
            case 'час останнього поливання':
                data.lastWatered = new Date(value);
                break;
            default:
                console.warn(`Невідомий ключ: ${key}`);
        }
    });
    return data;
}

// Команда Мої рослини для перегляду списку доданих рослин
bot.onText(/Мої рослини/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const response = await axios.get(myPlantsURL, { params: { userId: chatId } });
        const plants = response.data;
        if (plants.length === 0) {
            await bot.sendMessage(chatId, 'У вас ще немає збережених рослин.', { reply_markup: mainMenuKeyboard });
        } else {
            const keyboard = {
                inline_keyboard: plants.map((plant, index) => [
                    { text: plant.name, callback_data: `select_${index}` }
                ])
            };
            await bot.sendMessage(chatId, 'Ваші рослини:', { reply_markup: keyboard });
        }
    } catch (error) {
        await bot.sendMessage(chatId, `Помилка: ${error}`, { reply_markup: mainMenuKeyboard });
    }
});

// Обробка вибору рослини для перегляду деталей
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const plantIndex = parseInt(data.split('_')[1]);
    const action = data.split('_')[0];

    try {
        const response = await axios.get(myPlantsURL, { params: { userId: chatId } });
        const plants = response.data;
        const selectedPlant = plants[plantIndex];

        if (action === 'select') {
            const keyboard = {
                inline_keyboard: [
                    [{ text: 'Редагувати', callback_data: `edit_${plantIndex}` }],
                    [{ text: 'Видалити', callback_data: `delete_${plantIndex}` }]
                ]
            };
            const message = `Назва: ${selectedPlant.name}\nБіологічна назва: ${selectedPlant.scientificName}\nПеріодичність поливання: ${selectedPlant.wateringInterval || 'Не вказано'}\nУмови проростання: ${selectedPlant.germinationConditions || 'Не вказано'}\nОстанній полив: ${selectedPlant.lastWatered ? new Date(selectedPlant.lastWatered).toISOString().split('T')[0] : 'Не вказано'}`;
            bot.sendMessage(chatId, message, { reply_markup: keyboard });

        } else if (action === 'edit') {
            isEditing = true;
            editingPlant[chatId] = selectedPlant;
            const promptMessage = 'Введіть нову інформацію про рослину у форматі або /cancel для скасування:\n' +
                'назва: нова назва\n' +
                'біологічна назва: нова біологічна назва\n' +
                'періодичність поливання: нова періодичність (у днях)\n' +
                'умови проростання: нові умови\n' +
                'час останнього поливання: новий час (у форматі YYYY-MM-DD)';
            bot.sendMessage(chatId, promptMessage);

        } else if (action === 'delete') {
            await axios.delete(`${serverURL}/deletePlant/${selectedPlant._id}`);
            bot.sendMessage(chatId, 'Рослину успішно видалено.', { reply_markup: mainMenuKeyboard });
        }
    } catch (error) {
        bot.sendMessage(chatId, `Помилка: ${error}`, { reply_markup: mainMenuKeyboard });
    }
});

// Команда Мої нагадування для перевірки рослин, які потребують поливу
bot.onText(/Мої нагадування/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const response = await axios.get(myPlantsURL, { params: { userId: chatId } });
        const plants = response.data;
        if (plants.length === 0) {
            await bot.sendMessage(chatId, 'У вас немає збережених рослин.', { reply_markup: mainMenuKeyboard });
        } else {
            let message = 'Рослини, які потребують поливу:\n\n';
            let anyPlantsNeedWatering = false;
            plants.forEach((plant, index) => {
                const lastWatered = new Date(plant.lastWatered);
                const wateringInterval = plant.wateringInterval;
                const nextWateringDate = new Date(lastWatered.getTime() + wateringInterval * 24 * 60 * 60 * 1000);
                const currentDate = new Date();
                if (currentDate >= nextWateringDate) {
                    anyPlantsNeedWatering = true;
                    message += `${index + 1}. ${plant.name}\n   Останній полив: ${lastWatered.toLocaleDateString()}\n   Наступний полив: ${nextWateringDate.toLocaleDateString()}\n\n`;
                }
            });
            if (anyPlantsNeedWatering) {
                await bot.sendMessage(chatId, message);
            } else {
                await bot.sendMessage(chatId, 'Наразі всі ваші рослини политі вчасно.', { reply_markup: mainMenuKeyboard });
            }
        }
    } catch (error) {
        await bot.sendMessage(chatId, `Помилка: ${error.message}`, { reply_markup: mainMenuKeyboard });
    }
});

// Команда Справка про користування ботом для відображення інструкцій користувачеві
bot.onText(/Справка про користування ботом/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
Справка про користування ботом:

1. *Додати рослину*: Дозволяє вам додати нову рослину та вказати її параметри.
2. *Мої рослини*: Переглянути список доданих рослин.
3. *Мої нагадування*: Переглянути наявні нагадування.
4. *Справка про користування ботом*: Показати цей текст з інструкціями.`;
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});
