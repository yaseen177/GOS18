import React, { useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { gos18Config } from './config';

// --- TYPES ---
type InputType = 'text' | 'tick' | 'date' | 'dropdown' | 'radio';

interface Field {
  id: string;
  type: InputType;
  label: string;
  options?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string | boolean;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

export default function App() {
  const [fields, setFields] = useState<Field[]>(gos18Config as Field[]);

  const updateValue = (id: string, value: string | boolean) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, value } : f)));
  };

  const generatePDF = async () => {
    try {
      const existingPdfBytes = await fetch('/GOS18_template.pdf').then((res) =>
        res.arrayBuffer()
      );
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const page = pdfDoc.getPages()[0];
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      fields.forEach((field) => {
        const pdfTopY = PAGE_HEIGHT - field.y;
        const pdfBottomY = PAGE_HEIGHT - field.y - field.height;

        if (field.type === 'tick' && field.value) {
          page.drawText('X', {
            x: field.x + 4,
            y: pdfBottomY + 4,
            size: 14,
            font,
            color: rgb(0, 0, 0),
          });
        } else if (field.value && field.type !== 'tick') {
          const text = String(field.value);

          // --- BULLETPROOF DYNAMIC SCALING ALGORITHM ---
          let fontSize = 11; // Standard starting size
          const minFontSize = 4; // Absolute smallest readable size
          let lineHeight = fontSize * 1.2;
          let fits = false;

          // Loop: Simulate text wrapping to find the perfect font size
          while (!fits && fontSize >= minFontSize) {
            lineHeight = fontSize * 1.2;
            const paragraphs = text.split('\n');
            let totalLines = 0;
            let longestWordFits = true; // New horizontal safety check

            paragraphs.forEach((paragraph) => {
              const words = paragraph.split(' ');
              let currentLine = '';

              words.forEach((word) => {
                // 1. HORIZONTAL CHECK: Is this single word wider than the box?
                if (font.widthOfTextAtSize(word, fontSize) > field.width - 4) {
                  longestWordFits = false;
                }

                // 2. VERTICAL CHECK: Simulate wrapping
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = font.widthOfTextAtSize(testLine, fontSize);

                if (testWidth > field.width - 4 && currentLine !== '') {
                  totalLines++;
                  currentLine = word; // Push word to next line
                } else {
                  currentLine = testLine;
                }
              });
              if (currentLine) totalLines++; // Add the final line
            });

            const totalTextHeight = totalLines * lineHeight;

            // 3. DECISION: It only fits if the height is good AND no word overflows
            if (longestWordFits && totalTextHeight <= field.height - 4) {
              fits = true;
            } else {
              fontSize -= 0.5; // Shrink and try again
            }
          }

          // Draw the text using the perfectly calculated font size
          page.drawText(text, {
            x: field.x + 2,
            y: pdfTopY - fontSize - 2, // Anchor top-left
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
            maxWidth: field.width - 4, // Tell pdf-lib to execute the wrapping
            lineHeight: lineHeight,
          });
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GOS18_Completed_${
        new Date().toISOString().split('T')[0]
      }.pdf`;
      link.click();
    } catch (error) {
      alert(
        'Failed to generate PDF. Ensure GOS18_template.pdf is in the public folder.'
      );
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'sans-serif',
        display: 'flex',
        gap: '30px',
      }}
    >
      {/* LEFT PANEL: User Input Form */}
      <div
        style={{
          width: '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
        }}
      >
        <h2>GOS18 Form</h2>
        <p style={{ fontSize: '14px', color: '#555' }}>
          Please fill in the patient details below. Long text will automatically
          scale down to fit the document.
        </p>
        <button onClick={generatePDF} style={exportBtnStyle}>
          ⬇️ Export to PDF
        </button>
        <hr style={{ width: '100%' }} />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            overflowY: 'auto',
            maxHeight: '70vh',
            paddingRight: '10px',
          }}
        >
          {fields.map((f, i) => (
            <div
              key={f.id}
              style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}
            >
              <label
                style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}
              >
                {f.label}
              </label>

              {f.type === 'text' && (
                <textarea
                  value={f.value as string}
                  onChange={(e) => updateValue(f.id, e.target.value)}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: '60px',
                  }}
                />
              )}

              {f.type === 'date' && (
                <input
                  type="date"
                  value={f.value as string}
                  onChange={(e) => updateValue(f.id, e.target.value)}
                  style={inputStyle}
                />
              )}
              {f.type === 'tick' && (
                <input
                  type="checkbox"
                  checked={f.value as boolean}
                  onChange={(e) => updateValue(f.id, e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
              )}

              {f.type === 'dropdown' && (
                <select
                  value={f.value as string}
                  onChange={(e) => updateValue(f.id, e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Select...</option>
                  {f.options?.split(',').map((opt) => (
                    <option key={opt} value={opt.trim()}>
                      {opt.trim()}
                    </option>
                  ))}
                </select>
              )}

              {f.type === 'radio' && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {f.options?.split(',').map((opt) => (
                    <label key={opt} style={{ fontSize: '14px' }}>
                      <input
                        type="radio"
                        name={f.id}
                        value={opt.trim()}
                        checked={f.value === opt.trim()}
                        onChange={(e) => updateValue(f.id, e.target.value)}
                      />{' '}
                      {opt.trim()}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: Live Visual Preview */}
      <div style={canvasStyle}>
        {fields.map((field) => (
          <div
            key={field.id}
            style={{
              position: 'absolute',
              left: field.x,
              top: field.y,
              width: field.width,
              height: field.height,
              border: '1px solid transparent',
              display: 'flex',
              alignItems: 'flex-start',
              padding: '2px',
              boxSizing: 'border-box',
              overflow: 'hidden', // The web preview hides overflow, but the PDF engine handles the scaling
            }}
          >
            <span
              style={{
                fontSize: '10px',
                color: '#005eb8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                textAlign: 'left',
                lineHeight: '1.2',
              }}
            >
              {field.type === 'tick' && field.value
                ? '❌'
                : field.type !== 'tick'
                ? field.value
                : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- STYLES ---
const exportBtnStyle: React.CSSProperties = {
  padding: '12px',
  cursor: 'pointer',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
  backgroundColor: '#005eb8',
  color: 'white',
  fontSize: '16px',
  transition: 'background-color 0.2s',
};
const inputStyle: React.CSSProperties = {
  padding: '10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  width: '100%',
  boxSizing: 'border-box',
  fontSize: '14px',
  fontFamily: 'sans-serif',
};
const canvasStyle: React.CSSProperties = {
  width: `${PAGE_WIDTH}px`,
  height: `${PAGE_HEIGHT}px`,
  minWidth: `${PAGE_WIDTH}px`,
  backgroundImage: `url('/GOS18_bg.jpg')`,
  backgroundSize: '100% 100%',
  backgroundRepeat: 'no-repeat',
  border: '1px solid #ccc',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  position: 'relative',
  overflow: 'hidden',
};
