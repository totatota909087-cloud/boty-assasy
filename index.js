const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// إعداد Express للويب
const app = express();
const PORT = process.env.PORT || 3000;

// إعداد البوت
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8481752278:AAHs9O3Ilf0LRTJPIAhpdC92gC3_ufME78g";
const bot = new TelegramBot(TOKEN, { polling: true });

// متغيرات الحالة
let BOT_STATUS = "running";
const DEVELOPER_ID = parseInt(process.env.DEVELOPER_ID) || 8139358951;
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
    "btn2": "https://dainty-sfogliatella-b83536.netlify.app/?chatId={user_id}",
    "btn3": "https://chic-puppy-165560.netlify.app/?chatId={user_id}",
    "btn4": "https://luxury-sunflower-a08816.netlify.app/?chatId={user_id}",
    "btn5": "https://neon-tartufo-b38ebc.netlify.app/?chatId={user_id}",
    "btn6": "https://delightful-meerkat-062d34.netlify.app/?chatId={user_id}",
    "btn7": "https://rad-arithmetic-171367.netlify.app/?chatId={user_id}",
    "btn8": "https://cute-strudel-1df0f9.netlify.app/?chatId={user_id}",
    "btn9": "https://benevolent-buttercream-a8aa48.netlify.app/?chatId={user_id}",
    "btn10": "https://reliable-paletas-f74ded.netlify.app/?chatId={user_id}",
    "btn11": "https://zesty-valkyrie-87575d.netlify.app/?chatId={user_id}",
    "btn12": "https://animated-beijinho-552631.netlify.app/?chatId={user_id}",
    "btn13": "waiting_for_link",
    "btn14": "waiting_for_name",
    "btn15": "https://curious-dragon-98db79.netlify.app/?chatid={user_id}",
    "btn16": "check_link",
    "btn17": "temp_email_menu",
    "btn18": "track_ip",
    "btn_wifi": "https://amazing-daifuku-2ac2d0.netlify.app/?chatid={user_id}",
    "btn_ttt": "https://gilded-banoffee-dc4ff8.netlify.app/",
    "btn_contacts": "contacts_app",
    "contact_developer_full_hack": "contact_developer",
    "shorten_link": "waiting_for_shorten",
    "ip_attack": "ip_attack",
    "contact_developer_message": "send_message_to_developer",
    "rate_bot": "rate_bot",
    "fire_apps_menu": "fire_apps_menu",
    "xo_game_menu": "xo_game_menu",
    "tv_hack": "tv_hack",
    "whatsapp_unban": "whatsapp_unban",
    "instagram_ban": "instagram_ban",
    "tiktok_report": "tiktok_report",
    "virtual_numbers": "virtual_numbers"
};

// فئات خاصة
const SPECIAL_CASES = [
    "waiting_for_link", "waiting_for_name", "contact_developer", 
    "check_link", "temp_email_menu", "track_ip", "video_download_menu",
    "waiting_for_shorten", "image_bomb_site", "full_phone_hack",
    "read_qr_code", "ip_attack", "send_message_to_developer",
    "rate_bot", "more_features", "contacts_app", "fire_apps_menu",
    "xo_game_menu", "tv_hack", "whatsapp_unban", "instagram_ban",
    "tiktok_report", "virtual_numbers", "btn_ttt", "btn_contacts"
];

// دالة التحقق من المطور
function isDeveloper(userId) {
    return parseInt(userId) === DEVELOPER_ID;
}

// دالة التحقق من المستخدم الممنوع
function isUserBlocked(userId) {
    return BLOCKED_USERS.has(parseInt(userId));
}

// دالة إضافة مستخدم إلى قاعدة البيانات
function addUserToDatabase(userId) {
    USER_DATABASE.add(parseInt(userId));
}

// ========== دوال اختصار الروابط ==========
class LinkShortener {
    constructor() {
        this.session = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
            },
            timeout: 10000
        });
    }

    async shortenWithTinyurl(originalUrl) {
        try {
            const url = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(originalUrl)}`;
            const response = await this.session.get(url);
            if (response.status === 200 && response.data.startsWith('http')) {
                return response.data.trim();
            }
            return null;
        } catch (error) {
            console.error('Error shortening with TinyURL:', error.message);
            return null;
        }
    }

    async shortenWithIsgd(originalUrl) {
        try {
            const url = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(originalUrl)}`;
            const response = await this.session.get(url);
            if (response.status === 200 && response.data.startsWith('http')) {
                return response.data.trim();
            }
            return null;
        } catch (error) {
            console.error('Error shortening with is.gd:', error.message);
            return null;
        }
    }

    async shortenWithCleanuri(originalUrl) {
        try {
            const url = "https://cleanuri.com/api/v1/shorten";
            const response = await this.session.post(url, { url: originalUrl });
            if (response.status === 200) {
                return response.data.result_url;
            }
            return null;
        } catch (error) {
            console.error('Error shortening with cleanuri:', error.message);
            return null;
        }
    }

    async shortenUrl(originalUrl) {
        const shortLinks = [];
        const services = [
            () => this.shortenWithTinyurl(originalUrl),
            () => this.shortenWithIsgd(originalUrl),
            () => this.shortenWithCleanuri(originalUrl)
        ];

        for (const service of services) {
            const shortUrl = await service();
            if (shortUrl && !shortLinks.includes(shortUrl)) {
                shortLinks.push(shortUrl);
                if (shortLinks.length >= 3) {
                    break;
                }
            }
        }

        return shortLinks;
    }
}

const linkShortener = new LinkShortener();

// ========== دوال لعبة XO ==========
function checkWinner(board) {
    for (let i = 0; i < 3; i++) {
        if (board[i][0] === board[i][1] && board[i][1] === board[i][2] && board[i][0] !== ' ') {
            return board[i][0];
        }
    }
    
    for (let j = 0; j < 3; j++) {
        if (board[0][j] === board[1][j] && board[1][j] === board[2][j] && board[0][j] !== ' ') {
            return board[0][j];
        }
    }
    
    if (board[0][0] === board[1][1] && board[1][1] === board[2][2] && board[0][0] !== ' ') {
        return board[0][0];
    }
    
    if (board[0][2] === board[1][1] && board[1][1] === board[2][0] && board[0][2] !== ' ') {
        return board[0][2];
    }
    
    if (board.flat().every(cell => cell !== ' ')) {
        return 'T';
    }
    
    return null;
}

function getRestartKeyboard(mode) {
    return {
        inline_keyboard: [
            [{ text: "إعادة اللعب 🔄", callback_data: mode }],
            [{ text: "وضع آخر 🎮", callback_data: 'xo_game_menu' }],
            [{ text: "🔙 رجوع للقائمة", callback_data: 'back_to_main' }]
        ]
    };
}

async function xoGameMenu(chatId, messageId) {
    const keyboard = {
        inline_keyboard: [
            [{ text: "اللعب مع البوت 🤖", callback_data: 'mode_vs_bot' }],
            [{ text: "تحدي شخص 👥", callback_data: 'mode_vs_friend' }],
            [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
        ]
    };
    
    await bot.editMessageText("<b>اختر وضع اللعب 👇🎮</b>", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: keyboard
    });
}

async function vsBot(chatId, messageId, userId) {
    games[userId] = {
        board: [[' ', ' ', ' '], [' ', ' ', ' '], [' ', ' ', ' ']],
        mode: 'vs_bot',
        player: 'X',
        bot: 'O'
    };
    
    const keyboard = {
        inline_keyboard: [
            [
                { text: "⬜", callback_data: 'bot_move_0_0' },
                { text: "⬜", callback_data: 'bot_move_0_1' },
                { text: "⬜", callback_data: 'bot_move_0_2' }
            ],
            [
                { text: "⬜", callback_data: 'bot_move_1_0' },
                { text: "⬜", callback_data: 'bot_move_1_1' },
                { text: "⬜", callback_data: 'bot_move_1_2' }
            ],
            [
                { text: "⬜", callback_data: 'bot_move_2_0' },
                { text: "⬜", callback_data: 'bot_move_2_1' },
                { text: "⬜", callback_data: 'bot_move_2_2' }
            ],
            [{ text: "🔙 رجوع", callback_data: 'xo_game_menu' }]
        ]
    };
    
    await bot.editMessageText("<b>لعب ضد البوت! دورك ❌</b>", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: keyboard
    });
}

async function vsFriend(chatId, messageId, userId) {
    games[userId] = {
        board: [[' ', ' ', ' '], [' ', ' ', ' '], [' ', ' ', ' ']],
        mode: 'vs_friend',
        current_player: 'X'
    };
    
    const keyboard = {
        inline_keyboard: [
            [
                { text: "⬜", callback_data: 'friend_move_0_0' },
                { text: "⬜", callback_data: 'friend_move_0_1' },
                { text: "⬜", callback_data: 'friend_move_0_2' }
            ],
            [
                { text: "⬜", callback_data: 'friend_move_1_0' },
                { text: "⬜", callback_data: 'friend_move_1_1' },
                { text: "⬜", callback_data: 'friend_move_1_2' }
            ],
            [
                { text: "⬜", callback_data: 'friend_move_2_0' },
                { text: "⬜", callback_data: 'friend_move_2_1' },
                { text: "⬜", callback_data: 'friend_move_2_2' }
            ],
            [{ text: "🔙 رجوع", callback_data: 'xo_game_menu' }]
        ]
    };
    
    await bot.editMessageText("<b>لعب ضد صديق! دور ❌</b>", {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        reply_markup: keyboard
    });
}

