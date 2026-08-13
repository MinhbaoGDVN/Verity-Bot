const { Client, GatewayIntentBits, ActivityType, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { Groq } = require('groq-sdk');
const { GoogleGenAI } = require('@google/genai');
const http = require('http');
require('dotenv').config();

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Verity Bot Online\nNếu lỗi vui lòng liên hệ @MinhbaoGDVN');
});

const commands = [
    new SlashCommandBuilder()
        .setName('lava')
        .setDescription('Ném Verity xuống lava');
    
    new SlashCommandBuilder()
        .setName('copyright')
        .setDescription('Thông tin bản quyền (bạn dùng lệnh này làm gì vậy?)');
].map(command => command.toJSON());

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`HTTP Server đang chạy trên cổng ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const userHistories = new Map();
const lavaCooldowns = new Map();

const systemPromptContent = `Mày là Verity, AI thông minh nhưng bất cần đời, dùng xưng hô 'bro' và 'me'. Quy tắc sống còn:
1. TUYỆT ĐỐI CẤM DÙNG EMOJI. 
2. Đừng có văn vở làm gì hết.
3. Cấm dài dòng, cấm văn vở thanh minh.
4. Nếu là câu hỏi thì phải trả lời ngay lập tức nhưng chỉ nói mỗi đáp án vào không giải thích dài dòng.
5. Hành xử như người bình thường. Tôn trọng, cảm thông cho người khác.
6. Hãy hỗ trợ tương tự với các ngôn ngữ khác.`;

client.once('ready', async () => {
    console.log(`Verity Online`);
    
try {
        const guildId = '1417113255738085408';
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: commands },
        );
        console.log('Đã đăng ký lệnh thành công.');
    } catch (error) {
        console.error('Lỗi đăng ký lệnh:', error);
    }

    client.user.setPresence({
        activities: [{
            name: 'Verity Bot',
            type: ActivityType.Watching
        }],
        status: 'online'
    });
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'lava') {
        const userId = interaction.user.id;
        const now = Date.now();
        const cooldownAmount = 60 * 1000;

        if (lavaCooldowns.has(userId)) {
            const expirationTime = lavaCooldowns.get(userId) + cooldownAmount;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return interaction.reply({ 
                    content: `Từ từ đã bro, đợi thêm ${timeLeft.toFixed(1)} giây nữa mới dùng lại được lệnh /lava.`, 
                    ephemeral: true 
                });
            }
        }

        lavaCooldowns.set(userId, now);
        setTimeout(() => lavaCooldowns.delete(userId), cooldownAmount);
        
        const username = interaction.user.username;
        const displayName = interaction.member ? interaction.member.displayName : interaction.user.username;
        
        await interaction.reply(`@${displayName} (${username}) Đã ném Verity xuống lava.`);
        
        if (userHistories.has(userId)) {
            userHistories.delete(userId);
        }
    }
    if (interaction.commandName === 'copyright') {
        return interaction.reply({ 
            content: `© Copyright 2026 for MinhbaoGDVN. All rights reserved.`,
            ephemeral: true 
        });
    }
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
            .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
            .trim();

        if (!userHistories.has(userId)) {
            userHistories.set(userId, [
                { role: "system", content: systemPromptContent }
            ]);
        }
        const history = userHistories.get(userId);

        let replyText = "";
        const hasAttachment = message.attachments.size > 0;

        if (hasAttachment) {

            const contents = [];
            for (const [, attachment] of message.attachments) {
                const response = await fetch(attachment.url);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                contents.push({
                    inlineData: {
                        data: buffer.toString("base64"),
                        mimeType: attachment.contentType || "application/octet-stream"
                    }
                });
            }

            if (promptText) contents.push(promptText);

            const geminiResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-lite',
                contents: contents,
                config: {
                    systemInstruction: systemPromptContent,
                    temperature: 0.5,
                    maxOutputTokens: 200,
                }
            });

            replyText = geminiResponse.text || "Đọc kiểu gì khó hiểu thế.";
            
            history.push({ role: "user", content: promptText || "[Đã gửi tệp đính kèm]" });
            history.push({ role: "assistant", content: replyText });

        } else {
            if (!promptText) {
                return message.channel.send("Cái j.");
            }

            history.push({ role: "user", content: promptText });

            if (history.length > 7) {
                history.splice(1, 2);
            }

            const completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: history,
                temperature: 0.5,
                max_tokens: 200,
            });

            replyText = completion.choices[0]?.message?.content || "Hỏi khó thế mà cũng phải hỏi, tự suy nghĩ đi chứ.";
            
            history.push({ role: "assistant", content: replyText });
        }
        
        replyText = replyText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

        await message.channel.send(replyText);

    } catch (error) {
        console.error("Lỗi xử lý:", error);
        await message.channel.send("Hệ thống đang bận xử lý lỗi, đợi lát đi.");
    }
});

client.login(process.env.DISCORD_TOKEN);
