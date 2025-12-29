
import React, { useState } from 'react';
import { FileUp, Download, CheckCircle2, ShieldCheck, FileText, AlertTriangle } from 'lucide-react';
import { pdfToImages } from './services/pdfService';
import { processImageWithAI } from './services/geminiService';
import { exportToWord } from './services/wordExportService';
import { AppState, PageProcessResult } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isProcessing: false,
    progress: 0,
    results: [],
    fileName: null,
  });
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      setError("Vui lòng chọn tệp PDF hợp lệ.");
      return;
    }
    setError(null);
    setState(prev => ({ ...prev, isProcessing: true, progress: 0, fileName: file.name, results: [] }));
    
    try {
      const images = await pdfToImages(file, (p) => setState(prev => ({ ...prev, progress: p * 0.1 })));
      const processedResults: PageProcessResult[] = [];
      
      for (let i = 0; i < images.length; i++) {
        const ocrData = await processImageWithAI(images[i]);
        processedResults.push({ 
          pageNumber: i + 1, 
          data: ocrData, 
          imageUrl: `data:image/png;base64,${images[i]}` 
        });
        
        const currentProgress = 10 + ((i + 1) / images.length) * 90;
        setState(prev => ({ ...prev, progress: currentProgress, results: [...processedResults] }));
      }
      setState(prev => ({ ...prev, isProcessing: false }));
    } catch (err: any) {
      console.error(err);
      setError("Có lỗi trong quá trình xử lý AI. Hãy thử lại.");
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans">
      <header className="max-w-6xl mx-auto mb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold mb-4 border border-indigo-200 shadow-sm">
          <ShieldCheck size={14} /> Nghị định 30/2020/NĐ-CP (Định dạng chuẩn)
        </div>
        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">AI OCR Administrative Pro</h1>
        <p className="text-slate-500 font-medium italic">Bảo toàn 100% văn bản - Layout chuẩn hóa - Không lặp chữ</p>
      </header>

      <main className="max-w-7xl mx-auto bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden">
        {!state.isProcessing && state.results.length === 0 && (
          <div className="py-24 flex flex-col items-center">
            <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
              <FileText className="text-indigo-600" size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Chọn văn bản cần số hóa</h2>
            <p className="text-slate-400 mb-10 max-w-sm text-center">Hệ thống AI Pro sẽ đảm bảo không mất một chữ nào từ văn bản gốc của bạn.</p>
            <label className="cursor-pointer bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold shadow-xl hover:bg-black transition-all active:scale-95 flex items-center gap-2">
              <FileUp size={20} /> Tải file PDF
              <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
            </label>
            {error && <p className="mt-4 text-red-500 font-medium flex items-center gap-1"><AlertTriangle size={16} /> {error}</p>}
          </div>
        )}

        {state.isProcessing && (
          <div className="py-32 flex flex-col items-center justify-center">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center font-black text-indigo-600 text-xs">PRO</div>
            </div>
            <p className="text-xl font-bold text-slate-700 mb-4 tracking-tight">Đang quét toàn bộ văn bản (Data Integrity Check)...</p>
            <div className="w-full max-w-md bg-slate-100 h-3 rounded-full overflow-hidden mb-4 shadow-inner">
              <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${state.progress}%` }}></div>
            </div>
            <p className="text-indigo-600 font-mono font-bold text-2xl">{Math.round(state.progress)}%</p>
          </div>
        )}

        {state.results.length > 0 && !state.isProcessing && (
          <div className="flex flex-col">
            <div className="p-6 bg-white border-b flex flex-wrap justify-between items-center gap-4 sticky top-0 z-30 shadow-sm">
               <div className="flex items-center gap-3">
                 <div className="bg-green-600 p-2 rounded-lg text-white shadow-md">
                    <CheckCircle2 size={20} />
                 </div>
                 <span className="font-bold text-slate-700 truncate max-w-[200px]">{state.fileName}</span>
               </div>
               <div className="flex gap-2">
                 <button onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Đổi file</button>
                 <button 
                  onClick={() => exportToWord(state.results, state.fileName || 'document')} 
                  className="bg-indigo-600 text-white px-10 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                 >
                   <Download size={18} /> Tải file Word (.docx)
                 </button>
               </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 bg-slate-50 max-h-[75vh] overflow-y-auto">
              {state.results.map(page => (
                <div key={page.pageNumber} className="flex flex-col gap-4">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2 flex justify-between items-center">
                    <span>Trang {page.pageNumber}</span>
                    <span className="text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">XEM TRƯỚC</span>
                  </div>
                  <div className="bg-white p-12 shadow-xl border border-slate-200 rounded-[1.5rem] font-serif min-h-[800px] relative text-[13pt] leading-relaxed overflow-hidden">
                    {/* Header Preview */}
                    <div className="flex w-full mb-8 text-center uppercase">
                      <div className="w-[40%] flex flex-col gap-1 pr-2 border-r border-dashed border-slate-100">
                        {page.data.blocks.filter(b => b.role === 'agency_header').map((b, i) => <div key={i} className="font-bold text-[11pt]">{b.text}</div>)}
                        {page.data.blocks.filter(b => b.role === 'doc_type_subject' && b.text.toLowerCase().startsWith('v/v')).map((b, i) => <div key={i} className="italic text-[11pt] normal-case mt-1">{b.text}</div>)}
                      </div>
                      <div className="w-[60%] flex flex-col gap-1 pl-2">
                        <div className="font-bold text-[12pt]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                        <div className="font-bold text-[13pt] border-b border-black pb-1 inline-block mx-auto px-4">Độc lập - Tự do - Hạnh phúc</div>
                        {page.data.blocks.filter(b => b.role === 'date_place').map((b, i) => <div key={i} className="italic text-[13pt] normal-case mt-2">{b.text}</div>)}
                      </div>
                    </div>

                    {/* Content Area with Normal Spacing */}
                    <div className="flex flex-col gap-0">
                      {page.data.blocks.filter(b => !['agency_header', 'national_emblem', 'date_place'].includes(b.role) && !(b.role === 'doc_type_subject' && b.text.toLowerCase().startsWith('v/v'))).map((block, idx) => {
                        const isUncertain = (txt: string) => page.data.uncertainWords.some(uw => txt.toLowerCase().includes(uw.toLowerCase()));
                        const isBody = block.role === 'body';
                        
                        if (block.role === 'address_block' || block.text.toLowerCase().includes('kính gửi')) {
                          const cleanText = block.text.replace(/^.*?kính\s+gửi:?\s*/i, '').trim();
                          return (
                            <div key={idx} className="my-6 flex gap-4 pl-8">
                              <span className="font-bold shrink-0">Kính gửi:</span>
                              <div className="flex flex-col">{cleanText.split('\n').map((t, j) => <span key={j}>{t.trim()}</span>)}</div>
                            </div>
                          );
                        }

                        return (
                          <p key={idx} className={`text-justify ${block.isBold ? 'font-bold' : ''} ${block.role === 'doc_type_subject' ? 'text-center uppercase font-bold text-[15pt] my-6' : 'mb-3'} ${isBody ? 'indent-10' : ''}`}>
                            {block.text.split(/(\s+)/).map((word, wIdx) => (
                              <span key={wIdx} className={isUncertain(word) ? "text-red-500 font-bold underline decoration-wavy" : ""}>{word}</span>
                            ))}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
