import React, { useState, useRef, useEffect } from 'react';
import { useWebsite } from '@/context/WebsiteContext';
import { useSearchParams } from 'react-router-dom';
import { Save, Upload, Image as ImageIcon, Video, FileText, Smartphone, Type, Settings2, Palette, LogIn } from 'lucide-react';
import { cn, compressImage } from '@/lib/utils';
import { motion } from 'motion/react';

export default function Settings() {
  const { settings, updateSettings } = useWebsite();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') || 'branding';
  
  const [formData, setFormData] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const lastSettingsRef = useRef(settings);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    // If settings change from outside, and we haven't modified the form, update it safely
    if (!isDirtyRef.current) {
      lastSettingsRef.current = settings;
      setFormData(settings);
    }
  }, [settings]);

  useEffect(() => {
    // Detect if user modified formData locally compared to last known baseline settings
    const isUserModified = JSON.stringify(formData) !== JSON.stringify(lastSettingsRef.current);
    if (isUserModified) {
      isDirtyRef.current = true;
      const timer = setTimeout(() => {
        updateSettings(formData);
        // Sync our reference baseline to match so we don't loop or trigger again unnecessarily
        lastSettingsRef.current = formData;
      }, 500); // 500ms typing pause debounce for real-time preview sync
      return () => clearTimeout(timer);
    }
  }, [formData, updateSettings]);

  useEffect(() => {
    if (categoryParam !== activeCategory) {
      setActiveCategory(categoryParam);
    }
  }, [categoryParam]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setSearchParams({ category: cat });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    isDirtyRef.current = true;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    isDirtyRef.current = false;
    updateSettings(formData);
    lastSettingsRef.current = formData;
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const compressed = await compressImage(event.target!.result as string, 300, 300, 0.85);
          setFormData(prev => ({ ...prev, logoUrl: compressed }));
          setSaved(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: null }));
    setSaved(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Website Settings</h1>
          <p className="text-slate-500 font-medium mt-1">Manage branding, content, and contact information.</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:opacity-90 transition-opacity whitespace-nowrap w-full sm:w-auto justify-center"
        >
          <Save className="w-5 h-5" />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Category Dropdown */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-slate-700 mb-2">Select Settings Category</label>
        <div className="relative w-full max-w-md">
          <select 
            value={activeCategory} 
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none pr-10"
          >
            <option value="branding">Branding & ID Card</option>
            <option value="landing">Landing Page Content</option>
            <option value="principal">Principal Message</option>
            <option value="login">Login Page Settings</option>
            <option value="contact">Contact Information</option>
            <option value="gallery">Gallery Images</option>
            <option value="other_pages">Other Pages</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
            <Settings2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        
        {/* Branding Section */}
        {activeCategory === 'branding' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-6 lg:p-8 border border-slate-200 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Branding & Logo</h2>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">School Name</label>
                  <input 
                    type="text" 
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-tiro"
                  />
               </div>
               <div className="pt-2">
                 <p className="text-xs text-slate-500">This name will appear in the navigation bar, footer, and generated receipts/challans if no logo is provided.</p>
               </div>
               
               <div className="pt-4 border-t border-slate-100 mt-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">ID Card School Name (Optional)</label>
                  <input 
                    type="text" 
                    name="idCardSchoolName"
                    value={formData.idCardSchoolName || ''}
                    onChange={handleChange}
                    placeholder="e.g. B.J.V.N"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-tiro"
                  />
                  <p className="text-xs text-slate-500 mt-2">A shorter version of the school name specifically for ID cards. If empty, the main School Name is used.</p>
               </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">School Logo</label>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 relative overflow-hidden group hover:border-amber-400 transition-colors">
                {formData.logoUrl ? (
                  <div className="relative">
                    <img src={formData.logoUrl} alt="Logo" className="h-20 object-contain" />
                    <button onClick={removeLogo} className="absolute -top-3 -right-3 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Click to upload logo</p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoUpload} 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  style={{ display: formData.logoUrl ? 'none' : 'block' }}
                />
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  name="logoUrl"
                  value={formData.logoUrl || ''}
                  onChange={handleChange}
                  placeholder="Or paste image URL here"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Principal Signature (ID Card)</label>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 relative overflow-hidden group hover:border-amber-400 transition-colors h-[164px]">
                {formData.principalSignatureUrl ? (
                  <div className="relative bg-black/5 p-2 rounded-lg">
                    <img src={formData.principalSignatureUrl} alt="Signature" className="h-16 object-contain mix-blend-multiply" />
                    <button onClick={() => { setFormData(prev => ({...prev, principalSignatureUrl: undefined})); setSaved(false); }} className="absolute -top-3 -right-3 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Click to upload signature</p>
                    <p className="text-xs text-slate-400 mt-1">Transparent PNG recommended</p>
                  </>
                )}
                <input 
                  type="file" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        if (event.target?.result) {
                          const compressed = await compressImage(event.target!.result as string, 300, 150, 0.8);
                          setFormData(prev => ({ ...prev, principalSignatureUrl: compressed }));
                          setSaved(false);
                        }
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }} 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  style={{ display: formData.principalSignatureUrl ? 'none' : 'block' }}
                />
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  name="principalSignatureUrl"
                  value={formData.principalSignatureUrl || ''}
                  onChange={handleChange}
                  placeholder="Or paste signature URL here"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Watermark Image (ID Card)</label>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 relative overflow-hidden group hover:border-amber-400 transition-colors h-[164px]">
                {formData.watermarkUrl ? (
                  <div className="relative">
                    <img src={formData.watermarkUrl} alt="Watermark" className="h-16 object-contain opacity-50" />
                    <button onClick={() => { setFormData(prev => ({...prev, watermarkUrl: undefined})); setSaved(false); }} className="absolute -top-3 -right-3 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                      ×
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">Click to upload watermark</p>
                    <p className="text-xs text-slate-400 mt-1">Light image recommended</p>
                  </>
                )}
                <input 
                  type="file" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        if (event.target?.result) {
                          const compressed = await compressImage(event.target!.result as string, 400, 400, 0.6);
                          setFormData(prev => ({ ...prev, watermarkUrl: compressed }));
                          setSaved(false);
                        }
                      };
                      reader.readAsDataURL(e.target.files[0]);
                    }
                  }} 
                  accept="image/*" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  style={{ display: formData.watermarkUrl ? 'none' : 'block' }}
                />
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  name="watermarkUrl"
                  value={formData.watermarkUrl || ''}
                  onChange={handleChange}
                  placeholder="Or paste watermark URL here"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>
          </div>
        </motion.div>
        )}

        {/* Landing Page Content Section */}
        {activeCategory === 'landing' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-6 lg:p-8 border border-slate-200 shadow-sm"
        >
           <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Type className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Landing Page Content</h2>
          </div>
          
          <div className="space-y-8">
             {/* Hero Section */}
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Hero Section</h3>
               <div className="grid gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hero Headline</label>
                    <input 
                      type="text" 
                      name="heroHeadline"
                      value={formData.heroHeadline}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-lg"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hero Description</label>
                    <textarea 
                      name="heroSubtitle"
                      value={formData.heroSubtitle}
                      onChange={handleChange}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    ></textarea>
                 </div>
                 
                 <div>
                    <div className="flex items-center justify-between mb-2">
                       <label className="block text-sm font-bold text-slate-700">Hero Gallery Images (Up to 3)</label>
                       <span className="text-xs text-slate-500">{formData.heroGalleryImages?.length || 0}/3</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {formData.heroGalleryImages?.map((img, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-slate-100 border border-slate-200">
                           <img src={img} alt={`Hero Gallery ${i}`} className="w-full h-full object-cover" />
                           <button 
                             onClick={() => setFormData(prev => ({...prev, heroGalleryImages: prev.heroGalleryImages.filter((_, idx) => idx !== i)}))}
                             className="absolute top-2 right-2 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             ×
                           </button>
                        </div>
                      ))}
                      {(!formData.heroGalleryImages || formData.heroGalleryImages.length < 3) && (
                        <div className="rounded-xl border-2 border-dashed border-slate-300 aspect-[4/3] flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative overflow-hidden cursor-pointer">
                           <Upload className="w-6 h-6 text-slate-400 mb-2" />
                           <span className="text-xs font-semibold text-slate-500">Add Image</span>
                           <input 
                             type="file" 
                             accept="image/*"
                             className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                             onChange={(e) => {
                               if (e.target.files && e.target.files[0]) {
                                 const reader = new FileReader();
                                 reader.onload = async (event) => {
                                   if (event.target?.result) {
                                     const compressed = await compressImage(event.target!.result as string, 800, 600, 0.75);
                                     setFormData(prev => ({ ...prev, heroGalleryImages: [...(prev.heroGalleryImages || []), compressed] }));
                                     setSaved(false);
                                   }
                                 };
                                 reader.readAsDataURL(e.target.files[0]);
                               }
                               e.target.value = ''; // Reset
                             }}
                           />
                        </div>
                      )}
                    </div>
                    {(!formData.heroGalleryImages || formData.heroGalleryImages.length < 3) && (
                      <div className="mt-4 flex gap-2">
                        <input 
                          type="text"
                          placeholder="Or paste image URL here..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = e.currentTarget.value;
                                if (val) {
                                   setFormData(prev => ({ ...prev, heroGalleryImages: [...(prev.heroGalleryImages || []), val] }));
                                   setSaved(false);
                                   e.currentTarget.value = '';
                                }
                             }
                          }}
                        />
                        <button 
                          type="button"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            if (input && input.value) {
                               setFormData(prev => ({ ...prev, heroGalleryImages: [...(prev.heroGalleryImages || []), input.value] }));
                               setSaved(false);
                               input.value = '';
                            }
                          }}
                          className="bg-indigo-600 text-white px-5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                        >
                          Add URL
                        </button>
                      </div>
                    )}
                 </div>
                 
                 <div className="mt-8 pt-6 border-t border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Background Image/Overlay (Optional)</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 relative group hover:border-blue-400 transition-colors h-[160px] overflow-hidden cursor-pointer">
                      {formData.heroOverlayImageUrl ? (
                        <div className="relative w-full h-full">
                          <img src={formData.heroOverlayImageUrl} alt="Hero Overlay" className="w-full h-full object-cover rounded-xl" />
                          <button onClick={(e) => { e.preventDefault(); setFormData(prev => ({...prev, heroOverlayImageUrl: undefined})); setSaved(false); }} className="absolute top-2 right-2 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                            ×
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-medium text-slate-600">Upload Background Image</p>
                          <p className="text-xs text-slate-400 mt-1">Recommended for hero section background</p>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        style={{ display: formData.heroOverlayImageUrl ? 'none' : 'block' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              if (event.target?.result) {
                                const compressed = await compressImage(event.target!.result as string, 800, 600, 0.7);
                                setFormData(prev => ({ ...prev, heroOverlayImageUrl: compressed }));
                                setSaved(false);
                              }
                            };
                            reader.readAsDataURL(e.target.files[0]);
                          }
                          e.target.value = '';
                        }}
                      />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <input 
                        type="text"
                        name="heroOverlayImageUrl"
                        value={formData.heroOverlayImageUrl || ''}
                        onChange={handleChange}
                        placeholder="Or paste image URL here..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                 </div>
               </div>
               
               {/* Prospectus & Promo Videos */}
               <div className="pt-4 mt-6 border-t border-slate-100">
                 <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Action Buttons</h3>
                 <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Prospectus Link (PDF URL)</label>
                    <input 
                      type="url" 
                      name="prospectusUrl"
                      value={formData.prospectusUrl || ""}
                      onChange={handleChange}
                      placeholder="https://example.com/prospectus.pdf"
                      className="w-full max-w-xl bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                 </div>
                 
                 <div className="flex items-center justify-between mb-4">
                   <h4 className="text-sm font-bold text-slate-800">Promo Videos</h4>
                   <button 
                     onClick={() => {
                        const newVideo = { id: `v-${Date.now()}`, title: 'New Video', description: 'Video description', embedUrl: '' };
                        setFormData(prev => ({ ...prev, promoVideos: [...(prev.promoVideos || []), newVideo] }));
                        setSaved(false);
                     }}
                     className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold transition-colors"
                   >
                     + Add Video
                   </button>
                 </div>
                 
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formData.promoVideos?.map((video, idx) => (
                      <div key={video.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative">
                        <button 
                          onClick={() => {
                            setFormData(prev => ({ ...prev, promoVideos: prev.promoVideos.filter(v => v.id !== video.id) }));
                            setSaved(false);
                          }}
                          className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md z-10"
                        >
                          ×
                        </button>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                            <input 
                              type="text" 
                              value={video.title}
                              onChange={(e) => {
                                const newVideos = [...(formData.promoVideos || [])];
                                newVideos[idx] = { ...video, title: e.target.value };
                                setFormData(prev => ({ ...prev, promoVideos: newVideos }));
                                setSaved(false);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                            <input 
                              type="text" 
                              value={video.description}
                              onChange={(e) => {
                                const newVideos = [...(formData.promoVideos || [])];
                                newVideos[idx] = { ...video, description: e.target.value };
                                setFormData(prev => ({ ...prev, promoVideos: newVideos }));
                                setSaved(false);
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">YouTube Embed URL</label>
                            <input 
                              type="url" 
                              value={video.embedUrl}
                              onChange={(e) => {
                                const newVideos = [...(formData.promoVideos || [])];
                                newVideos[idx] = { ...video, embedUrl: e.target.value };
                                setFormData(prev => ({ ...prev, promoVideos: newVideos }));
                                setSaved(false);
                              }}
                              placeholder="https://www.youtube.com/embed/..."
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!formData.promoVideos || formData.promoVideos.length === 0) && (
                      <div className="col-span-full py-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        No videos added yet. Add a video to show on the Watch Tour page.
                      </div>
                    )}
                 </div>
               </div>
             </div>

             {/* Hero Action Card Profiles (Principal & Vice Principal) */}
                <div className="pt-6 mt-6 border-t border-slate-100">
                  <h3 className="text-md font-bold text-slate-800 mb-2 flex items-center gap-2 font-sans">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div> 
                    Hero Action Card Profiles
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 font-medium font-sans">
                    Customize the photographs and names of the Principal and Vice Principal shown inside the "Get Prospectus" and "Watch Tour" cards on the Hero Section.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Principal Hero Info */}
                    <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-100 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-amber-100 font-sans">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wider">Principal Card (Left)</h4>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 font-sans">Principal Display Name</label>
                          <input 
                            type="text" 
                            name="principalHeroName"
                            value={formData.principalHeroName || ''}
                            onChange={handleChange}
                            placeholder="e.g. Dr. S. K. Sharma"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 font-sans">Principal Portrait Photo URL</label>
                          <input 
                            type="text" 
                            name="principalHeroImage"
                            value={formData.principalHeroImage || ''}
                            onChange={handleChange}
                            placeholder="Paste portrait image URL here..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vice Principal Hero Info */}
                    <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-blue-100 font-sans">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <h4 className="text-sm font-bold text-blue-900 uppercase tracking-wider">Vice Principal Card (Right)</h4>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 font-sans">Vice Principal Display Name</label>
                          <input 
                            type="text" 
                            name="vicePrincipalHeroName"
                            value={formData.vicePrincipalHeroName || ''}
                            onChange={handleChange}
                            placeholder="e.g. Mr. Pranjal Dutta"
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 font-sans">Vice Principal Portrait Photo URL</label>
                          <input 
                            type="text" 
                            name="vicePrincipalHeroImage"
                            value={formData.vicePrincipalHeroImage || ''}
                            onChange={handleChange}
                            placeholder="Paste portrait image URL here..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Updates & Notifications Section */}
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Updates & Notifications Section</h3>
               <div className="grid gap-6">
                 <div className="grid md:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Supra Title</label>
                      <input 
                        type="text" 
                        name="updatesTitle"
                        value={formData.updatesTitle}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Main Heading</label>
                      <input 
                        type="text" 
                        name="updatesSubtitle"
                        value={formData.updatesSubtitle}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                   </div>
                 </div>
                 
                 <div className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-800">Updates/Notifications List</h4>
                      <button 
                        onClick={() => {
                           const newUpdate = { id: `u-${Date.now()}`, title: 'New Update', date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), description: 'Details about the update', isImportant: false };
                           setFormData(prev => ({ ...prev, updatesList: [...(prev.updatesList || []), newUpdate] }));
                           setSaved(false);
                        }}
                        className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold transition-colors"
                      >
                        + Add Update
                      </button>
                    </div>
                    
                    <div className="grid lg:grid-cols-2 gap-4">
                      {formData.updatesList?.map((update, idx) => (
                         <div key={update.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative space-y-3">
                           <button 
                              onClick={() => {
                                setFormData(prev => ({ ...prev, updatesList: prev.updatesList.filter(u => u.id !== update.id) }));
                                setSaved(false);
                              }}
                              className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md z-10"
                            >
                              ×
                            </button>
                            <div>
                               <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                               <input 
                                 type="text" 
                                 value={update.title}
                                 onChange={(e) => {
                                   const newList = [...(formData.updatesList || [])];
                                   newList[idx] = { ...update, title: e.target.value };
                                   setFormData(prev => ({ ...prev, updatesList: newList }));
                                   setSaved(false);
                                 }}
                                 className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                               />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                                 <input 
                                   type="text" 
                                   value={update.date}
                                   onChange={(e) => {
                                     const newList = [...(formData.updatesList || [])];
                                     newList[idx] = { ...update, date: e.target.value };
                                     setFormData(prev => ({ ...prev, updatesList: newList }));
                                     setSaved(false);
                                   }}
                                   className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                 />
                              </div>
                              <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={update.isImportant || false}
                                    onChange={(e) => {
                                       const newList = [...(formData.updatesList || [])];
                                       newList[idx] = { ...update, isImportant: e.target.checked };
                                       setFormData(prev => ({ ...prev, updatesList: newList }));
                                       setSaved(false);
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                  />
                                  <span className="text-xs font-bold text-rose-600">Mark as Important</span>
                                </label>
                              </div>
                            </div>
                            <div>
                               <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                               <textarea 
                                 value={update.description}
                                 onChange={(e) => {
                                   const newList = [...(formData.updatesList || [])];
                                   newList[idx] = { ...update, description: e.target.value };
                                   setFormData(prev => ({ ...prev, updatesList: newList }));
                                   setSaved(false);
                                 }}
                                 rows={2}
                                 className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                               ></textarea>
                            </div>
                            <div>
                               <label className="block text-xs font-semibold text-slate-600 mb-1">Image URL (Optional)</label>
                               <input 
                                 type="url" 
                                 value={update.imageUrl || ""}
                                 onChange={(e) => {
                                   const newList = [...(formData.updatesList || [])];
                                   newList[idx] = { ...update, imageUrl: e.target.value };
                                   setFormData(prev => ({ ...prev, updatesList: newList }));
                                   setSaved(false);
                                 }}
                                 placeholder="https://"
                                 className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                               />
                            </div>
                         </div>
                      ))}
                      {(!formData.updatesList || formData.updatesList.length === 0) && (
                         <div className="col-span-full py-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                           No updates added yet. Add an update to display on the landing page.
                         </div>
                      )}
                    </div>
                 </div>
               </div>
             </div>

             {/* Toppers Section */}
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> HSLC & HS Toppers Section</h3>
               <div className="grid gap-6">
                 <div className="grid md:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Supra Title</label>
                      <input 
                        type="text" 
                        name="toppersTitle"
                        value={formData.toppersTitle || 'Excellence'}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Main Heading</label>
                      <input 
                        type="text" 
                        name="toppersSubtitle"
                        value={formData.toppersSubtitle || 'HSLC & HS Toppers'}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                   </div>
                 </div>
                 
                 <div className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-slate-800">Toppers List</h4>
                      <button 
                        onClick={() => {
                           const newTopper = { id: `t-${Date.now()}`, name: 'New Student', rank: 'State Rank 1', percentage: '99%', stream: 'Science', year: new Date().getFullYear().toString(), imageUrl: '' };
                           setFormData(prev => ({ ...prev, toppersList: [...(prev.toppersList || []), newTopper] }));
                           setSaved(false);
                        }}
                        className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold transition-colors"
                      >
                        + Add Topper
                      </button>
                    </div>
                    
                    <div className="grid lg:grid-cols-2 gap-4">
                      {formData.toppersList?.map((topper, idx) => (
                         <div key={topper.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative space-y-3">
                           <button 
                              onClick={() => {
                                setFormData(prev => ({ ...prev, toppersList: prev.toppersList.filter(t => t.id !== topper.id) }));
                                setSaved(false);
                              }}
                              className="absolute top-2 right-2 bg-rose-500 hover:bg-rose-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md z-10"
                            >
                              ×
                            </button>
                            <div>
                               <label className="block text-xs font-semibold text-slate-600 mb-1">Student Name</label>
                               <input 
                                 type="text" 
                                 value={topper.name}
                                 onChange={(e) => {
                                   const newList = [...(formData.toppersList || [])];
                                   newList[idx] = { ...topper, name: e.target.value };
                                   setFormData(prev => ({ ...prev, toppersList: newList }));
                                   setSaved(false);
                                 }}
                                 className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                               />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className="block text-xs font-semibold text-slate-600 mb-1">Rank</label>
                                 <input 
                                   type="text" 
                                   value={topper.rank}
                                   onChange={(e) => {
                                     const newList = [...(formData.toppersList || [])];
                                     newList[idx] = { ...topper, rank: e.target.value };
                                     setFormData(prev => ({ ...prev, toppersList: newList }));
                                     setSaved(false);
                                   }}
                                   className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                 />
                              </div>
                              <div>
                                 <label className="block text-xs font-semibold text-slate-600 mb-1">Percentage</label>
                                 <input 
                                   type="text" 
                                   value={topper.percentage}
                                   onChange={(e) => {
                                     const newList = [...(formData.toppersList || [])];
                                     newList[idx] = { ...topper, percentage: e.target.value };
                                     setFormData(prev => ({ ...prev, toppersList: newList }));
                                     setSaved(false);
                                   }}
                                   className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                 />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                 <label className="block text-xs font-semibold text-slate-600 mb-1">Stream / Class</label>
                                 <input 
                                   type="text" 
                                   value={topper.stream}
                                   onChange={(e) => {
                                     const newList = [...(formData.toppersList || [])];
                                     newList[idx] = { ...topper, stream: e.target.value };
                                     setFormData(prev => ({ ...prev, toppersList: newList }));
                                     setSaved(false);
                                   }}
                                   className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                 />
                              </div>
                              <div>
                                 <label className="block text-xs font-semibold text-slate-600 mb-1">Year</label>
                                 <input 
                                   type="text" 
                                   value={topper.year}
                                   onChange={(e) => {
                                     const newList = [...(formData.toppersList || [])];
                                     newList[idx] = { ...topper, year: e.target.value };
                                     setFormData(prev => ({ ...prev, toppersList: newList }));
                                     setSaved(false);
                                   }}
                                   className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                                 />
                              </div>
                            </div>
                            <div>
                               <label className="block text-xs font-semibold text-slate-600 mb-1">Image URL (Optional)</label>
                               <input 
                                 type="url" 
                                 value={topper.imageUrl || ""}
                                 onChange={(e) => {
                                   const newList = [...(formData.toppersList || [])];
                                   newList[idx] = { ...topper, imageUrl: e.target.value };
                                   setFormData(prev => ({ ...prev, toppersList: newList }));
                                   setSaved(false);
                                 }}
                                 placeholder="https://..."
                                 className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                               />
                            </div>
                         </div>
                      ))}
                      {(!formData.toppersList || formData.toppersList.length === 0) && (
                         <div className="col-span-full py-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                           No toppers added yet. Add a topper to display on the landing page.
                         </div>
                      )}
                    </div>
                 </div>
               </div>
             </div>

             {/* Gallery Section Texts */}
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Gallery Section</h3>
               <div className="grid gap-6">
                 <div className="grid md:grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Supra Title</label>
                      <input 
                        type="text" 
                        name="galleryTitle"
                        value={formData.galleryTitle}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Main Heading</label>
                      <input 
                        type="text" 
                        name="gallerySubtitle"
                        value={formData.gallerySubtitle}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                   </div>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                    <textarea 
                      name="galleryDescription"
                      value={formData.galleryDescription}
                      onChange={handleChange}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    ></textarea>
                 </div>
               </div>
             </div>

             {/* Footer Info */}
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Footer Snippets</h3>
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Footer About Text</label>
                  <textarea 
                    name="aboutText"
                    value={formData.aboutText}
                    onChange={handleChange}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  ></textarea>
               </div>
             </div>

          </div>
        </motion.div>
        )}

        {/* Principal Message Section */}
        {activeCategory === 'principal' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-6 lg:p-8 border border-slate-200 shadow-sm"
        >
           <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
             <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
               <Settings2 className="w-5 h-5" />
             </div>
             <h2 className="text-xl font-bold text-slate-800">Principal Message</h2>
           </div>

           <div className="space-y-8">
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Profile & Title</h3>
               <div className="grid md:grid-cols-2 gap-6">
                 <div className="md:col-span-2 grid md:grid-cols-3 gap-6 items-start bg-slate-50/55 p-5 rounded-3xl border border-slate-100 mb-2">
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Browse Photo</label>
                     <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center bg-white relative overflow-hidden group transition-colors aspect-square max-h-[140px] w-full">
                       {formData.principalImageUrl ? (
                         <div className="relative w-full h-full flex items-center justify-center">
                           <img src={formData.principalImageUrl} alt="Principal" className="w-full h-full object-contain rounded-xl p-1 bg-slate-50" />
                           <button 
                             type="button"
                             onClick={() => { setFormData(prev => ({...prev, principalImageUrl: ''})); setSaved(false); }} 
                             className="absolute top-1 right-1 bg-rose-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-md hover:bg-rose-600 transition-colors z-10"
                           >
                             ×
                           </button>
                         </div>
                       ) : (
                         <>
                           <div className="w-8 h-8 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-1 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                             <Upload className="w-4 h-4" />
                           </div>
                           <p className="text-[11px] font-bold text-slate-600 leading-tight">Drag or Click</p>
                           <p className="text-[9px] text-slate-400 mt-1">JPG, PNG up to 5MB</p>
                         </>
                       )}
                       <input 
                         type="file" 
                         onChange={(e) => {
                           if (e.target.files && e.target.files[0]) {
                             const reader = new FileReader();
                             reader.onload = async (event) => {
                               if (event.target?.result) {
                                 const compressed = await compressImage(event.target!.result as string, 500, 500, 0.75);
                                 setFormData(prev => ({ ...prev, principalImageUrl: compressed }));
                                 setSaved(false);
                               }
                             };
                             reader.readAsDataURL(e.target.files[0]);
                           }
                         }} 
                         accept="image/*" 
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                         style={{ display: formData.principalImageUrl ? 'none' : 'block' }}
                       />
                     </div>
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Or Paste Portrait Image URL</label>
                      <input 
                        type="text" 
                        name="principalImageUrl"
                        value={formData.principalImageUrl || ''}
                        onChange={handleChange}
                        placeholder="e.g. https://images.unsplash.com/..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                        You can upload a local portrait photo directly or paste an external image link. The uploaded photograph will be displayed on the public Principal Message page.
                      </p>
                   </div>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
                    <input 
                      type="text" 
                      name="principalName"
                      value={formData.principalName || ''}
                      onChange={handleChange}
                      placeholder="e.g. Dr. S. K. Sharma"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Title/Role</label>
                    <input 
                      type="text" 
                      name="principalTitle"
                      value={formData.principalTitle || ''}
                      onChange={handleChange}
                      placeholder="e.g. Principal"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Message Box Title</label>
                    <input 
                      type="text" 
                      name="principalMessageTitle"
                      value={formData.principalMessageTitle || ''}
                      onChange={handleChange}
                      placeholder="e.g. From the Principal's Desk"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Highlight Quote</label>
                    <textarea 
                      name="principalMessageQuote"
                      value={formData.principalMessageQuote || ''}
                      onChange={handleChange}
                      rows={2}
                      placeholder="e.g. Education is not just about academic excellence..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    ></textarea>
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Full Message Body</label>
                    <textarea 
                      name="principalMessageBody"
                      value={formData.principalMessageBody || ''}
                      onChange={handleChange}
                      rows={10}
                      placeholder="e.g. Dear Parents, Students, and Well-wishers..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    ></textarea>
                 </div>
               </div>
             </div>
           </div>
        </motion.div>
        )}

        {/* Login Page Sidebar Content Section */}
        {activeCategory === 'login' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-6 lg:p-8 border border-slate-200 shadow-sm"
        >
           <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
              <LogIn className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Login Page Settings</h2>
          </div>
          
          <div className="space-y-8">
             {/* Main Login Box */}
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Login Box Text</h3>
               <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Login Box Title</label>
                    <input 
                      type="text" 
                      name="loginBoxTitle"
                      value={formData.loginBoxTitle}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Login Box Subtitle</label>
                    <input 
                      type="text" 
                      name="loginBoxSubtitle"
                      value={formData.loginBoxSubtitle}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                 </div>
               </div>
             </div>

             {/* Sidebar Info */}
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Sidebar Text & Graphics</h3>
               <div className="grid md:grid-cols-2 gap-6">
                 <div className="space-y-4">
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Heading Text</label>
                     <textarea 
                       name="loginSidebarHeading"
                       value={formData.loginSidebarHeading}
                       onChange={handleChange}
                       rows={3}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                     ></textarea>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Profile Quote Author Name</label>
                     <input 
                       type="text" 
                       name="loginSidebarQuoteAuthor"
                       value={formData.loginSidebarQuoteAuthor}
                       onChange={handleChange}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Profile Quote Role</label>
                     <input 
                       type="text" 
                       name="loginSidebarQuoteRole"
                       value={formData.loginSidebarQuoteRole}
                       onChange={handleChange}
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                     />
                   </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Full Size Background Logo</label>
                      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 relative overflow-hidden group hover:border-purple-400 transition-colors h-[120px]">
                        {formData.loginSidebarLogoUrl ? (
                          <div className="relative">
                            <img src={formData.loginSidebarLogoUrl} alt="Login Logo" className="h-[72px] object-contain" />
                            <button onClick={() => { setFormData(prev => ({...prev, loginSidebarLogoUrl: undefined})); setSaved(false); }} className="absolute -top-3 -right-3 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                              ×
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-2 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                            <p className="text-xs text-slate-500 font-medium cursor-pointer relative z-10">Select full size logo</p>
                          </>
                        )}
                        <input 
                          type="file" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const reader = new FileReader();
                              reader.onload = async (event) => {
                                if (event.target?.result) {
                                  const compressed = await compressImage(event.target!.result as string, 400, 400, 0.8);
                                  setFormData(prev => ({ ...prev, loginSidebarLogoUrl: compressed }));
                                  setSaved(false);
                                }
                              };
                              reader.readAsDataURL(e.target.files[0]);
                            }
                          }} 
                          accept="image/*" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          style={{ display: formData.loginSidebarLogoUrl ? 'none' : 'block' }}
                        />
                      </div>
                      <div className="mt-3">
                        <input
                          type="text"
                          name="loginSidebarLogoUrl"
                          value={formData.loginSidebarLogoUrl || ''}
                          onChange={handleChange}
                          placeholder="Or paste image URL here"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Profile Avatar</label>
                      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 relative overflow-hidden group hover:border-purple-400 transition-colors h-[120px]">
                        {formData.loginSidebarQuoteAvatarUrl ? (
                          <div className="relative">
                            <img src={formData.loginSidebarQuoteAvatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover shadow-sm bg-slate-800" />
                            <button onClick={() => { setFormData(prev => ({...prev, loginSidebarQuoteAvatarUrl: undefined})); setSaved(false); }} className="absolute -top-2 -right-2 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md">
                              ×
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-2 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                              <Upload className="w-5 h-5" />
                            </div>
                            <p className="text-xs text-slate-500 font-medium relative z-10 cursor-pointer">Select author avatar</p>
                          </>
                        )}
                        <input 
                          type="file" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const reader = new FileReader();
                              reader.onload = async (event) => {
                                if (event.target?.result) {
                                  const compressed = await compressImage(event.target!.result as string, 200, 200, 0.75);
                                  setFormData(prev => ({ ...prev, loginSidebarQuoteAvatarUrl: compressed }));
                                  setSaved(false);
                                }
                              };
                              reader.readAsDataURL(e.target.files[0]);
                            }
                          }} 
                          accept="image/*" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          style={{ display: formData.loginSidebarQuoteAvatarUrl ? 'none' : 'block' }}
                        />
                      </div>
                      <div className="mt-3">
                        <input
                          type="text"
                          name="loginSidebarQuoteAvatarUrl"
                          value={formData.loginSidebarQuoteAvatarUrl || ''}
                          onChange={handleChange}
                          placeholder="Or paste image URL here"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                        />
                      </div>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        </motion.div>
        )}

        {/* Contact Info */}
        {activeCategory === 'contact' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-6 lg:p-8 border border-slate-200 shadow-sm"
        >
           <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Contact Information</h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Details</h3>
              <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                    <input 
                      type="text" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Full Address</label>
                    <input 
                      type="text" 
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                 </div>
              </div>
            </div>

            <div>
              <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Contact Page Texts</h3>
              <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Headline Left Part</label>
                    <input 
                      type="text" 
                      name="contactPageHeadlineLeft"
                      value={formData.contactPageHeadlineLeft}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Headline Right Part</label>
                    <input 
                      type="text" 
                      name="contactPageHeadlineRight"
                      value={formData.contactPageHeadlineRight}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Subtitle</label>
                    <textarea 
                      name="contactPageSubtitle"
                      value={formData.contactPageSubtitle}
                      onChange={handleChange}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    ></textarea>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
        )}

        {/* Gallery Info */}
        {activeCategory === 'gallery' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-6 lg:p-8 border border-slate-200 shadow-sm"
        >
           <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Gallery Images</h2>
          </div>
          
          <div className="space-y-8">
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Page Texts</h3>
               <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Gallery Page Title</label>
                    <input 
                      type="text" 
                      name="galleryPageTitle"
                      value={formData.galleryPageTitle}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Gallery Page Subtitle</label>
                    <textarea 
                      name="galleryPageSubtitle"
                      value={formData.galleryPageSubtitle}
                      onChange={handleChange}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    ></textarea>
                 </div>
               </div>
             </div>

             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Full Gallery Items (with Categories)</h3>
               <div className="flex justify-end mb-4">
                 <button 
                   onClick={() => {
                      const newItem = { id: `g-${Date.now()}`, title: 'New Image', category: 'Campus', src: '' };
                      setFormData(prev => ({ ...prev, galleryPageItems: [...(prev.galleryPageItems || []), newItem] }));
                      setSaved(false);
                   }}
                   className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition-colors"
                 >
                   + Add Item
                 </button>
               </div>
               
               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.galleryPageItems?.map((item, idx) => (
                    <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative flex flex-col gap-3">
                      <button 
                        onClick={() => {
                          setFormData(prev => ({ ...prev, galleryPageItems: prev.galleryPageItems.filter(v => v.id !== item.id) }));
                          setSaved(false);
                        }}
                        className="absolute -top-2 -right-2 bg-rose-500 hover:bg-rose-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-md z-10"
                      >
                        ×
                      </button>
                      
                      {item.src && (
                        <div className="relative">
                          <img src={item.src} className="w-full h-32 object-cover rounded-lg border border-slate-200" alt="Preview" />
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = [...(formData.galleryPageItems || [])];
                              newItems[idx] = { ...item, src: '' };
                              setFormData(prev => ({ ...prev, galleryPageItems: newItems }));
                              setSaved(false);
                            }}
                            className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded transition"
                          >
                            Clear Link
                          </button>
                        </div>
                      )}
                      
                      <div>
                         <label className="block text-xs font-semibold text-slate-600 mb-1">Image URL (External Link Only)</label>
                         <input 
                           type="url" 
                           required={true}
                           value={item.src}
                           placeholder="Paste public image link (Unsplash, Imgur, etc.)"
                           onChange={(e) => {
                             const newItems = [...(formData.galleryPageItems || [])];
                             newItems[idx] = { ...item, src: e.target.value };
                             setFormData(prev => ({ ...prev, galleryPageItems: newItems }));
                             setSaved(false);
                           }}
                           className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                         />
                      </div>

                      <div>
                         <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                         <input 
                           type="text" 
                           value={item.title}
                           onChange={(e) => {
                             const newItems = [...(formData.galleryPageItems || [])];
                             newItems[idx] = { ...item, title: e.target.value };
                             setFormData(prev => ({ ...prev, galleryPageItems: newItems }));
                             setSaved(false);
                           }}
                           className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                         />
                      </div>
                      <div>
                         <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                         <input 
                           type="text" 
                           value={item.category}
                           onChange={(e) => {
                             const newItems = [...(formData.galleryPageItems || [])];
                             newItems[idx] = { ...item, category: e.target.value };
                             setFormData(prev => ({ ...prev, galleryPageItems: newItems }));
                             setSaved(false);
                           }}
                           className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                         />
                      </div>
                    </div>
                  ))}
               </div>
             </div>
          </div>
        </motion.div>
        )}
        
        {/* Other Pages */}
        {activeCategory === 'other_pages' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] p-6 lg:p-8 border border-slate-200 shadow-sm"
        >
           <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Other Pages Settings</h2>
          </div>
          
          <div className="space-y-8">
             {/* Staff Page */}
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Staff Page</h3>
               <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Title Normal Part</label>
                    <input 
                      type="text" 
                      name="staffPageTitle"
                      value={formData.staffPageTitle}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Title Highlighted Part</label>
                    <input 
                      type="text" 
                      name="staffPageTitleHighlight"
                      value={formData.staffPageTitleHighlight}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Subtitle</label>
                    <textarea 
                      name="staffPageSubtitle"
                      value={formData.staffPageSubtitle}
                      onChange={handleChange}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    ></textarea>
                 </div>
               </div>
             </div>

             {/* Result Page */}
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Result Page</h3>
               <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                    <input 
                      type="text" 
                      name="resultPageTitle"
                      value={formData.resultPageTitle}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Subtitle</label>
                    <textarea 
                      name="resultPageSubtitle"
                      value={formData.resultPageSubtitle}
                      onChange={handleChange}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    ></textarea>
                 </div>
               </div>
             </div>

             {/* Admission Page */}
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Online Admission Form</h3>
               <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                    <input 
                      type="text" 
                      name="admissionPageTitle"
                      value={formData.admissionPageTitle}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Subtitle</label>
                    <textarea 
                      name="admissionPageSubtitle"
                      value={formData.admissionPageSubtitle}
                      onChange={handleChange}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    ></textarea>
                 </div>
               </div>
             </div>

             {/* Video Page */}
             <div>
               <h3 className="text-md font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Video Page</h3>
               <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                    <input 
                      type="text" 
                      name="videoPageTitle"
                      value={formData.videoPageTitle}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Subtitle</label>
                    <textarea 
                      name="videoPageSubtitle"
                      value={formData.videoPageSubtitle}
                      onChange={handleChange}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    ></textarea>
                 </div>
               </div>
             </div>

             {/* Attendance System Toggles */}
             <div className="pt-6 border-t border-slate-100">
               <h3 className="text-md font-bold text-slate-800 mb-2 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> 
                 Attendance Tracking Channels
               </h3>
               <p className="text-xs text-slate-500 mb-6 font-medium">
                 Super Admin controls to toggle attendance tracking capabilities. Disabling a channel blocks access to its scanner.
               </p>
               
               <div className="grid sm:grid-cols-2 gap-6">
                 {/* Face Recognition Attendance Toggle */}
                 <div className="flex items-center justify-between p-5 rounded-[20px] bg-slate-50 border border-slate-200 hover:border-indigo-200 transition-colors">
                   <div className="space-y-1 pr-4">
                     <p className="text-sm font-bold text-slate-800">Face Recognition Attendance</p>
                     <p className="text-xs text-slate-500">Enable camera-based biometric scanning using stored faces.</p>
                   </div>
                   <button
                     type="button"
                     onClick={() => {
                       isDirtyRef.current = true;
                       setFormData(prev => ({ 
                         ...prev, 
                         enableFaceAttendance: prev.enableFaceAttendance === undefined ? false : !prev.enableFaceAttendance 
                       }));
                       setSaved(false);
                     }}
                     className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                       formData.enableFaceAttendance !== false ? 'bg-indigo-600' : 'bg-slate-200'
                     }`}
                   >
                     <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                       formData.enableFaceAttendance !== false ? 'translate-x-5' : 'translate-x-0'
                     }`} />
                   </button>
                 </div>

                 {/* QR Code Attendance Toggle */}
                 <div className="flex items-center justify-between p-5 rounded-[20px] bg-slate-50 border border-slate-200 hover:border-emerald-200 transition-colors">
                   <div className="space-y-1 pr-4">
                     <p className="text-sm font-bold text-slate-800">QR Code Attendance</p>
                     <p className="text-xs text-slate-500">Enable physical student/teacher identity card QR scanner.</p>
                   </div>
                   <button
                     type="button"
                     onClick={() => {
                       isDirtyRef.current = true;
                       setFormData(prev => ({ 
                         ...prev, 
                         enableQrAttendance: prev.enableQrAttendance === undefined ? false : !prev.enableQrAttendance 
                       }));
                       setSaved(false);
                     }}
                     className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                       formData.enableQrAttendance !== false ? 'bg-emerald-600' : 'bg-slate-200'
                     }`}
                   >
                     <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                       formData.enableQrAttendance !== false ? 'translate-x-5' : 'translate-x-0'
                     }`} />
                   </button>
                 </div>
               </div>
             </div>

          </div>
        </motion.div>
        )}
        
      </div>
    </div>
  );
}
