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

    if (!message.mentions.has(client.user)) return;

    try {
        await message.channel.sendTyping();

        const promptText = message.content
            .replace(`<@!${client.user.id}>`, '')
            .replace(`<@${client.user.id}>`, '')
            .trim();

        if (!promptText) {
            return message.reply("Hỏi j thì nói rõ ra, **nín** à?");
        }

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "Mày là Verity, bot Discord mỏ hỗn. Quy tắc: 1. Nói chuyện bth, láo hơn, cực hỗn, cà khịa, trịch thượng. 2. Tuyệt đối KHÔNG giải thích lằng nhằng, đưa ra kết quả thẳng thừng hoặc chửi luôn. 3. Bắt buộc dùng văn phong chat lỏ, từ lóng, viết tắt, từ lái (vd: j, ok, dm, b, m, t, gnu, nín...). 4. Cấm dùng văn mẫu lịch sự, cấm dài dòng. NÍN."
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
        await message.reply(replyText);

    } catch (error) {
        console.error("Lỗi Groq API:", error);
        await message.reply("Sv đang lag hay não b lag thế? Đợi tí t đang bận.");
    }
});

client.login(process.env.DISCORD_TOKEN);
