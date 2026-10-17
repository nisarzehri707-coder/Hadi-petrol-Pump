import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sliders, 
  Store, 
  Fuel, 
  Upload, 
  Trash2, 
  Save, 
  Download, 
  UploadCloud, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone,
  Info,
  Layers,
  KeyRound,
  Lock,
  Plus,
  Edit2,
  X
} from 'lucide-react';
import { formatPKR, formatLitres } from '../utils/formatters';

export const SettingsView = () => {
  const { 
    data, 
    currentUser,
    updateStationInfo, 
    updateRates, 
    calibrateTank, 
    updateLogo, 
    resetLogo, 
    resetToDemoData, 
    exportData, 
    importData, 
    updatePins,
    updateNozzle,
    addNozzle,
    deleteNozzle,
    showToast,
    language 
  } = useApp();

  const { station, rates, tanks, nozzles = [] } = data;
  const isUrdu = language === 'ur';

  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);

  // Station Info Form State
  const [stationName, setStationName] = useState(station.name);
  const [owner, setOwner] = useState(station.owner);
  const [phone, setPhone] = useState(station.phone);
  const [address, setAddress] = useState(station.address);

  // Security PINs Form State
  const [ownerPin, setOwnerPin] = useState(station.ownerPin || '7860');
  const [staffPin, setStaffPin] = useState(station.staffPin || '1234');
  const [showPins, setShowPins] = useState(false);

  // Fuel Rates Form State
  const [petrolSelling, setPetrolSelling] = useState(String(rates.petrol.selling));
  const [petrolPurchase, setPetrolPurchase] = useState(String(rates.petrol.purchase));
  const [dieselSelling, setDieselSelling] = useState(String(rates.diesel.selling));
  const [dieselPurchase, setDieselPurchase] = useState(String(rates.diesel.purchase));

  // Tank Calibration State
  const [petrolStock, setPetrolStock] = useState(String(tanks.petrol.currentStock));
  const [petrolCapacity, setPetrolCapacity] = useState(String(tanks.petrol.capacity));
  const [petrolAlert, setPetrolAlert] = useState(String(tanks.petrol.minAlert));

  const [dieselStock, setDieselStock] = useState(String(tanks.diesel.currentStock));
  const [dieselCapacity, setDieselCapacity] = useState(String(tanks.diesel.capacity));
  const [dieselAlert, setDieselAlert] = useState(String(tanks.diesel.minAlert));

  // Nozzle Management State
  const [showAddNozzleModal, setShowAddNozzleModal] = useState(false);
  const [newNozzleName, setNewNozzleName] = useState('');
  const [newNozzleLabel, setNewNozzleLabel] = useState('');
  const [newNozzleFuel, setNewNozzleFuel] = useState('petrol');
  const [newNozzleMeter, setNewNozzleMeter] = useState('0');

  // Editing Nozzle Meter inline
  const [editingNozzleId, setEditingNozzleId] = useState(null);
  const [editingMeterValue, setEditingMeterValue] = useState('');

  // Handle Logo Upload (Base64)
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showToast('Image must be under 3MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateLogo(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveStationInfo = (e) => {
    e.preventDefault();
    updateStationInfo({
      name: stationName.trim() || 'HADI PETROL PUMP',
      owner: owner.trim() || 'Tanveer Zehri',
      phone: phone.trim(),
      address: address.trim(),
    });
  };

  const handleSavePins = (e) => {
    e.preventDefault();
    if (!ownerPin.trim() || !staffPin.trim()) {
      showToast('PINs cannot be empty', 'error');
      return;
    }
    updatePins(ownerPin.trim(), staffPin.trim());
  };

  const handleSaveRates = (e) => {
    e.preventDefault();
    updateRates({
      petrol: {
        selling: parseFloat(petrolSelling) || 0,
        purchase: parseFloat(petrolPurchase) || 0,
      },
      diesel: {
        selling: parseFloat(dieselSelling) || 0,
        purchase: parseFloat(dieselPurchase) || 0,
      }
    });
  };

  const handleCalibratePetrol = (e) => {
    e.preventDefault();
    calibrateTank('petrol', petrolStock, petrolCapacity, petrolAlert);
  };

  const handleCalibrateDiesel = (e) => {
    e.preventDefault();
    calibrateTank('diesel', dieselStock, dieselCapacity, dieselAlert);
  };

  const handleImportJsonFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentUser?.role !== 'owner') {
      showToast('Only the station owner can restore database backups.', 'error');
      if (e.target) e.target.value = '';
      return;
    }

    if (!confirm('Importing this file will replace current station records. (A safety backup is automatically preserved). Proceed?')) {
      if (e.target) e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      importData(event.target.result);
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleResetDemoData = () => {
    if (currentUser?.role !== 'owner') {
      showToast('Only the station owner can reset data to demo defaults.', 'error');
      return;
    }
    const phrase = prompt('WARNING: All real records will be replaced with sample demo data!\nType "RESET" in all capitals to confirm:');
    if (phrase === 'RESET') {
      resetToDemoData();
    } else if (phrase !== null) {
      alert('Confirmation phrase did not match. Reset cancelled.');
    }
  };

  const handleAddNozzleSubmit = (e) => {
    e.preventDefault();
    addNozzle({
      name: newNozzleName || `Nozzle ${nozzles.length + 1}`,
      label: newNozzleLabel || (newNozzleFuel === 'petrol' ? 'Super Petrol Dispenser' : 'HSD Diesel Dispenser'),
      fuelType: newNozzleFuel,
      lastMeter: parseFloat(newNozzleMeter) || 0,
    });
    setNewNozzleName('');
    setNewNozzleLabel('');
    setNewNozzleMeter('0');
    setShowAddNozzleModal(false);
  };

  const handleSaveNozzleMeter = (nozId) => {
    const meterVal = parseFloat(editingMeterValue);
    if (isNaN(meterVal) || meterVal < 0) {
      showToast('Enter valid meter reading', 'error');
      return;
    }
    updateNozzle(nozId, { lastMeter: meterVal });
    setEditingNozzleId(null);
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300 max-w-4xl mx-auto">
      
      {/* Page Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-700" />
            <span>Station Configuration & Control</span>
          </h2>
          <p className="text-xs text-slate-500">
            Branding, rates, dispenser nozzles, security PINs & database management
          </p>
        </div>
      </div>

      {/* 1. Station Logo & Branding */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Store className="w-4 h-4 text-emerald-700" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Station Identity & Official Logo
          </h3>
        </div>

        <div className="flex items-center gap-4">
          {/* Logo Circular Preview */}
          <div className="relative w-20 h-20 rounded-2xl ring-2 ring-emerald-500/30 bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
            {station.logo ? (
              <img
                src={station.logo}
                alt={station.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700 flex flex-col items-center justify-center text-white p-2 text-center">
                <Fuel className="w-6 h-6 text-white" />
                <span className="text-[9px] font-bold mt-1">Default</span>
              </div>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Logo</span>
              </button>

              {station.logo && (
                <button
                  type="button"
                  onClick={resetLogo}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-rose-600 text-xs font-bold transition-all active:scale-95 border border-slate-200"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-500">
              Station logo appears on printed slips & WhatsApp receipts. Recommended square ratio.
            </p>
          </div>
        </div>

        {/* Station Details Form */}
        <form onSubmit={handleSaveStationInfo} className="space-y-3 pt-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Station Name
            </label>
            <input
              type="text"
              required
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Owner / Proprietor
              </label>
              <input
                type="text"
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0300-XXXXXXX"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Station Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20"
            />
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-all active:scale-95 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Station Details</span>
          </button>
        </form>
      </div>

      {/* 2. Security PINs & Staff Access */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Security PINs & User Access
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPins(!showPins)}
            className="text-[10px] text-slate-500 hover:text-slate-800 font-bold px-2 py-1 bg-slate-100 rounded-lg"
          >
            {showPins ? 'Hide PINs' : 'Reveal PINs'}
          </button>
        </div>

        <form onSubmit={handleSavePins} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
              <label className="text-[11px] font-bold text-emerald-900 block mb-1">
                Owner Security PIN (Admin Access)
              </label>
              <div className="relative">
                <input
                  type={showPins ? 'text' : 'password'}
                  required
                  value={ownerPin}
                  onChange={(e) => setOwnerPin(e.target.value)}
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-950 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20 shadow-sm"
                />
                <Lock className="w-4 h-4 text-emerald-600 absolute right-3 top-3" />
              </div>
              <span className="text-[10px] text-emerald-700/80 mt-1 block">Default: 7860 (Full control, settings, profit reports)</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60">
              <label className="text-[11px] font-bold text-amber-900 block mb-1">
                Staff / Shift Operator PIN
              </label>
              <div className="relative">
                <input
                  type={showPins ? 'text' : 'password'}
                  required
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-amber-950 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500/20 shadow-sm"
                />
                <Lock className="w-4 h-4 text-amber-600 absolute right-3 top-3" />
              </div>
              <span className="text-[10px] text-amber-700/80 mt-1 block">Default: 1234 (Dispenser shifts, meter reading, bulk dump)</span>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all active:scale-95 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Update Security PINs</span>
          </button>
        </form>
      </div>

      {/* 3. Dispenser Nozzle Management */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Dispenser Nozzles & Meter Calibration
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAddNozzleModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold active:scale-95 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Nozzle</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Manage electronic dispenser nozzles. If a mechanical dispenser meter is repaired or rolls over, adjust its reading below:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nozzles.map((noz) => {
            const isEditing = editingNozzleId === noz.id;
            return (
              <div key={noz.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{noz.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      noz.fuelType === 'petrol' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {noz.fuelType.toUpperCase()}
                    </span>
                  </div>
                  {nozzles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete nozzle ${noz.name}?`)) {
                          deleteNozzle(noz.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                      title="Delete nozzle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-500">{noz.label}</div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Current Last Meter</span>
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="number"
                          step="any"
                          value={editingMeterValue}
                          onChange={(e) => setEditingMeterValue(e.target.value)}
                          className="w-24 bg-white border border-emerald-500 rounded px-2 py-1 text-xs font-mono font-bold text-slate-900 shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNozzleMeter(noz.id)}
                          className="px-2 py-1 bg-emerald-700 text-white rounded text-[10px] font-bold hover:bg-emerald-800 shadow-sm"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNozzleId(null)}
                          className="px-1.5 py-1 bg-slate-200 text-slate-600 rounded text-[10px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {Number(noz.lastMeter).toFixed(1)} L
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNozzleId(noz.id);
                        setEditingMeterValue(String(noz.lastMeter));
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 active:scale-95 shadow-sm"
                    >
                      <Edit2 className="w-3 h-3 text-emerald-700" />
                      <span>Calibrate Meter</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Fuel Rates & Margins */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-emerald-700" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Official Selling & Purchase Benchmark Rates (PKR)
            </h3>
          </div>
        </div>

        <form onSubmit={handleSaveRates} className="space-y-3">
          {/* Petrol Rates */}
          <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-900">Super Petrol (Rs / L)</span>
              <span className="text-[11px] font-mono font-semibold text-emerald-800">
                Margin: Rs {((parseFloat(petrolSelling) || 0) - (parseFloat(petrolPurchase) || 0)).toFixed(2)}/L
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 font-semibold block">Selling Rate</label>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={petrolSelling}
                  onChange={(e) => setPetrolSelling(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-emerald-800 text-sm focus:outline-none focus:border-emerald-600 shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 font-semibold block">Purchase Cost</label>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={petrolPurchase}
                  onChange={(e) => setPetrolPurchase(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-slate-700 text-sm focus:outline-none focus:border-emerald-600 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Diesel Rates */}
          <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-amber-900">High-Speed Diesel (Rs / L)</span>
              <span className="text-[11px] font-mono font-semibold text-amber-800">
                Margin: Rs {((parseFloat(dieselSelling) || 0) - (parseFloat(dieselPurchase) || 0)).toFixed(2)}/L
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 font-semibold block">Selling Rate</label>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={dieselSelling}
                  onChange={(e) => setDieselSelling(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-amber-800 text-sm focus:outline-none focus:border-amber-600 shadow-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 font-semibold block">Purchase Cost</label>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={dieselPurchase}
                  onChange={(e) => setDieselPurchase(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-semibold text-slate-700 text-sm focus:outline-none focus:border-amber-600 shadow-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all active:scale-95 shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Update Active Fuel Rates</span>
          </button>
        </form>
      </div>

      {/* 5. Underground Tank Dip Calibration */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Layers className="w-4 h-4 text-emerald-700" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Tank Capacity & Alert Settings
          </h3>
        </div>

        {/* Petrol Tank Calibration */}
        <form onSubmit={handleCalibratePetrol} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="font-bold text-xs text-slate-900">Super Petrol Tank Specs</span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-slate-500 font-semibold block">Current Stock (L)</label>
              <input
                type="number"
                step="0.01"
                value={petrolStock}
                onChange={(e) => setPetrolStock(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono text-xs text-slate-900 shadow-sm"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 font-semibold block">Max Capacity</label>
              <input
                type="number"
                value={petrolCapacity}
                onChange={(e) => setPetrolCapacity(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono text-xs text-slate-900 shadow-sm"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 font-semibold block">Low Stock Alert</label>
              <input
                type="number"
                value={petrolAlert}
                onChange={(e) => setPetrolAlert(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono text-xs text-slate-900 shadow-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors shadow-sm"
          >
            Update Petrol Tank Specs
          </button>
        </form>

        {/* Diesel Tank Calibration */}
        <form onSubmit={handleCalibrateDiesel} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="font-bold text-xs text-slate-900">Diesel Tank Specs</span>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-slate-500 font-semibold block">Current Stock (L)</label>
              <input
                type="number"
                step="0.01"
                value={dieselStock}
                onChange={(e) => setDieselStock(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono text-xs text-slate-900 shadow-sm"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 font-semibold block">Max Capacity</label>
              <input
                type="number"
                value={dieselCapacity}
                onChange={(e) => setDieselCapacity(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono text-xs text-slate-900 shadow-sm"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 font-semibold block">Low Stock Alert</label>
              <input
                type="number"
                value={dieselAlert}
                onChange={(e) => setDieselAlert(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono text-xs text-slate-900 shadow-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition-colors shadow-sm"
          >
            Update Diesel Tank Specs
          </button>
        </form>
      </div>

      {/* 6. Data Backup & System Tools */}
      <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Backup & Data Persistence
          </h3>
        </div>

        <p className="text-[11px] text-slate-500">
          All station records (shifts, meter readings, tanks, suppliers, khata ledger, and expenses) are saved locally and securely. Export backups regularly for permanent safety.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {/* Export JSON */}
          <button
            type="button"
            onClick={exportData}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 transition-all active:scale-95 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Export Backup</span>
          </button>

          {/* Import JSON */}
          <div>
            <input
              type="file"
              ref={jsonInputRef}
              onChange={handleImportJsonFile}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 transition-all active:scale-95 shadow-sm"
            >
              <UploadCloud className="w-4 h-4 text-sky-600" />
              <span>Restore Backup</span>
            </button>
          </div>
        </div>

        {/* Reset to Demo Data */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetDemoData}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Initial Demo Data</span>
          </button>
        </div>
      </div>

      {/* MODAL: ADD NOZZLE */}
      {showAddNozzleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleAddNozzleSubmit} className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-black uppercase text-slate-900">Add New Dispenser Nozzle</span>
              <button type="button" onClick={() => setShowAddNozzleModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Nozzle Name</label>
              <input
                type="text"
                placeholder="e.g. Nozzle 5"
                value={newNozzleName}
                onChange={(e) => setNewNozzleName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-sm"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Fuel Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewNozzleFuel('petrol')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${newNozzleFuel === 'petrol' ? 'bg-emerald-100 border-emerald-500 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                >
                  Super Petrol
                </button>
                <button
                  type="button"
                  onClick={() => setNewNozzleFuel('diesel')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${newNozzleFuel === 'diesel' ? 'bg-amber-100 border-amber-500 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                >
                  HSD Diesel
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Dispenser Label / Description</label>
              <input
                type="text"
                placeholder="e.g. North Island Dispenser #3"
                value={newNozzleLabel}
                onChange={(e) => setNewNozzleLabel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-sm"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Initial Opening Meter (Litres)</label>
              <input
                type="number"
                step="any"
                value={newNozzleMeter}
                onChange={(e) => setNewNozzleMeter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 shadow-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddNozzleModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm"
              >
                Create Nozzle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* System Signature Footer */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center space-y-1 text-xs shadow-sm">
        <p className="font-bold text-slate-700">
          HADI PETROL PUMP MANAGEMENT SYSTEM V4.0
        </p>
        <p className="text-[10px] text-emerald-700 font-mono font-semibold">
          Custom Engineered for Tanveer Zehri • Highway Bypass • PWA Offline Ready
        </p>
      </div>

    </div>
  );
};
