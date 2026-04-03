import { useState, useEffect, useRef } from 'react';

export default function GoogleAddressSearch({ field, updateMultipleValues }: { field: any, updateMultipleValues: (updates: {id: string, value: string}[]) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    // Initialise Google Services
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

    // Restrict search to standard residential/commercial addresses in the UK
    autocompleteService.current.getPlacePredictions({ 
      input: searchTerm,
      componentRestrictions: { country: 'gb' },
      types: ['address'] 
    }, (results: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
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
      fields: ['formatted_address', 'address_components']
    }, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        
        // Extract the UK Postcode
        const postcodeComponent = place.address_components?.find((c: google.maps.GeocoderAddressComponent) => 
          c.types.includes('postal_code')
        );
        const postcode = postcodeComponent ? postcodeComponent.long_name : '';
        
        // Format the address (removing the postcode from the end of the string)
        let cleanAddress = place.formatted_address || '';
        if (postcode) {
          cleanAddress = cleanAddress.replace(postcode, '').replace(/,\s*$/, '').trim();
        }

        // Push data simultaneously to the Patient Address and Postcode boxes
        updateMultipleValues([
          { id: '1775166357198', value: cleanAddress }, // Px Address
          { id: '1775166388131', value: postcode }      // Px Postcode
        ]);

        setSearchTerm('');
        setPredictions([]);
      }
    });
  };

  const clearSelection = () => {
    updateMultipleValues([
      { id: '1775166357198', value: '' }, 
      { id: '1775166388131', value: '' }                          
    ]);
  };

  // If the field already has an address value, show the "Selected" state
  if (field && field.value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, paddingRight: '12px' }}>
          <span style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ✅ Patient Address Linked
          </span>
          <span style={{ fontSize: '14px', color: '#14532d', lineHeight: '1.4' }}>
            {field.value}
          </span>
        </div>
        <button 
          onClick={clearSelection}
          style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold', fontSize: '14px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          title="Remove Address"
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ position: 'relative' }}>
        <input 
          type="text" 
          className="custom-input" 
          placeholder="Enter House Number & Postcode (e.g. 14 CV1 2WT)..." 
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