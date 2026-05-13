import './style.css';
import { Settings } from './js/settings.js';
import { Glossary } from './js/glossary.js';
import { Api } from './js/api.js';
import { Export } from './js/export.js';

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const settingsModalContent = document.getElementById('settings-modal-content');
  
  const toneInfoBtn = document.getElementById('tone-info-btn');
  const closeToneInfoBtn = document.getElementById('close-tone-info-btn');
  const toneInfoModal = document.getElementById('tone-info-modal');
  const toneInfoModalContent = document.getElementById('tone-info-modal-content');
  
  const apiKeyInput = document.getElementById('api-key-input');
  const csvUrlInput = document.getElementById('csv-url-input');
  const updateGlossaryBtn = document.getElementById('update-glossary-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const settingsStatus = document.getElementById('settings-status');

  const translateBtn = document.getElementById('translate-btn');
  const chineseInput = document.getElementById('chinese-input');
  const translationOutput = document.getElementById('translation-output');
  const toneSelect = document.getElementById('tone-select');
  
  const exportWordBtn = document.getElementById('export-word-btn');

  // Initialization
  apiKeyInput.value = Settings.getApiKey();
  csvUrlInput.value = Settings.getCsvUrl();

  // Settings Modal Logic
  const openSettings = () => {
    settingsModal.classList.remove('opacity-0', 'pointer-events-none');
    settingsModalContent.classList.remove('scale-95');
  };

  const closeSettings = () => {
    settingsModal.classList.add('opacity-0', 'pointer-events-none');
    settingsModalContent.classList.add('scale-95');
    settingsStatus.classList.add('hidden'); // Hide any status messages
  };

  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
  });

  // Tone Info Modal Logic
  const openToneInfo = () => {
    toneInfoModal.classList.remove('opacity-0', 'pointer-events-none');
    toneInfoModalContent.classList.remove('scale-95');
  };

  const closeToneInfo = () => {
    toneInfoModal.classList.add('opacity-0', 'pointer-events-none');
    toneInfoModalContent.classList.add('scale-95');
  };

  toneInfoBtn.addEventListener('click', openToneInfo);
  closeToneInfoBtn.addEventListener('click', closeToneInfo);
  toneInfoModal.addEventListener('click', (e) => {
    if (e.target === toneInfoModal) closeToneInfo();
  });

  const showStatus = (msg, isError = false) => {
    settingsStatus.textContent = msg;
    settingsStatus.className = `mt-4 text-xs font-medium text-center ${isError ? 'text-red-600' : 'text-green-600'}`;
    settingsStatus.classList.remove('hidden');
    setTimeout(() => {
      settingsStatus.classList.add('hidden');
    }, 3000);
  };

  saveSettingsBtn.addEventListener('click', () => {
    Settings.setApiKey(apiKeyInput.value.trim());
    Settings.setCsvUrl(csvUrlInput.value.trim());
    showStatus('Settings saved successfully!');
  });

  updateGlossaryBtn.addEventListener('click', async () => {
    const originalText = updateGlossaryBtn.innerHTML;
    updateGlossaryBtn.innerHTML = '<span>Updating...</span>';
    updateGlossaryBtn.disabled = true;
    
    // Save URL first just in case
    Settings.setCsvUrl(csvUrlInput.value.trim());

    try {
      const glossary = await Glossary.fetchAndParse();
      const count = Object.keys(glossary).length;
      showStatus(`Glossary updated! Loaded ${count} terms.`);
    } catch (err) {
      showStatus(err.message || 'Failed to update glossary', true);
    } finally {
      updateGlossaryBtn.innerHTML = originalText;
      updateGlossaryBtn.disabled = false;
    }
  });

  // Clear translation on input change
  chineseInput.addEventListener('input', () => {
    translationOutput.innerHTML = '';
  });

  // Translation Logic
  translateBtn.addEventListener('click', async () => {
    const text = chineseInput.value.trim();
    if (!text) return;

    translateBtn.disabled = true;
    translateBtn.classList.add('opacity-50', 'cursor-not-allowed');
    translationOutput.innerHTML = `
      <div class="flex items-center space-x-2 text-indigo-400 mt-2">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-sm tracking-widest uppercase">Translating...</span>
      </div>
    `;

    try {
      // Lazy load glossary if empty and url exists
      if (Object.keys(Glossary.get()).length === 0 && Settings.getCsvUrl()) {
         try { await Glossary.fetchAndParse(); } catch (e) { console.warn("Failed lazy load of glossary", e); }
      }

      const tone = toneSelect.value;
      const translated = await Api.translate(text, tone);
      
      translationOutput.innerHTML = translated.replace(/\\n/g, '<br>');
      translationOutput.classList.remove('text-gray-300', 'italic');
    } catch (err) {
      translationOutput.innerHTML = `<span class="text-red-500 text-sm">Error: ${err.message}</span>`;
      alert(err.message);
    } finally {
      translateBtn.disabled = false;
      translateBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  });

  // Export Logic
  exportWordBtn.addEventListener('click', () => {
    const source = chineseInput.value.trim();
    // Get innerText to strip HTML and get newlines
    const translated = translationOutput.innerText.trim();
    
    if (!source || !translated || translationOutput.classList.contains('italic')) {
      alert("Please translate some text before exporting.");
      return;
    }

    try {
      Export.generateWordDoc(source, translated);
    } catch (err) {
      alert("Error generating Word document: " + err.message);
    }
  });
});
