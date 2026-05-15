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
  translate: async (text, tone) => {
    const apiKey = Settings.getApiKey();
    if (!apiKey) {
      throw new Error("Gemini API Key 尚未設定，請先至設定中填寫。");
    }

    const toneInstruction = getToneInstruction(tone);
    const glossaryInstruction = getGlossaryInstruction(text);

    let systemPrompt = `你是一位專精於漢傳佛教、藏傳佛教（金剛乘）與古典佛典翻譯的資深英文譯師，正負責將開示文獻轉譯以供數位出版。你的翻譯必須完美融合「精準深邃的佛學專有名詞」與「符合英文母語邏輯的流暢句法」。

在翻譯時，請嚴格遵守以下五大原則：
1. 句型重組與流暢度 (Native Grammatical Flow)：絕對不要逐字死譯。中文佛典與開示常使用無主詞的長句或連言句，你必須主動將其拆解，重組成結構完整、帶有明確主詞與動詞的英文句子。善用轉折詞連接因果與修行邏輯。絕不可產出沒有動詞的碎句 (Sentence Fragments)。
2. 語氣與法味 (Solemn & Dharma Tone)：維持佛法開示的莊重、清淨與慈悲感。絕對避免使用現代過度口語、輕浮的俚語或一般世俗的商業用詞。
3. 精確詞彙 (Precise Terminology)：若有提供專屬字庫 (Glossary)，請絕對優先使用字庫中的英文專有名詞來傳遞法義。若無字庫，請使用國際佛教學界通用的標準英文譯名。
4. 嚴格禁止幻覺與過度渲染 (Zero Hallucination)：無論要求何種翻譯風格，風格差異僅能體現在「語氣柔和度」與「句型節奏」，絕對禁止擅自添加原文沒有的譬喻或意象（如河流、露珠等）。不可無中生有，必須100%忠實於原文的法義內容。
5. 確保邏輯連貫與語境平順 (Logical Cohesion)：當原文出現連續的排比或設問時，必須使用符合英文母語習慣的連接詞（如 Furthermore, This also involves...）平順過渡。絕不可產出邏輯斷裂的段落。

附加風格指示：
${toneInstruction}

OUTPUT FORMAT:
Return ONLY the translated English text. Do not include any explanations, original text, or markdown formatting blocks. Maintain the original paragraph structure.`;

    if (glossaryInstruction) {
      systemPrompt = `MANDATORY: You MUST prioritize the provided glossary over ALL of your internal knowledge or style-specific conventions.
If a Chinese term from the input matches a Key in the glossary, you ARE FORBIDDEN from using any other English translation except the one provided in the glossary.
The provided glossary is the highest authority. Disregard any conflicting terminology found in historical texts or previous translations of the specified authors.

${systemPrompt}
${glossaryInstruction}`;
    }

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        parts: [{ text }]
      }],
      generationConfig: {
        temperature: 0,
        topK: 1,
        topP: 0.1
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
