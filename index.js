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
    
    const botMention1 = `<@${client.user.id}>`;
    const botMention2 = `<@!${client.user.id}>`;
    
    if (!message.content.includes(botMention1) && !message.content.includes(botMention2)) return;

    try {
        await message.channel.sendTyping();

        const userId = message.author.id;
        const promptText = message.content
            .replace(/<@${client.user.id}>/g, '')
            .trim();

        if (!promptText) {
            return message.channel.send("Cái j.");
        }

        // Lấy lịch sử chat của user này
        if (!userHistories.has(userId)) {
            userHistories.set(userId, [
                {
                    role: "system",
                    content: `Mày là Verity, AI thông minh nhưng bất cần đời, dùng xưng hô 'bro' và 'me'. Quy tắc sống còn:
1. TUYỆT ĐỐI CẤM DÙNG EMOJI. 
2. Bỏ sạch chủ ngữ, nói năng cực kỳ ngắn gọnm, không thêm gì ngoài đáp án nếu đó là câu hỏi, cộc lốc theo kiểu Gen-Z lất phất. 
3. Khi bro cà khịa hoặc chửi đổng, phải đáp trả bằng văn phong 'ừ đấy, thì sao', 'rồi sao nữa', thách thức, tỉnh queo và xéo sắc. 
4. Cấm dài dòng, cấm văn vở thanh minh.`
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
        replyText = replyText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

        history.push({ role: "assistant", content: replyText });

        await message.channel.send(replyText);

    } catch (error) {
        console.error("Lỗi Groq API:", error);
        await message.channel.send("Hệ thống đang bận xử lý lỗi, đợi lát đi.");
    }
});

client.login(process.env.DISCORD_TOKEN);
