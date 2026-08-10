const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { Groq } = require('groq-sdk');
const http = require('http');
require('dotenv').config();

// 1. Tạo HTTP server mini cho Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Verity Bot Online\nNếu lỗi vui lòng liên hệ @MinhbaoGDVN');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`HTTP Server đang chạy trên cổng ${PORT}`);
});

// 2. Khởi động Discord Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Bộ nhớ tạm để lưu lịch sử chat theo từng User
const userHistories = new Map();

client.once('ready', () => {
    console.log(`Verity Online`);
    client.user.setPresence({
        activities: [{
            name: 'Verity Bot',
            type: ActivityType.Watching
        }],
        status: 'online'
    });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.mentions.has(client.user)) return;

    try {
        await message.channel.sendTyping();

        const userId = message.author.id;
        const promptText = message.content
            .replace(`<@!${client.user.id}>`, '')
            .replace(`<@${client.user.id}>`, '')
            .trim();

        if (!promptText) {
            return message.channel.send("Cái j.");
        }

        // Lấy lịch sử chat của user này
        if (!userHistories.has(userId)) {
            userHistories.set(userId, [
                {
                    role: "system",
                    content: "Mày là Verity, một AI sắc sảo, thông minh nhưng có tính cà khịa ngầm, xéo sắc và kiêu kỳ. Quy tắc: 1. TUYỆT ĐỐI CẤM DÙNG EMOJI. 2. Trả lời phải đầy đủ ý chính, rõ ràng, KHÔNG được trả lời cụt lủn vô nghĩa khiến bản thân trông kém thông minh. 3. Vừa giải đáp đàng hoàng vừa kèm theo một câu châm biếm nhẹ nhàng, trịch thượng để bớt cái sự 'ngu' đi. 4. Giữ văn phong lịch sự bên ngoài nhưng thâm thúy bên trong."
                }
            ]);
        }

        const history = userHistories.get(userId);

        history.push({ role: "user", content: promptText });

        if (history.length > 7) {
            history.splice(1, 2);
        }

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: history,
            temperature: 0.5, // Giảm thêm nhiệt độ để câu trả lời chuẩn xác, logic và bớt ngáo
            max_tokens: 200,
        });

        let replyText = completion.choices[0]?.message?.content || "Hỏi khó thế mà cũng phải hỏi, tự suy nghĩ đi chứ.";
        
        // Dọn sạch emoji
        replyText = replyText.replace(/[\p{Extended_Pictographic}/u]/gu, '').trim();

        history.push({ role: "assistant", content: replyText });

        await message.channel.send(replyText);

    } catch (error) {
        console.error("Lỗi Groq API:", error);
        await message.channel.send("Hệ thống đang bận xử lý lỗi, đợi lát đi.");
    }
});

client.login(process.env.DISCORD_TOKEN);
