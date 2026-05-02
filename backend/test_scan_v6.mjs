import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = 'AIzaSyCr4B9PogzTa5z3IRzMQLuDx_NUTD9DYEM';

const PHOTOS = [
  { file: '../WhatsApp Image 2026-05-01 at 19.54.40.jpeg', mime: 'image/jpeg' },
  { file: '../WhatsApp Image 2026-05-02 at 01.41.00.jpeg', mime: 'image/jpeg' },
];

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'object',
      properties: {
        books: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title:      { type: 'string' },
              author:     { type: 'string' },
              language:   { type: 'string', enum: ['he', 'en', 'other'] },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['title', 'author', 'language', 'confidence'],
          },
        },
      },
      required: ['books'],
    },
  },
});

for (const { file, mime } of PHOTOS) {
  const absPath = path.resolve(file);
  if (!fs.existsSync(absPath)) { console.log(`\n⚠️  Not found: ${file}\n`); continue; }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📷  ${path.basename(file)}`);
  console.log('─'.repeat(60));

  const imageBase64 = fs.readFileSync(absPath).toString('base64');

  try {
    const result = await model.generateContent([
      { inlineData: { mimeType: mime, data: imageBase64 } },
      `זהה את כל הספרים הנראים בתמונה.
סרוק משמאל לימין, מלמעלה למטה — כלול גם ספרים חלקיים, בזווית, או בקצוות.
כתוב את הכותרת בדיוק כפי שמופיעה על גב הספר — אל תתרגם ואל תתקן שגיאות כתיב.
אם שם המחבר אינו נראה, השאר ריק.`,
    ]);

    const books = JSON.parse(result.response.text()).books ?? [];
    console.log(`✅  ${books.length} books identified:\n`);

    books.forEach((b, i) => {
      const icon = b.confidence === 'high' ? '🟢' : b.confidence === 'medium' ? '🟡' : '🔴';
      const lang = b.language === 'he' ? 'עב' : b.language === 'en' ? 'EN' : '??';
      const author = b.author ? ` — ${b.author}` : '';
      console.log(`  ${String(i + 1).padStart(2)}. ${icon} [${lang}] "${b.title}"${author}`);
    });
  } catch (err) {
    console.log(`❌  Error: ${err.message}`);
  }
}

console.log(`\n${'─'.repeat(60)}\nDone.\n`);