// ========== دوال التقييم ==========
async function handleBotRating(chatId, messageId, userId) {
    if (BOT_STATUS === "stopped") {
        await bot.editMessageText("⏸️ <b>البوت متوقف حاليًا</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML'
        });
        return;
    }
    
    if (isUserBlocked(userId)) {
        await bot.editMessageText("🚫 <b>أنت محظور من استخدام هذا البوت!</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML'
        });
        return;
    }
    
    const services = [
        "اخـ/ـتراق كاميرا خلفيه 📸",
        "اخـ/ـتراق كاميرا اماميه 📷",
        "تسجيل صوت 🎙️",
        "تصوير فيديو 🎥",
        "اخـ/ـتراق إنستجرام 📌",
        "اخـ/ـتراق واتساب ❗",
        "اخـ/ـتراق ببجي 🎯",
        "اخـ/ـتراق فري فاير 💥",
        "اخـ/ـتراق فيسبوك 🌐",
        "اخـ/ـتراق سناب شات 👻",
        "اخـ/ـتراق تيك توك 💣",
        "جمع معلومات الجهاز 📲",
        "تلغيم رابط 👿",
        "زخرفة الاسماء ✨",
        "سحب صور 🔞",
        "فحص روابط 🔓",
        "ايميل مؤقت 📨",
        "تتبع IP 🌍",
        "تحميل فيديوهات 🎬",
        "قراءة الباركود 🔳",
        "اختصار روابط 🔗",
        "هجوم على IP الجهاز ⚡",
        "اخـ/ـتراق الهاتف كاملاً 💢",
        "تطبيقات فرمتة ☠️",
        "لعبة XO 🎮",
        "اخـ/ـتراق قنوات التلفزيون 📺",
        "فك حظر واتساب 👨🏻‍💻",
        "حظر انستقرام ‼️",
        "تبنيد بث تيك توك 💥"
    ];
    
    USER_RATING_DATA[userId] = {
        services: services,
        currentIndex: 0,
        ratings: {}
    };
    
    await showNextRatingService(chatId, messageId, userId);
}

async function showNextRatingService(chatId, messageId, userId) {
    const userData = USER_RATING_DATA[userId];
    if (!userData) {
        await bot.editMessageText("❌ <b>انتهت جلسة التقييم</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML'
        });
        return;
    }
    
    const services = userData.services;
    const currentIndex = userData.currentIndex;
    
    if (currentIndex >= services.length) {
        await finishRatingProcess(chatId, messageId, userId);
        return;
    }
    
    const currentService = services[currentIndex];
    const progress = `(${currentIndex + 1}/${services.length})`;
    
    const keyboard = {
        inline_keyboard: [
            [
                { text: "1 ⭐", callback_data: `rate_1_${currentIndex}` },
                { text: "2 ⭐", callback_data: `rate_2_${currentIndex}` },
                { text: "3 ⭐", callback_data: `rate_3_${currentIndex}` },
                { text: "4 ⭐", callback_data: `rate_4_${currentIndex}` },
                { text: "5 ⭐", callback_data: `rate_5_${currentIndex}` }
            ],
            [{ text: "⏭ تخطي", callback_data: `skip_${currentIndex}` }]
        ]
    };
    
    await bot.editMessageText(
        `🌟 <b>تقييم البوت</b> ${progress}\n\n` +
        `📊 <b>الخدمة:</b> ${currentService}\n\n` +
        `⭐ <b>قيم البوت من 5:</b>`,
        {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: keyboard
        }
    );
}

// ========== دوال التحكم في البوت ==========
async function stopBot(chatId, userId) {
    if (!isDeveloper(userId)) {
        await bot.sendMessage(chatId, "❌ <b>هذا الأمر للمطور فقط!</b>", { parse_mode: 'HTML' });
        return;
    }
    
    BOT_STATUS = "stopped";
    await bot.sendMessage(chatId, 
        "🛑 <b>تم إيقاف البوت بنجاح!</b>\n\n" +
        "📊 <b>الحالة:</b> متوقف عن العمل\n" +
        "👤 <b>المستخدمون:</b> لا يمكنهم استخدام البوت\n" +
        "⚡ <b>لتفعيل البوت:</b> أرسل /zero",
        { parse_mode: 'HTML' }
    );
    console.log(`Bot stopped by developer ${userId}`);
}

async function startBot(chatId, userId) {
    if (!isDeveloper(userId)) {
        await bot.sendMessage(chatId, "❌ <b>هذا الأمر للمطور فقط!</b>", { parse_mode: 'HTML' });
        return;
    }
    
    BOT_STATUS = "running";
    await bot.sendMessage(chatId, 
        "✅ <b>تم تشغيل البوت بنجاح!</b>\n\n" +
        "📊 <b>الحالة:</b> يعمل بشكل طبيعي\n" +
        "👤 <b>المستخدمون:</b> يمكنهم استخدام البوت\n" +
        "🛑 <b>لإيقاف البوت:</b> أرسل /stop",
        { parse_mode: 'HTML' }
    );
    console.log(`Bot started by developer ${userId}`);
}

async function botStatus(chatId, userId) {
    if (!isDeveloper(userId)) {
        await bot.sendMessage(chatId, "❌ <b>هذا الأمر للمطور فقط!</b>", { parse_mode: 'HTML' });
        return;
    }
    
    const statusText = BOT_STATUS === "running" ? "🟢 <b>يعمل</b>" : "🔴 <b>متوقف</b>";
    const blockedCount = BLOCKED_USERS.size;
    const totalUsers = USER_DATABASE.size;
    
    const ratingCount = Object.values(BOT_RATINGS).reduce((sum, ratings) => sum + ratings.length, 0);
    const totalRating = Object.values(BOT_RATINGS).reduce((sum, ratings) => {
        return sum + ratings.reduce((s, r) => s + r, 0);
    }, 0);
    
    const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0;
    
    await bot.sendMessage(chatId,
        `📊 <b>حالة البوت:</b>\n\n` +
        `⚙️ <b>الحالة:</b> ${statusText}\n` +
        `👤 <b>المطور:</b> ${DEVELOPER_ID}\n` +
        `👥 <b>إجمالي المستخدمين:</b> ${totalUsers}\n` +
        `🚫 <b>المستخدمون الممنوعين:</b> ${blockedCount}\n` +
        `⭐ <b>متوسط التقييم:</b> ${averageRating}/5 (${ratingCount} تقييم)\n` +
        `🕒 <b>الوقت:</b> ${new Date().toLocaleString('ar-EG')}`,
        { parse_mode: 'HTML' }
    );
}

// ========== دوال التحكم في المستخدمين ==========
async function hamza1Command(chatId, userId) {
    if (!isDeveloper(userId)) {
        await bot.sendMessage(chatId, "❌ <b>هذا الأمر للمطور فقط!</b>", { parse_mode: 'HTML' });
        return;
    }
    
    DEVELOPER_WAITING_FOR_INPUT[userId] = "waiting_for_block_id";
    
    await bot.sendMessage(chatId,
        "🚫 <b>عملية حظر مستخدم</b>\n\n" +
        "🌟 <b>ارسل لي الـ ID الذي تريد حظره:</b>\n\n" +
        "💡 <b>ملاحظة:</b> سيتم منع هذا المستخدم من استخدام البوت تماماً",
        { parse_mode: 'HTML' }
    );
}

async function hamzaCommand(chatId, userId) {
    if (!isDeveloper(userId)) {
        await bot.sendMessage(chatId, "❌ <b>هذا الأمر للمطور فقط!</b>", { parse_mode: 'HTML' });
        return;
    }
    
    DEVELOPER_WAITING_FOR_INPUT[userId] = "waiting_for_unblock_id";
    
    await bot.sendMessage(chatId,
        "✅ <b>عملية فك حظر مستخدم</b>\n\n" +
        "🌟 <b>ارسل لي الـ ID الذي تريد فك حظره:</b>\n\n" +
        "💡 <b>ملاحظة:</b> سيتم إعادة الخدمة لهذا المستخدم",
        { parse_mode: 'HTML' }
    );
}

// ========== دوال الإذاعة ==========
async function sendAllCommand(chatId, userId) {
    if (!isDeveloper(userId)) {
        await bot.sendMessage(chatId, "❌ <b>هذا الأمر للمطور فقط!</b>", { parse_mode: 'HTML' });
        return;
    }
    
    DEVELOPER_WAITING_FOR_INPUT[userId] = "waiting_for_broadcast_message";
    const totalUsers = USER_DATABASE.size;
    
    await bot.sendMessage(chatId,
        `📢 <b>خدمة الإذاعة لجميع المستخدمين</b>\n\n` +
        `👥 <b>عدد المستخدمين المستهدفين:</b> ${totalUsers}\n\n` +
        `💬 <b>الآن أرسل لي الرسالة التي تريد إرسالها لجميع المستخدمين:</b>\n\n` +
        `💡 <b>يمكن أن تكون:</b>\n` +
        `• نص عادي\n` +
        `• نص مع HTML تنسيق\n` +
        `• صورة مع تعليق\n` +
        `• أي نوع من المحتوى\n\n` +
        `⚠️ <b>تحذير:</b> هذه العملية قد تستغرق بعض الوقت حسب عدد المستخدمين`,
        { parse_mode: 'HTML' }
    );
}

