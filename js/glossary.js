import { Settings } from './settings.js';

let currentGlossary = {};

const parseCSV = (text) => {
  const result = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    // 處理雙引號包覆的情況
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 如果遇到連續兩個雙引號，代表這是一個被跳脫的單一雙引號
        currentCell += '"';
        i++; // 跳過下一個引號
      } else {
        // 切換引號狀態
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 遇到不在引號內的逗號，代表欄位結束
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // 遇到不在引號內的換行，代表一列結束
      if (char === '\r' && nextChar === '\n') {
        i++; // 處理 Windows CRLF 換行
      }
      currentRow.push(currentCell.trim());
      // 過濾完全空白的列
      if (currentRow.some(c => c !== '')) {
         result.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      // 正常字元，加入目前欄位
      currentCell += char;
    }
  }

  // 處理最後一個欄位與列
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c !== '')) {
       result.push(currentRow);
    }
  }

  return result;
};

export const Glossary = {
  get: () => currentGlossary,
  
  fetchAndParse: async () => {
    const url = Settings.getCsvUrl();
    if (!url) {
      throw new Error("CSV URL is not configured.");
    }
    
    try {
      const cleanUrl = url.trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        throw new Error("Invalid CSV URL. It must start with http:// or https://");
      }

      const response = await fetch(cleanUrl, {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
      }
      
      let csvText = await response.text();
      
      // 安全過濾：移除開頭可能存在的 BOM 字元
      csvText = csvText.replace(/^\uFEFF/, '');
      
      const rows = parseCSV(csvText);
      const parsed = {};
      
      // 安全過濾：略過第一行的標題 (i = 1 開始)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 2) {
          // 雙欄位對應：第一欄為中文 Key，第二欄為英文 Value
          const ch = row[0];
          const en = row[1];
          if (ch && en) {
            parsed[ch] = en;
          }
        }
      }
      
      currentGlossary = parsed;
      return parsed;
      
    } catch (err) {
      console.error("Error updating glossary:", err);
      throw err;
    }
  }
};
