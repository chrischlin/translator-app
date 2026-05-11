import { Settings } from './settings.js';
import { Glossary } from './glossary.js';

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const getToneInstruction = (tone) => {
  switch (tone) {
    case 'book':
      return "Use a formal, literary tone suitable for a published book. Ensure elegance and precise phrasing.";
    case 'video':
      return "Use a conversational, engaging, and dynamic tone suitable for video subtitles or a script. Keep it natural and expressive.";
    case 'web':
      return "Use a clear, concise, and accessible tone suitable for a webpage or blog post. Keep sentences relatively short and easy to read.";
    default:
      return "Translate naturally and accurately.";
  }
};

const getGlossaryInstruction = () => {
  const glossary = Glossary.get();
  const terms = Object.keys(glossary);
  if (terms.length === 0) return "";
  
  let instruction = "\n\nCRITICAL GLOSSARY INSTRUCTION: You MUST use the following exact translations for the specified terms:\n";
  for (const [ch, en] of Object.entries(glossary)) {
    instruction += `- "${ch}" MUST be translated as "${en}"\n`;
  }
  return instruction;
};

export const Api = {
  translate: async (text, tone) => {
    const apiKey = Settings.getApiKey();
    if (!apiKey) {
      throw new Error("Gemini API Key is not set. Please configure it in settings.");
    }

    const toneInstruction = getToneInstruction(tone);
    const glossaryInstruction = getGlossaryInstruction();

    const systemPrompt = `You are a professional, high-quality Japanese minimalist translator. Your task is to translate Chinese text into English.
${toneInstruction}${glossaryInstruction}

OUTPUT FORMAT:
Return ONLY the translated English text. Do not include any explanations, original text, or markdown formatting blocks. Maintain the original paragraph structure.`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        parts: [{ text }]
      }]
    };

    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errData)}`);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Unexpected API response format");
    }
  }
};