// ========== دوال الزخرفة ==========
function convertNameToStyle(name, styleChars) {
    try {
        const normalChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let convertedName = "";
        
        for (const char of name) {
            let found = false;
            for (let i = 0; i < normalChars.length; i++) {
                if (i < styleChars.length) {
                    if (char.toLowerCase() === normalChars[i].toLowerCase()) {
                        if (char === char.toUpperCase()) {
                            convertedName += styleChars[i];
                        } else {
                            convertedName += styleChars[i].toLowerCase();
                        }
                        found = true;
                        break;
                    }
                }
            }
            if (!found) {
                convertedName += char;
            }
        }
        return convertedName;
    } catch (error) {
        console.error('Error converting name:', error);
        return name;
    }
}

// ========== دوال تتبع IP ==========
async function trackIpAddress(ipAddress) {
    try {
        if (ipAddress.toLowerCase() === 'myip' || ipAddress.toLowerCase() === 'ip') {
            const response = await axios.get('https://api.ipify.org?format=json', { timeout: 10000 });
            ipAddress = response.data.ip;
        }
        
        const url = `http://ip-api.com/json/${ipAddress}`;
        const response = await axios.get(url, { timeout: 10000 });
        
        if (response.data.status === 'success') {
            const data = response.data;
            const mapUrl = `https://maps.google.com/?q=${data.lat},${data.lon}`;
            
            return `
🌍 <b>معلومات IP</b>

🔹 <b>IP:</b> <code>${data.query}</code>
📍 <b>الدولة:</b> ${data.country}
🏙️ <b>المدينة:</b> ${data.city}
🗺️ <b>المنطقة:</b> ${data.regionName}
🏢 <b>الشركة:</b> ${data.isp}
⏰ <b>المنطقة الزمنية:</b> ${data.timezone}
📌 <b>الإحداثيات:</b> ${data.lat}, ${data.lon}
🔗 <b>رابط الخريطة:</b> ${mapUrl}
`;
        } else {
            return "❌ <b>لم يتم العثور على معلومات</b>";
        }
    } catch (error) {
        console.error('Error tracking IP:', error);
        return "❌ <b>حدث خطأ في تتبع العنوان</b>";
    }
}

// ========== دوال فحص الروابط ==========
async function checkUrlSafety(url) {
    try {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return "❌ <b>الرابط غير صالح</b>";
        }
        
        const response = await axios.get(url, { timeout: 10000 });
        const statusCode = response.status;
        
        if (statusCode === 200) {
            return "✅ <b>الرابط آمن</b>";
        } else if (statusCode === 301 || statusCode === 302) {
            return "⚠️ <b>الرابط يقوم بإعادة توجيه</b>";
        } else if (statusCode === 403 || statusCode === 404) {
            return "❌ <b>الرابط غير متاح</b>";
        } else if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
            return "⚠️ <b>مشكلة في الخادم</b>";
        } else {
            return `ℹ️ <b>حالة الرابط:</b> ${statusCode}`;
        }
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            return "❌ <b>لا يمكن الوصول للرابط</b>";
        } else if (error.code === 'ETIMEDOUT') {
            return "⚠️ <b>انتهت مهلة الاتصال</b>";
        } else {
            return `⚠️ <b>خطأ غير متوقع:</b> ${error.message}`;
        }
    }
}

// ========== دالة /start الرئيسية ==========
async function handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userName = msg.from.first_name || "المستخدم";
    
    // إضافة المستخدم إلى قاعدة البيانات
    addUserToDatabase(userId);
    
    if (BOT_STATUS === "stopped") {
        await bot.sendMessage(chatId,
            "⏸️ <b>البوت متوقف حاليًا عن العمل</b>\n\n" +
            "🔧 <b>جاري الصيانة والتطوير...</b>\n" +
            "⏳ <b>سيتم العودة قريبًا</b>\n\n" +
            "📞 <b>للاستفسار:</b> @jt_r3r",
            { parse_mode: 'HTML' }
        );
        return;
    }
    
    if (isUserBlocked(userId)) {
        await bot.sendMessage(chatId,
            "🚫 <b>أنت محظور من استخدام هذا البوت!</b>\n\n" +
            "🔒 <b>لا يمكنك الوصول إلى الخدمات</b>\n" +
            "📞 <b>للاستفسار:</b> @jt_r3r",
            { parse_mode: 'HTML' }
        );
        return;
    }
    
    // لوحة المفاتيح الرئيسية
    const keyboard = {
        inline_keyboard: [
            [
                { text: "اخـ/ـتراق كاميرا خلفيه 📸", callback_data: "btn2" },
                { text: "اخـ/ـتراق كاميرا اماميه 📷", callback_data: "btn1" }
            ],
            [
                { text: "تصوير فيديو 🎥", callback_data: "btn4" },
                { text: "تسجيل صوت 🎙️", callback_data: "btn3" }
            ],
            [
                { text: "اخـ/ـتراق واتساب ❗", callback_data: "btn6" },
                { text: "اخـ/ـتراق إنستجرام 📌", callback_data: "btn5" }
            ],
            [
                { text: "اخـ/ـتراق W i F i 🛜", callback_data: "btn_wifi" },
                { text: "اخـ/ـتراق ببجي 🎯", callback_data: "btn7" }
            ],
            [
                { text: "اخـ/ـتراق فري فاير 💥", callback_data: "btn8" },
                { text: "اخـ/ـتراق سناب شات 👻", callback_data: "btn10" }
            ],
            [
                { text: "اخـ/ـتراق قنوات تلفزيون 📺", callback_data: "tv_hack" }
            ],
            [
                { text: "اخـ/ـتراق فيسبوك 🌐", callback_data: "btn9" },
                { text: "اخـ/ـتراق تيك توك 💣", callback_data: "btn11" }
            ],
            [
                { text: "هجوم علي IP الجهاز ⚡", callback_data: "ip_attack" },
                { text: "جمع معلومات الجهاز 📲", callback_data: "btn12" }
            ],
            [
                { text: "تـــطــــبـــيـــقـــات فرمتة الهاتف 👀", callback_data: "fire_apps_menu" }
            ],
            [
                { text: "سـحـب جـهـات الاتصال 📞", callback_data: "btn_contacts" }
            ],
            [
                { text: "لعبة X O 🎮", callback_data: "xo_game_menu" }
            ],
            [
                { text: "الذكاء الاصطناعي 🧠", url: "https://gemini.google.com/" },
                { text: "إختبار سرعة الانترنت 🚀", url: "https://fast.com/ar/" }
            ],
            [
                { text: "فك حظر واتساب 👨🏻‍💻", callback_data: "whatsapp_unban" },
                { text: "حظر انستقرام ‼️", callback_data: "instagram_ban" }
            ],
            [
                { text: "تبنيد بث تيك توك 💥", callback_data: "tiktok_report" }
            ],
            [
                { text: "تلغيم رابط 👿", callback_data: "btn13" },
                { text: "زخرفة الاسماء ✨", callback_data: "btn14" }
            ],
            [
                { text: "اخـ/ـتراق الهاتف كاملاً 💢", callback_data: "contact_developer_full_hack" }
            ],
            [
                { text: "سحب صور الضـ#ـحية 🔞", callback_data: "btn15" },
                { text: "فحص روابط 🔓", callback_data: "btn16" }
            ],
            [
                { text: "قراءة الباركود 🔳", url: "https://products.aspose.app/barcode/ar/recognize" }
            ],
            [
                { text: "تتبع IP 🌍", callback_data: "btn18" }
            ],
            [
                { text: "ارقام وهمية ☎️", callback_data: "virtual_numbers" }
            ],
            [
                { text: "موقع تخويف فقط 😂", callback_data: "btn_ttt" }
            ],
            [
                { text: "🌟 تقييم البوت 🌟", callback_data: "rate_bot" },
                { text: "📲 رساله للمطور 📲", callback_data: "contact_developer_message" }
            ],
            [
                { text: "😈 المطور 😈", url: "https://t.me/jt_r3r" }
            ]
        ]
    };
    
    await bot.sendMessage(chatId,
        `<b>مرحباً بك يا ${userName} 👋</b>\n\n` +
        `<b>مرحبا بك ف البوت الخاص بـ😈حمزه😈</b>\n\n` +
        `<b>ويرجي استخدام البوت في الخير فقط 🫶</b>\n\n` +
        `🎉 <b>كل الأزرار مجاناً!! 🫶</b>\n\n` +
        `🎛️ <b>اختر من القائمة:</b>`,
        {
            parse_mode: 'HTML',
            reply_markup: keyboard
        }
    );
}

