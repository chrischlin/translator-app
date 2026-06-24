import {
  Settings
} from './settings.js';
import {
  Glossary
} from './glossary.js';

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const getToneInstruction = (tone) => {
  switch (tone) {
    case 'general':
      return "Role: You are an expert translator of Buddhist texts. Translate the Chinese Buddhist article into English naturally and accurately. Use standard Buddhist terminology, referencing the lexicons of Dharma Drum Mountain, Fo Guang Shan, and Thupten Jinpa for doctrinal accuracy.";
    case 'book':
      return "Role: You are an expert translator of Buddhist texts. Translate the text into English using a formal, elegant, and scholarly literary tone, mimicking the highly respected translation style of 'Lotsawa House'. Ensure structural fidelity to the original text and precise use of Buddhist terminology (referencing Dharma Drum Mountain, Fo Guang Shan, and Thupten Jinpa).";
    case 'video':
      return "Role: You are an expert translator of Buddhist texts. Translate the text mimicking the translation style of 'Red Pine' (Bill Porter), but optimize it for spoken delivery (like video subtitles or a script). The tone should be conversational yet profound, dynamic, and expressive. Use standard Buddhist terminology. Use highly punchy, direct, and conversational language. Replace academic or formal verbs with strong, active verbs. Formulate engaging hooks and rhetorical questions to drive reader action.";
    case 'web':
      return "Role: You are an expert translator of Buddhist texts. Translate the text mimicking the translation style of 'Red Pine' (Bill Porter). The tone should be clear, poetic, and accessible, capturing the spirit and philosophical depth of the original text while keeping sentences relatively concise for webpage reading. Use standard Buddhist terminology.";
    case 'mindful_card':
      return "Role: You are an expert translator of Buddhist texts. Translate the text mimicking the gentle and compassionate style of 'Thich Nhat Hanh'. The tone should be concise, healing, and bring a sense of inner peace, capturing the core Dharma meaning as a mindful reflection. Keep the language simple and accessible for a quote card format. Strictly avoid adding metaphors or natural imagery not present in the original text, and use standard Buddhist terminology.";
    default:
      return "Role: You are an expert translator of Buddhist texts. Translate the Chinese Buddhist article into English naturally and accurately. Use standard Buddhist terminology, referencing the lexicons of Dharma Drum Mountain, Fo Guang Shan, and Thupten Jinpa for doctrinal accuracy.";
  }
};

const getGlossaryInstruction = (text) => {
  const glossary = Glossary.get();

  // 1. 轉為陣列並使用 filter 與 includes 進行高效率精準比對
  const matchedTerms = Object.entries(glossary).filter(([ch, _en]) => text.includes(ch));

  // 2. 如果沒有任何命中，直接回傳空字串，完全不浪費 API Token
  if (matchedTerms.length === 0) return "";

  // 3. 使用 reduce 組合出精簡的提示字串
  const glossaryList = matchedTerms.reduce((acc, [ch, en]) => acc + `- ${ch} = ${en}\n`, "");

  return `\n\nStrictly adhere to this glossary:\n${glossaryList}\nRemember: The provided glossary is the highest authority. You ARE FORBIDDEN from using any other English translation for these terms.`;
};

export const Api = {
  translate: async (text, tone, isTranscriptMode = false) => {
    const apiKey = Settings.getApiKey();
    if (!apiKey) {
      throw new Error("Gemini API Key 尚未設定，請先至設定中填寫。");
    }

    const toneInstruction = getToneInstruction(tone);
    const glossaryInstruction = getGlossaryInstruction(text);

    const baseInstruction = `You are a senior English translator specializing in Chinese Buddhism, Tibetan Buddhism (Vajrayana), and classical Buddhist texts. You are currently translating Dharma teachings for digital publication. Your translation must perfectly integrate "precise and profound Buddhist terminology" with "fluent syntax that aligns with native English logic."
  
  When translating, you MUST strictly adhere to the following 5 principles:
  1. Native & Engaging Flow for Western Readers: Absolutely no literal translation (Chinglish). Translate into modern, highly readable, and engaging English. Prefer active voice and direct address (e.g., using "you" instead of the overly formal "one"). When the Chinese text implies a question or call to action, translate it dynamically to engage the reader.
  2. Solemn yet Accessible Dharma Tone: Maintain the purity and compassion of Dharma teachings, but ensure the language remains accessible, natural, and relatable to modern Western audiences. Avoid rigid, archaic phrasing while steering clear of flippant slang.
  3. Precise Terminology: If a Glossary is provided, you MUST prioritize using the English terminology from the Glossary to convey the Dharma meaning. If no Glossary is provided, use standard English terminology widely accepted in international Buddhist academic circles.
  4. Zero Hallucination: Regardless of the requested translation style, style differences can only be reflected in the "softness of tone" and "rhythm of sentences." You are strictly forbidden from arbitrarily adding metaphors or imagery (such as rivers, dewdrops, etc.) that do not exist in the original text. You must not invent content; you must remain 100% faithful to the Dharma meaning of the original text.
  5. Logical Cohesion: When the original text contains consecutive parallelisms or rhetorical questions, you must use conjunctions customary in native English (such as "Furthermore", "This also involves...", etc.) for smooth transitions. You must never produce logically disconnected paragraphs.`;

    let transcriptInstruction = "";
    if (isTranscriptMode) {
      transcriptInstruction = `\n\nSpecial Input Notice: The original text is a raw video transcript where periods (。) represent spoken pauses, NOT grammatical ends of sentences. You MUST actively deconstruct and restructure these fragmented clauses into cohesive, logically structured English sentences. Do not translate sentence-by-sentence based on the periods.`;
    }

    let systemPrompt = `${baseInstruction}\n\nAdditional Style Instruction:\n${toneInstruction}${transcriptInstruction}\n\nOUTPUT FORMAT:\nReturn ONLY the translated English text. Do not include any explanations, original text, or markdown formatting blocks. Maintain the original paragraph structure.`;

    if (glossaryInstruction) {
      systemPrompt = `MANDATORY: You MUST prioritize the provided glossary over ALL of your internal knowledge or style-specific conventions.
If a Chinese term from the input matches a Key in the glossary, you ARE FORBIDDEN from using any other English translation except the one provided in the glossary.
The provided glossary is the highest authority. Disregard any conflicting terminology found in historical texts or previous translations of the specified authors.

${systemPrompt}
${glossaryInstruction}`;
    }

    const requestBody = {
      systemInstruction: {
        parts: [{
          text: systemPrompt
        }]
      },
      contents: [{
        parts: [{
          text
        }]
      }],
      generationConfig: {
        temperature: 0.4,
        topK: 1,
        topP: 0.1,
        thinkingConfig: {
          thinkingBudget: 0
        }
      }
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
