import { Settings } from './settings.js';
import { Glossary } from './glossary.js';

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const getToneInstruction = (tone) => {
  switch (tone) {
    case 'general':
      return "Role: You are an expert translator of Buddhist texts. Translate the Chinese Buddhist article into English naturally and accurately. Use standard Buddhist terminology, referencing the lexicons of Dharma Drum Mountain, Fo Guang Shan, and Thupten Jinpa for doctrinal accuracy.";
    case 'book':
      return "Role: You are an expert translator of Buddhist texts. Translate the text into English using a formal, elegant, and scholarly literary tone, mimicking the highly respected translation style of 'Lotsawa House'. Ensure structural fidelity to the original text and precise use of Buddhist terminology (referencing Dharma Drum Mountain, Fo Guang Shan, and Thupten Jinpa).";
    case 'video':
      return "Role: You are an expert translator of Buddhist texts. Translate the text mimicking the translation style of 'Red Pine' (Bill Porter), but optimize it for spoken delivery (like video subtitles or a script). The tone should be conversational yet profound, dynamic, and expressive. Use standard Buddhist terminology.";
    case 'web':
      return "Role: You are an expert translator of Buddhist texts. Translate the text mimicking the translation style of 'Red Pine' (Bill Porter). The tone should be clear, poetic, and accessible, capturing the spirit and philosophical depth of the original text while keeping sentences relatively concise for webpage reading. Use standard Buddhist terminology.";
    case 'mindful_card':
      return `Role: You are an expert translator of Buddhist texts. Please translate by mimicking the tone and mindfulness philosophy of 'Thich Nhat Hanh'.
Tone: The text must be concise, gentle, and full of compassion and wisdom. Speak softly as if talking to a friend, bringing inner peace and tranquility.
Strategy: Do not just provide a rigid literal translation. Grasp the core Buddhist meaning of the original text and transform it into a healing, mindful quote.
Imagery: Appropriately integrate imagery of mindfulness and nature (e.g., breathing, smiling, water, falling leaves, footsteps, the present moment).`;
    default:
      return "Role: You are an expert translator of Buddhist texts. Translate the Chinese Buddhist article into English naturally and accurately. Use standard Buddhist terminology, referencing the lexicons of Dharma Drum Mountain, Fo Guang Shan, and Thupten Jinpa for doctrinal accuracy.";
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
      
      const isQuotaError = response.status === 429 || 
        (errData.error && errData.error.message && errData.error.message.toLowerCase().includes('quota'));
      
      if (isQuotaError) {
        const err = new Error("QUOTA_EXCEEDED");
        err.isQuotaError = true;
        throw err;
      }

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
