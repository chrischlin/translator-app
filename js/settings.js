const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwdFHeTOdMoOPHcdRwqsoKjYFWUCuOw4RT2a-pmG6cJnwXcaQXy6jwELxnHXCaRraheftF0kJNdpyh/pub?gid=1786168014&single=true&output=csv";

export const Settings = {
  getApiKey: () => localStorage.getItem('gemini_api_key') || '',
  setApiKey: (key) => localStorage.setItem('gemini_api_key', key),
  
  getCsvUrl: () => localStorage.getItem('glossary_csv_url') || DEFAULT_CSV_URL,
  setCsvUrl: (url) => localStorage.setItem('glossary_csv_url', url),
};
