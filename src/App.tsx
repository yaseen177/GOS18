import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { gos18Config } from './config';

// --- TYPES ---
type InputType = 'text' | 'tick' | 'date' | 'dropdown' | 'radio';

interface Field {
  id: string;
  type: InputType;
  label: string;
  options?: string;
  group?: string; 
  section?: string; 
  exclusive?: boolean; 
  x: number;
  y: number;
  width: number;
  height: number;
  value: string | boolean;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

// --- FORMATTING HELPER ---
const formatDisplayValue = (field: Field) => {
  if (field.type === 'date' && typeof field.value === 'string' && field.value) {
    return field.value.split('-').reverse().join('/');
  }
  return String(field.value || '');
};

// --- AUTO-SCALING WEB PREVIEW COMPONENT ---
function AutoScalingPreview({ field }: { field: Field }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current || !textRef.current || field.type === 'tick' || !field.value) return;
    const container = containerRef.current;
    const textNode = textRef.current;

    let currentSize = 12;
    textNode.style.fontSize = `${currentSize}px`;

    while (
      (textNode.offsetHeight > container.clientHeight || textNode.offsetWidth > container.clientWidth) &&
      currentSize > 4
    ) {
      currentSize -= 0.5;
      textNode.style.fontSize = `${currentSize}px`;
    }
  }, [field.value, field.width, field.height]);

  if (field.type === 'tick') {
    return field.value ? <span style={{ fontSize: '14px', color: '#005eb8' }}>❌</span> : null;
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'flex-start', overflow: 'hidden' }}>
      <span
        ref={textRef}
        style={{
          color: '#005eb8',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          textAlign: 'left',
          lineHeight: '1.2',
          display: 'inline-block'
        }}
      >
        {formatDisplayValue(field)}
      </span>
    </div>
  );
}