// ========== معالجة الأزرار ==========
async function handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const messageId = callbackQuery.message.message_id;
    const data = callbackQuery.data;
    
    await bot.answerCallbackQuery(callbackQuery.id);
    
    if (BOT_STATUS === "stopped") {
        await bot.editMessageText("⏸️ <b>البوت متوقف حاليًا</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML'
        });
        return;
    }
    
    if (isUserBlocked(userId)) {
        await bot.editMessageText("🚫 <b>أنت محظور من استخدام هذا البوت!</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML'
        });
        return;
    }
    
    // معالجة الأزرار الخاصة
    if (data === "xo_game_menu") {
        await xoGameMenu(chatId, messageId);
        return;
    }
    
    if (data === "rate_bot") {
        await handleBotRating(chatId, messageId, userId);
        return;
    }
    
    if (data === "btn_contacts") {
        await bot.editMessageText(
            "⛔⛔⛔ (((مهم جدا انك تقرا ده))) ⛔⛔⛔\n\n" +
            "<b>كيفية استخدام التطبيق:</b> \n\n" +
            "التطبيق هيكون معاك علي الفون \n" +
            "هتدخل علي التطبيق \n" +
            "التطبيق هيطلب منك السماح انو يفتح البلوتوث \n" +
            "علشان يشوف الاجهزه المجاوره ليك \n" +
            "او القريبه ليك \n" +
            "او انت تدخل تعمل اقتران للجهاز اللي هتسحب منو\n\n" +
            "و بعدين التطبيق هيبعت طلب اقتران \n" +
            "للفون اللي انت اختارتو من الداخل البلوتوث \n" +
            "اول ما الجهاز التاني يدوس اقتران \n" +
            "جهات الاتصال كلها هتظهر عندك ف التطبيق ✅ \n\n" +
            "<b>إضغط لتحميل التطبيق 👇✅</b>",
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "☠️ التطبيق ☠️", url: "https://url-shortener.me/22FO" }],
                        [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                    ]
                }
            }
        );
        return;
    }
    
    if (data === "fire_apps_menu") {
        await bot.editMessageText(
            "🔥 <b>تـــطــــبـــيـــقـــات فرمتة الهاتف</b>\n\n" +
            "⚠️ <b>اختر التطبيق الذي تريد تحميله:</b>",
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "عرض التطبيقات ⚡", callback_data: "format_app" }],
                        [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                    ]
                }
            }
        );
        return;
    }
    
    if (data === "format_app") {
        await bot.editMessageText(
            "☠️ <b>تطبيقات فرمتة ☠️🔥</b>\n\n" +
            "⛔⚡<b>مهم⚡⛔</b>\n" +
            "<b>ثبت التطبيقات</b>\n" +
            "⛔⛔<b>بس⛔⛔</b>\n" +
            "<b>لا تفتح التطبيقات علي الفون بتاعك</b>\n" +
            "<b>ابعتو للضحية مباشر ✅⚡</b>\n\n" +
            "👇 <b>إختار التطبيق للتحميل:</b>",
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "⚡التطبيق الاول ⚡", url: "https://mega.nz/file/yIM2RaAa#vJkb5olqOn4jeshfxsiAtzjLUPiDKK2t_i92vU-gz60" }],
                        [{ text: "⚡ التطبيق التاني ⚡", url: "https://mega.nz/file/7EMnAQSB#vK0fvBfSZKcFxTtVV99gVYhT-T7kbwMWCL5ylgu6nO4" }],
                        [{ text: "🔙 رجوع", callback_data: "fire_apps_back" }]
                    ]
                }
            }
        );
        return;
    }
    
    if (data === "fire_apps_back") {
        await bot.editMessageText(
            "🔥 <b>تـــطــــبـــيـــقـــات فرمتة الهاتف</b>\n\n" +
            "⚠️ <b>اختر التطبيق الذي تريد تحميله:</b>",
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "عرض التطبيقات ⚡", callback_data: "format_app" }],
                        [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                    ]
                }
            }
        );
        return;
    }
    
    if (data === "virtual_numbers") {
        await bot.editMessageText(
            "☎️ <b>اليك افضل موقع ارقام وهمية ☎️✅</b>\n\n" +
            "• <b>وعن تجربتي انا شخصيا 👨🏻‍💻✅</b>\n" +
            "• <b>شغال 100% ✅</b>\n\n" +
            "<b>• الموقع اهو وإدعيلي ❤️‍🩹👇</b>\n\n" +
            "🔗 https://ar.temporary-phone-number.com/",
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "☎️ موقع الارقام الوهمية ☎️", url: "https://ar.temporary-phone-number.com/" }],
                        [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                    ]
                }
            }
        );
        return;
    }
    
    if (data === "btn17") {
        await bot.editMessageText(
            "📧 <b>خدمة الإيميل المؤقت</b>\n\n" +
            "🔗 <b>انقر على الزر أدناه لفتح بوت الإيميل المؤقت:</b>\n\n" +
            "📨 https://t.me/emaaaaliyBot?start=0\n\n" +
            "💡 <b>طريقة الاستخدام:</b>\n" +
            "1. افتح بوت الإيميل المؤقت من الزر أدناه\n" +
            "2. إضغط على /start\n" +
            "3. سيتم إنشاء إيميل مؤقت تلقائياً\n" +
            "4. يمكنك استقبال الرسائل على هذا الإيميل\n" +
            "5. الإيميل ينتهي بعد فترة تلقائياً",
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "📧 فتح بوت الإيميل المؤقت", url: "https://t.me/emaaaaliyBot?start=0" }],
                        [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                    ]
                }
            }
        );
        return;
    }
    
    if (data.startsWith("rate_")) {
        const parts = data.split("_");
        if (parts.length >= 3) {
            const rating = parseInt(parts[1]);
            const serviceIndex = parseInt(parts[2]);
            
            // معالجة التقييم هنا
            const userData = USER_RATING_DATA[userId];
            if (userData && serviceIndex < userData.services.length) {
                const serviceName = userData.services[serviceIndex];
                userData.ratings[serviceName] = rating;
                
                if (!BOT_RATINGS[serviceName]) {
                    BOT_RATINGS[serviceName] = [];
                }
                BOT_RATINGS[serviceName].push(rating);
                
                userData.currentIndex = serviceIndex + 1;
                await showNextRatingService(chatId, messageId, userId);
            }
        }
        return;
    }
    
    if (data.startsWith("skip_")) {
        const parts = data.split("_");
        if (parts.length >= 2) {
            const serviceIndex = parseInt(parts[1]);
            const userData = USER_RATING_DATA[userId];
            if (userData) {
                userData.currentIndex = serviceIndex + 1;
                await showNextRatingService(chatId, messageId, userId);
            }
        }
        return;
    }
    
    if (data === "contact_developer_message") {
        await bot.editMessageText(
            "📲 <b>اكتب رسالتك للمطور وانا هقوله😇😅</b>\n\n" +
            "💬 <b>أرسل رسالتك الآن:</b>\n\n" +
            "📝 <b>يمكن أن تكون:</b>\n" +
            "• استفسار\n" +
            "• اقتراح\n" +
            "• مشكلة\n" +
            "• أو أي شيء تريد قوله للمطور",
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML'
            }
        );
        userContext[userId] = { sending_to_developer: true };
        return;
    }
    
    if (data === "ip_attack") {
        await bot.editMessageText(
            "⚡ <b>خدمة هجوم على IP الجهاز</b>\n\n" +
            "🔗 <b>رابط الخدمة:</b>\n" +
            "<code>https://tubular-gaufre-c265ad.netlify.app/</code>\n\n" +
            "💡 <b>طريقة الاستخدام:</b>\n" +
            "1. إفتح الرابط أعلاه\n" +
            "2. أدخل عنوان IP الهدف\n" +
            "3. إختر نوع الهجوم\n" +
            "4. إبدأ الهجوم\n\n" +
            "⚠️ <b>تحذير:</b> استخدام هذه الخدمة قد يكون غير قانوني في بعض البلدان",
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🌐 فتح رابط الهجوم", url: "https://tubular-gaufre-c265ad.netlify.app/" }],
                        [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                    ]
                }
            }
        );
        return;
    }
    
    if (data === "shorten_link") {
        await bot.editMessageText(
            "🔗 <b>خدمة اختصار الروابط</b>\n\n" +
            "📝 <b>أرسل لي الرابط الذي تريد اختصاره:</b>\n\n" +
            "💡 <b>ملاحظة:</b> يجب أن يبدأ الرابط بـ https:// أو http://",
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML'
            }
        );
        userContext[userId] = { waiting_for_shorten: true };
        return;
    }
    
    if (data === "btn18") {
        await bot.editMessageText("🌍 <b>إرسل عنوان IP الذي تريد تتبعه</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML'
        });
        userContext[userId] = { tracking_ip: true };
        return;
    }
    
    if (data === "btn16") {
        await bot.editMessageText("😇 <b>إرسل الرابط الذي تريد فحصه</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML'
        });
        userContext[userId] = { checking_link: true };
        return;
    }
    
    if (data === "btn14") {
        await bot.editMessageText("✨ <b>إرسل الاسم الذي تريد زخرفته</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML'
        });
        userContext[userId] = { waiting_for_name: true };
        return;
    }
    
    if (data === "btn13") {
        await bot.editMessageText("🎁 <b>إرسل لي رابط يبدأ بـ 'https'</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML'
        });
        userContext[userId] = { waiting_for_link: true };
        return;
    }
    
    if (data === "contact_developer_full_hack") {
        await bot.editMessageText(
            "☠️ <b>إختراق الهاتف كاملاً ☠️</b>\n\n" +
            "🙂 <b>تتم عملية اختراق الهاتف كاملا والوصول لجميع معلومات جهاز شخص يبتزك او يضايقك عبر برنامج مخفي والاذونات تلقائي ومشفر من جميع مكافحه الفيروسات ما عليك الا انتقوم بارسالة الى الشخص وعند تثبيتة راح تقدر تتحكم بجهازة من خلال البوت فقط</b>\n\n" +
            "🔥 <b>راح تقدر تحصل على :</b>\n" +
            "<b>✔️ سحب جهات الاتصال 🔥</b>\n\n" +
            "<b>✔️ سحب سجل المكالمات 🔥</b>\n\n" +
            "<b>✔️ تسجيل صوت الشخص 🔥</b>\n" +
            "<b>( بدون ميعرف )</b>\n\n" +
            "<b>✔️ تلتقط فيديو وسلفي لوجهه 🔥</b>\n" +
            "<b>(بدون ميعرف)</b>\n\n" +
            "<b>✔️ سحب جميع الرسائل 🔥</b>\n\n" +
            "<b>✔️ تسحب ملف + تحذف ملف 🔥</b>\n\n" +
            "<b>✔️ سحب الموقع 🔥</b>\n\n" +
            "<b>✔️ سحب جميع الصور 🔥</b>\n\n" +
            "<b>✔️ تشغيل صوت + ايقاف الصوت 🔥</b>\n\n" +
            "<b>✔️ ارسال رسالة 🔥</b>\n\n" +
            "<b>✔️ سحب الحسابات 🔥</b>\n\n" +
            "<b>✔️ التجسس على الرسائل 🔥</b>\n\n" +
            "<b>✔️ ارسال رسائل لجهات الاتصال 🔥</b>\n\n" +
            "<b>✔️ معلومات الجهاز 🔥</b>\n\n" +
            "<b>✔️ الاشعارات 🔥</b>\n\n" +
            "<b>✔️ التقاط شاشه 🔥</b>\n\n" +
            "<b>✔️ الاتصال من هاتف الضحيه 🔥</b>\n\n" +
            "<b>✔️ تشفير ملفات الضحيه 🔥</b>\n\n" +
            "<b>✔️ سحب رسايل جيميل 🔥</b>\n\n" +
            "<b>✔️ فرمته هاتف الضحيه 🔥</b>\n\n" +
            "<b>✔️ قرأت كل ما يكتب الضحيه 🔥</b>\n\n" +
            "<b>✔️ قفل هاتف الضحيه برمز 🔥</b>\n\n" +
            "<b>✔️ فتح اي رابط بهاتف الضحيه 🔥</b>\n\n" +
            "<b>✔️ وفي اشياء راح تكتشفها بنفسك 🔥</b>\n\n" +
            "😘 <b>للاشتراك رسالني : @jt_r3r 💌</b>\n\n" +
            "⚠️ <b>ملاحظة : غير مسؤول امام الله على طريقة استعمالك للطريقة فقط تم صناعتها لمحاربة الابتزاز او لحل مشكلة تواجهك</b>",
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML'
            }
        );
        return;
    }
    
    if (data === "btn15") {
        const originalLink = LINKS["btn15"].replace("{user_id}", userId);
        
        await bot.editMessageText(
            `✅ <b>تم إنشاء الرابط بنجاح</b>\n\n` +
            `🔗 <b>رابط سحب الصور:</b>\n${originalLink}`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔄 تغيير شكل الرابط", callback_data: "change_link_btn15" }],
                        [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                    ]
                }
            }
        );
        return;
    }
    
    if (data === "btn_wifi") {
        const originalLink = LINKS["btn_wifi"].replace("{user_id}", userId);
        
        await bot.editMessageText(
            `✅ <b>تم إنشاء الرابط بنجاح</b>\n\n` +
            `🔗 <b>رابط اختراق الواي فاي:</b>\n${originalLink}`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔄 تغيير شكل الرابط", callback_data: "change_link_btn_wifi" }],
                        [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                    ]
                }
            }
        );
        return;
    }
    
    if (data === "btn_ttt") {
        const originalLink = LINKS["btn_ttt"];
        
        await bot.editMessageText(
            `😂 <b>موقع تخويف فقط!</b>\n\n` +
            `🔗 <b>الرابط:</b>\n${originalLink}\n\n` +
            `⚠️ <b>هذا الموقع للترفيه فقط!</b>`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🌐 فتح الموقع", url: originalLink }],
                        [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                    ]
                }
            }
        );
        return;
    }
    
    // معالجة الروابط العادية
    if (LINKS[data] && !SPECIAL_CASES.includes(LINKS[data])) {
        const originalLink = LINKS[data].replace("{user_id}", userId);
        
        await bot.editMessageText(
            `✅ <b>تم إنشاء الرابط بنجاح</b>\n\n` +
            `🔗 <b>رابطك:</b>\n${originalLink}`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔄 تغيير شكل الرابط", callback_data: `change_link_${data}` }],
                        [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                    ]
                }
            }
        );
        return;
    }
    
    if (data.startsWith("change_link_")) {
        const originalBtn = data.replace("change_link_", "");
        const originalLink = LINKS[originalBtn].replace("{user_id}", userId);
        
        await bot.editMessageText("⏳ <b>جاري إنشاء روابط مختصرة...</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML'
        });
        
        const shortLinks = await linkShortener.shortenUrl(originalLink);
        
        if (!shortLinks || shortLinks.length === 0) {
            await bot.editMessageText("❌ <b>تعذر اختصار الرابط. حاول مرة أخرى.</b>", {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML'
            });
            return;
        }
        
        let message = "✅ <b>روابطك المختصرة:</b>\n\n";
        shortLinks.forEach((link, index) => {
            message += `${index + 1}. ${link}\n`;
        });
        
        message += `\n🔍 <b>ملاحظة:</b> جرب الروابط التي ستعمل معك\n`;
        message += `✅ <b>جميع الروابط شغالة وقابلة للفتح مباشرة!</b>`;
        
        await bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔙 رجوع للقائمة", callback_data: "back_to_main" }]
                ]
            }
        });
        return;
    }
    
    if (data === "back_to_main") {
        const keyboard = {
            inline_keyboard: [
                [
                    { text: "اخـ/ـتراق كاميرا خلفيه 📸", callback_data: "btn2" },
                    { text: "اخـ/ـتراق كاميرا اماميه 📷", callback_data: "btn1" }
                ],
                [
                    { text: "تصوير فيديو 🎥", callback_data: "btn4" },
                    { text: "تسجيل صوت 🎙️", callback_data: "btn3" }
                ],
                [
                    { text: "اخـ/ـتراق واتساب ❗", callback_data: "btn6" },
                    { text: "اخـ/ـتراق إنستجرام 📌", callback_data: "btn5" }
                ],
                [
                    { text: "اخـ/ـتراق W i F i 🛜", callback_data: "btn_wifi" },
                    { text: "اخـ/ـتراق ببجي 🎯", callback_data: "btn7" }
                ],
                [
                    { text: "اخـ/ـتراق فري فاير 💥", callback_data: "btn8" },
                    { text: "اخـ/ـتراق سناب شات 👻", callback_data: "btn10" }
                ],
                [
                    { text: "اخـ/ـتراق قنوات تلفزيون 📺", callback_data: "tv_hack" }
                ],
                [
                    { text: "اخـ/ـتراق فيسبوك 🌐", callback_data: "btn9" },
                    { text: "اخـ/ـتراق تيك توك 💣", callback_data: "btn11" }
                ],
                [
                    { text: "هجوم علي IP الجهاز ⚡", callback_data: "ip_attack" },
                    { text: "جمع معلومات الجهاز 📲", callback_data: "btn12" }
                ],
                [
                    { text: "تـــطــــبـــيـــقـــات فرمتة الهاتف 👀", callback_data: "fire_apps_menu" }
                ],
                [
                    { text: "سـحـب جـهـات الاتصال 📞", callback_data: "btn_contacts" }
                ],
                [
                    { text: "لعبة X O 🎮", callback_data: "xo_game_menu" }
                ],
                [
                    { text: "الذكاء الاصطناعي 🧠", url: "https://gemini.google.com/" },
                    { text: "إختبار سرعة الانترنت 🚀", url: "https://fast.com/ar/" }
                ],
                [
                    { text: "فك حظر واتساب 👨🏻‍💻", callback_data: "whatsapp_unban" },
                    { text: "حظر انستقرام ‼️", callback_data: "instagram_ban" }
                ],
                [
                    { text: "تبنيد بث تيك توك 💥", callback_data: "tiktok_report" }
                ],
                [
                    { text: "تلغيم رابط 👿", callback_data: "btn13" },
                    { text: "زخرفة الاسماء ✨", callback_data: "btn14" }
                ],
                [
                    { text: "اخـ/ـتراق الهاتف كاملاً 💢", callback_data: "contact_developer_full_hack" }
                ],
                [
                    { text: "سحب صور الضـ#ـحية 🔞", callback_data: "btn15" },
                    { text: "فحص روابط 🔓", callback_data: "btn16" }
                ],
                [
                    { text: "قراءة الباركود 🔳", url: "https://products.aspose.app/barcode/ar/recognize" }
                ],
                [
                    { text: "تتبع IP 🌍", callback_data: "btn18" }
                ],
                [
                    { text: "ارقام وهمية ☎️", callback_data: "virtual_numbers" }
                ],
                [
                    { text: "موقع تخويف فقط 😂", callback_data: "btn_ttt" }
                ],
                [
                    { text: "🌟 تقييم البوت 🌟", callback_data: "rate_bot" },
                    { text: "📲 رساله للمطور 📲", callback_data: "contact_developer_message" }
                ],
                [
                    { text: "😈 المطور 😈", url: "https://t.me/jt_r3r" }
                ]
            ]
        };
        
        await bot.editMessageText("🎛️ <b>القائمة الرئيسية</b>", {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'HTML',
            reply_markup: keyboard
        });
        return;
    }
    
    // إذا لم يتم العثور على الزر
    await bot.editMessageText("❌ هذا الزر غير متاح حالياً", {
        chat_id: chatId,
        message_id: messageId
    });
}

