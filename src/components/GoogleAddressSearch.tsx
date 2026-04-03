import { useState, useEffect, useRef } from 'react';

export default function GoogleAddressSearch({ field, updateMultipleValues }: { field: any, updateMultipleValues: (updates: {id: string, value: string}[]) => void }) {
  const [houseNumber, setHouseNumber] = useState('');
  const [postcode, setPostcode] = useState('');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    if (window.google && window.google.maps) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
    }
  }, []);

  const handleFind = () => {
    if (!postcode || !autocompleteService.current) return;
    setIsSearching(true);
    setPredictions([]);

    const combinedQuery = `${houseNumber} ${postcode}`.trim();
    autocompleteService.current.getPlacePredictions({ 
      input: combinedQuery,
      componentRestrictions: { country: 'gb' },
      types: ['address'] 
    }, (results: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
      setIsSearching(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results);
      } else {
        alert("No addresses found.");
      }
    });
  };

  const handleSelectPlace = (placeId: string) => {
    if (!placesService.current) return;
    placesService.current.getDetails({
      placeId: placeId,
      fields: ['formatted_address', 'address_components']
    }, (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        const pc = place.address_components?.find((c: google.maps.GeocoderAddressComponent) => c.types.includes('postal_code'))?.long_name || '';
        let addr = place.formatted_address || '';
        if (pc) addr = addr.replace(pc, '').replace(/,\s*$/, '').trim();

        updateMultipleValues([
          { id: '1775166357198', value: addr }, 
          { id: '1775166388131', value: pc }
        ]);
        setPredictions([]);
        setHouseNumber('');
        setPostcode('');
      }
    });
  };

  if (field && field.value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <span style={{ fontSize: '11px', color: '#166534', fontWeight: 'bold' }}>✅ PATIENT ADDRESS LINKED</span>
          <span style={{ fontSize: '14px', color: '#14532d' }}>{field.value}</span>
        </div>
        <button onClick={() => updateMultipleValues([{ id: '1775166357198', value: '' }, { id: '1775166388131', value: '' }])} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input type="text" className="custom-input" placeholder="House No." value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} style={{ width: '90px' }} />
        <input type="text" className="custom-input" placeholder="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value.toUpperCase())} style={{ flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && handleFind()} />
        <button onClick={handleFind} disabled={isSearching} style={{ padding: '0 16px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>{isSearching ? '⏳' : 'Find'}</button>
      </div>
      {predictions.length > 0 && (
        <div className="custom-scrollbar" style={{ border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: 'white', maxHeight: '180px', overflowY: 'auto' }}>
          {predictions.map((p) => (
            <div key={p.place_id} onClick={() => handleSelectPlace(p.place_id)} style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>{p.description}</div>
          ))}
        </div>
      )}
    </div>
  );
}