// --- NHS GP AUTOCOMPLETE TOOL ---
function GPAutocomplete({ field, updateValue }: { field: Field, updateValue: (id: string, val: string) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchTerm.trim().length < 3) {
      setResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations?PrimaryRoleId=RO177&Name=${encodeURIComponent(searchTerm)}`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        setResults(data.Organisations || []);
      } catch (err) {
        console.error('Failed to search NHS API.', err);
      }
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const selectGP = async (orgId: string, orgName: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations/${orgId}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      const address = data.Organisation?.GeoLoc?.Location;

      const fullAddress = [
        orgName,
        address?.AddrLn1,
        address?.AddrLn2,
        address?.AddrLn3,
        address?.Town,
        address?.PostCode
      ].filter(Boolean).join('\n');

      updateValue(field.id, fullAddress);
      setResults([]); 
      setSearchTerm(''); 
    } catch (err) {
      alert('Failed to fetch GP details.');
    }
    setIsSearching(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
        <input
          type="text"
          className="custom-input"
          placeholder="Search NHS Directory (type 3+ letters)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingRight: isSearching ? '30px' : '12px' }} 
        />
        {isSearching && (
          <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }}>
            ⏳
          </div>
        )}
        {results.length > 0 && (
          <div className="custom-scrollbar" style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', zIndex: 50, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            {results.map((org: any) => (
              <div
                key={org.OrgId}
                onClick={() => selectGP(org.OrgId, org.Name)}
                style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <strong style={{ color: '#0f172a' }}>{org.Name}</strong> 
                <span style={{ color: '#64748b' }}>{org.PostCode}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <textarea
        className="custom-input custom-scrollbar"
        value={field.value as string}
        onChange={(e) => updateValue(field.id, e.target.value)}
        placeholder="Selected GP will appear here..."
        style={{ resize: 'vertical', minHeight: '60px', height: `${Math.max(60, field.height)}px` }}
      />
    </div>
  );
}


export default function App() {
  const [fields, setFields] = useState<Field[]>(() => {
    const today = new Date().toISOString().split('T')[0];

    return (gos18Config as Field[]).map(field => {
      let f = { ...field };

      // Pre-populate specific dates
      if (f.label === 'Date of ST' || f.label === 'Date of Referral') {
        f.value = today;
      }

      if (f.type === 'tick') {
        f.x += 2.5;
        f.y += 2.5;
      }

      const l = f.label.toLowerCase();
      
      if (l.includes('date') || l.includes('optician') || l.includes('practice') || l.includes('goc')) {
        f.section = '1. Practice Details';
      }
      else if (l.includes('px ') || l.includes('title') || l === 'female' || l === 'male') {
        f.section = '2. Patient Details';
        if (l === 'female' || l === 'male') { f.group = 'Gender'; f.exclusive = true; } 
        else if (l.includes('title') || l.includes('surname') || l.includes('forenames')) f.group = 'Patient Name';
        else if (l.includes('address') || l.includes('postcode')) f.group = 'Address Details';
        else if (l.includes('phone')) f.group = 'Contact Details';
        else if (l.includes('dob')) f.group = 'Date of Birth';
        else if (l.includes('nhs no')) f.group = 'NHS Number';
      }
      else if (l.includes('gp') || l.includes('referral to') || l.includes('casualty')) {
        f.section = '3. Referral Pathway';
        if (f.type === 'tick') { f.group = 'Action Required'; f.exclusive = true; } 
      }
      else if (['strab', 'paed', 'orthoptic', 'cataract', 'cornea', 'diabetic', 'external', 'glaucoma', 'yag', 'low vision', 'oculoplastic', 'other med ret', 'squint', 'vitreoretinal', 'not specified'].some(kw => l.includes(kw))) {
        f.section = '4. Reasons for Referral';
        if (f.type === 'tick') { f.group = 'Clinical Conditions (Select all that apply)'; f.exclusive = false; } 
      }
      else if (['re sph', 're cyl', 're axis', 're prism', 're base', 're add'].some(kw => l.startsWith(kw))) {
        f.section = '5. Optical Prescription (Rx)';
        f.group = 'Right Eye (Rx)';
      }
      else if (['le sph', 'le cyl', 'le axis', 'le prism', 'le base', 'le add'].some(kw => l.startsWith(kw))) {
        f.section = '5. Optical Prescription (Rx)';
        f.group = 'Left Eye (Rx)';
      }
      else if (['re va', 're ph', 're nva', 're prev va'].some(kw => l.startsWith(kw))) {
        f.section = '6. Visual Acuity & IOP';
        f.group = 'Right Eye Acuity';
      }
      else if (['le va', 'le ph', 'le nva', 'le prev va'].some(kw => l.startsWith(kw))) {
        f.section = '6. Visual Acuity & IOP';
        f.group = 'Left Eye Acuity';
      }
      else if (l.includes('iop')) {
        f.section = '6. Visual Acuity & IOP';
        f.group = 'Intraocular Pressure';
      }
      else if (l.includes('c:d')) {
        f.section = '6. Visual Acuity & IOP';
        f.group = 'Cup-to-Disc Ratio'; // Separated from IOP!
      }
      else if (l.includes('cyclo') || l.includes('dilated')) {
        f.section = '6. Visual Acuity & IOP';
        f.group = 'Drops';
      }
      else {
        f.section = '7. Additional Info';
      }

      return f;
    });
  });

  const [zoom, setZoom] = useState(0.85);
  const [activeSection, setActiveSection] = useState<string>('5. Optical Prescription (Rx)'); 

  const updateValue = (id: string, value: string | boolean) => {
    const targetField = fields.find(f => f.id === id);
    
    let updatedFields = fields.map((f) => {
      if (f.id === id) return { ...f, value };
      if (targetField?.type === 'tick' && targetField.group && targetField.exclusive && value === true) {
        if (f.type === 'tick' && f.group === targetField.group) return { ...f, value: false };
      }
      return f;
    });

    if (targetField && typeof value === 'string' && value.trim() === '') {
      if (targetField.label.endsWith(' SPH')) {
        const prefix = targetField.label.substring(0, 3); 
        updatedFields = updatedFields.map(f => {
          const baseLabel = f.label.replace(prefix, '');
          if (f.label.startsWith(prefix) && ['CYL', 'AXIS', 'PRISM', 'BASE', 'ADD'].includes(baseLabel)) {
            return { ...f, value: '' }; 
          }
          return f;
        });
      } else if (targetField.label.endsWith(' CYL')) {
        const prefix = targetField.label.substring(0, 3);
        updatedFields = updatedFields.map(f => f.label === `${prefix}AXIS` ? { ...f, value: '' } : f);
      } else if (targetField.label.endsWith(' PRISM')) {
        const prefix = targetField.label.substring(0, 3);
        updatedFields = updatedFields.map(f => f.label === `${prefix}BASE` ? { ...f, value: '' } : f);
      }
    }

    setFields(updatedFields);
  };

  const clearForm = () => {
    if (window.confirm("Are you sure you want to clear all data for this patient?")) {
      const today = new Date().toISOString().split('T')[0];
      
      setFields(fields.map(f => {
        if (f.label === 'Date of ST' || f.label === 'Date of Referral') {
          return { ...f, value: today };
        }
        return { ...f, value: f.type === 'tick' ? false : '' };
      }));
      setActiveSection('1. Practice Details'); 
    }
  };

  const generatePDF = async () => {
    try {
      const existingPdfBytes = await fetch('/GOS18_template.pdf').then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const page = pdfDoc.getPages()[0];
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      fields.forEach((field) => {
        const pdfTopY = PAGE_HEIGHT - field.y;
        const pdfBottomY = PAGE_HEIGHT - field.y - field.height;

        if (field.type === 'tick' && field.value) {
          page.drawText('X', { x: field.x + 4, y: pdfBottomY + 4, size: 14, font, color: rgb(0, 0, 0) });
        } else if (field.value && field.type !== 'tick') {
          const text = formatDisplayValue(field);
          let fontSize = 12; 
          const minFontSize = 4; 
          let linesToDraw: string[] = [];
          let lineHeight = 0;

          const getLines = (size: number) => {
            const lines: string[] = [];
            const paragraphs = text.split(/\r?\n/);
            paragraphs.forEach((p) => {
              if (p === '') { lines.push(''); return; }
              const words = p.split(' ');
              let current = '';
              words.forEach((w) => {
                const test = current ? `${current} ${w}` : w;
                if (font.widthOfTextAtSize(test, size) <= field.width - 4) { current = test; } 
                else { if (current) lines.push(current); current = w; }
              });
              if (current) lines.push(current);
            });
            return lines;
          };

          while (fontSize >= minFontSize) {
            lineHeight = fontSize * 1.2;
            linesToDraw = getLines(fontSize);
            const totalHeight = linesToDraw.length * lineHeight;
            const wordBleeds = linesToDraw.some(line => font.widthOfTextAtSize(line, fontSize) > field.width - 4);
            if (totalHeight <= field.height - 4 && !wordBleeds) break; 
            fontSize -= 0.5;
          }

          linesToDraw.forEach((line, index) => {
            page.drawText(line, {
              x: field.x + 2, y: pdfTopY - fontSize - 2 - (index * lineHeight), 
              size: fontSize, font, color: rgb(0, 0, 0),
            });
          });
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.slice(0)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      alert('Failed to generate PDF. Ensure GOS18_template.pdf is in the public folder.');
    }
  };

  const renderInputControl = (f: Field) => {
    if (f.label === 'GP Name and Address') {
      return <GPAutocomplete field={f} updateValue={updateValue} />;
    }

    let isDisabled = false;
    if (f.label.startsWith('RE ') || f.label.startsWith('LE ')) {
      const prefix = f.label.substring(0, 3); 
      const type = f.label.substring(3);      
      
      if (['CYL', 'AXIS', 'PRISM', 'BASE', 'ADD'].includes(type)) {
        const sphBlank = !String(fields.find(x => x.label === `${prefix}SPH`)?.value || '').trim();
        if (sphBlank) isDisabled = true;
        
        if (type === 'AXIS') {
          const cylBlank = !String(fields.find(x => x.label === `${prefix}CYL`)?.value || '').trim();
          if (cylBlank) isDisabled = true;
        }
        
        if (type === 'BASE') {
          const prismBlank = !String(fields.find(x => x.label === `${prefix}PRISM`)?.value || '').trim();
          if (prismBlank) isDisabled = true;
        }
      }
    }

    switch (f.type) {
      case 'text':
        const isShortField = ['SPH', 'CYL', 'AXIS', 'PRISM', 'BASE', 'ADD', 'VA', 'PH', 'NVA', 'IOP', 'C:D', 'Title'].some(kw => f.label.includes(kw));
        return isShortField ? (
          <input
            type="text"
            className="custom-input"
            value={f.value as string}
            onChange={(e) => updateValue(f.id, e.target.value)}
            disabled={isDisabled}
            style={{ textAlign: 'center' }}
          />
        ) : (
          <textarea
            className="custom-input custom-scrollbar"
            value={f.value as string}
            onChange={(e) => updateValue(f.id, e.target.value)}
            placeholder="Type here..."
            disabled={isDisabled}
            style={{ resize: 'vertical', minHeight: '40px', height: `${Math.max(40, f.height)}px` }}
          />
        );
      case 'date':
        return <input className="custom-input" type="date" value={f.value as string} onChange={(e) => updateValue(f.id, e.target.value)} disabled={isDisabled} />;
      case 'dropdown':
        return (
          <select className="custom-input" value={f.value as string} onChange={(e) => updateValue(f.id, e.target.value)} disabled={isDisabled}>
            <option value="">Select...</option>
            {f.options?.split(',').map((opt) => <option key={opt} value={opt.trim()}>{opt.trim()}</option>)}
          </select>
        );
      case 'radio':
        return (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '4px 0', opacity: isDisabled ? 0.5 : 1, pointerEvents: isDisabled ? 'none' : 'auto' }}>
            {f.options?.split(',').map((opt) => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer', color: '#4b5563' }}>
                <input type="radio" name={f.id} value={opt.trim()} checked={f.value === opt.trim()} onChange={(e) => updateValue(f.id, e.target.value)} disabled={isDisabled} style={{ width: '16px', height: '16px', accentColor: '#005eb8' }} />
                {opt.trim()}
              </label>
            ))}
          </div>
        );
      default: return null;
    }
  };

  const getFieldBlocksForSection = (sectionName: string) => {
    const sectionFields = fields.filter(f => f.section === sectionName);
    const blocks: { type: 'single' | 'group', name?: string, items: Field[] }[] = [];
    let currentGroup: string | undefined = undefined;
    let currentItems: Field[] = [];

    sectionFields.forEach((f) => {
      if (f.group) {
        if (f.group === currentGroup) {
          currentItems.push(f); 
        } else {
          if (currentItems.length > 0) blocks.push({ type: currentGroup ? 'group' : 'single', name: currentGroup, items: currentItems });
          currentGroup = f.group;
          currentItems = [f];
        }
      } else {
        if (currentItems.length > 0) blocks.push({ type: currentGroup ? 'group' : 'single', name: currentGroup, items: currentItems });
        currentGroup = undefined;
        blocks.push({ type: 'single', items: [f] });
        currentItems = [];
      }
    });
    if (currentItems.length > 0) blocks.push({ type: currentGroup ? 'group' : 'single', name: currentGroup, items: currentItems });
    return blocks;
  };

  const uniqueSections = Array.from(new Set(fields.map(f => f.section as string))).sort();

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; background-color: #f8fafc; color: #0f172a; }
        .custom-input { 
          padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; width: 100%; 
          box-sizing: border-box; font-size: 14px; font-family: system-ui, -apple-system, sans-serif; 
          background-color: #ffffff; transition: all 0.2s ease; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
        }
        .custom-input:focus { outline: none; border-color: #005eb8; box-shadow: 0 0 0 3px rgba(0, 94, 184, 0.15); }
        .custom-input::placeholder { color: #94a3b8; }
        
        .custom-input:disabled { 
          background-color: #f1f5f9; 
          color: #94a3b8; 
          border-color: #e2e8f0; 
          cursor: not-allowed; 
        }

        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        .action-btn { transition: transform 0.1s ease, box-shadow 0.2s ease; }
        .action-btn:active { transform: scale(0.98); }
        .zoom-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-weight: bold; color: #333; transition: all 0.2s; }
        .zoom-btn:hover { background: #f1f5f9; border-color: #94a3b8; }
        .accordion-btn { transition: background-color 0.2s ease; }
        .accordion-btn:hover { background-color: #f1f5f9 !important; }
        .tick-card {
          display: flex; align-items: center; gap: 10px; cursor: pointer;
          font-size: 13.5px; padding: 10px 14px; border-radius: 8px;
          transition: all 0.2s ease; border: 1px solid #e2e8f0;
          background-color: #ffffff;
        }
        .tick-card:hover { border-color: #cbd5e1; background-color: #f8fafc; }
        .tick-card.active { 
          background-color: #eff6ff; border-color: #bfdbfe; 
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
      `}</style>

      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        
        {/* --- HEADER --- */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', zIndex: 10 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ backgroundColor: '#005eb8', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px' }}>NHS</span>
              GOS18 Generator
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="action-btn" onClick={clearForm} 
              style={{ padding: '10px 16px', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', backgroundColor: '#ffffff', color: '#64748b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              🗑️ Clear Form
            </button>
            <button 
              className="action-btn" onClick={generatePDF} 
              style={{ padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontWeight: '600', backgroundColor: '#005eb8', color: 'white', fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(0, 94, 184, 0.2), 0 2px 4px -1px rgba(0, 94, 184, 0.1)' }}
            >
              📄 Open PDF
            </button>
          </div>
        </header>

        <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* --- LEFT PANEL: ACCORDION FORM --- */}
          <div className="custom-scrollbar" style={{ width: '460px', minWidth: '460px', padding: '24px', overflowY: 'auto', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {uniqueSections.map((sectionName) => {
                const isOpen = activeSection === sectionName;
                
                return (
                  <div key={sectionName} style={{ border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: isOpen ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none', transition: 'box-shadow 0.2s' }}>
                    
                    <button 
                      className="accordion-btn"
                      onClick={() => setActiveSection(isOpen ? '' : sectionName)}
                      style={{ width: '100%', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isOpen ? '#f8fafc' : '#ffffff', border: 'none', cursor: 'pointer', fontWeight: '700', color: '#0f172a', fontSize: '15px', borderBottom: isOpen ? '1px solid #e2e8f0' : 'none' }}
                    >
                      {sectionName}
                      <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease', color: '#64748b' }}>▼</span>
                    </button>

                    {isOpen && (
                      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#ffffff' }}>
                        {getFieldBlocksForSection(sectionName).map((block, index) => {
                          
                          const isTickGroup = block.items.every(item => item.type === 'tick');

                          if (block.type === 'group') {
                            return (
                              <div key={`group-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <label style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                                  {block.name}
                                </label>

                                <div style={{ 
                                  display: isTickGroup ? 'grid' : 'flex', 
                                  gridTemplateColumns: isTickGroup ? 'repeat(auto-fill, minmax(170px, 1fr))' : 'none',
                                  gap: '8px', flexWrap: 'wrap' 
                                }}>
                                  {block.items.map((f) => {
                                    const displayLabel = (f.group && (f.label.startsWith('RE ') || f.label.startsWith('LE '))) 
                                      ? f.label.substring(3) 
                                      : f.label;

                                    return f.type === 'tick' ? (
                                      <label key={f.id} className={`tick-card ${f.value ? 'active' : ''}`}>
                                        <input type="checkbox" checked={f.value as boolean} onChange={(e) => updateValue(f.id, e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#005eb8' }} />
                                        <span style={{ fontWeight: f.value ? '600' : '500', color: f.value ? '#1e3a8a' : '#334155', fontSize: '13px' }}>{displayLabel}</span>
                                      </label>
                                    ) : (
                                      <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '45px' }}>
                                        <label style={{ fontSize: '12px', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayLabel}</label>
                                        {renderInputControl(f)}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <React.Fragment key={`single-${index}`}>
                              {block.items.map((f) => (
                                f.type === 'tick' ? (
                                  <label key={f.id} className={`tick-card ${f.value ? 'active' : ''}`} style={{ maxWidth: '250px' }}>
                                    <input type="checkbox" checked={f.value as boolean} onChange={(e) => updateValue(f.id, e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#005eb8' }} />
                                    <span style={{ fontWeight: f.value ? '600' : '500', color: f.value ? '#1e3a8a' : '#334155' }}>{f.label}</span>
                                  </label>
                                ) : (
                                  <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{f.label}</label>
                                    {renderInputControl(f)}
                                  </div>
                                )
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

            </div>
          </div>

          {/* --- RIGHT PANEL: VISUAL PREVIEW --- */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#cbd5e1', position: 'relative' }}>
            
            <div style={{ position: 'absolute', top: '24px', right: '32px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.9)', padding: '6px 8px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 20, backdropFilter: 'blur(4px)' }}>
              <button className="zoom-btn" onClick={() => setZoom(Math.max(0.3, zoom - 0.1))} title="Zoom Out">−</button>
              <span style={{ width: '50px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button className="zoom-btn" onClick={() => setZoom(Math.min(2.0, zoom + 0.1))} title="Zoom In">+</button>
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, overflow: 'auto', display: 'flex', padding: '40px', alignItems: 'flex-start', justifyContent: 'center' }}>
              <div style={{
                width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px`, minWidth: `${PAGE_WIDTH}px`, minHeight: `${PAGE_HEIGHT}px`,
                backgroundImage: `url('/GOS18_bg.jpg')`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
                backgroundColor: 'white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
                position: 'relative', overflow: 'hidden', transform: `scale(${zoom})`, transformOrigin: 'top center',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' 
              }}>
                {fields.map((field) => (
                  <div
                    key={field.id}
                    style={{
                      position: 'absolute', left: field.x, top: field.y, width: field.width, height: field.height,
                      display: 'flex', alignItems: 'flex-start', padding: '2px', boxSizing: 'border-box', overflow: 'hidden',
                    }}
                  >
                     <AutoScalingPreview field={field} />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}