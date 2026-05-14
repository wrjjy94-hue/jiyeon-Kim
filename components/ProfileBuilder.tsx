'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  Camera, 
  Mail, 
  Phone, 
  Plus, 
  X, 
  Briefcase, 
  Sparkles, 
  Download, 
  Save, 
  Upload, 
  Trash2,
  Calendar,
  Building,
  Cloud
} from 'lucide-react';

/* 
Supabase Table SQL Setup:

create table profiles (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  content jsonb not null
);

-- RLS (Row Level Security) - Optional but recommended
alter table profiles enable row level security;
create policy "Anyone can insert" on profiles for insert with check (true);
create policy "Anyone can select" on profiles for select using (true);
create policy "Anyone can update" on profiles for update using (true);
*/
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { INITIAL_DATA, ProfileData, ExperienceItem } from '@/lib/types';
import { compressImage } from '@/lib/image-utils';
import { refineBio } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';

export default function ProfileBuilder() {
  const [data, setData] = useState<ProfileData>(INITIAL_DATA);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState(false);
  const [sessionId] = useState(() => Math.floor(Math.random() * 8999) + 1000);
  const printRef = useRef<HTMLDivElement>(null);

  // Load from Supabase/Local Storage
  useEffect(() => {
    const init = async () => {
      const storedId = localStorage.getItem('profile-db-id');
      const savedLocal = localStorage.getItem('smart-profile-data');

      if (storedId) {
        try {
          const { data: remoteData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', storedId)
            .single();

          if (remoteData && !error) {
            setData(remoteData.content);
            setIsLoaded(true);
            return;
          }
        } catch (e) {
          console.error('Supabase fetch failed', e);
        }
      }

      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          if (parsed.name === '홍길동' || (parsed.version !== INITIAL_DATA.version)) {
            setData(INITIAL_DATA);
            localStorage.setItem('smart-profile-data', JSON.stringify(INITIAL_DATA));
          } else {
            setData(curr => ({ ...curr, ...parsed }));
          }
        } catch (e) {
          console.error('Failed to parse local storage data');
        }
      }
      setIsLoaded(true);
    };

    init();
  }, []);

  // Auto-save to local storage (Supabase save will be manual/explicit for now)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('smart-profile-data', JSON.stringify(data));
    }
  }, [data, isLoaded]);

  const saveToSupabase = async () => {
    setIsSupabaseLoading(true);
    try {
      const storedId = localStorage.getItem('profile-db-id');
      
      if (storedId) {
        const { error } = await supabase
          .from('profiles')
          .update({ content: data, updated_at: new Date().toISOString() })
          .eq('id', storedId);
        
        if (error) throw error;
        alert('Supabase에 성공적으로 저장되었습니다.');
      } else {
        const { data: inserted, error } = await supabase
          .from('profiles')
          .insert([{ content: data }])
          .select()
          .single();
        
        if (error) throw error;
        localStorage.setItem('profile-db-id', inserted.id);
        alert('Supabase에 새로운 프로필이 생성되었습니다.');
      }
    } catch (error: any) {
      console.error('Supabase Save Error:', error);
      alert('Supabase 저장 실패: ' + error.message);
    } finally {
      setIsSupabaseLoading(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isProfile = true, experienceId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      if (isProfile) {
        updateField('profileImage', compressed);
      } else if (experienceId) {
        const newExperience = data.experience.map(item => 
          item.id === experienceId ? { ...item, companyLogo: compressed } : item
        );
        updateField('experience', newExperience);
      }
    } catch (error) {
      alert('이미지 업로드에 실패했습니다.');
    }
  };

  const addKeyword = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newKeyword.trim()) {
      if (!data.keywords.includes(newKeyword.trim())) {
        updateField('keywords', [...data.keywords, newKeyword.trim()]);
      }
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    updateField('keywords', data.keywords.filter(k => k !== keyword));
  };

  const addExperience = () => {
    const newItem: ExperienceItem = {
      id: Date.now().toString(),
      companyName: '새 회사',
      role: '직책',
      period: '2024.01 ~ 현재',
      description: '- 성과를 입력하세요',
    };
    updateField('experience', [newItem, ...data.experience]);
  };

  const updateExperience = (id: string, field: keyof ExperienceItem, value: string) => {
    const newExp = data.experience.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    updateField('experience', newExp);
  };

  const removeExperience = (id: string) => {
    updateField('experience', data.experience.filter(item => item.id !== id));
  };

  const handleAiRefine = async () => {
    if (!data.bio.trim()) return;
    setIsAiLoading(true);
    try {
      const refined = await refineBio(data.bio);
      updateField('bio', refined);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!printRef.current) return;
    const element = printRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${data.name}_이력서.pdf`);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_profile_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setData(imported);
      } catch (err) {
        alert('올바른 JSON 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (confirm('모든 내용이 초기화되고 기본 데이터로 복구됩니다. 계속하시겠습니까?')) {
      setData(INITIAL_DATA);
      localStorage.removeItem('smart-profile-data');
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="h-16 px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Briefcase size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Smart Profile Maker</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3">
            <label className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer transition-colors flex items-center gap-2">
              <Upload size={14} />
              Restore JSON
              <input type="file" className="hidden" accept=".json" onChange={importJson} />
            </label>
            <button 
              onClick={saveToSupabase}
              disabled={isSupabaseLoading}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSupabaseLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Cloud size={14} /></motion.div> : <Cloud size={14} />}
              Cloud Sync
            </button>
            <button 
              onClick={exportJson}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
            >
              <Save size={14} />
              Backup JSON
            </button>
            <button 
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 border border-red-100"
            >
              <Trash2 size={14} />
              초기화
            </button>
          </div>
          <button 
            onClick={downloadPdf}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"
          >
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </header>

      {/* Main Layout - Bento Grid container */}
      <main ref={printRef} className="flex-1 flex flex-col md:flex-row p-6 gap-6 overflow-auto">
        
        {/* Left Sidebar: Profile & Keywords */}
        <section className="w-full md:w-80 flex flex-col gap-6 shrink-0">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="relative mb-6 group cursor-pointer">
              <div className="w-32 h-32 rounded-full border-4 border-indigo-50 bg-slate-100 overflow-hidden flex items-center justify-center shadow-inner">
                {data.profileImage ? (
                  <Image 
                    src={data.profileImage} 
                    alt="Profile" 
                    width={128} 
                    height={128} 
                    className="w-full h-full object-cover"
                    unoptimized
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Camera size={32} className="text-slate-300" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white border-2 border-white cursor-pointer hover:bg-indigo-700 transition-all shadow-md">
                <Plus size={14} />
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
              </label>
            </div>
            
            <div className="w-full space-y-1 mb-6">
              <input 
                type="text" 
                value={data.name} 
                onChange={(e) => updateField('name', e.target.value)}
                className="text-xl font-bold text-center w-full bg-transparent border-b border-transparent hover:border-slate-100 focus:border-indigo-500 outline-none"
                placeholder="이름"
              />
              <input 
                type="text" 
                value={data.jobTitle} 
                onChange={(e) => updateField('jobTitle', e.target.value)}
                className="text-indigo-600 font-semibold text-sm text-center w-full bg-transparent border-b border-transparent hover:border-slate-100 focus:border-indigo-500 outline-none"
                placeholder="직무 타이틀"
              />
            </div>
            
            <div className="w-full space-y-4 pt-4 border-t border-slate-100 text-left">
              <div className="flex items-center gap-3 text-slate-600 group">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-12 shrink-0">Email</span>
                <input 
                  type="email" 
                  value={data.email} 
                  onChange={(e) => updateField('email', e.target.value)}
                  className="text-sm truncate bg-transparent flex-1 border-b border-transparent hover:border-slate-100 focus:border-indigo-500 outline-none"
                  placeholder="이메일"
                />
              </div>
              <div className="flex items-center gap-3 text-slate-600 group">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-12 shrink-0">Phone</span>
                <input 
                  type="text" 
                  value={data.phone} 
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="text-sm bg-transparent flex-1 border-b border-transparent hover:border-slate-100 focus:border-indigo-500 outline-none"
                  placeholder="연락처"
                />
              </div>
              <div className="flex items-center gap-3 text-slate-600 group">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-12 shrink-0">Birth</span>
                <input 
                  type="text" 
                  value={data.birthDate || ''} 
                  onChange={(e) => updateField('birthDate', e.target.value)}
                  className="text-sm bg-transparent flex-1 border-b border-transparent hover:border-slate-100 focus:border-indigo-500 outline-none"
                  placeholder="YYYY.MM.DD"
                />
              </div>
              <div className="flex items-center gap-3 text-slate-600 group">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-12 shrink-0">Info</span>
                <input 
                  type="text" 
                  value={data.gender || ''} 
                  onChange={(e) => updateField('gender', e.target.value)}
                  className="text-sm bg-transparent flex-1 border-b border-transparent hover:border-slate-100 focus:border-indigo-500 outline-none"
                  placeholder="성별 등"
                />
              </div>
            </div>
          </div>

          {/* Keywords Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex-1 flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">핵심 키워드</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <AnimatePresence>
                {data.keywords.map(kw => (
                  <motion.span 
                    key={kw}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold flex items-center gap-1 group cursor-default"
                  >
                    #{kw}
                    <button onClick={() => removeKeyword(kw)} className="text-indigo-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100">
                      <X size={10} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
            <div className="mt-auto">
              <input 
                type="text" 
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={addKeyword}
                placeholder="+ 추가 (Enter)" 
                className="w-full bg-slate-50 border-none text-xs rounded-full px-4 py-2 focus:ring-1 focus:ring-indigo-400 outline-none" 
              />
            </div>
          </div>
        </section>

        {/* Right Main Content */}
        <section className="flex-1 flex flex-col gap-6">
          {/* AI Bio Section Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 min-h-[240px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                📌 나의 소개문 (Bio)
              </h3>
              <button 
                onClick={handleAiRefine}
                disabled={isAiLoading}
                className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 hover:opacity-90 shadow-sm transition-all disabled:opacity-50"
              >
                {isAiLoading ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Sparkles size={14} /></motion.div> : <Sparkles size={14} />}
                AI 비서에게 다듬기 요청
              </button>
            </div>
            <textarea 
              value={data.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              className="flex-1 w-full p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-100 leading-relaxed transition-all" 
              placeholder="나를 소개하는 글을 작성하세요..."
            />
          </div>

          {/* Career Timeline Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold">⏳ 커리어 타임라인</h3>
              <button 
                onClick={addExperience}
                className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                <Plus size={14} />
                경력 추가
              </button>
            </div>
            
            <div className="flex-1 space-y-8 relative">
              {/* Timeline Line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-100"></div>

              <AnimatePresence initial={false}>
                {data.experience.map((exp) => (
                  <motion.div 
                    key={exp.id} 
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -10, opacity: 0 }}
                    className="relative pl-12 group"
                  >
                    {/* Timeline Dot/Icon */}
                    <div className="absolute left-0 top-1 w-10 h-10 bg-white rounded-full border-2 border-indigo-600 flex items-center justify-center shadow-sm z-10 overflow-hidden group-hover:scale-105 transition-transform">
                      <label className="cursor-pointer w-full h-full flex items-center justify-center">
                        {exp.companyLogo ? (
                          <Image 
                            src={exp.companyLogo} 
                            alt="Logo" 
                            width={40} 
                            height={40} 
                            className="w-full h-full object-cover"
                            unoptimized
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Corp</div>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, false, exp.id)} />
                      </label>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <input 
                          value={exp.period}
                          onChange={(e) => updateExperience(exp.id, 'period', e.target.value)}
                          className="text-[10px] font-bold text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded w-fit outline-none"
                        />
                        <div className="flex items-center gap-1">
                          <input 
                            value={exp.companyName}
                            onChange={(e) => updateExperience(exp.id, 'companyName', e.target.value)}
                            className="font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-100 focus:border-indigo-400 outline-none"
                            placeholder="회사명"
                          />
                          <span className="text-slate-300 mx-1">|</span>
                          <input 
                            value={exp.role}
                            onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                            className="text-slate-500 text-sm bg-transparent border-b border-transparent hover:border-slate-100 focus:border-indigo-400 outline-none"
                            placeholder="직책"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => removeExperience(exp.id)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <textarea 
                      value={exp.description}
                      onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                      className="w-full text-sm text-slate-600 p-2 bg-transparent hover:bg-slate-50 focus:bg-white rounded-lg border border-transparent hover:border-slate-100 focus:border-indigo-100 transition-all outline-none resize-none min-h-[60px]"
                      placeholder="주요 성과를 입력하세요..."
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer Bar (Status) */}
      <footer className="h-10 px-8 bg-white border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          Last saved: {new Date().toLocaleTimeString()} (Local Storage)
        </div>
        <div className="flex gap-4">
          <span>Session ID: SMP-{sessionId}</span>
          <span className="font-medium text-slate-500">v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}

