import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { generateItinerary, getItineraries, deleteItinerary, updateItineraryPlan, suggestPlaces, searchHotels } from '../api/api';
import MapComponent from '../components/MapComponent';
import WeatherWidget from '../components/WeatherWidget';
import html2pdf from 'html2pdf.js';
import './ItineraryPage.css';

import { TRAVEL_STYLES, STYLE_ICONS } from '../utils/constants';

const CURRENCIES = ['MYR', 'EUR', 'GBP', 'USD', 'JPY', 'AUD', 'CAD', 'SGD', 'THB', 'KRW'];

// ── Date calculation helpers ──
const toDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const addDaysToStr = (str, days) => {
  if (!str) return '';
  try {
    const [y, m, d] = str.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + Number(days));
    return toDateStr(date);
  } catch {
    return str;
  }
};

const getDaysBetween = (s1, s2) => {
  if (!s1 || !s2) return null;
  try {
    const [y1, m1, d1] = s1.split('-').map(Number);
    const [y2, m2, d2] = s2.split('-').map(Number);
    const dt1 = new Date(y1, m1 - 1, d1);
    const dt2 = new Date(y2, m2 - 1, d2);
    return Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

export default function ItineraryPage() {
  const [form, setForm] = useState({
    destination: '', duration: 3, budget: '', currency: 'MYR',
    travelStyle: 'cultural', numberOfPeople: 1,
    startDate: '', endDate: ''
  });
  const [mustVisitPlaces, setMustVisitPlaces] = useState([]);
  const [placeInput, setPlaceInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState([]);
  const [activeItinerary, setActiveItinerary] = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const todayStr = toDateStr(new Date());

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editedPlan, setEditedPlan] = useState(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Place search
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);

  // AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);

  const placeSearchTimeout = useRef(null);

  // Hotels
  const [hotels, setHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelsError, setHotelsError] = useState('');
  const [hotelTier, setHotelTier] = useState('mid-range');
  const [hotelMeta, setHotelMeta] = useState(null);

  // Destination autocomplete
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [destLoading, setDestLoading] = useState(false);
  const searchTimeout = useRef(null);
  const wrapperRef = useRef(null);

  // Close destination dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDestDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { fetchSaved(); }, []);

  const fetchSaved = async () => {
    try {
      const { data } = await getItineraries();
      setSaved(data);
    } catch { /* silent */ }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Destination search with debounce
  const handleDestinationInput = (e) => {
    const value = e.target.value;
    setForm({ ...form, destination: value });
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.length < 2) { setDestSuggestions([]); setShowDestDropdown(false); return; }
    searchTimeout.current = setTimeout(async () => {
      setDestLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&limit=8&accept-language=en&namedetails=1`,
          { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
        );
        const data = await res.json();
        setDestSuggestions(data);
        setShowDestDropdown(true);
      } catch { setDestSuggestions([]); }
      finally { setDestLoading(false); }
    }, 380);
  };

  const getDestType = (item) => {
    if (item.type === 'country') return { label: 'Country', color: '#6366f1' };
    if (['city', 'town', 'municipality'].includes(item.type)) return { label: 'City', color: '#10b981' };
    if (['state', 'province'].includes(item.type)) return { label: 'State', color: '#f59e0b' };
    if (item.type === 'region') return { label: 'Region', color: '#06b6d4' };
    if (item.class === 'place') return { label: 'City', color: '#10b981' };
    return { label: 'Place', color: '#8b5cf6' };
  };

  const getDestSubtitle = (item) => {
    const a = item.address;
    if (!a) return '';
    const parts = [];
    if (a.state && a.state !== item.display_name.split(',')[0].trim()) parts.push(a.state);
    if (a.country) parts.push(a.country);
    return parts.join(', ');
  };

  const selectSuggestion = (item) => {
    const name = item.display_name.split(',')[0].trim();
    setForm({ ...form, destination: name });
    setDestSuggestions([]);
    setShowDestDropdown(false);
  };

  // ── Edit Mode Handlers ──
  const handleToggleEdit = () => {
    if (!editMode) setEditedPlan(JSON.parse(JSON.stringify(currentPlan)));
    else setEditedPlan(null);
    setEditMode(e => !e);
    setShowPlaceSearch(false);
    setShowAiSuggestions(false);
  };

  const handleEditActivity = (dayIdx, actIdx, field, value) => {
    const plan = JSON.parse(JSON.stringify(editedPlan));
    plan.days[dayIdx].activities[actIdx][field] = value;
    setEditedPlan(plan);
  };

  const handleDeleteActivity = (dayIdx, actIdx) => {
    const plan = JSON.parse(JSON.stringify(editedPlan));
    plan.days[dayIdx].activities.splice(actIdx, 1);
    setEditedPlan(plan);
  };

  const handleAddActivity = (dayIdx, newAct) => {
    const plan = JSON.parse(JSON.stringify(editedPlan));
    plan.days[dayIdx].activities.push(newAct);
    setEditedPlan(plan);
  };

  const handleSavePlan = async () => {
    setSavingPlan(true);
    try {
      await updateItineraryPlan(activeItinerary._id, editedPlan);
      setActiveItinerary(prev => ({ ...prev }));
      // Update saved list too
      setSaved(prev => prev.map(i => i._id === activeItinerary._id
        ? { ...i, plan: editedPlan } : i));
      setActiveItinerary(prev => ({ ...prev, plan: editedPlan }));
      setEditMode(false);
      setEditedPlan(null);
    } catch { alert('Failed to save. Please try again.'); }
    finally { setSavingPlan(false); }
  };

  // ── Place Search ──
  const handlePlaceSearch = (e) => {
    const q = e.target.value;
    setPlaceQuery(q);
    if (placeSearchTimeout.current) clearTimeout(placeSearchTimeout.current);
    if (q.length < 2) { setPlaceResults([]); return; }
    placeSearchTimeout.current = setTimeout(async () => {
      setPlaceSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ' ' + activeItinerary.destination)}&format=json&addressdetails=1&limit=6&accept-language=en`,
          { headers: { 'Accept-Language': 'en-US,en;q=0.9' } }
        );
        const data = await res.json();
        setPlaceResults(data);
      } catch { setPlaceResults([]); }
      finally { setPlaceSearching(false); }
    }, 400);
  };

  const handleAddFromSearch = (place) => {
    const name = place.display_name.split(',')[0].trim();
    handleAddActivity(activeDay, {
      activity: name,
      description: `Visit ${name} in ${activeItinerary.destination}.`,
      time: '',
      estimatedCost: 0,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon)
    });
    setPlaceQuery('');
    setPlaceResults([]);
  };

  const handleAiSuggest = async () => {
    setLoadingSuggest(true);
    setShowAiSuggestions(true);
    setAiSuggestions([]);
    try {
      const plan = editMode ? editedPlan : currentPlan;
      const day = plan?.days?.[activeDay];
      const { data } = await suggestPlaces(activeItinerary._id, {
        destination: activeItinerary.destination,
        dayTitle: day?.title || `Day ${activeDay + 1}`,
        existingActivities: day?.activities || []
      });
      setAiSuggestions(data.suggestions || []);
    } catch { setAiSuggestions([]); }
    finally { setLoadingSuggest(false); }
  };

  const handleAddAiSuggestion = (act) => {
    if (!editMode) {
      setEditedPlan(JSON.parse(JSON.stringify(currentPlan)));
      setEditMode(true);
    }
    handleAddActivity(activeDay, act);
  };

  // ── Smart Bidirectional Date & Duration Alignment ──
  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    if (!newStart) {
      setForm(prev => ({ ...prev, startDate: '', endDate: '' }));
      return;
    }

    const currentDur = Number(form.duration) || 3;
    if (form.endDate) {
      const diff = getDaysBetween(newStart, form.endDate);
      if (diff > 0) {
        // Aligns duration directly
        setForm(prev => ({ ...prev, startDate: newStart, duration: diff }));
      } else {
        // If start date is on/after end date, push end date forward by current duration
        const newEnd = addDaysToStr(newStart, currentDur);
        setForm(prev => ({ ...prev, startDate: newStart, endDate: newEnd }));
      }
    } else {
      // Auto-set end date from duration
      const newEnd = addDaysToStr(newStart, currentDur);
      setForm(prev => ({ ...prev, startDate: newStart, endDate: newEnd }));
    }
  };

  const handleEndDateChange = (e) => {
    const newEnd = e.target.value;
    if (!newEnd) {
      setForm(prev => ({ ...prev, endDate: '' }));
      return;
    }

    if (form.startDate) {
      const diff = getDaysBetween(form.startDate, newEnd);
      if (diff > 0) {
        setForm(prev => ({ ...prev, endDate: newEnd, duration: diff }));
      } else if (diff === 0) {
        // Same-day trip = 1 day
        setForm(prev => ({ ...prev, endDate: newEnd, duration: 1 }));
      } else {
        // User selected an end date before start date -> snap start date to match
        setForm(prev => ({ ...prev, startDate: newEnd, endDate: newEnd, duration: 1 }));
      }
    } else {
      const currentDur = Number(form.duration) || 3;
      const newStart = addDaysToStr(newEnd, -currentDur);
      setForm(prev => ({ ...prev, startDate: newStart, endDate: newEnd }));
    }
  };

  const handleDurationChange = (val) => {
    const parsed = parseInt(val, 10);
    const dur = isNaN(parsed) ? 1 : Math.max(1, Math.min(30, parsed));
    if (form.startDate) {
      const newEnd = addDaysToStr(form.startDate, dur);
      setForm(prev => ({ ...prev, duration: dur, endDate: newEnd }));
    } else {
      setForm(prev => ({ ...prev, duration: dur }));
    }
  };

  const setQuickStart = (daysOffset) => {
    const base = new Date();
    base.setDate(base.getDate() + daysOffset);
    const newStart = toDateStr(base);
    const dur = Number(form.duration) || 3;
    const newEnd = addDaysToStr(newStart, dur);
    setForm(prev => ({ ...prev, startDate: newStart, endDate: newEnd }));
  };

  // Helper for smart spot suggestions based on destination
  const getDestinationSuggestions = () => {
    const dest = (form.destination || '').toLowerCase();
    if (dest.includes('japan') || dest.includes('tokyo')) {
      return ['Shinjuku Gyoen', 'Shibuya Sky', 'Senso-ji Temple', 'TeamLab Planets', 'Meiji Shrine'];
    }
    if (dest.includes('korea') || dest.includes('seoul')) {
      return ['Gyeongbokgung Palace', 'Myeongdong Night Market', 'N Seoul Tower', 'Bukchon Hanok Village', 'Hongdae'];
    }
    if (dest.includes('finland') || dest.includes('helsinki') || dest.includes('rovaniemi')) {
      return ['Santa Claus Village', 'Northern Lights Aurora Tour', 'Helsinki Cathedral', 'Suomenlinna Fortress', 'Löyly Sauna'];
    }
    if (dest.includes('switzerland') || dest.includes('swiss') || dest.includes('zurich')) {
      return ['Jungfraujoch', 'Matterhorn Zermatt', 'Lake Geneva', 'Interlaken', 'Lucerne Old Town'];
    }
    if (dest.includes('thailand') || dest.includes('bangkok')) {
      return ['Grand Palace', 'Wat Arun', 'Chatuchak Weekend Market', 'Iconsiam', 'Khao San Road'];
    }
    if (dest.includes('bali') || dest.includes('indonesia')) {
      return ['Uluwatu Temple', 'Tegallalang Rice Terrace', 'Nusa Penida', 'Mount Batur Sunrise', 'Seminyak Beach'];
    }
    if (dest.includes('london') || dest.includes('uk') || dest.includes('england')) {
      return ['London Eye', 'Big Ben & Westminster', 'British Museum', 'Tower Bridge', 'Hyde Park'];
    }
    if (dest.includes('france') || dest.includes('paris')) {
      return ['Eiffel Tower', 'Louvre Museum', 'Montmartre', 'Arc de Triomphe', 'Seine River Cruise'];
    }
    return ['Historic Old Town', 'Local Food Market', 'Iconic City Viewpoint', 'Cultural Museum', 'Scenic Waterfront'];
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setActiveItinerary(null);
    try {
      const { data } = await generateItinerary({ ...form, mustVisitPlaces });
      setActiveItinerary(data.itinerary);
      setActiveDay(0);
      fetchSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate itinerary.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this itinerary?')) return;
    try {
      await deleteItinerary(id);
      setSaved(prev => prev.filter(i => i._id !== id));
      if (activeItinerary?._id === id) setActiveItinerary(null);
    } catch { /* silent */ }
  };

  const handleViewSaved = (itin) => {
    setActiveItinerary(itin);
    setActiveDay(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fetch hotels whenever an itinerary becomes active or tier changes
  const fetchHotels = async (tierToFetch = 'mid-range') => {
    if (!activeItinerary?.destination) return;
    setHotelsLoading(true);
    setHotelsError('');
    try {
      const params = {
        travelStyle: activeItinerary.travelStyle || '',
        budget: activeItinerary.budget || '',
        duration: activeItinerary.duration || '',
        currency: activeItinerary.currency || 'MYR',
        tier: tierToFetch
      };
      const { data } = await searchHotels(activeItinerary.destination, params);
      setHotels(data.hotels || []);
      setHotelMeta({
        activeTier: data.activeTier,
        tierLabel: data.tierLabel,
        tierReason: data.tierReason,
        tierBadge: data.tierBadge
      });
    } catch {
      setHotelsError('Could not load accommodation. Please try again.');
    } finally {
      setHotelsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeItinerary?.destination) return;
    setHotelTier('mid-range');
    fetchHotels('mid-range');
  }, [activeItinerary]);

  const handleSelectHotelTier = (tier) => {
    setHotelTier(tier);
    fetchHotels(tier);
  };

  const handleExportPDF = () => {
    if (!currentPlan) return;

    // Build a clean off-screen HTML doc for PDF
    const pdfRoot = document.createElement('div');
    pdfRoot.style.cssText = 'font-family: Inter, Arial, sans-serif; color: #161616; background: #ffffff; padding: 24px; max-width: 800px; margin: 0 auto;';

    // ── Cover Header ──
    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 28px; padding-bottom: 20px; border-bottom: 3px solid #9FE870;';
    header.innerHTML = `
      <h1 style="font-size: 2rem; font-weight: 800; color: #161616; margin: 0 0 8px;">${activeItinerary.destination}</h1>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
        <span style="background: rgba(159,232,112,0.15); color: #163300; border: 1px solid rgba(159,232,112,0.4); padding: 4px 12px; border-radius: 999px; font-size: 0.82rem; font-weight: 700;">${activeItinerary.duration} Days</span>
        <span style="background: rgba(6,182,212,0.1); color: #0e7490; border: 1px solid rgba(6,182,212,0.3); padding: 4px 12px; border-radius: 999px; font-size: 0.82rem; font-weight: 700;">${activeItinerary.travelStyle}</span>
        ${activeItinerary.budget > 0 ? `<span style="background: rgba(16,185,129,0.1); color: #059669; border: 1px solid rgba(16,185,129,0.3); padding: 4px 12px; border-radius: 999px; font-size: 0.82rem; font-weight: 700;">${activeItinerary.currency} ${Number(activeItinerary.budget).toLocaleString()}</span>` : ''}
      </div>
      <p style="font-size: 0.95rem; color: #4a4a4a; line-height: 1.6; margin: 0;">${currentPlan.overview || ''}</p>
    `;
    pdfRoot.appendChild(header);

    // ── Each Day as a separate page ──
    currentPlan.days?.forEach((day, dayIdx) => {
      const daySection = document.createElement('div');
      if (dayIdx > 0) daySection.style.pageBreakBefore = 'always';
      daySection.style.cssText += 'padding-top: 20px;';

      // Day Title
      const dayTitle = document.createElement('div');
      dayTitle.style.cssText = 'font-size: 1.3rem; font-weight: 800; color: #161616; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 2px solid #9FE870;';
      dayTitle.textContent = day.title || `Day ${day.day}`;
      daySection.appendChild(dayTitle);

      // Activities
      const acts = getActivitiesForDay(day);
      acts.forEach((act, actIdx) => {
        const actDiv = document.createElement('div');
        actDiv.style.cssText = 'display: flex; gap: 14px; margin-bottom: 16px; padding: 14px 16px; background: #f9fafb; border: 1px solid #eaeaea; border-radius: 10px;';
        
        const numCircle = document.createElement('div');
        numCircle.style.cssText = 'flex: 0 0 28px; height: 28px; border-radius: 50%; background: #163300; color: #9FE870; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem;';
        numCircle.textContent = actIdx + 1;
        
        const content = document.createElement('div');
        content.style.cssText = 'flex: 1;';
        
        let metaHtml = '';
        if (act.time) metaHtml += `<span style="color: #0e7490; font-weight: 600;">🕐 ${act.time}</span>`;
        if (act.estimatedCost > 0) metaHtml += `<span style="color: #059669; font-weight: 600; margin-left: 12px;">💰 ${activeItinerary.currency} ${act.estimatedCost}</span>`;
        
        content.innerHTML = `
          <div style="font-weight: 700; font-size: 1rem; color: #161616; margin-bottom: 4px;">${act.activity}</div>
          <div style="font-size: 0.88rem; color: #4a4a4a; line-height: 1.5;">${act.description || ''}</div>
          ${metaHtml ? `<div style="display: flex; gap: 12px; margin-top: 6px; font-size: 0.8rem;">${metaHtml}</div>` : ''}
        `;
        
        actDiv.appendChild(numCircle);
        actDiv.appendChild(content);
        daySection.appendChild(actDiv);
      });

      // Accommodation
      if (day.accommodation) {
        const accomDiv = document.createElement('div');
        accomDiv.style.cssText = 'background: rgba(159,232,112,0.08); border: 1px solid rgba(159,232,112,0.3); padding: 12px 16px; border-radius: 10px; margin-top: 14px; margin-bottom: 8px;';
        accomDiv.innerHTML = `<strong style="display: block; color: #163300; font-size: 0.82rem; text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">🏨 Night Stay</strong><span style="color: #161616; font-size: 0.9rem;">${day.accommodation}</span>`;
        daySection.appendChild(accomDiv);
      }

      // Meals
      if (day.meals?.length > 0) {
        const mealsDiv = document.createElement('div');
        mealsDiv.style.cssText = 'background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.3); padding: 12px 16px; border-radius: 10px;';
        mealsDiv.innerHTML = `
          <strong style="display: block; color: #059669; font-size: 0.82rem; text-transform: uppercase; font-weight: 800; margin-bottom: 6px;">🍽️ Dining Suggestions</strong>
          <ul style="padding-left: 18px; margin: 0; font-size: 0.88rem; color: #4a4a4a;">
            ${day.meals.map(m => `<li style="margin-bottom: 3px;">${m}</li>`).join('')}
          </ul>
        `;
        daySection.appendChild(mealsDiv);
      }

      pdfRoot.appendChild(daySection);
    });

    // ── Packing List on its own page ──
    if (currentPlan.packingList?.length > 0) {
      const packSection = document.createElement('div');
      packSection.style.cssText = 'page-break-before: always; padding-top: 20px;';

      const packTitle = document.createElement('div');
      packTitle.style.cssText = 'font-size: 1.3rem; font-weight: 800; color: #161616; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 2px solid #9FE870;';
      packTitle.textContent = '🎒 Smart Packing List';
      packSection.appendChild(packTitle);

      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;';
      currentPlan.packingList.forEach(item => {
        const cell = document.createElement('div');
        cell.style.cssText = 'background: #f9fafb; border: 1px solid #eaeaea; padding: 10px 14px; border-radius: 8px;';
        cell.innerHTML = `
          <div style="font-weight: 700; font-size: 0.88rem; color: #161616;">✅ ${item.item}</div>
          <div style="font-size: 0.78rem; color: #666; margin-top: 2px;">${item.reason || ''}</div>
        `;
        grid.appendChild(cell);
      });
      packSection.appendChild(grid);
      pdfRoot.appendChild(packSection);
    }

    // Generate PDF
    const opt = {
      margin:       10,
      filename:     `${activeItinerary.destination.replace(/[^a-z0-9]/gi, '_')}_Itinerary.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'], avoid: ['.pdf-activity'] }
    };

    html2pdf().set(opt).from(pdfRoot).save();
  };

  const currentPlan = activeItinerary?.plan;

  // Process activities (backward compatible for older saves without "activities" array)
  const getActivitiesForDay = (dayData) => {
    if (!dayData) return [];
    if (dayData.activities && Array.isArray(dayData.activities)) return dayData.activities;
    
    // Legacy mapping
    const mapped = [];
    if (dayData.morning) mapped.push({ time: '09:00 AM', ...dayData.morning });
    if (dayData.afternoon) mapped.push({ time: '01:00 PM', ...dayData.afternoon });
    if (dayData.evening) mapped.push({ time: '06:00 PM', ...dayData.evening });
    return mapped;
  };

  // Extract markers for the current active day
  const currentDayData = currentPlan?.days?.[activeDay];
  const activities = getActivitiesForDay(currentDayData);
  
  const mapMarkers = activities
    .filter(a => a.lat && a.lng)
    .map(a => ({
      lat: a.lat,
      lng: a.lng,
      title: a.activity,
      description: a.description
    }));

    const renderTransitIcon = (mode) => {
      if (!mode) return <img src="/transit-default.png" alt="Transit" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
      
      const m = mode.toLowerCase();
      
      if (m.includes('train') || m.includes('subway') || m.includes('metro'))
        return <img src="/train.png" alt="Train" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
      
      if (m.includes('bus'))
        return <img src="/bus.png" alt="Bus" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
      
      if (m.includes('walk'))
        return <img src="/walk.png" alt="Walk" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
      
      if (m.includes('drive') || m.includes('car') || m.includes('taxi'))
        return <img src="/car.png" alt="Car" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;

      if (m.includes('high speed train'))
        return <img src="/high-speed-train.png.png" alt="high speed train" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
      
      return <img src="/transit.png" alt="Transit" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />;
    };

  return (
    <div className="itinerary-dashboard-container">
      <Navbar />

      {/* NO ACTIVE ITINERARY = SHOW FORM VIEW */}
      {!activeItinerary && (
        <div className="form-layout-centered fade-in">
          {/* Hero Header */}
          <div className="itin-page-hero">
            <div className="itin-hero-badge">
              <span className="itin-badge-sparkle">✨</span> AI-Powered Travel Engine
            </div>
            <h1 className="itin-hero-title">
              Smart <span>Itinerary Generator</span>
            </h1>
            <p className="itin-hero-subtitle">
              Plan your dream getaway in seconds with optimized daily routes, hidden gems & live budget tracking.
            </p>
          </div>

          <div className="itin-generator-card">
            <div className="itin-card-header">
              <div className="itin-card-header-icon">🗺️</div>
              <div>
                <h2 className="itin-card-title">Plan Your Next Adventure</h2>
                <p className="itin-card-subtitle">Set your dates and destination — duration & route will auto-align seamlessly</p>
              </div>
            </div>

            {error && <div className="alert alert-error"><span>⚠️ </span>{error}</div>}

            <form onSubmit={handleGenerate}>
              {/* ── SECTION 1: DESTINATION ── */}
              <div className="itin-form-section">
                <div className="itin-section-header">
                  <span className="itin-section-num">1</span>
                  <div style={{ flex: 1 }}>
                    <span className="itin-section-title">Where are you heading?</span>
                    <span className="itin-section-sub">Type a city or country, or select a popular destination below</span>
                  </div>
                </div>

                <div className="dest-autocomplete-wrapper" ref={wrapperRef}>
                  <div style={{ position: 'relative' }}>
                    <input
                      name="destination"
                      className="form-input"
                      style={{ fontSize: '1rem', paddingLeft: '40px' }}
                      placeholder="e.g. Tokyo, Japan or Rovaniemi, Finland"
                      value={form.destination}
                      onChange={handleDestinationInput}
                      onFocus={() => destSuggestions.length > 0 && setShowDestDropdown(true)}
                      autoComplete="off"
                      required
                    />
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem' }}>
                      📍
                    </span>
                    {destLoading && (
                      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                        <span className="spinner spinner-sm" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      </span>
                    )}
                  </div>

                  {showDestDropdown && destSuggestions.length > 0 && (
                    <div className="dest-dropdown">
                      {destSuggestions.map((item, idx) => {
                        const typeInfo = getDestType(item);
                        const name = item.display_name.split(',')[0].trim();
                        const subtitle = getDestSubtitle(item);
                        return (
                          <div
                            key={idx}
                            className="dest-option"
                            onMouseDown={() => selectSuggestion(item)}
                          >
                            <div className="dest-option-main">
                              <span className="dest-option-name">{name}</span>
                              {subtitle && <span className="dest-option-sub">{subtitle}</span>}
                            </div>
                            <span className="dest-type-badge" style={{ background: `${typeInfo.color}18`, color: typeInfo.color, border: `1px solid ${typeInfo.color}40` }}>
                              {typeInfo.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Popular Destination Quick Chips */}
                <div className="itin-dest-chips">
                  <span className="itin-chips-label">Popular:</span>
                  {[
                    { flag: '🇯🇵', name: 'Tokyo, Japan' },
                    { flag: '🇰🇷', name: 'Seoul, South Korea' },
                    { flag: '🇫🇮', name: 'Rovaniemi, Finland' },
                    { flag: '🇨🇭', name: 'Zurich, Switzerland' },
                    { flag: '🇹🇭', name: 'Bangkok, Thailand' },
                    { flag: '🇬🇧', name: 'London, UK' },
                    { flag: '🇮🇩', name: 'Bali, Indonesia' }
                  ].map(dest => (
                    <button
                      key={dest.name}
                      type="button"
                      className={`itin-dest-chip ${form.destination.toLowerCase().includes(dest.name.split(',')[0].toLowerCase()) ? 'active' : ''}`}
                      onClick={() => setForm({ ...form, destination: dest.name })}
                    >
                      <span>{dest.flag}</span> {dest.name.split(',')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── SECTION 2: DATES & DURATION (HERO AUTO-ALIGN) ── */}
              <div className="itin-form-section itin-dates-section">
                <div className="itin-section-header">
                  <span className="itin-section-num">2</span>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span className="itin-section-title">Travel Dates & Duration</span>
                      <span className="itin-section-sub">Pick start & end date — duration auto-aligns, or change days directly</span>
                    </div>
                    <span className="itin-duration-live-badge">
                      🗓️ {form.duration} {form.duration === 1 ? 'Day' : 'Days'} {form.duration > 1 ? `(${form.duration - 1} Nights)` : ''}
                    </span>
                  </div>
                </div>

                <div className="itin-dates-grid">
                  {/* Start Date */}
                  <div className="itin-date-box">
                    <label className="itin-date-label">
                      <span>🛫 Departure Date</span>
                      <span className="itin-date-badge-pill">Start</span>
                    </label>
                    <input
                      name="startDate"
                      type="date"
                      className="itin-date-input"
                      value={form.startDate}
                      min={todayStr}
                      onChange={handleStartDateChange}
                    />
                    <div className="itin-date-quick-actions">
                      <button type="button" onClick={() => setQuickStart(0)}>Today</button>
                      <button type="button" onClick={() => setQuickStart(1)}>Tomorrow</button>
                      <button type="button" onClick={() => setQuickStart(7)}>Next Wk</button>
                    </div>
                  </div>

                  {/* Flight Icon Divider */}
                  <div className="itin-flight-divider">
                    <span className="itin-flight-icon">✈️</span>
                    <div className="itin-flight-line" />
                  </div>

                  {/* End Date */}
                  <div className="itin-date-box">
                    <label className="itin-date-label">
                      <span>🛬 Return Date</span>
                      <span className="itin-date-badge-pill">End</span>
                    </label>
                    <input
                      name="endDate"
                      type="date"
                      className="itin-date-input"
                      value={form.endDate}
                      min={form.startDate || todayStr}
                      onChange={handleEndDateChange}
                    />
                    <div className="itin-date-quick-actions">
                      <span className="itin-date-sub-hint">
                        {form.endDate ? formatDisplayDate(form.endDate) : 'Auto-calculated'}
                      </span>
                    </div>
                  </div>

                  {/* Duration Stepper */}
                  <div className="itin-duration-box">
                    <label className="itin-date-label">
                      <span>⏳ Duration</span>
                      <span className="itin-date-badge-pill">Days</span>
                    </label>
                    <div className="itin-duration-counter">
                      <button
                        type="button"
                        className="itin-counter-btn"
                        onClick={() => handleDurationChange(form.duration - 1)}
                        disabled={form.duration <= 1}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        name="duration"
                        min="1"
                        max="30"
                        className="itin-counter-input"
                        value={form.duration}
                        onChange={(e) => handleDurationChange(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="itin-counter-btn"
                        onClick={() => handleDurationChange(form.duration + 1)}
                        disabled={form.duration >= 30}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Duration Preset Chips */}
                <div className="itin-quick-durations">
                  <span className="itin-quick-label">⚡ Quick Duration:</span>
                  {[
                    { days: 3, label: '3 Days', sub: 'Weekend' },
                    { days: 5, label: '5 Days', sub: 'Getaway' },
                    { days: 7, label: '7 Days', sub: '1 Week' },
                    { days: 10, label: '10 Days', sub: 'Extended' },
                    { days: 14, label: '14 Days', sub: '2 Weeks' }
                  ].map(item => (
                    <button
                      key={item.days}
                      type="button"
                      className={`itin-duration-chip ${Number(form.duration) === item.days ? 'active' : ''}`}
                      onClick={() => handleDurationChange(item.days)}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Date Summary Banner */}
                {form.startDate && form.endDate && (
                  <div className="itin-date-summary-banner">
                    <div className="itin-summary-icon">🗓️</div>
                    <div className="itin-summary-text">
                      <strong>{form.duration}-Day Journey Ready!</strong>
                      <span>{formatDisplayDate(form.startDate)} ➔ {formatDisplayDate(form.endDate)} ({form.duration > 1 ? `${form.duration - 1} nights` : 'day trip'})</span>
                    </div>
                    <span className="itin-summary-pill">Auto-aligned ✓</span>
                  </div>
                )}
              </div>

              {/* ── SECTION 3: TRAVELERS, BUDGET & CURRENCY ── */}
              <div className="itin-form-section">
                <div className="itin-section-header">
                  <span className="itin-section-num">3</span>
                  <div style={{ flex: 1 }}>
                    <span className="itin-section-title">Who is traveling & Budget</span>
                    <span className="itin-section-sub">Help us tailor hotel tiers, food options and pace</span>
                  </div>
                </div>

                <div className="itin-budget-grid">
                  <div className="itin-input-card">
                    <label className="itin-input-card-label">👥 Travelers</label>
                    <input
                      name="numberOfPeople"
                      type="number"
                      min="1"
                      max="20"
                      className="form-input"
                      value={form.numberOfPeople}
                      onChange={handleChange}
                    />
                    <div className="itin-traveler-presets">
                      <button type="button" className={Number(form.numberOfPeople) === 1 ? 'active' : ''} onClick={() => setForm({ ...form, numberOfPeople: 1 })}>Solo (1)</button>
                      <button type="button" className={Number(form.numberOfPeople) === 2 ? 'active' : ''} onClick={() => setForm({ ...form, numberOfPeople: 2 })}>Couple (2)</button>
                      <button type="button" className={Number(form.numberOfPeople) === 4 ? 'active' : ''} onClick={() => setForm({ ...form, numberOfPeople: 4 })}>Family (4)</button>
                    </div>
                  </div>

                  <div className="itin-input-card">
                    <label className="itin-input-card-label">💰 Estimated Budget <span className="itin-optional-tag">(Optional)</span></label>
                    <input
                      name="budget"
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="e.g. 3500"
                      value={form.budget}
                      onChange={handleChange}
                    />
                    <div className="itin-budget-hints">
                      <button type="button" onClick={() => setForm({ ...form, budget: 1500 })}>1.5k</button>
                      <button type="button" onClick={() => setForm({ ...form, budget: 3500 })}>3.5k</button>
                      <button type="button" onClick={() => setForm({ ...form, budget: 7000 })}>7k</button>
                    </div>
                  </div>

                  <div className="itin-input-card">
                    <label className="itin-input-card-label">💱 Currency</label>
                    <select
                      name="currency"
                      className="form-select"
                      value={form.currency}
                      onChange={handleChange}
                      style={{ height: '42px' }}
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── SECTION 4: TRAVEL STYLE & VIBE ── */}
              <div className="itin-form-section">
                <div className="itin-section-header">
                  <span className="itin-section-num">4</span>
                  <div style={{ flex: 1 }}>
                    <span className="itin-section-title">What is your travel style?</span>
                    <span className="itin-section-sub">Choose your desired vibe to curate personalized attractions</span>
                  </div>
                </div>

                <div className="itin-styles-grid">
                  {TRAVEL_STYLES.map(style => {
                    const isActive = form.travelStyle === style;
                    return (
                      <button
                        key={style}
                        type="button"
                        className={`itin-style-card ${isActive ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, travelStyle: style })}
                      >
                        <span className="itin-style-emoji">{STYLE_ICONS[style] || '✈️'}</span>
                        <span className="itin-style-name">
                          {style.charAt(0).toUpperCase() + style.slice(1)}
                        </span>
                        {isActive && <span className="itin-style-check">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── SECTION 5: MUST-VISIT PLACES ── */}
              <div className="itin-form-section">
                <div className="itin-section-header">
                  <span className="itin-section-num">5</span>
                  <div style={{ flex: 1 }}>
                    <span className="itin-section-title">Must-Visit Places</span>
                    <span className="itin-section-sub">Add specific spots you definitely don't want to miss</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    placeholder="e.g. Disneyland, Tokyo Tower, Santa Claus Village..."
                    value={placeInput}
                    onChange={e => setPlaceInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = placeInput.trim();
                        if (trimmed && !mustVisitPlaces.includes(trimmed)) {
                          setMustVisitPlaces(prev => [...prev, trimmed]);
                        }
                        setPlaceInput('');
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0 20px', flexShrink: 0, fontWeight: 700 }}
                    onClick={() => {
                      const trimmed = placeInput.trim();
                      if (trimmed && !mustVisitPlaces.includes(trimmed)) {
                        setMustVisitPlaces(prev => [...prev, trimmed]);
                      }
                      setPlaceInput('');
                    }}
                  >
                    + Add
                  </button>
                </div>

                {/* Spot suggestions based on destination */}
                <div className="itin-place-suggestions">
                  <span className="itin-suggest-label">Ideas:</span>
                  {getDestinationSuggestions()
                    .filter(s => !mustVisitPlaces.includes(s))
                    .slice(0, 4)
                    .map(spot => (
                      <button
                        key={spot}
                        type="button"
                        className="itin-suggest-tag"
                        onClick={() => setMustVisitPlaces(prev => [...prev, spot])}
                      >
                        + {spot}
                      </button>
                    ))}
                </div>

                {/* Active Tags Display */}
                {mustVisitPlaces.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {mustVisitPlaces.map((place, i) => (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(159,232,112,0.18)',
                        border: '1px solid rgba(159,232,112,0.5)',
                        color: '#163300',
                        padding: '6px 14px', borderRadius: 999,
                        fontSize: '0.84rem', fontWeight: 700,
                        animation: 'fadeIn 0.2s ease'
                      }}>
                        📍 {place}
                        <button
                          type="button"
                          onClick={() => setMustVisitPlaces(prev => prev.filter((_, idx) => idx !== i))}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#163300', fontSize: '0.9rem', lineHeight: 1,
                            padding: 0, display: 'flex', alignItems: 'center', marginLeft: 4
                          }}
                        >✕</button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMustVisitPlaces([])}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: '0.78rem', padding: '6px 10px'
                      }}
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* ── BIG VIBRANT SUBMIT BUTTON ── */}
              <button
                type="submit"
                className="itin-generate-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner spinner-sm" style={{ borderColor: '#9FE870', borderTopColor: 'transparent' }} />
                    <span>Getting things ready for your adventure...</span>
                  </>
                ) : (
                  <>
                    <span className="itin-btn-sparkle">✨</span>
                    <span>Generate Smart Itinerary</span>
                    <span className="itin-btn-arrow">➔</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Saved Items below the form */}
          {saved.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 16 }}> PREVIOUS JOURNEYS</h3>
              <div className="grid-2">
                {saved.map(itin => (
                  <div key={itin._id} className="saved-itin-item">
                    <div className="saved-itin-info" onClick={() => handleViewSaved(itin)}>
                      <div className="saved-itin-dest">📍 {itin.destination}</div>
                      <div className="saved-itin-meta">{itin.duration}d · {itin.travelStyle} · {new Date(itin.createdAt).toLocaleDateString()}</div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(itin._id)} title="Delete">🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* YES ACTIVE ITINERARY = SHOW SPLIT LAYOUT */}
      {activeItinerary && currentPlan && (
        <>
        <div className="split-layout-active fade-in">
          
          {/* LEFT: TIMELINE FEED */}
          <div className="timeline-panel" id="itinerary-pdf-content">
            <div className="itin-top-bar" data-html2canvas-ignore>
              <button className="btn-back-planner" onClick={() => setActiveItinerary(null)}>
                ← Back to Planner
              </button>
              <button className="btn-download-pdf" onClick={handleExportPDF}>
                📥 Download PDF
              </button>
            </div>

            <div className="itin-header-split">
              <h1 style={{ fontSize: '1.8rem', lineHeight: 1.2, marginBottom: 8 }}>{activeItinerary.destination}</h1>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-primary">{activeItinerary.duration} Days</span>
                <span className="badge badge-cyan">{activeItinerary.travelStyle}</span>
                {activeItinerary.startDate && (
                  <span className="badge badge-warning">
                    📅 {new Date(activeItinerary.startDate).toLocaleDateString()} → {activeItinerary.endDate ? new Date(activeItinerary.endDate).toLocaleDateString() : `+${activeItinerary.duration}d`}
                  </span>
                )}
                {activeItinerary.budget > 0 && (
                  <span className="badge badge-success">{activeItinerary.currency} {Number(activeItinerary.budget).toLocaleString()}</span>
                )}
              </div>
              <p style={{ marginTop: 16, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{currentPlan.overview}</p>
            </div>

            {/* Live Weather Widget */}
            <WeatherWidget destination={activeItinerary.destination} />
            
            {/* ── Edit Toolbar ── */}
            <div className="edit-toolbar" data-html2canvas-ignore>
              {!editMode ? (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={handleToggleEdit} style={{ display: "flex", alignItems: "center", gap: 6 }}>✏️ Edit Itinerary</button>
                  <button className="btn btn-secondary btn-sm" onClick={handleAiSuggest} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {loadingSuggest ? <span className="spinner spinner-sm" style={{ width: 14, height: 14, borderWidth: 2 }} /> : ''} AI Suggest Places
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-success btn-sm" onClick={handleSavePlan} disabled={savingPlan}>{savingPlan ? "Saving..." : "💾 Save Changes"}</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowPlaceSearch(s => !s)}>
                    🔍 Search Place
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleAiSuggest} disabled={loadingSuggest}>{loadingSuggest ? "..." : "🤖 AI Suggest"}</button>
                  <button className="btn btn-danger btn-sm" onClick={handleToggleEdit}>✕ Cancel</button>
                </>
              )}
            </div>

            {/* ── Place Search Panel ── */}
            {showPlaceSearch && editMode && (
              <div className="place-search-panel">
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    placeholder={`Search places in ${activeItinerary.destination}...`}
                    value={placeQuery}
                    onChange={handlePlaceSearch}
                    autoFocus
                    style={{ color: '#161616', background: '#fff' }}
                  />
                  {placeSearching && <span className="spinner spinner-sm" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderWidth: 2 }} />}
                </div>
                {placeResults.length > 0 && (
                  <div className="place-results">
                    {placeResults.map((p, i) => (
                      <div key={i} className="place-result-item" onClick={() => handleAddFromSearch(p)}>
                        <span className="place-result-name">📍 {p.display_name.split(',')[0].trim()}</span>
                        <span className="place-result-sub">{p.display_name.split(',').slice(1, 3).join(',').trim()}</span>
                        <span className="place-add-btn">+ Add</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── AI Suggestions Panel ── */}
            {showAiSuggestions && (
              <div className="ai-suggest-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong style={{ fontSize: '0.9rem' }}>🤖 AI Suggested Places for Day {activeDay + 1}</strong>
                  <button onClick={() => setShowAiSuggestions(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>✕</button>
                </div>
                {loadingSuggest ? (
                  <div style={{ textAlign: 'center', padding: 16 }}><span className="spinner" /></div>
                ) : aiSuggestions.map((s, i) => (
                  <div key={i} className="ai-suggest-item">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.activity}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{s.description}</div>
                      {s.estimatedCost > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', marginTop: 2 }}>💰 Est. {activeItinerary.currency} {s.estimatedCost}</div>}
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => handleAddAiSuggestion(s)}>+ Add</button>
                  </div>
                ))}
              </div>
            )}

            {/* AI Packing List Section */}
            {currentPlan.packingList && currentPlan.packingList.length > 0 && (
              <div className="packing-list-section">
                <h3>🎒 Smart Packing List</h3>
                <div className="packing-grid">
                  {currentPlan.packingList.map((item, idx) => (
                    <div key={idx} className="packing-item">
                      <div className="packing-item-name">✅ {item.item}</div>
                      <div className="packing-item-reason">{item.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="day-tabs" style={{ marginTop: 24 }}>
              {currentPlan.days?.map((day, i) => (
                <button 
                  key={i} 
                  className={`day-tab ${activeDay === i ? 'active' : ''}`}
                  onClick={() => setActiveDay(i)}
                >
                  Day {day.day}
                </button>
              ))}
            </div>

            {currentDayData && (
              <div className="day-feed" style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>{currentDayData.title}</h3>

                <div className="timeline-list">
                  {(editMode ? editedPlan?.days?.[activeDay]?.activities : activities).map((act, index) => (
                    <div key={index}>
                      {!editMode && act.transitDetails && (
                        <div className="transit-link fade-in">
                          <div className="transit-icon">{renderTransitIcon(act.transitDetails.mode)}</div>
                          <div className="transit-details">
                            <strong>{act.transitDetails.time || '10 mins'}</strong>
                            <span>({act.transitDetails.distance || 'N/A'}) via {act.transitDetails.mode || 'transit'}</span>
                          </div>
                        </div>
                      )}

                      <div className={`timeline-item fade-in ${editMode ? 'edit-mode' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="item-number">{index + 1}</div>
                        <div className="item-content-card">
                          {editMode ? (
                            // ── EDITABLE MODE ──
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <input
                                className="edit-field-input"
                                value={act.activity}
                                placeholder="Place name"
                                onChange={e => handleEditActivity(activeDay, index, 'activity', e.target.value)}
                              />
                              <textarea
                                className="edit-field-textarea"
                                value={act.description}
                                placeholder="Description"
                                rows={2}
                                onChange={e => handleEditActivity(activeDay, index, 'description', e.target.value)}
                              />
                              <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                  className="edit-field-input"
                                  value={act.time || ''}
                                  placeholder="Time e.g. 09:00 AM"
                                  style={{ flex: 1 }}
                                  onChange={e => handleEditActivity(activeDay, index, 'time', e.target.value)}
                                />
                                <input
                                  className="edit-field-input"
                                  type="number"
                                  value={act.estimatedCost || 0}
                                  placeholder="Cost"
                                  style={{ flex: 1 }}
                                  onChange={e => handleEditActivity(activeDay, index, 'estimatedCost', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <button
                                onClick={() => handleDeleteActivity(activeDay, index)}
                                style={{ alignSelf: 'flex-end', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem' }}
                              >🗑️ Remove</button>
                            </div>
                          ) : (
                            // ── VIEW MODE ──
                            <>
                              <div className="item-header">
                                <div className="item-title">{act.activity}</div>
                                {act.time && <div className="item-time">{act.time}</div>}
                              </div>
                              <div className="item-desc">{act.description}</div>
                              {act.estimatedCost > 0 && (
                                <div className="cost-tag">
                              💰 Est. Cost: {activeItinerary.currency} {act.estimatedCost}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Accommodations & Meals block for the day */}
                <div style={{ marginTop: 30, paddingTop: 20, borderTop: '1px solid var(--glass-border)' }}>
                  {currentDayData.accommodation && (
                    <div className="itin-accommodation-card">
                      <strong>🏨 Night Stay</strong>
                      <span>{currentDayData.accommodation}</span>
                    </div>
                  )}
                  {currentDayData.meals?.length > 0 && (
                    <div className="itin-meals-card">
                      <strong>🍽️ Dining Suggestions</strong>
                      <ul>
                        {currentDayData.meals.map((meal, i) => <li key={i}>{meal}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: MAP FULL HEIGHT */}
          <div className="map-panel">
            <MapComponent markers={mapMarkers} />
          </div>

        </div>

        {/* HOTEL SECTION — Below the split view */}
        <div className="hotel-section">
          <div className="hotel-section-header">
            <div>
              <h2 className="hotel-section-title">
                🏨 Accommodation in {activeItinerary?.destination}
              </h2>
              <p className="hotel-section-desc">
                {hotelMeta?.tierReason ? (
                  <span>✨ <strong>{hotelMeta.tierReason}</strong>. Click any option below or view on Google Maps.</span>
                ) : (
                  'Browse accommodation matched to your budget and travel style.'
                )}
              </p>
            </div>

            {/* Interactive Accommodation Tier Pills */}
            <div className="hotel-tier-pills">
              {[
                { id: 'backpacker', label: '🎒 Hostels & Budget' },
                { id: 'mid-range', label: '🏨 Mid-Range (3-4★)' },
                { id: 'luxury', label: '👑 5-Star Luxury' },
                { id: 'family', label: '👨‍👩‍👧 Family Friendly' }
              ].map(t => (
                <button
                  key={t.id}
                  className={`hotel-tier-pill ${hotelTier === t.id ? 'active' : ''}`}
                  onClick={() => handleSelectHotelTier(t.id)}
                  disabled={hotelsLoading}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {hotelsLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)', padding: '24px 0' }}>
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 3 }} />
              <span>Searching for best matched stays...</span>
            </div>
          )}

          {hotelsError && (
            <div className="alert alert-error"><span>⚠️ </span> {hotelsError}</div>
          )}

          {!hotelsLoading && hotels.length > 0 && (
            <div className="hotel-grid">
              {hotels.map((hotel) => (
                <div key={hotel.id} className="hotel-card">
                  <div className="hotel-card-img">
                    {hotel.photoUrl ? (
                      <img src={hotel.photoUrl} alt={hotel.name} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '3rem' }}>🏨</div>
                    )}
                    {hotel.tierBadge && (
                      <span className="hotel-card-badge" style={{ color: hotel.tierBadgeColor || '#9FE870' }}>
                        {hotel.tierBadge}
                      </span>
                    )}
                    {hotel.priceLevel && (
                      <span className="hotel-card-price">
                        {'$'.repeat(hotel.priceLevel)}
                      </span>
                    )}
                  </div>
                  <div className="hotel-card-body">
                    <div>
                      <h3 className="hotel-card-name">{hotel.name}</h3>
                      {hotel.rating && (
                        <div className="hotel-card-rating">
                          <span style={{ color: '#f59e0b' }}>{hotel.rating >= 4.5 ? '⭐⭐⭐⭐⭐' : hotel.rating >= 4 ? '⭐⭐⭐⭐☆' : hotel.rating >= 3.5 ? '⭐⭐⭐☆☆' : '⭐⭐⭐☆☆'}</span>
                          <span>{hotel.rating} ({hotel.totalRatings?.toLocaleString()} reviews)</span>
                        </div>
                      )}
                      <p className="hotel-card-address">📍 {hotel.address}</p>
                    </div>
                    <a
                      href={hotel.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hotel-card-link"
                    >
                      View on Google Maps
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
      )}
    </div>
  );
}
