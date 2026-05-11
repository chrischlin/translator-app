import { Document, Packer, Paragraph, TextRun } from "docx";

export const Export = {
  generateWordDoc: async (sourceText, translatedText) => {
    const sourceParagraphs = sourceText.split('\n').map(p => p.trim());
    const translatedParagraphs = translatedText.split('\n').map(p => p.trim());
    
    const docElements = [];

    // Assuming line-by-line or paragraph-by-paragraph matching
    const maxLen = Math.max(sourceParagraphs.length, translatedParagraphs.length);

    for (let i = 0; i < maxLen; i++) {
      const src = sourceParagraphs[i] || "";
      const tgt = translatedParagraphs[i] || "";
      
      if (src) {
        docElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: src,
                font: "Noto Sans TC",
                size: 24, // 12pt
              })
            ],
            spacing: { after: 120 } // 0.1 line spacing basically
          })
        );
      }
      
      if (tgt) {
        docElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: tgt,
                font: "Inter",
                size: 24, // 12pt
                color: "555555"
              })
            ],
            spacing: { after: 360 } // some space before next paragraph pair
          })
        );
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: docElements
      }]
    });

    const blob = await Packer.toBlob(doc);
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Translation_Export.docx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
};