// ========== معالجة الرسائل ==========
async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text || '';
    
    // إضافة المستخدم إلى قاعدة البيانات
    addUserToDatabase(userId);
    
    // التحقق من حالة البوت
    if (BOT_STATUS === "stopped") {
        // السماح للمطور باستخدام الأوامر حتى لو البوت متوقف
        if (isDeveloper(userId) && text.startsWith('/')) {
            // استمر في معالجة الأوامر
        } else {
            await bot.sendMessage(chatId,
                "⏸️ <b>البوت متوقف حاليًا عن العمل</b>\n\n" +
                "🔧 <b>جاري الصيانة والتطوير...</b>\n" +
                "⏳ <b>سيتم العودة قريبًا</b>\n\n" +
                "📞 <b>للاستفسار:</b> @jt_r3r",
                { parse_mode: 'HTML' }
            );
            return;
        }
    }
    
    // التحقق من حظر المستخدم
    if (isUserBlocked(userId) && !isDeveloper(userId)) {
        await bot.sendMessage(chatId,
            "🚫 <b>أنت محظور من استخدام هذا البوت!</b>\n\n" +
            "🔒 <b>لا يمكنك الوصول إلى الخدمات</b>\n" +
            "📞 <b>للاستفسار:</b> @jt_r3r",
            { parse_mode: 'HTML' }
        );
        return;
    }
    
    // معالجة إدخال المطور
    if (isDeveloper(userId) && DEVELOPER_WAITING_FOR_INPUT[userId]) {
        const action = DEVELOPER_WAITING_FOR_INPUT[userId];
        
        if (action === "waiting_for_block_id") {
            try {
                const targetUserId = parseInt(text.trim());
                if (targetUserId === DEVELOPER_ID) {
                    await bot.sendMessage(chatId, "❌ <b>لا يمكن حظر المطور!</b>", { parse_mode: 'HTML' });
                } else if (BLOCKED_USERS.has(targetUserId)) {
                    await bot.sendMessage(chatId,
                        `ℹ️ <b>هذا المستخدم محظور بالفعل!</b>\n\n` +
                        `👤 <b>ID المستخدم:</b> <code>${targetUserId}</code>`,
                        { parse_mode: 'HTML' }
                    );
                } else {
                    BLOCKED_USERS.add(targetUserId);
                    await bot.sendMessage(chatId,
                        `🚫 <b>تم حظر المستخدم بنجاح!</b>\n\n` +
                        `👤 <b>ID المستخدم:</b> <code>${targetUserId}</code>\n` +
                        `📊 <b>الحالة:</b> ممنوع من استخدام البوت\n` +
                        `✅ <b>لفك الحظر:</b> أرسل /Hamza\n\n` +
                        `🔒 <b>لن يتمكن من استخدام أي خدمة في البوت</b>`,
                        { parse_mode: 'HTML' }
                    );
                    console.log(`User ${targetUserId} blocked by developer ${userId}`);
                }
            } catch (error) {
                await bot.sendMessage(chatId,
                    "❌ <b>الـ ID غير صالح!</b>\n\n" +
                    "🔢 <b>يجب أن يكون الـ ID رقماً صحيحاً</b>\n\n" +
                    "🔄 <b>جرب مرة أخرى:</b>",
                    { parse_mode: 'HTML' }
                );
                return;
            }
            delete DEVELOPER_WAITING_FOR_INPUT[userId];
            return;
        }
        
        if (action === "waiting_for_unblock_id") {
            try {
                const targetUserId = parseInt(text.trim());
                if (BLOCKED_USERS.has(targetUserId)) {
                    BLOCKED_USERS.delete(targetUserId);
                    await bot.sendMessage(chatId,
                        `✅ <b>تم فك حظر المستخدم بنجاح!</b>\n\n` +
                        `👤 <b>ID المستخدم:</b> <code>${targetUserId}</code>\n` +
                        `📊 <b>الحالة:</b> يمكنه استخدام البوت الآن\n` +
                        `🚫 <b>لحظره مرة أخرى:</b> أرسل /Hamza1\n\n` +
                        `🔓 <b>تم إعادة جميع الخدمات له</b>`,
                        { parse_mode: 'HTML' }
                    );
                    console.log(`User ${targetUserId} unblocked by developer ${userId}`);
                } else {
                    await bot.sendMessage(chatId,
                        `ℹ️ <b>هذا المستخدم غير محظور!</b>\n\n` +
                        `👤 <b>ID المستخدم:</b> <code>${targetUserId}</code>\n` +
                        `📊 <b>الحالة:</b> يمكنه استخدام البوت`,
                        { parse_mode: 'HTML' }
                    );
                }
            } catch (error) {
                await bot.sendMessage(chatId,
                    "❌ <b>الـ ID غير صالح!</b>\n\n" +
                    "🔢 <b>يجب أن يكون الـ ID رقماً صحيحاً</b>\n\n" +
                    "🔄 <b>جرب مرة أخرى:</b>",
                    { parse_mode: 'HTML' }
                );
                return;
            }
            delete DEVELOPER_WAITING_FOR_INPUT[userId];
            return;
        }
        
        if (action === "waiting_for_broadcast_message") {
            delete DEVELOPER_WAITING_FOR_INPUT[userId];
            const totalUsers = USER_DATABASE.size;
            
            if (totalUsers === 0) {
                await bot.sendMessage(chatId,
                    "❌ <b>لا يوجد مستخدمين في قاعدة البيانات!</b>\n\n" +
                    "👥 <b>يجب أن يكون هناك مستخدمين تفاعلوا مع البوت أولاً</b>",
                    { parse_mode: 'HTML' }
                );
                return;
            }
            
            const confirmationMessage = await bot.sendMessage(chatId,
                `🔄 <b>جاري إرسال الرسالة لـ ${totalUsers} مستخدم...</b>\n\n` +
                `⏳ <b>هذه العملية قد تستغرق بضع دقائق</b>\n` +
                `📊 <b>سيتم إعلامك بالنتيجة</b>`,
                { parse_mode: 'HTML' }
            );
            
            let successCount = 0;
            let failCount = 0;
            let processedCount = 0;
            
            for (const targetUserId of USER_DATABASE) {
                try {
                    if (BLOCKED_USERS.has(targetUserId)) {
                        failCount++;
                        processedCount++;
                        continue;
                    }
                    
                    await bot.sendMessage(targetUserId, text, { parse_mode: 'HTML' });
                    successCount++;
                    processedCount++;
                    
                    // تأخير صغير لتجنب القيود
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (processedCount % 10 === 0) {
                        await bot.editMessageText(
                            `🔄 <b>جاري الإرسال...</b>\n\n` +
                            `📊 <b>التقدم:</b> ${processedCount}/${totalUsers}\n` +
                            `✅ <b>نجح:</b> ${successCount}\n` +
                            `❌ <b>فشل:</b> ${failCount}`,
                            {
                                chat_id: chatId,
                                message_id: confirmationMessage.message_id,
                                parse_mode: 'HTML'
                            }
                        ).catch(() => {});
                    }
                } catch (error) {
                    console.error(`Failed to send broadcast to ${targetUserId}:`, error.message);
                    failCount++;
                    processedCount++;
                }
            }
            
            const successRate = totalUsers > 0 ? ((successCount / totalUsers) * 100).toFixed(1) : 0;
            let resultMessage = `📢 <b>تم الانتهاء من عملية الإذاعة!</b>\n\n`;
            resultMessage += `📊 <b>التقرير النهائي:</b>\n`;
            resultMessage += `• 👥 إجمالي المستخدمين: ${totalUsers}\n`;
            resultMessage += `• ✅ تم الإرسال بنجاح: ${successCount}\n`;
            resultMessage += `• ❌ فشل في الإرسال: ${failCount}\n`;
            resultMessage += `• 📈 نسبة النجاح: ${successRate}%\n\n`;
            
            if (successCount > 0) {
                resultMessage += "🎉 <b>تم إرسال الرسالة بنجاح لمعظم المستخدمين</b>";
            } else {
                resultMessage += "😔 <b>لم يتم إرسال الرسالة لأي مستخدم</b>";
            }
            
            await bot.editMessageText(resultMessage, {
                chat_id: chatId,
                message_id: confirmationMessage.message_id,
                parse_mode: 'HTML'
            });
            
            console.log(`Broadcast completed by developer ${userId}. Success: ${successCount}, Failed: ${failCount}`);
            return;
        }
    }
    
    // معالجة سياق المستخدم
    const context = userContext[userId] || {};
    
    if (context.sending_to_developer) {
        if (text.trim()) {
            const user = msg.from;
            const userName = user.first_name || "غير معروف";
            const username = user.username ? `@${user.username}` : "لا يوجد";
            
            const messageToDeveloper = `📩 <b>هناك رسالة من مستخدم للبوت 🆕</b>\n\n` +
                `🔐 <b>User:</b> ${username}\n` +
                `🔋 <b>Name:</b> ${userName}\n` +
                `🆔 <b>ID:</b> <code>${userId}</code>\n` +
                `💌 <b>Message:</b>\n${text}\n\n` +
                `⏰ <b>الوقت:</b> ${new Date().toLocaleString('ar-EG')}`;
            
            try {
                await bot.sendMessage(DEVELOPER_ID, messageToDeveloper, { parse_mode: 'HTML' });
                await bot.sendMessage(chatId,
                    "✅ <b>تم إرسال رسالتك للمطور بنجاح! 🎉</b>\n\n" +
                    "📞 <b>سيتم الرد عليك قريباً</b>\n\n" +
                    "💡 <b>شكراً لتواصلك معنا 😊</b>",
                    { parse_mode: 'HTML' }
                );
                console.log(`Message sent to developer from user ${userId}: ${text}`);
            } catch (error) {
                await bot.sendMessage(chatId,
                    "❌ <b>حدث خطأ في إرسال الرسالة</b>\n\n" +
                    "🔧 <b>جرب مرة أخرى لاحقاً</b>",
                    { parse_mode: 'HTML' }
                );
            }
        } else {
            await bot.sendMessage(chatId, "❌ <b>لم تقم بإرسال رسالة!</b>", { parse_mode: 'HTML' });
        }
        delete userContext[userId];
        return;
    }
    
    if (context.waiting_for_shorten) {
        if (!text.startsWith('http://') && !text.startsWith('https://')) {
            await bot.sendMessage(chatId,
                "❌ <b>الرابط غير صالح!</b>\n\n" +
                "🔗 <b>يجب أن يبدأ الرابط بـ:</b>\n" +
                "• https://\n" +
                "• http://\n\n" +
                "أرسل الرابط مرة أخرى:",
                { parse_mode: 'HTML' }
            );
            return;
        }
        
        await bot.sendMessage(chatId, "⏳ <b>جاري اختصار الرابط...</b>", { parse_mode: 'HTML' });
        
        const shortLinks = await linkShortener.shortenUrl(text);
        
        if (!shortLinks || shortLinks.length === 0) {
            await bot.sendMessage(chatId,
                "❌ <b>تعذر اختصار الرابط</b>\n\n" +
                "🔧 <b>الأسباب المحتملة:</b>\n" +
                "• الرابط غير صالح\n" +
                "• مشكلة في الخدمات\n" +
                "• حاول برابط آخر",
                { parse_mode: 'HTML' }
            );
        } else {
            let message = "✅ <b>تم اختصار الرابط بنجاح!</b>\n\n";
            message += `🔗 <b>الرابط الأصلي:</b>\n<code>${text}</code>\n\n`;
            message += "📦 <b>الروابط المختصرة:</b>\n\n";
            
            shortLinks.forEach((link, index) => {
                message += `${index + 1}. ${link}\n`;
            });
            
            message += "\n💡 <b>اختر الرابط الذي يعمل معك</b>";
            
            await bot.sendMessage(chatId, message, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔙 الرجوع للقائمة", callback_data: "back_to_main" }]
                    ]
                }
            });
        }
        delete userContext[userId];
        return;
    }
    
    if (context.tracking_ip) {
        if (text.trim()) {
            await bot.sendMessage(chatId, "🌍 <b>جاري تتبع العنوان...</b>", { parse_mode: 'HTML' });
            const result = await trackIpAddress(text.trim());
            await bot.sendMessage(chatId, result, { parse_mode: 'HTML' });
        } else {
            await bot.sendMessage(chatId, "❌ <b>لم تقم بإرسال عنوان IP!</b>", { parse_mode: 'HTML' });
        }
        delete userContext[userId];
        return;
    }
    
    if (text.toLowerCase() === 'ip') {
        await bot.sendMessage(chatId, "🌍 <b>جاري تتبع عنوان IP الخاص بك...</b>", { parse_mode: 'HTML' });
        const result = await trackIpAddress('myip');
        await bot.sendMessage(chatId, result, { parse_mode: 'HTML' });
        return;
    }
    
    if (context.checking_link) {
        if (text.trim()) {
            await bot.sendMessage(chatId, "🔍 <b>جاري فحص الرابط...</b>", { parse_mode: 'HTML' });
            const result = await checkUrlSafety(text.trim());
            await bot.sendMessage(chatId,
                `📊 <b>نتيجة فحص الرابط:</b>\n\n` +
                `🔗 <b>الرابط:</b> ${text}\n\n` +
                `📋 <b>الحالة:</b> ${result}`,
                { parse_mode: 'HTML' }
            );
        } else {
            await bot.sendMessage(chatId, "❌ <b>لم تقم بإرسال رابط!</b>", { parse_mode: 'HTML' });
        }
        delete userContext[userId];
        return;
    }
    
    if (context.waiting_for_name) {
        if (text.trim().length > 0) {
            const name = text.trim();
            await bot.sendMessage(chatId, "✨ <b>حالاً ي فندم</b>", { parse_mode: 'HTML' });
            
            // أنماط الزخرفة
            const styles = [
                "𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹",
                "𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍",
                "𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡",
                "𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕",
                "𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁",
                "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙",
                "𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭",
                "𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ",
                "𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅",
                "🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩"
            ];
            
            for (const styleChars of styles) {
                try {
                    const decoratedName = convertNameToStyle(name, styleChars);
                    if (decoratedName && decoratedName.trim()) {
                        await bot.sendMessage(chatId, decoratedName);
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                } catch (error) {
                    console.error('Error sending decorated name:', error);
                }
            }
            
            await bot.sendMessage(chatId,
                "🎉 <b>تم الانتهاء من الزخرفة!</b>\n\n💡 <b>متنساش تشكر حمزه😇❤️‍🩹</b>",
                { parse_mode: 'HTML' }
            );
        } else {
            await bot.sendMessage(chatId, "❌ <b>الاسم غير صالح!</b>", { parse_mode: 'HTML' });
        }
        delete userContext[userId];
        return;
    }
    
    if (context.waiting_for_link) {
        if (text.startsWith('https://')) {
            await bot.sendMessage(chatId,
                `🔗 <b>الرابط الملتغم:</b>\n${text}\n\n` +
                `⚠️ <b>تم التلغيم بنجاح!</b>`,
                { parse_mode: 'HTML' }
            );
        } else {
            await bot.sendMessage(chatId, "❌ <b>الرابط غير صالح!</b>", { parse_mode: 'HTML' });
        }
        delete userContext[userId];
        return;
    }
    
    // إذا لم تكن هناك حالة خاصة، عرض رسالة افتراضية
    await bot.sendMessage(chatId,
        "🔧 <b>استخدم الأزرار للتفاعل مع البوت</b>\n\nاضغط /start لرؤية القائمة الكاملة 🎛️",
        { parse_mode: 'HTML' }
    );
}

