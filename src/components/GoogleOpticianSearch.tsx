import React, { useState, useEffect, useRef } from 'react';

export default function GoogleOpticianSearch({ field, updateMultipleValues }: { field: any, updateMultipleValues: (updates: {id: string, value: string}[]) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    if (window.google && window.google.maps) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
    }
  }, []);

  useEffect(() => {
    if (!searchTerm || !autocompleteService.current) {
      setPredictions([]);
      return;
    }

    // 🕵️ THE TRICK: Silently append "optician" to the search query.
    // This forces Google's algorithm to filter out irrelevant businesses
    // and heavily prioritise optical practices in the dropdown!
    const optimisedQuery = searchTerm.toLowerCase().includes('optician') 
      ? searchTerm 
      : `${searchTerm} optician`;

    autocompleteService.current.getPlacePredictions({ 
      input: optimisedQuery,
      componentRestrictions: { country: 'gb' },
      types: ['establishment'] 
    }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results);
      } else {
        setPredictions([]);
      }
    });
  }, [searchTerm]);

  const handleSelectPlace = (placeId: string) => {
    if (!placesService.current) return;

    placesService.current.getDetails({
      placeId: placeId,
      fields: ['name', 'formatted_address', 'formatted_phone_number', 'address_components']
    }, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        
        const postcodeComponent = place.address_components?.find(c => c.types.includes('postal_code'));
        const postcode = postcodeComponent ? postcodeComponent.long_name : '';
        
        let cleanAddress = place.formatted_address || '';
        if (postcode) {
          cleanAddress = cleanAddress.replace(postcode, '').replace(/,\s*$/, '').trim();
        }

        updateMultipleValues([
          { id: '1775219937562', value: `${place.name}, ${cleanAddress}` }, 
          { id: '1775165586948', value: postcode },                          
          { id: '1775165626091', value: place.formatted_phone_number || '' } 
        ]);

        setSearchTerm('');
        setPredictions([]);
      }
    });
  };

  const clearSelection = () => {
    // Clear all three specific form fields
    updateMultipleValues([
      { id: '1775219937562', value: '' }, 
      { id: '1775165586948', value: '' },                          
      { id: '1775165626091', value: '' } 
    ]);
  };

  // --- RENDER LOGIC ---
  
  // Safety check: ensure 'field' exists before checking its value
  if (field && field.value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '12px' }}>
          <span style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ✅ Practice Linked
          </span>
          <span style={{ fontSize: '14px', color: '#14532d', lineHeight: '1.4' }}>
            {field.value}
          </span>
        </div>
        <button 
          onClick={clearSelection}
          style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold', fontSize: '14px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          title="Remove Practice"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
        >
          ✕
        </button>
      </div>
    );
  }

  // Otherwise, show the search bar
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ position: 'relative' }}>
        <input 
          type="text" 
          className="custom-input" 
          placeholder="Search Google for Practice (e.g. Specsavers Coventry)..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        
        {predictions.length > 0 && (
          <div className="custom-scrollbar" style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '200px', overflowY: 'auto', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', zIndex: 50, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            {predictions.map((p) => (
              <div 
                key={p.place_id} 
                onClick={() => handleSelectPlace(p.place_id)}
                style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '13px' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} 
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <strong style={{ color: '#0f172a' }}>{p.structured_formatting.main_text}</strong> 
                <span style={{ color: '#64748b', marginLeft: '6px' }}>{p.structured_formatting.secondary_text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}