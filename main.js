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
  
  let apiKeyInput = document.getElementById('api-key-input');
  let csvUrlInput = document.getElementById('csv-url-input');
  const updateGlossaryBtn = document.getElementById('update-glossary-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const settingsStatus = document.getElementById('settings-status');

  const translateBtn = document.getElementById('translate-btn');
  const chineseInput = document.getElementById('chinese-input');
  const translationOutput = document.getElementById('translation-output');
  const toneSelect = document.getElementById('tone-select');
  
  const exportWordBtnDesktop = document.getElementById('export-word-btn-desktop');
  const exportWordBtnMobile = document.getElementById('export-word-btn-mobile');

  // Initialization
  apiKeyInput.value = Settings.getApiKey();
  csvUrlInput.value = Settings.getCsvUrl();

  // Settings Modal Logic
  const openSettings = () => {
    // Force reset inputs to the last saved state when opening
    apiKeyInput.value = Settings.getApiKey();
    csvUrlInput.value = Settings.getCsvUrl();
    
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
  settingsModal.addEventListener('mousedown', (e) => {
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
  toneInfoModal.addEventListener('mousedown', (e) => {
    if (e.target === toneInfoModal) closeToneInfo();
  });

  // Error Modal Logic
  const errorModal = document.getElementById('error-modal');
  const errorModalContent = document.getElementById('error-modal-content');
  const errorModalTitle = document.getElementById('error-modal-title');
  const errorModalMsg = document.getElementById('error-modal-msg');
  const closeErrorModalBtn = document.getElementById('close-error-modal-btn');

  const showErrorModal = (msg, title = "翻譯失敗") => {
    if (msg) errorModalMsg.textContent = msg;
    if (errorModalTitle) errorModalTitle.textContent = title;
    errorModal.classList.remove('opacity-0', 'pointer-events-none');
    errorModalContent.classList.remove('scale-95');
  };

  const closeErrorModal = () => {
    errorModal.classList.add('opacity-0', 'pointer-events-none');
    errorModalContent.classList.add('scale-95');
  };

  closeErrorModalBtn.addEventListener('click', closeErrorModal);
  errorModal.addEventListener('mousedown', (e) => {
    if (e.target === errorModal) closeErrorModal();
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
    const newApiKey = apiKeyInput.value.trim();
    const newCsvUrl = csvUrlInput.value.trim();

    Settings.setApiKey(newApiKey);
    Settings.setCsvUrl(newCsvUrl);

    // 徹底阻斷 Cmd+Z 幽靈復原：替換 DOM 元素以清除 Undo Stack
    if (newApiKey === '') {
      const clonedApi = apiKeyInput.cloneNode(true);
      apiKeyInput.replaceWith(clonedApi);
      apiKeyInput = clonedApi;
    }

    if (newCsvUrl === '') {
      Glossary.clear(); // 同步清空記憶體
      const clonedCsv = csvUrlInput.cloneNode(true);
      csvUrlInput.replaceWith(clonedCsv);
      csvUrlInput = clonedCsv;
    }

    showStatus('設定成功！');
    setTimeout(() => {
      closeSettings();
    }, 1500);
  });

  updateGlossaryBtn.addEventListener('click', async () => {
    const csvUrl = csvUrlInput.value.trim();
    if (csvUrl === '') {
      showStatus('請輸入有效的 CSV URL', true);
      return;
    }

    const originalText = updateGlossaryBtn.innerHTML;
    updateGlossaryBtn.innerHTML = '<span>更新中...</span>';
    updateGlossaryBtn.disabled = true;
    
    // Save URL first just in case
    Settings.setCsvUrl(csvUrl);

    try {
      const glossary = await Glossary.fetchAndParse();
      const count = Object.keys(glossary).length;
      showStatus(`已更新！已載入 ${count} 個詞`);
    } catch (err) {
      showStatus('字庫載入失敗，請檢查URL是否正確且具有公開存取權限。', true);
    } finally {
      updateGlossaryBtn.innerHTML = originalText;
      updateGlossaryBtn.disabled = false;
    }
  });

  // Button State Helpers
  const setButtonDisabled = (btn, disabled) => {
    btn.disabled = disabled;
    if (disabled) {
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  };

  const checkInputState = () => {
    const isEmpty = chineseInput.value.trim() === '';
    setButtonDisabled(translateBtn, isEmpty);
  };

  const setExportDisabled = (disabled) => {
    setButtonDisabled(exportWordBtnDesktop, disabled);
    setButtonDisabled(exportWordBtnMobile, disabled);
  };

  // Initial States
  checkInputState();
  setExportDisabled(true);

  // Clear translation on input or tone change
  const resetTranslationOutput = () => {
    translationOutput.innerHTML = '<span class="text-gray-300">翻譯結果...</span>';
    setExportDisabled(true);
  };

  chineseInput.addEventListener('input', () => {
    resetTranslationOutput();
    checkInputState();
  });
  toneSelect.addEventListener('change', resetTranslationOutput);

  // Translation Logic
  translateBtn.addEventListener('click', async () => {
    const text = chineseInput.value.trim();
    if (!text) return;

    setButtonDisabled(translateBtn, true);
    setExportDisabled(true);
    translationOutput.innerHTML = `<span class="inline-flex items-center space-x-2 text-indigo-400">
        <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-sm tracking-widest uppercase">翻譯中...</span>
      </span>`;

    try {
      // Lazy load glossary if empty and url exists
      if (Object.keys(Glossary.get()).length === 0 && Settings.getCsvUrl()) {
         try { await Glossary.fetchAndParse(); } catch (e) { console.warn("Failed lazy load of glossary", e); }
      }

      const tone = toneSelect.value;
      const translated = await Api.translate(text, tone);
      
      translationOutput.innerHTML = translated.replace(/\\n/g, '<br>');
      translationOutput.classList.remove('text-gray-300', 'italic');
      
      setExportDisabled(false);
    } catch (err) {
      if (err.isQuotaError || err.message === "QUOTA_EXCEEDED") {
        translationOutput.innerHTML = '<span class="text-red-500 text-sm">⚠️ 翻譯失敗：翻譯額度已用盡，請稍後再試或聯繫管理員。</span>';
        showErrorModal("翻譯額度已用盡，請稍後再試或聯繫管理員。");
      } else {
        translationOutput.innerHTML = '<span class="text-red-500 text-sm">⚠️ 翻譯失敗：' + err.message + '</span>';
        showErrorModal(err.message);
      }
      setExportDisabled(true);
    } finally {
      checkInputState();
    }
  });

  // Export Logic
  const handleExport = () => {
    const source = chineseInput.value.trim();
    // Get innerText to strip HTML and get newlines
    const translated = translationOutput.innerText.trim();
    
    if (!source || !translated || translationOutput.classList.contains('italic')) {
      showErrorModal("匯出前請先翻譯一些文字。", "無法匯出");
      return;
    }

    try {
      Export.generateWordDoc(source, translated);
    } catch (err) {
      showErrorModal("產生 Word 檔案時發生錯誤：" + err.message, "匯出失敗");
    }
  };

  exportWordBtnDesktop.addEventListener('click', handleExport);
  exportWordBtnMobile.addEventListener('click', handleExport);
});
