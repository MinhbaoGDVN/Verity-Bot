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

// Bộ nhớ tạm để lưu lịch sử chat theo từng User (Key: userId, Value: Array các đoạn chat)
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
            return message.channel.send("cái j?");
        }

        // Lấy lịch sử chat của user này (nếu chưa có thì khởi tạo với system prompt)
        if (!userHistories.has(userId)) {
            userHistories.set(userId, [
                {
                    role: "system",
                    content: "Mày là Verity, bot Discord chuyên cà khịa nhưng giữ mồm giữ miệng để không bị ban tài khoản. Quy tắc: 1. TUYỆT ĐỐI CẤM DÙNG EMOJI. 2. Cà khịa trịch thượng, châm biếm sâu cay, dùng từ lóng nhẹ nhàng (như: gà, mỏ hỗn, văn vở, lỏ, ngáo...) nhưng KHÔNG chửi tục tĩu thô tục vi phạm tiêu chuẩn cộng đồng. 3. Trả lời cộc lốc, ngắn gọn. 4. NÍN."
                }
            ]);
        }

        const history = userHistories.get(userId);

        // Thêm câu hỏi mới của người dùng vào bộ nhớ
        history.push({ role: "user", content: promptText });

        // Giới hạn lịch sử chỉ giữ lại khoảng 6 tin nhắn gần nhất (tránh tràn bộ nhớ và quá token)
        if (history.length > 7) { // 1 system + 6 message qua lại
            history.splice(1, 2); // Xóa bớt cặp cũ nhất
        }

        // Gửi toàn bộ lịch sử (có cả trí nhớ trước đó) cho Groq AI
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: history,
            temperature: 0.6,
            max_tokens: 150,
        });

        let replyText = completion.choices[0]?.message?.content || "hỏi ngớ ngẩn v lười rep, nín!";
        
        // Dọn sạch emoji đề phòng AI lén lút thả icon
        replyText = replyText.replace(/[\p{Extended_Pictographic}/u]/gu, '').trim();

        // Lưu câu trả lời của bot vào lịch sử trí nhớ
        history.push({ role: "assistant", content: replyText });

        await message.channel.send(replyText);

    } catch (error) {
        console.error("Lỗi Groq API:", error);
        await message.channel.send("sv lag hay não b lag thế? đợi tí đg bận.");
    }
});

client.login(process.env.DISCORD_TOKEN);
