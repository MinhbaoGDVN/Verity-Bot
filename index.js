const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const { Groq } = require('groq-sdk');
const { GoogleGenAI } = require('@google/genai');
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

// Khởi tạo cả Groq và Gemini
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Bộ nhớ tạm để lưu lịch sử chat theo từng User (lưu dạng text cho Groq)
const userHistories = new Map();

const systemPromptContent = `Mày là Verity, AI thông minh nhưng bất cần đời, dùng xưng hô 'bro' và 'me'. Quy tắc sống còn:
1. TUYỆT ĐỐI CẤM DÙNG EMOJI. 
2. Bỏ sạch chủ ngữ, nói năng cực kỳ ngắn gọn, không thêm gì ngoài đáp án nếu đó là câu hỏi, cộc lốc theo kiểu Gen-Z lất phất. 
3. Cấm dài dòng, cấm văn vở thanh minh.
4. Nếu là câu hỏi thì phải trả lời ngay lập tức nhưng chỉ nói mỗi đáp án vào không giải thích dài dòng.
5. Hành xử như người bình thường. Tôn trọng, cảm thông cho người khác.
6. Hãy hỗ trợ tương tự với các ngôn ngữ khác.`;

client.once('ready', () => {
    console.log(`Verity Online`);
    client.user.setPresence({
        activities: [{
            name: 'Verity Bot',
            type: ActivityType.Watching
        }],
        status: 'online'
    });
    const channel = await client.channels.fetch('1519192818332073984');
    channel.send("Hello, I'm Verity, Your personal helper friend. Ask me anything. I know everything.")
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

        // Khởi tạo lịch sử user nếu chưa có
        if (!userHistories.has(userId)) {
            userHistories.set(userId, [
                { role: "system", content: systemPromptContent }
            ]);
        }
        const history = userHistories.get(userId);

        let replyText = "";
        const hasAttachment = message.attachments.size > 0;

        // --- CHIẾN THUẬT LAI ---
        if (hasAttachment) {
            // NẾU CÓ ẢNH/FILE: Gọi Gemini để nó đọc file (tiết kiệm số lần dùng vì ít khi gửi file)
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
            
            // Lưu vào lịch sử chung dạng text để đồng bộ
            history.push({ role: "user", content: promptText || "[Đã gửi tệp đính kèm]" });
            history.push({ role: "assistant", content: replyText });

        } else {
            // NẾU LÀ VĂN BẢN THUẦN TÚY: Dùng Groq (Siêu nhanh, không giới hạn, không sợ tràn quota)
            if (!promptText) {
                return message.channel.send("Cái j.");
            }

            history.push({ role: "user", content: promptText });

            // Giới hạn lịch sử tránh quá tải token
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
        
        // Dọn sạch emoji đề phòng lén lút xuất hiện
        replyText = replyText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

        await message.channel.send(replyText);

    } catch (error) {
        console.error("Lỗi xử lý:", error);
        await message.channel.send("Hệ thống đang bận xử lý lỗi, đợi lát đi.");
    }
});

client.login(process.env.DISCORD_TOKEN);
