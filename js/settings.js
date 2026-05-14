const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/1b7v5U0xQj4E5LznzYDarfd17VqJDqOeM-ukL0qCSEWU/export?format=csv&gid=1786168014";

export const Settings = {
  getApiKey: () => localStorage.getItem('gemini_api_key') || '',
  setApiKey: (key) => localStorage.setItem('gemini_api_key', key),
  
  getCsvUrl: () => localStorage.getItem('glossary_csv_url') || DEFAULT_CSV_URL,
  setCsvUrl: (url) => localStorage.setItem('glossary_csv_url', url),
};
