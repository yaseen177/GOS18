import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { gos18Config } from './config';
import GoogleOpticianSearch from './components/GoogleOpticianSearch';
import GoogleAddressSearch from './components/GoogleAddressSearch';

// --- TYPES ---
type InputType = 'text' | 'tick' | 'date' | 'dropdown' | 'radio' | 'sign';

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
    if (!containerRef.current || !textRef.current || field.type === 'tick' || field.type === 'sign' || !field.value) return;
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
  }, [field.value, field.width, field.height, field.type]);

  if (field.type === 'tick') {
    return field.value ? <span style={{ fontSize: '14px', color: '#005eb8' }}>❌</span> : null;
  }

  if (field.type === 'sign') {
    return field.value ? (
      <img src={String(field.value)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Signature Preview" />
    ) : null;
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

// --- SIGNATURE MODAL UI ---
function SignatureModal({ initialValue, onSave, onCancel }: { initialValue: string, onSave: (val: string) => void, onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialValue;
    }
  }, [initialValue]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    setIsDrawing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const endDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const isCanvasBlank = () => {
      const context = canvas.getContext('2d');
      const pixelBuffer = new Uint32Array(context!.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
      return !pixelBuffer.some(color => color !== 0);
    };

    if (isCanvasBlank()) {
      onSave('');
    } else {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '600px', maxWidth: '90vw', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
        <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', color: '#0f172a' }}>✍️ Draw Your Signature</h2>
        <div style={{ border: '2px dashed #94a3b8', borderRadius: '8px', backgroundColor: '#f8fafc', overflow: 'hidden', touchAction: 'none' }}>
          <canvas
            ref={canvasRef}
            width={800}  
            height={300} 
            style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair', touchAction: 'none' }}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={endDrawing}
            onPointerOut={endDrawing}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <button onClick={handleClear} style={{ padding: '10px 16px', fontSize: '14px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            🗑️ Clear
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onCancel} style={{ padding: '10px 16px', fontSize: '14px', background: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Cancel
            </button>
            <button onClick={handleSave} style={{ padding: '10px 24px', fontSize: '14px', background: '#005eb8', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Save Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignatureInput({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {value ? (
        <a href="#" onClick={openModal} style={{ color: '#10b981', fontSize: '14px', textDecoration: 'underline', fontWeight: '600', padding: '10px 0', display: 'inline-block' }}>
          ✅ Signed
        </a>
      ) : (
        <a href="#" onClick={openModal} style={{ color: '#005eb8', fontSize: '14px', textDecoration: 'underline', fontWeight: '600', padding: '10px 0', display: 'inline-block' }}>
          + Insert Signature Here
        </a>
      )}

      {isModalOpen && (
        <SignatureModal initialValue={value} onSave={(val) => { onChange(val); setIsModalOpen(false); }} onCancel={() => setIsModalOpen(false)} />
      )}
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
        <input type="text" className="custom-input" placeholder="Search NHS Directory (type 3+ letters)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingRight: isSearching ? '30px' : '12px' }} />
        {isSearching && <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }}>⏳</div>}
        {results.length > 0 && (
          <div className="custom-scrollbar" style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', zIndex: 50, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            {results.map((org: any) => (
              <div key={org.OrgId} onClick={() => selectGP(org.OrgId, org.Name)} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <strong style={{ color: '#0f172a' }}>{org.Name}</strong> <span style={{ color: '#64748b' }}>{org.PostCode}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <textarea className="custom-input custom-scrollbar" value={field.value as string} onChange={(e) => updateValue(field.id, e.target.value)} placeholder="Selected GP will appear here..." style={{ resize: 'vertical', minHeight: '60px', height: `${Math.max(60, field.height)}px` }} />
    </div>
  );
}


// ==========================================
// ADMIN LOGIN GATE (NEW)
// ==========================================
function AdminLogin({ onSuccess, onCancel }: { onSuccess: () => void, onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Reads from the .env file. Defaults to 'admin' if not set.
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin';
    
    if (password === correctPassword) {
      onSuccess();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0f172a', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '12px', width: '400px', border: '1px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        <h2 style={{ marginTop: 0, color: '#f8fafc', fontSize: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🔒 Admin Access Required
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
          Please enter the master password to access the mapping editor and system configuration.
        </p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <input 
              type="password" 
              autoFocus
              placeholder="Enter Password..."
              className="custom-input" 
              style={{ backgroundColor: '#0f172a', color: 'white', borderColor: error ? '#ef4444' : '#475569', padding: '12px' }}
              value={password} 
              onChange={(e) => { setPassword(e.target.value); setError(false); }} 
            />
            {error && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', display: 'block' }}>Incorrect password. Please try again.</span>}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onCancel} style={{ padding: '10px 16px', background: 'transparent', color: '#cbd5e1', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Cancel
            </button>
            <button type="submit" style={{ padding: '10px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Unlock Editor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ==========================================
// ADMIN MAPPING MODE COMPONENT
// ==========================================
function AdminMapper({ onExit }: { onExit: () => void }) {
  const [fields, setFields] = useState<Field[]>(gos18Config as Field[]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);

  const [dragInfo, setDragInfo] = useState<{ id: string, type: 'move' | 'resize', startX: number, startY: number, startVal1: number, startVal2: number } | null>(null);

  const selectedField = fields.find(f => f.id === selectedId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setFields(prev => prev.map(f => {
          if (f.id !== selectedId) return f;
          const step = e.shiftKey ? 5 : 1; 
          let { x, y, width, height } = f;

          if (e.altKey) {
            if (e.key === 'ArrowUp') height = Math.max(5, height - step);
            if (e.key === 'ArrowDown') height += step;
            if (e.key === 'ArrowLeft') width = Math.max(5, width - step);
            if (e.key === 'ArrowRight') width += step;
          } else {
            if (e.key === 'ArrowUp') y -= step;
            if (e.key === 'ArrowDown') y += step;
            if (e.key === 'ArrowLeft') x -= step;
            if (e.key === 'ArrowRight') x += step;
          }
          return { ...f, x, y, width, height };
        }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);

  const handlePointerDown = (e: React.PointerEvent, id: string, type: 'move' | 'resize') => {
    e.stopPropagation();
    const field = fields.find(f => f.id === id);
    if (!field) return;
    setDragInfo({ id, type, startX: e.clientX, startY: e.clientY, startVal1: type === 'move' ? field.x : field.width, startVal2: type === 'move' ? field.y : field.height });
    setSelectedId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfo) return;
    const dx = (e.clientX - dragInfo.startX) / zoom;
    const dy = (e.clientY - dragInfo.startY) / zoom;

    setFields(prev => prev.map(f => {
      if (f.id === dragInfo.id) {
        if (dragInfo.type === 'move') return { ...f, x: Math.round(dragInfo.startVal1 + dx), y: Math.round(dragInfo.startVal2 + dy) };
        return { ...f, width: Math.max(5, Math.round(dragInfo.startVal1 + dx)), height: Math.max(5, Math.round(dragInfo.startVal2 + dy)) };
      }
      return f;
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragInfo) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDragInfo(null);
    }
  };

  const updateSelectedField = (key: keyof Field, value: any) => {
    setFields(prev => prev.map(f => f.id === selectedId ? { ...f, [key]: value } : f));
  };

  const addNewField = () => {
    const newId = Date.now().toString();
    const newField: Field = { id: newId, type: 'text', label: 'New Field', section: '7. Additional Info', x: 50, y: 50, width: 150, height: 30, value: '' };
    setFields(prev => [...prev, newField]);
    setSelectedId(newId);
  };

  const deleteSelectedField = () => {
    if (!selectedId) return;
    if (window.confirm("Are you sure you want to delete this field?")) {
      setFields(prev => prev.filter(f => f.id !== selectedId));
      setSelectedId(null);
    }
  };

  const copyConfig = () => {
    const exportData = fields.map(f => ({ ...f, value: f.type === 'tick' ? false : '' }));
    const exportText = `export const gos18Config = ${JSON.stringify(exportData, null, 2)};\n`;
    navigator.clipboard.writeText(exportText);
    alert('Config copied to clipboard! Paste this directly over the contents of your config.ts file.');
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#1e293b', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', backgroundColor: '#0f172a', borderBottom: '1px solid #334155', zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8' }}>⚙️ Admin Mapping Editor</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={copyConfig} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', backgroundColor: '#10b981', color: 'white', border: 'none' }}>📋 Copy Config</button>
          <button onClick={onExit} style={{ padding: '8px 16px', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', backgroundColor: '#ef4444', color: 'white', border: 'none' }}>⬅️ Exit Admin</button>
        </div>
      </header>
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="custom-scrollbar" style={{ width: '400px', padding: '20px', overflowY: 'auto', backgroundColor: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <button onClick={addNewField} style={{ padding: '12px', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', backgroundColor: '#3b82f6', color: 'white', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '15px' }}>➕ Add New Field</button>
          <div>
            <h3 style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase' }}>Select Field to Edit</h3>
            <select className="custom-input" style={{ backgroundColor: '#334155', color: 'white', borderColor: '#475569', width: '100%' }} value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">-- Select Field --</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.label || 'Unnamed Field'} ({f.type})</option>)}
            </select>
          </div>
          {selectedField ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>Label (Name)</label>
                <input type="text" className="custom-input" style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }} value={selectedField.label} onChange={(e) => updateSelectedField('label', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>Input Type</label>
                  <select className="custom-input" style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }} value={selectedField.type} onChange={(e) => updateSelectedField('type', e.target.value as InputType)}>
                    <option value="text">Text Box</option>
                    <option value="tick">Tick Box</option>
                    <option value="date">Date Picker</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="radio">Radio Buttons</option>
                    <option value="sign">Signature Pad</option>
                  </select>
                </div>
              </div>
              {(selectedField.type === 'dropdown' || selectedField.type === 'radio') && (
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>Options (Comma separated)</label>
                  <input type="text" className="custom-input" placeholder="e.g. Yes, No, Maybe" style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }} value={selectedField.options || ''} onChange={(e) => updateSelectedField('options', e.target.value)} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>Accordion Section</label>
                  <input type="text" className="custom-input" placeholder="e.g. 1. Patient Details" style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }} value={selectedField.section || ''} onChange={(e) => updateSelectedField('section', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>Group Name (Optional)</label>
                  <input type="text" className="custom-input" placeholder="Groups items horizontally" style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }} value={selectedField.group || ''} onChange={(e) => updateSelectedField('group', e.target.value)} />
                </div>
              </div>
              <hr style={{ borderColor: '#334155', margin: '4px 0' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', color: '#94a3b8' }}>X</label><input type="number" className="custom-input" style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }} value={selectedField.x} onChange={(e) => updateSelectedField('x', Number(e.target.value))} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', color: '#94a3b8' }}>Y</label><input type="number" className="custom-input" style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }} value={selectedField.y} onChange={(e) => updateSelectedField('y', Number(e.target.value))} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', color: '#94a3b8' }}>Width</label><input type="number" className="custom-input" style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }} value={selectedField.width} onChange={(e) => updateSelectedField('width', Number(e.target.value))} /></div>
                <div style={{ flex: 1 }}><label style={{ fontSize: '12px', color: '#94a3b8' }}>Height</label><input type="number" className="custom-input" style={{ backgroundColor: '#1e293b', color: 'white', border: '1px solid #334155' }} value={selectedField.height} onChange={(e) => updateSelectedField('height', Number(e.target.value))} /></div>
              </div>
              <button onClick={deleteSelectedField} style={{ marginTop: '10px', padding: '10px', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', backgroundColor: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b' }}>🗑️ Delete Field</button>
            </div>
          ) : (
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
              <p style={{ margin: 0 }}>Click a box on the PDF or select from the dropdown to edit its properties.</p>
            </div>
          )}
        </div>

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a' }}>
          <div style={{ position: 'absolute', top: '24px', right: '32px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(30,41,59,0.9)', padding: '6px 8px', borderRadius: '10px', zIndex: 20 }}>
            <button className="zoom-btn" style={{ background: '#334155', color: 'white', border: 'none' }} onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}>−</button>
            <span style={{ width: '50px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>{Math.round(zoom * 100)}%</span>
            <button className="zoom-btn" style={{ background: '#334155', color: 'white', border: 'none' }} onClick={() => setZoom(Math.min(2.0, zoom + 0.1))}>+</button>
          </div>

          <div className="custom-scrollbar" style={{ flex: 1, overflow: 'auto', display: 'flex', padding: '40px', alignItems: 'flex-start', justifyContent: 'center' }}>
            <div 
              style={{
                width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px`, minWidth: `${PAGE_WIDTH}px`, minHeight: `${PAGE_HEIGHT}px`,
                backgroundImage: `url('/GOS18_bg.jpg')`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
                backgroundColor: 'white', position: 'relative', overflow: 'hidden', transform: `scale(${zoom})`, transformOrigin: 'top center',
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {fields.map((f) => {
                const isSelected = selectedId === f.id;
                return (
                  <div
                    key={f.id}
                    onPointerDown={(e) => handlePointerDown(e, f.id, 'move')}
                    style={{
                      position: 'absolute', left: f.x, top: f.y, width: f.width, height: f.height,
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.4)' : (f.type === 'tick' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(239, 68, 68, 0.2)'),
                      border: isSelected ? '2px solid #0ea5e9' : (f.type === 'tick' ? '1px solid #8b5cf6' : '1px solid #ef4444'),
                      cursor: 'move', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxSizing: 'border-box', touchAction: 'none'
                    }}
                  >
                    <span style={{ fontSize: '10px', color: isSelected ? '#0284c7' : '#991b1b', fontWeight: 'bold', pointerEvents: 'none', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {f.label}
                    </span>
                    {isSelected && (
                      <div 
                        onPointerDown={(e) => handlePointerDown(e, f.id, 'resize')}
                        style={{ position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, background: '#0ea5e9', border: '2px solid white', borderRadius: '50%', cursor: 'se-resize', zIndex: 10 }} 
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


// ==========================================
// MAIN APPLICATION
// ==========================================
export default function App() {
  const [appState, setAppState] = useState<'app' | 'login' | 'admin'>('app');

  const [fields, setFields] = useState<Field[]>(() => {
    const today = new Date().toISOString().split('T')[0];

    return (gos18Config as Field[]).map(field => {
      let f = { ...field };

      if (f.label === 'Date of ST' || f.label === 'Date of Referral') {
        f.value = today;
      }

      if (f.type === 'tick') {
        f.x += 2.5;
        f.y += 2.5;
      }

      if (!f.section) {
        f.section = 'Uncategorised Fields';
      }

      return f;
    });
  });

  const [zoom, setZoom] = useState(0.85);
  const uniqueSections = Array.from(new Set(fields.map(f => f.section as string))).sort();
  const [activeSection, setActiveSection] = useState<string>(uniqueSections[0] || ''); 

  // --- ROUTING / STATE GATES ---
  if (appState === 'login') {
    return <AdminLogin onSuccess={() => setAppState('admin')} onCancel={() => setAppState('app')} />;
  }

  if (appState === 'admin') {
    return <AdminMapper onExit={() => setAppState('app')} />;
  }

  const updateValue = (id: string, value: string | boolean) => {
    const targetField = fields.find(f => f.id === id);
    const isClearing = typeof value === 'string' && value.trim() === '';
    
    // Determine if we are clearing a root optical field
    const clearingSph = isClearing && targetField?.label.endsWith(' SPH');
    const clearingCyl = isClearing && targetField?.label.endsWith(' CYL');
    const prefix = targetField?.label.substring(0, 3);
  
    setFields(prev => prev.map(f => {
      // 1. Update the target field itself
      if (f.id === id) return { ...f, value };
      
      // 2. Handle exclusive tick boxes
      if (targetField?.type === 'tick' && targetField.group && targetField.exclusive && value === true) {
        if (f.type === 'tick' && f.group === targetField.group) return { ...f, value: false };
      }
  
      // 3. Handle cascading optical field clears in the same pass
      if (prefix && f.label.startsWith(prefix)) {
        const baseLabel = f.label.replace(prefix, '');
        if (clearingSph && ['CYL', 'AXIS', 'PRISM', 'BASE', 'ADD'].includes(baseLabel)) {
          return { ...f, value: '' };
        }
        if (clearingCyl && baseLabel === 'AXIS') {
          return { ...f, value: '' };
        }
      }
  
      return f;
    }));
  };

  const updateMultipleValues = (updates: {id: string, value: string | boolean}[]) => {
    setFields(prevFields => prevFields.map(f => {
      const update = updates.find(u => u.id === f.id);
      if (update) {
        return { ...f, value: update.value };
      }
      return f;
    }));
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
      setActiveSection(uniqueSections[0] || ''); 
    }
  };

  const generatePDF = async () => {
    try {
      const existingPdfBytes = await fetch('/GOS18_template.pdf').then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const page = pdfDoc.getPages()[0];
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (const field of fields) {
        const pdfTopY = PAGE_HEIGHT - field.y;
        const pdfBottomY = PAGE_HEIGHT - field.y - field.height;

        if (field.type === 'tick' && field.value) {
          page.drawText('X', { x: field.x + 4, y: pdfBottomY + 4, size: 14, font, color: rgb(0, 0, 0) });
        } 
        else if (field.type === 'sign' && field.value) {
          try {
            const imageBytes = await fetch(String(field.value)).then(r => r.arrayBuffer());
            const image = await pdfDoc.embedPng(imageBytes);
            page.drawImage(image, {
              x: field.x,
              y: pdfBottomY,
              width: field.width,
              height: field.height,
            });
          } catch (e) {
            console.error("Failed to embed signature", e);
          }
        }
        else if (field.value && field.type !== 'tick' && field.type !== 'sign') {
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
      }

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
    // 1. Existing GP Autocomplete intercept
    if (f.label === 'GP Name and Address') {
      return <GPAutocomplete field={f} updateValue={updateValue} />;
    }

    // 2. NEW: Google Optician Search intercept
    if (f.id === '1775219937562') {
      return <GoogleOpticianSearch field={f} updateMultipleValues={updateMultipleValues} />;
    }

    // 3. NEW: Google Patient Address Search intercept
    if (f.id === '1775166357198') {
      return <GoogleAddressSearch field={f} updateMultipleValues={updateMultipleValues} />;
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
      case 'sign':
        return <SignatureInput value={f.value as string} onChange={(val) => updateValue(f.id, val)} />;
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

  return (
    <div className="app-container">
      {/* Keep minor micro-component styles here just in case they aren't in index.css yet */}

      {/* TOP NAVIGATION */}
      <header className="top-nav">
        <h1 className="nav-title">
          <span style={{ fontSize: '28px' }}>📄</span> 
          GOS18 Generator
        </h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setAppState('login')} 
            style={{ padding: '10px 16px', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', backgroundColor: '#f8fafc', color: '#475569', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
          >
            ⚙️ Admin Mapping
          </button>
          <button 
            onClick={clearForm} 
            style={{ padding: '10px 16px', cursor: 'pointer', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '600', backgroundColor: '#fff5f5', color: '#ef4444', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
          >
            🗑️ Clear Form
          </button>
        </div>
      </header>

      {/* MAIN SPLIT-PANE DASHBOARD */}
      <main className="dashboard-grid">
        
        {/* LEFT COLUMN: Clean Panel Cards */}
        <div className="form-column">
          {uniqueSections.map((sectionName) => {
            const isOpen = activeSection === sectionName;

            return (
              <div key={sectionName} className={`panel-card ${isOpen ? 'open' : ''}`}>
                
                {/* STRICTLY NO INLINE STYLES HERE */}
                <div 
                  className={`panel-header ${isOpen ? 'open' : ''}`}
                  onClick={() => setActiveSection(isOpen ? '' : sectionName)}
                >
                  <h2 className="section-heading">{sectionName}</h2>
                  <span className={`chevron ${isOpen ? 'open' : ''}`}>
                    ▼
                  </span>
                </div>
                
                {/* Form Content */}
                {isOpen && (
                  <div className="panel-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                                      <input type="checkbox" checked={f.value as boolean} onChange={(e) => updateValue(f.id, e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#0284c7' }} />
                                      <span style={{ fontWeight: f.value ? '600' : '500', color: f.value ? '#0369a1' : '#334155', fontSize: '13px' }}>{displayLabel}</span>
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
                                  <input type="checkbox" checked={f.value as boolean} onChange={(e) => updateValue(f.id, e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#0284c7' }} />
                                  <span style={{ fontWeight: f.value ? '600' : '500', color: f.value ? '#0369a1' : '#334155' }}>{f.label}</span>
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
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: Sticky PDF Preview */}
        <div className="preview-column">
          
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Live Preview</h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px', borderRadius: '8px' }}>
                <button className="zoom-btn" onClick={() => setZoom(Math.max(0.3, zoom - 0.1))} title="Zoom Out">−</button>
                <span style={{ width: '46px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button className="zoom-btn" onClick={() => setZoom(Math.min(2.0, zoom + 0.1))} title="Zoom In">+</button>
              </div>
              
              <button className="btn-primary" onClick={generatePDF}>
                Download PDF
              </button>
            </div>
          </div>

          <div className="custom-scrollbar" style={{ width: '100%', maxHeight: 'calc(100vh - 180px)', overflow: 'auto', backgroundColor: '#cbd5e1', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{
              width: `${PAGE_WIDTH}px`, height: `${PAGE_HEIGHT}px`, minWidth: `${PAGE_WIDTH}px`, minHeight: `${PAGE_HEIGHT}px`,
              backgroundImage: `url('/GOS18_bg.jpg')`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
              backgroundColor: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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

      <footer style={{ 
        marginTop: '40px',
        padding: '20px 0', 
        textAlign: 'center', 
        fontSize: '13px', 
        fontWeight: '500',
        color: '#64748b', 
        borderTop: '1px solid #e2e8f0',
      }}>
        &copy; {new Date().getFullYear()} Created by Yaseen Hussain (Optometrist)
      </footer>
    </div>
  );
}