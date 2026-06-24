import {
  Settings
} from './settings.js';
import {
  Glossary
} from './glossary.js';


const MODEL_NAME = "gemini-3.5-flash"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;


const getToneInstruction = (tone) => {
  switch (tone) {
    case 'general':
      return "Role: You are an expert translator of Buddhist texts. Translate the Chinese Buddhist article into English naturally and accurately. Use standard Buddhist terminology, referencing the lexicons of Dharma Drum Mountain, Fo Guang Shan, and Thupten Jinpa for doctrinal accuracy.";
    case 'book':
      return "Role: You are an expert translator of Buddhist texts. Translate the text into English using a formal, elegant, and scholarly literary tone, mimicking the highly respected translation style of 'Lotsawa House'. Ensure structural fidelity to the original text and precise use of Buddhist terminology (referencing Dharma Drum Mountain, Fo Guang Shan, and Thupten Jinpa).";
     case 'video':
      return "Role: You are an elite native-English scriptwriter. Optimize the content for spoken delivery (like video subtitles). The pacing must be crisp and highly dynamic. STRATEGY: Use short, impactful sentence structures, parallel constructions, and Present Tense to create immediate narrative presence (e.g., 'When the Guru hears this, he directly says...'). IMPORTANT: While the pacing is punchy, the vocabulary MUST remain strictly professional and dignified. Always use standard Buddhist terminology. Do NOT use casual language, and strictly avoid excessive contractions.";
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

  const matchedTerms = Object.entries(glossary).filter(([ch, _en]) => text.includes(ch));

  if (matchedTerms.length === 0) return "";

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

     const baseInstruction = `You are an elite bilingual scriptwriter and copywriter specializing in adapting Chinese Buddhist teachings into highly engaging, native-level English spoken content. Your task is NOT to translate word-for-word, but to REWRITE and transcreate the teachings so they sound completely natural to an English-speaking audience, while perfectly maintaining profound doctrinal accuracy.
  
  When writing, you MUST strictly adhere to the following principles:
  1. Act as a Native English Scriptwriter: Stop thinking like a traditional translator. You MUST stop being held hostage by the Chinese sentence structure. Do NOT use stilted, archaic, or robotic phrasing like "utters the phrase", "stated", or "contravenes". Instead, use highly natural, modern conversational flow (e.g., use "simply saying", "just saying", or "the Guru says"). 
  2. Solemn yet Accessible Dharma Tone: Maintain the purity, dignity, and solemnity of Dharma teachings. The flow can be modern and engaging, but the VOCABULARY must never be overly casual. Strictly limit the use of conversational contractions. NEVER secularize or simplify core Buddhist concepts to make them sound "relatable" (e.g., do not reduce Dharma concepts to secular terms like "supporter" or "fan").
  3. Precise Terminology: If a Glossary is provided, you MUST prioritize using the English terminology from the Glossary to convey the Dharma meaning. If no Glossary is provided, use standard English terminology widely accepted in international Buddhist academic circles.
  4. Zero Hallucination: Regardless of the requested translation style, style differences can only be reflected in the "softness of tone" and "rhythm of sentences." You are strictly forbidden from arbitrarily adding metaphors or imagery.
  5. Logical Cohesion: When the original text contains consecutive parallelisms or rhetorical questions, you must use conjunctions customary in native English for smooth transitions.`;

    let transcriptInstruction = "";
    if (isTranscriptMode) {
      transcriptInstruction = `\n\nSpecial Input Notice: The original text is a raw video transcript where periods (。) represent spoken pauses, NOT grammatical ends of sentences. You MUST actively deconstruct and restructure these fragmented clauses into cohesive, logically structured English sentences. Do not translate sentence-by-sentence based on the periods.`;
    }

    let systemPrompt = `${baseInstruction}\n\nAdditional Style Instruction:\n${toneInstruction}${transcriptInstruction}\n\nOUTPUT FORMAT:\nReturn ONLY the translated English text. You MUST translate every single term into English. NEVER leave any Chinese characters or pinyin in the final output, even for core Buddhist concepts. Do not include any explanations, original text, or markdown formatting blocks. Maintain the original paragraph structure.`;

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
        temperature: 0.7,
        topK: 40,
        topP: 0.8,
        thinkingConfig: {
          thinkingBudget: 1024
        }
      }
    };

    let maxRetries = 3;
    let retryDelay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let response;
      try {
        response = await fetch(`${API_URL}?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });
      } catch (fetchErr) {
        throw fetchErr;
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));

        const isQuotaError = response.status === 429 ||
          (errData.error && errData.error.message && errData.error.message.toLowerCase().includes('quota'));

        if (isQuotaError) {
          const err = new Error("QUOTA_EXCEEDED");
          err.isQuotaError = true;
          throw err;
        }

        const isHighDemandError = response.status === 503 || 
          (errData.error && errData.error.status === "UNAVAILABLE") ||
          (errData.error && errData.error.message && errData.error.message.toLowerCase().includes('high demand'));

        if (isHighDemandError) {
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryDelay *= 2; 
            continue;
          } else {
            throw new Error("目前此 AI 模型使用人數過多，請稍等片刻後再重試一次。");
          }
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
  }
};
