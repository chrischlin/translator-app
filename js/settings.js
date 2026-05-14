const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwdFHeTOdMoOPHcdRwqsoKjYFWUCuOw4RT2a-pmG6cJnwXcaQXy6jwELxnHXCaRraheftF0kJNdpyh/pub?gid=1786168014&single=true&output=csv";

export const Settings = {
  getApiKey: () => localStorage.getItem('gemini_api_key') || '',
  setApiKey: (key) => {
    if (!key || key.trim() === '') {
      localStorage.removeItem('gemini_api_key');
    } else {
      localStorage.setItem('gemini_api_key', key.trim());
    }
  },
  
  getCsvUrl: () => {
    const val = localStorage.getItem('glossary_csv_url');
    return val !== null ? val : DEFAULT_CSV_URL;
  },
  setCsvUrl: (url) => {
    if (!url || url.trim() === '') {
      localStorage.setItem('glossary_csv_url', '');
    } else {
      localStorage.setItem('glossary_csv_url', url.trim());
    }
  },
};
