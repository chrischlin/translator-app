import Papa from 'papaparse';
import { Settings } from './settings.js';

let currentGlossary = {};

export const Glossary = {
  get: () => currentGlossary,
  
  fetchAndParse: async () => {
    const url = Settings.getCsvUrl();
    if (!url) {
      throw new Error("CSV URL is not configured.");
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
      }
      const csvText = await response.text();
      
      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsed = {};
            results.data.forEach(row => {
              // Assuming first column is Chinese, second is English. Or maybe explicit headers like "中文", "英文"
              // We'll try to find keys dynamically or assume fixed index if headers are unknown.
              const keys = Object.keys(row);
              if (keys.length >= 2) {
                // Usually "Chinese" and "English" or similar. Let's use the first two columns.
                const ch = row[keys[0]]?.trim();
                const en = row[keys[1]]?.trim();
                if (ch && en) {
                  parsed[ch] = en;
                }
              }
            });
            currentGlossary = parsed;
            resolve(parsed);
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    } catch (err) {
      console.error("Error updating glossary:", err);
      throw err;
    }
  }
};