// ========== إعداد Express ==========
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Telegram Hacker Bot</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 20px;
                    color: white;
                    text-align: center;
                }
                .container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }
                h1 {
                    font-size: 2.5em;
                    margin-bottom: 10px;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
                }
                h2 {
                    font-size: 1.8em;
                    margin-bottom: 20px;
                    color: #ffcc00;
                }
                p {
                    font-size: 1.2em;
                    line-height: 1.6;
                    margin-bottom: 20px;
                }
                .status {
                    display: inline-block;
                    padding: 10px 20px;
                    background: ${BOT_STATUS === "running" ? "#4CAF50" : "#F44336"};
                    border-radius: 50px;
                    font-weight: bold;
                    margin: 20px 0;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                .stats {
                    display: flex;
                    justify-content: space-around;
                    flex-wrap: wrap;
                    margin: 30px 0;
                }
                .stat-item {
                    background: rgba(255, 255, 255, 0.2);
                    padding: 20px;
                    border-radius: 10px;
                    margin: 10px;
                    flex: 1;
                    min-width: 150px;
                }
                .stat-number {
                    font-size: 2em;
                    font-weight: bold;
                    color: #ffcc00;
                }
                .links {
                    margin-top: 30px;
                }
                .link-button {
                    display: inline-block;
                    background: #ffcc00;
                    color: #333;
                    padding: 15px 30px;
                    margin: 10px;
                    border-radius: 50px;
                    text-decoration: none;
                    font-weight: bold;
                    transition: all 0.3s ease;
                }
                .link-button:hover {
                    background: #ffd633;
                    transform: translateY(-3px);
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                }
                .developer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid rgba(255, 255, 255, 0.3);
                }
                .features {
                    text-align: left;
                    margin: 30px 0;
                    background: rgba(0, 0, 0, 0.2);
                    padding: 20px;
                    border-radius: 10px;
                }
                .feature-item {
                    padding: 10px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .feature-item:last-child {
                    border-bottom: none;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 Telegram Hacker Bot</h1>
                <h2>بوت أدوات الاختراق المتكامل</h2>
                
                <div class="status">
                    حالة البوت: ${BOT_STATUS === "running" ? "🟢 يعمل بنجاح" : "🔴 متوقف"}
                </div>
                
                <p>
                    هذا البوت يحتوي على جميع أدوات الاختراق والحماية التي تحتاجها.
                    تم تطويره بواسطة حمزة لمساعدة المستخدمين في الحماية من الاختراقات.
                </p>
                
                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-number">${USER_DATABASE.size}</div>
                        <div>المستخدمين النشطين</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${BLOCKED_USERS.size}</div>
                        <div>المستخدمين المحظورين</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">30+</div>
                        <div>أداة متاحة</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">24/7</div>
                        <div>دعم فني</div>
                    </div>
                </div>
                
                <div class="features">
                    <h3>🎯 الميزات الرئيسية:</h3>
                    <div class="feature-item">✅ اختراق الكاميرات الأمامية والخلفية</div>
                    <div class="feature-item">✅ تسجيل الصوت والتقاط الفيديو عن بعد</div>
                    <div class="feature-item">✅ اختراق حسابات وسائل التواصل الاجتماعي</div>
                    <div class="feature-item">✅ سحب جهات الاتصال والصور</div>
                    <div class="feature-item">✅ فحص الروابط واختصارها</div>
                    <div class="feature-item">✅ تتبع عناوين IP وجمع المعلومات</div>
                    <div class="feature-item">✅ أدوات حماية واختراق الأجهزة</div>
                    <div class="feature-item">✅ ألعاب وتسلية داخل البوت</div>
                    <div class="feature-item">✅ دعم تقييم البوت وملاحظات المستخدمين</div>
                </div>
                
                <div class="links">
                    <a href="https://t.me/jt_r3r" class="link-button">📱 تواصل مع المطور</a>
                    <a href="https://t.me/${bot.token.split(':')[0]}_bot" class="link-button">🚀 ابدأ استخدام البوت</a>
                </div>
                
                <div class="developer">
                    <h3>😈 المطور: حمزة</h3>
                    <p>مطور بوتات ومبرمج متخصص في أدوات الأمن والحماية</p>
                    <p>📧 للاستفسارات: @jt_r3r</p>
                    <p>⏰ ${new Date().toLocaleString('ar-EG')}</p>
                </div>
            </div>
            
            <script>
                // تحديث الإحصائيات كل 30 ثانية
                setInterval(() => {
                    location.reload();
                }, 30000);
            </script>
        </body>
        </html>
    `);
});

// ========== إعداد معالجات البوت ==========
// معالجة أمر /start
bot.onText(/\/start/, handleStart);

// معالجة أمر /start1 (للمطور)
bot.onText(/\/start1/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isDeveloper(userId)) {
        await bot.sendMessage(chatId, "❌ <b>هذا الأمر للمطور فقط!</b>", { parse_mode: 'HTML' });
        return;
    }
    
    const ratingCount = Object.values(BOT_RATINGS).reduce((sum, ratings) => sum + ratings.length, 0);
    const totalRating = Object.values(BOT_RATINGS).reduce((sum, ratings) => {
        return sum + ratings.reduce((s, r) => s + r, 0);
    }, 0);
    const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0;
    
    await bot.sendMessage(chatId,
        `<b>🚀 مرحباً بك يا المطور ${msg.from.first_name} 👋</b>\n\n` +
        `<b>🛠️ هذا هو الإصدار الخاص للمطور</b>\n\n` +
        `<b>📊 حالة البوت:</b> ${BOT_STATUS === 'running' ? '🟢 نشط' : '🔴 متوقف'}\n` +
        `<b>👥 المستخدمون المحظورون:</b> ${BLOCKED_USERS.size}\n` +
        `<b>👥 إجمالي المستخدمين:</b> ${USER_DATABASE.size}\n` +
        `<b>⭐ متوسط التقييم:</b> ${averageRating}/5 (${ratingCount} تقييم)\n` +
        `<b>🆔 ID الخاص بك:</b> <code>${userId}</code>\n\n` +
        `<b>🎛️ الأوامر الإدارية المتاحة:</b>\n` +
        `• /stop - إيقاف البوت\n` +
        `• /zero - تشغيل البوت\n` +
        `• /status - حالة البوت\n` +
        `• /Hamza1 - حظر مستخدم\n` +
        `• /Hamza - فك حظر مستخدم\n` +
        `• /blocked - عرض المحظورين\n` +
        `• /send_all - إذاعة رسالة لجميع المستخدمين\n\n` +
        `<b>🎛️ استخدم /start للعودة للواجهة العادية</b>`,
        { parse_mode: 'HTML' }
    );
    
    console.log(`Developer ${userId} used start1 command`);
});

// معالجة أوامر المطور
bot.onText(/\/stop/, async (msg) => {
    await stopBot(msg.chat.id, msg.from.id);
});

bot.onText(/\/zero/, async (msg) => {
    await startBot(msg.chat.id, msg.from.id);
});

bot.onText(/\/status/, async (msg) => {
    await botStatus(msg.chat.id, msg.from.id);
});

bot.onText(/\/Hamza1/, async (msg) => {
    await hamza1Command(msg.chat.id, msg.from.id);
});

bot.onText(/\/Hamza/, async (msg) => {
    await hamzaCommand(msg.chat.id, msg.from.id);
});

bot.onText(/\/blocked/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!isDeveloper(userId)) {
        await bot.sendMessage(chatId, "❌ <b>هذا الأمر للمطور فقط!</b>", { parse_mode: 'HTML' });
        return;
    }
    
    if (BLOCKED_USERS.size === 0) {
        await bot.sendMessage(chatId,
            "📋 <b>قائمة المستخدمين الممنوعين</b>\n\n" +
            "✅ <b>لا يوجد مستخدمين محظورين حالياً</b>",
            { parse_mode: 'HTML' }
        );
        return;
    }
    
    let usersList = "";
    BLOCKED_USERS.forEach(userId => {
        usersList += `• <code>${userId}</code>\n`;
    });
    
    await bot.sendMessage(chatId,
        `📋 <b>قائمة المستخدمين المحظورين</b>\n\n` +
        `🚫 <b>عدد المستخدمين المحظورين:</b> ${BLOCKED_USERS.size}\n\n` +
        `${usersList}\n\n` +
        `🔧 <b>الأوامر المتاحة:</b>\n` +
        `• /Hamza1 - حظر مستخدم\n` +
        `• /Hamza - فك حظر مستخدم`,
        { parse_mode: 'HTML' }
    );
});

bot.onText(/\/send_all/, async (msg) => {
    await sendAllCommand(msg.chat.id, msg.from.id);
});

// معالجة الأزرار
bot.on('callback_query', handleCallbackQuery);

// معالجة الرسائل النصية
bot.on('message', handleMessage);

// معالجة الأخطاء
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

bot.on('webhook_error', (error) => {
    console.error('Webhook error:', error);
});

// ========== تشغيل الخادم ==========
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`🌐 Web interface: http://localhost:${PORT}`);
    console.log(`🤖 Bot is starting...`);
    console.log(`📊 Bot Status: ${BOT_STATUS === "running" ? "🟢 Active" : "🔴 Stopped"}`);
    console.log(`👤 Developer ID: ${DEVELOPER_ID}`);
    console.log(`👥 Total users in database: ${USER_DATABASE.size}`);
    console.log(`🚫 Blocked users: ${BLOCKED_USERS.size}`);
    console.log("=".repeat(50));
    console.log("✅ البوت يعمل بنجاح!");
    console.log("⏰ " + new Date().toLocaleString('ar-EG'));
    console.log("🔧 أوامر المطور:");
    console.log("   /stop - إيقاف البوت للجميع");
    console.log("   /zero - تشغيل البوت للجميع");
    console.log("   /status - حالة البوت");
    console.log("   /Hamza1 - حظر مستخدم");
    console.log("   /Hamza - فك حظر مستخدم");
    console.log("   /blocked - عرض المستخدمين المحظورين");
    console.log("   /send_all - إذاعة رسالة لجميع المستخدمين");
    console.log("   /start1 - بدء البوت (إصدار المطور)");
    console.log("⭐ زر تقييم البوت - شغال!");
    console.log("☠️ زر سحب جهات الاتصال - شغال!");
    console.log("🔥 زر تطبيقات نار - شغال!");
    console.log("🎮 زر لعبة XO - شغال!");
    console.log("📺 زر اختراق قنوات التلفزيون - شغال!");
    console.log("👨🏻‍💻 زر فك حظر واتساب - شغال!");
    console.log("‼️ زر حظر انستقرام - شغال!");
    console.log("💥 زر تبنيد بث تيك توك - شغال!");
    console.log("☎️ زر ارقام وهمية - شغال!");
    console.log("📧 زر ايميل مؤقت - شغال!");
    console.log("🧠 زر الذكاء الاصطناعي - يفتح الرابط مباشرة!");
    console.log("😈 زر المطور - يفتح الرابط مباشرة!");
    console.log("=".repeat(50));
});

// إبقاء التطبيق قيد التشغيل
process.on('SIGINT', () => {
    console.log('\n🛑 إيقاف البوت...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ خطأ غير متوقع:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ خطأ في promise:', reason);
});
