const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');

// إعداد Express
const app = express();
const PORT = process.env.PORT || 3000;

// إعداد البوت
const TOKEN = "8481752278:AAHs9O3Ilf0LRTJPIAhpdC92gC3_ufME78g";
const bot = new TelegramBot(TOKEN, { polling: true });

// متغيرات الحالة
let BOT_STATUS = "running";
const DEVELOPER_ID = 8139358951;
const BLOCKED_USERS = new Set();
const USER_DATABASE = new Set();
const BOT_RATINGS = {};
const USER_RATING_DATA = {};
const DEVELOPER_WAITING_FOR_INPUT = {};
const games = {};
const userContext = {};

// روابط الأزرار
const LINKS = {
    "btn1": "https://timely-yeot-254806.netlify.app/?chatId={user_id}",
    "btn2": "https://dainty-sfogliatella-b83536.netlify.app/?chatId={user
