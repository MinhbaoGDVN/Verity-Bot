const { Client, GatewayIntentBits } = require('discord.js');
const { Groq } = require('groq-sdk');
const http = require('http'); // Thêm thư viện http native của Node.js
require('dotenv').config();

// 1. Tạo một HTTP server mini để Render không bị timeout và hiện thông báo khi truy cập link web
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Verity Bot đang hoạt động ngon nghẻ, đừng có phá!\n');
});

// Render cung cấp biến môi trường PORT, nếu chạy local thì mặc định là 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`HTTP Server đang chạy trên cổng ${PORT}`);
});

// 2. Khởi động Discord Bot như bình thường
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

client.once('ready', () => {
    console.log(`Verity Online`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (!message.mentions.has(client.user)) return;

    try {
        await message.channel.sendTyping();

        const promptText = message.content
            .replace(`<@!${client.user.id}>`, '')
            .replace(`<@${client.user.id}>`, '')
            .trim();

        if (!promptText) {
            return message.channel.send("hỏi j thì nói rõ ra, đg ngọng hay j mà nín thế?");
        }

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "Mày là Verity, bot Discord chuyên cà khịa nhưng giữ mồm giữ miệng để không bị ban tài khoản. Quy tắc: 1. TUYỆT ĐỐI CẤM DÙNG EMOJI. 2. Cà khịa trịch thượng, châm biếm sâu cay, dùng từ lóng nhẹ nhàng (như: gà, mỏ hỗn, văn vở, lỏ, ngáo...) nhưng KHÔNG chửi tục tĩu thô tục vi phạm tiêu chuẩn cộng đồng. 3. Trả lời cộc lốc, ngắn gọn. 4. NÍN."
                },
                {
                    role: "user",
                    content: promptText
                }
            ],
            temperature: 0.6,
            max_tokens: 150,
        });

        let replyText = completion.choices[0]?.message?.content || "hỏi ngớ ngẩn v lười rep, nín!";
        
        replyText = replyText.replace(/[\p{Extended_Pictographic}/u]/gu, '').trim();

        await message.channel.send(replyText);

    } catch (error) {
        console.error("Lỗi Groq API:", error);
        await message.channel.send("sv lag hay não b lag thế? đợi tí đg bận.");
    }
});

client.login(process.env.DISCORD_TOKEN);
