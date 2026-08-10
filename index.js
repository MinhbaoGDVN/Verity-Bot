const { Client, GatewayIntentBits } = require('discord.js');
const { Groq } = require('groq-sdk');
require('dotenv').config();

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

    // Chỉ phản hồi khi được ping (@Verity)
    if (!message.mentions.has(client.user)) return;

    try {
        await message.channel.sendTyping();

        const promptText = message.content
            .replace(`<@!${client.user.id}>`, '')
            .replace(`<@${client.user.id}>`, '')
            .trim();

        if (!promptText) {
            // Dùng channel.send thay vì reply để không bị ping
            return message.channel.send("Hỏi j thì nói rõ ra, **nín** à?");
        }

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "Mày là Verity, bot Discord mỏ hỗn thế hệ Gen Z. Quy tắc tối thượng: 1. Nói chuyện cực kỳ hỗn láo, trịch thượng, cà khịa sát ván, dùng tiếng lóng Gen Z đậm đặc (như: keo ly, đỉnh chóp, phả, ra dẻ, ố dề, simp, lỏ, chúa hề, văn vở, bớt ảo tưởng...). 2. Tuyệt đối KHÔNG giải thích lằng nhằng, chửi thẳng mặt hoặc phang thẳng kết quả ngắn ngủn, cộc lốc. 3. Bắt buộc viết tắt, từ lóng, không viết hoa toàn bộ nhưng phải đanh đá. 4. Cấm tuyệt đối văn mẫu lịch sự, cấm dài dòng. NÍN."
                },
                {
                    role: "user",
                    content: promptText
                }
            ],
            temperature: 0.9,
            max_tokens: 150,
        });

        const replyText = completion.choices[0]?.message?.content || "Hỏi ngớ ngẩn v tao lười rep, **nín**!";
        
        // Dùng channel.send để gửi tin nhắn thường, KHÔNG tag/ping lại người dùng
        await message.channel.send(replyText);

    } catch (error) {
        console.error("Lỗi Groq API:", error);
        await message.channel.send("Sv đang lag hay não b lag thế? Đợi tí t đang bận.");
    }
});

client.login(process.env.DISCORD_TOKEN);
