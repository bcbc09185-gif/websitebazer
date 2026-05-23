import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  Send, 
  X, 
  Sparkles, 
  User, 
  Bot, 
  ChevronDown, 
  ArrowRight,
  ExternalLink,
  MessageCircle,
  MapPin,
  Paperclip,
  FileText,
  FolderOpen,
  Image,
  Eye,
  Download,
  Trash2,
  CheckCircle,
  Code,
  Globe,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import LiveDemoSandbox from './LiveDemoSandbox';

interface Attachment {
  name: string;
  type: 'pdf' | 'image' | 'code' | 'folder_zip';
  size: number;
  url?: string;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  attachments?: Attachment[];
  suggestedPreset?: 'ecommerce' | 'portfolio' | 'educational' | 'corporate';
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'contact'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      text: "Hello! Welcome to Website Bazer Assistant. 😊 We are located in Kaptai, Bangladesh. You can buy premium ready-made templates here, or order a fully custom website tailored to your requirements!\n\n**✨ NEW**: You can now attach or send PDFs, design mockups/pictures, and project folders to me! I can also spin up an **Instant Live Demo Site Builder** for you on the fly. Try pressing the Live Sandbox Demo Site tab or ask me to build a site!",
      attachments: []
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Staged files waiting to be sent
  const [stagedAttachments, setStagedAttachments] = useState<(Attachment & { fakeProgress: number })[]>([]);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  
  // Modals / Overlays States
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxPreset, setSandboxPreset] = useState<'ecommerce' | 'portfolio' | 'educational' | 'corporate'>('ecommerce');
  const [sandboxTitle, setSandboxTitle] = useState('My Store Design');
  
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<Attachment | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [viewingFolder, setViewingFolder] = useState<Attachment | null>(null);
  const [activeFolderTab, setActiveFolderTab] = useState('index.html');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, stagedAttachments]);

  const handleSendMessage = async (textToSend?: string, customAttachments?: Attachment[]) => {
    const text = textToSend || inputValue.trim();
    // Allow sending just files/attachments even with empty input
    const attachmentsToSend = customAttachments || stagedAttachments.filter(f => f.fakeProgress === 100).map(f => ({
      name: f.name,
      type: f.type,
      size: f.size,
      url: f.url
    }));

    if (!text && attachmentsToSend.length === 0) return;

    if (!textToSend) {
      setInputValue('');
    }
    setStagedAttachments([]);

    // Format rich text explanation to append to AI instructions behind-the-scenes if documents are attached
    let enrichedText = text;
    if (attachmentsToSend.length > 0) {
      const fileNames = attachmentsToSend.map(f => `"${f.name}" (${f.type.toUpperCase()}, ${f.size} KB)`).join(', ');
      enrichedText += `\n\n[User uploaded following document context: ${fileNames}. Please review client requirements specification and suggest custom demo layout parameters!]`;
    }

    const newMessages: Message[] = [...messages, { 
      role: 'user', 
      text: text || `[Sent ${attachmentsToSend.length} document attachments]`,
      attachments: attachmentsToSend
    }];
    
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || '') + '/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: enrichedText,
          history: messages.slice(-10).map(m => ({ role: m.role, text: m.text })) // Send last 10 messages for context
        })
      });

      const data = await response.json();
      if (response.ok && data.reply) {
        // Dynamically detect matching setup presets in bot reply to offer "Create Live Demo" directly
        const loweredReply = data.reply.toLowerCase();
        let preset: 'ecommerce' | 'portfolio' | 'educational' | 'corporate' | undefined;
        
        if (loweredReply.includes('ecommerce') || loweredReply.includes('shop') || loweredReply.includes('store') || loweredReply.includes('বাজার') || loweredReply.includes('বেচাকেনা')) {
          preset = 'ecommerce';
        } else if (loweredReply.includes('portfolio') || loweredReply.includes('resume') || loweredReply.includes('বায়োডাটা') || loweredReply.includes('পোর্টফোলিও')) {
          preset = 'portfolio';
        } else if (loweredReply.includes('school') || loweredReply.includes('college') || loweredReply.includes('শিক্ষা') || loweredReply.includes('মাদ্রাসা')) {
          preset = 'educational';
        } else if (loweredReply.includes('agency') || loweredReply.includes('corporate') || loweredReply.includes('business') || loweredReply.includes('লজিস্টিকস')) {
          preset = 'corporate';
        }

        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: data.reply,
          suggestedPreset: preset
        }]);
      } else {
        throw new Error(data.error || 'Something went wrong');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('AI Assistant holds temporary network failure. Please retry.');
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: "Sorry, we are currently facing some database/server connection issues. However, you can directly reach us on WhatsApp or call us at 01329885689 for support!" 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsAttachmentMenuOpen(false);

    const fileList: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (file) {
        fileList.push(file);
      }
    }
    
    fileList.forEach(file => {
      let detectedType: 'pdf' | 'image' | 'code' | 'folder_zip' = 'code';
      let mockUrl = '';

      if (file.name.endsWith('.pdf')) {
        detectedType = 'pdf';
      } else if (file.type.startsWith('image/')) {
        detectedType = 'image';
        mockUrl = URL.createObjectURL(file);
      } else if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
        detectedType = 'folder_zip';
      }

      const sizeKb = Math.round(file.size / 1024);
      
      const newAttachment: Attachment & { fakeProgress: number } = {
        name: file.name,
        type: detectedType,
        size: sizeKb,
        url: mockUrl || `/simulated-storage/${file.name}`,
        fakeProgress: 0
      };

      setStagedAttachments(prev => [...prev, newAttachment]);

      // Progress bar simulation
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.round(Math.random() * 25) + 15;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          toast.success(`"${file.name}" uploaded successfully!`);
        }
        setStagedAttachments(prev => prev.map(item => 
          item.name === file.name ? { ...item, fakeProgress: currentProgress } : item
        ));
      }, 150);
    });
  };

  // Helper Auto presets choices to showcase uploading documents without requiring actual file system exploration
  const triggerAutoMockAttach = (fileName: string, type: 'pdf' | 'image' | 'code' | 'folder_zip', desc: string) => {
    setIsAttachmentMenuOpen(false);
    const existing = stagedAttachments.find(f => f.name === fileName);
    if (existing) {
      toast.error("Requirements package already attached!");
      return;
    }

    const mockItem: Attachment & { fakeProgress: number } = {
      name: fileName,
      type: type,
      size: type === 'pdf' ? 245 : type === 'folder_zip' ? 840 : 150,
      url: type === 'image' ? 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500' : `/simulated-storage/${fileName}`,
      fakeProgress: 0
    };

    setStagedAttachments(prev => [...prev, mockItem]);

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        toast.success(`Attached specification document: "${fileName}"!`);
      }
      setStagedAttachments(prev => prev.map(item => 
        item.name === fileName ? { ...item, fakeProgress: currentProgress } : item
      ));
    }, 100);
  };

  const handleOpenSandbox = (preset: 'ecommerce' | 'portfolio' | 'educational' | 'corporate', title: string) => {
    setSandboxPreset(preset);
    setSandboxTitle(title);
    setSandboxOpen(true);
    toast.success(`Loaded "${title}" mockup configuration in Sandbox Builder!`);
  };

  const quickQuestions = [
    { label: 'Build Custom Website 🛠️', q: 'I want to build a fully custom website tailored to my requirements. How can I hire you?' },
    { label: 'How to Buy Templates? 🛒', q: 'How do I buy these ready-made templates and make payments on this site?' },
    { label: 'Contact & Location 📞', q: 'What is your contact phone number, address, and email?' },
  ];

  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      let content = isListItem ? line.trim().substring(2) : line;

      const parts = content.split(/(\*\*.*?\*\*)/g);
      const elements = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={partIdx} className="font-extrabold text-blue-900">{part.slice(2, -2)}</strong>;
        }
        
        const linkRegex = /\[(.*?)\]\((.*?)\)/g;
        const linkMatch = [...part.matchAll(linkRegex)];
        if (linkMatch.length > 0) {
          const splitParts = part.split(/\[.*?\]\(.*?\)/g);
          const reconstituted: React.ReactNode[] = [];
          splitParts.forEach((sp, idx) => {
            reconstituted.push(sp);
            if (linkMatch[idx]) {
              reconstituted.push(
                <a 
                  key={idx} 
                  href={linkMatch[idx][2]} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 underline font-bold hover:text-blue-800"
                >
                  {linkMatch[idx][1]} <ExternalLink size={10} className="inline ml-0.5" />
                </a>
              );
            }
          });
          return <span key={partIdx}>{reconstituted}</span>;
        }

        return part;
      });

      if (isListItem) {
        return (
          <li key={i} className="ml-4 list-disc text-xs text-gray-700 leading-relaxed mb-1">
            {elements}
          </li>
        );
      }
      return (
        <p key={i} className="text-xs text-gray-700 leading-relaxed mb-2 min-h-[0.75rem]">
          {elements}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Side Sandbox Frame (Desktop Mode side-by-side) */}
      <LiveDemoSandbox
        isOpen={sandboxOpen}
        onClose={() => setSandboxOpen(false)}
        presetType={sandboxPreset}
        presetTitle={sandboxTitle}
      />

      {/* Closed Widget Bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            id="ai-assistant-widget-fab"
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border border-white"></span>
            </span>
            <div className="flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-pulse group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <span className="absolute right-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-300 whitespace-nowrap shadow-xl border border-gray-750">
              💬 AI Sandbox & File Support Active
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-assistant-widget-panel"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-[90vw] sm:w-[410px] h-[580px] bg-white border border-gray-150 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden mb-2 relative"
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md relative border border-white/20">
                  <Sparkles className="w-5 h-5 text-yellow-300 animate-spin-slow" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-indigo-600"></span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight font-display">Website Bazer Assistant</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-100 mt-0.5">
                    <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    <span>50,000+ Multilingual Desk</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors font-bold text-white cursor-pointer"
                title="Scribble Down Assistance"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Location info banner */}
            <div className="flex items-center justify-between bg-blue-50/70 border-b border-gray-100 px-4 py-1.5 text-xs text-gray-650">
              <div className="flex items-center gap-1">
                <MapPin size={11} className="text-blue-600" />
                <span className="font-medium text-gray-600">Hub: <strong>Kaptai, Rangamati, BD</strong></span>
              </div>
              <button 
                onClick={() => setSandboxOpen(true)}
                className="flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-wide cursor-pointer shadow-xs uppercase"
              >
                <Globe size={10} /> Live Sandbox Builder
              </button>
            </div>

            {/* Tab Navigation buttons */}
            <div className="flex border-b border-gray-100 bg-gray-50/40">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 border-b-2 ${
                  activeTab === 'chat' 
                    ? 'border-blue-600 text-blue-600 bg-white font-black' 
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <MessageSquare size={13} /> AI Chat Desk
              </button>
              <button
                onClick={() => setActiveTab('contact')}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 border-b-2 ${
                  activeTab === 'contact' 
                    ? 'border-blue-600 text-blue-600 bg-white font-black' 
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Phone size={13} /> Direct Contact
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-150/20">
              {activeTab === 'chat' ? (
                /* CHAT ENGINE */
                <div className="space-y-4">
                  {messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center text-xs self-start shrink-0">
                          <Bot size={14} />
                        </div>
                      )}
                      
                      <div className="max-w-[80%] flex flex-col gap-1">
                        <div className={`rounded-2xl px-3.5 py-2.5 shadow-sm border ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white border-blue-500 rounded-br-none'
                            : 'bg-white text-gray-800 border-gray-150 rounded-bl-none'
                        }`}>
                          {msg.role === 'user' ? (
                            <p className="leading-relaxed text-xs">{msg.text}</p>
                          ) : (
                            renderMessageContent(msg.text)
                          )}
                        </div>

                        {/* Rendering attachments inside the bubble */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={`flex flex-col gap-1.5 mt-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {msg.attachments.map((file, fIdx) => (
                              <div 
                                key={fIdx} 
                                className="max-w-full bg-white border border-gray-200 rounded-xl p-2 flex items-center gap-2.5 shadow-xs"
                              >
                                {file.type === 'image' ? (
                                  <>
                                    <img 
                                      src={file.url} 
                                      alt="Screenshot" 
                                      className="w-10 h-10 object-cover rounded shadow-inner"
                                    />
                                    <div className="flex-1 min-w-0 pr-1">
                                      <p className="text-[10px] text-gray-800 font-bold truncate">{file.name}</p>
                                      <p className="text-[9px] text-gray-400">{file.size} KB Layout</p>
                                    </div>
                                    <button 
                                      onClick={() => setActiveLightboxImage(file.url || null)}
                                      className="p-1.5 bg-gray-550 bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded text-[9px] font-bold"
                                    >
                                      View 🖼️
                                    </button>
                                  </>
                                ) : file.type === 'pdf' ? (
                                  <>
                                    <div className="w-9 h-9 bg-red-50 text-red-650 rounded-lg flex items-center justify-center text-red-600 shadow-inner">
                                      <FileText size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] text-gray-800 font-bold truncate">{file.name}</p>
                                      <p className="text-[9px] text-gray-400">PDF Requirements • {file.size} KB</p>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setViewingPdf(file);
                                        setPdfPage(1);
                                      }}
                                      className="p-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-[9px] font-bold shrink-0"
                                    >
                                      Read 📄
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 shadow-inner">
                                      <FolderOpen size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] text-gray-800 font-bold truncate">{file.name}</p>
                                      <p className="text-[9px] text-gray-400">Folder / ZIP Archive • {file.size} KB</p>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        setViewingFolder(file);
                                        setActiveFolderTab('index.html');
                                      }}
                                      className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[9px] font-bold shrink-0"
                                    >
                                      Explore 📂
                                    </button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Suggested Live Demo sandbox builder buttons */}
                        {msg.suggestedPreset && (
                          <div className={`mt-2 flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">Assistant generated prototype:</div>
                            <button
                              onClick={() => handleOpenSandbox(msg.suggestedPreset!, "Bazer Generated Prototype")}
                              className="px-3.5 py-1.5 bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow flex items-center gap-1.5 transition-all uppercase cursor-pointer"
                            >
                              <Globe size={11} className="animate-spin-slow" /> Open Live Sandbox Custom Demo Page 🎨
                            </button>
                          </div>
                        )}
                      </div>

                      {msg.role === 'user' && (
                        <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center text-xs self-start shrink-0">
                          <User size={14} />
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-2.5 justify-start">
                      <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center text-xs self-start shrink-0">
                        <Bot size={14} />
                      </div>
                      <div className="bg-white text-gray-800 border border-gray-150 rounded-2xl rounded-bl-none px-4 py-3 text-xs shadow-sm flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>
              ) : (
                /* CONTACT DIRECT LINKS PANEL */
                <div className="space-y-4 py-2 animate-fadeIn">
                  <div className="text-center pb-2">
                    <p className="text-xs text-gray-500">We are always ready to build custom websites according to your need. Reach us directly via call or message:</p>
                  </div>

                  {/* WhatsApp Support Item */}
                  <a
                    href="https://wa.me/8801822963824?text=I%20want%2520build%20a%20website%2C%20so%20I%20want%20to%20hire%20you"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all active:scale-[0.99] group/it border-l-4 border-l-emerald-500"
                  >
                    <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner group-hover/it:bg-emerald-600 group-hover/it:text-white transition-colors">
                      <MessageCircle size={22} className="fill-current" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-xs tracking-tight">WhatsApp / Hire Us</h4>
                      <p className="text-[11px] text-gray-500">Chat directly to build custom sites</p>
                      <span className="text-xs font-mono font-bold text-emerald-600 mt-1 inline-block">01822-963824</span>
                    </div>
                    <ArrowRight size={16} className="text-gray-400 group-hover/it:translate-x-1 transition-transform" />
                  </a>

                  {/* Direct Call Item */}
                  <a
                    href="tel:01329885689"
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-sky-500 hover:shadow-md transition-all active:scale-[0.99] group/it border-l-4 border-l-sky-500"
                  >
                    <div className="w-11 h-11 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center shadow-inner group-hover/it:bg-sky-600 group-hover/it:text-white transition-colors">
                      <Phone size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-xs tracking-tight">Direct Voice Call</h4>
                      <p className="text-[11px] text-gray-500">Speak directly for instant query</p>
                      <span className="text-xs font-mono font-bold text-sky-600 mt-1 inline-block">01329-885689</span>
                    </div>
                    <ArrowRight size={16} className="text-gray-400 group-hover/it:translate-x-1 transition-transform" />
                  </a>

                  {/* Telegram Item */}
                  <a
                    href="https://t.me/+8801822963824"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all active:scale-[0.99] group/it border-l-4 border-l-blue-400"
                  >
                    <div className="w-11 h-11 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shadow-inner group-hover/it:bg-blue-500 group-hover/it:text-white transition-colors">
                      <Send size={18} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-xs tracking-tight">Telegram Support</h4>
                      <p className="text-[11px] text-gray-500">Rapid messaging and file transfer</p>
                      <span className="text-xs font-mono font-bold text-blue-500 mt-1 inline-block">01822-963824</span>
                    </div>
                    <ArrowRight size={16} className="text-gray-400 group-hover/it:translate-x-1 transition-transform" />
                  </a>

                  {/* Gmail Item */}
                  <a
                    href="mailto:orjodas@gmail.com"
                    className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl hover:border-red-500 hover:shadow-md transition-all active:scale-[0.99] group/it border-l-4 border-l-red-500"
                  >
                    <div className="w-11 h-11 bg-red-50 text-red-650 rounded-xl flex items-center justify-center shadow-inner group-hover/it:bg-red-600 group-hover/it:text-white transition-colors">
                      <Mail size={18} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-xs tracking-tight">Email Desk</h4>
                      <p className="text-[11px] text-gray-500">Send custom proposal documents</p>
                      <span className="text-xs font-mono font-bold text-red-600 mt-1 inline-block">orjodas@gmail.com</span>
                    </div>
                    <ArrowRight size={16} className="text-gray-400 group-hover/it:translate-x-1 transition-transform" />
                  </a>
                </div>
              )}
            </div>

            {/* Staged attachments preview list above text input (High end messaging look) */}
            {stagedAttachments.length > 0 && activeTab === 'chat' && (
              <div className="px-3.5 py-2 bg-slate-50 border-t border-gray-150 flex flex-wrap gap-2 max-h-[85px] overflow-y-auto">
                {stagedAttachments.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-semibold text-gray-700 relative shadow-xxs">
                    {item.type === 'pdf' ? <FileText size={11} className="text-red-500" /> : item.type === 'image' ? <Image size={11} className="text-blue-500" /> : <FolderOpen size={11} className="text-amber-500" />}
                    <span className="max-w-[120px] truncate">{item.name}</span>
                    {item.fakeProgress < 100 ? (
                      <span className="text-blue-600 italic font-medium">{item.fakeProgress}%</span>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => setStagedAttachments(prev => prev.filter(f => f.name !== item.name))}
                        className="p-0.5 hover:bg-gray-150 rounded text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Quick Suggestions (visible only inside AI Chat tab) */}
            {activeTab === 'chat' && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
                {quickQuestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(item.q)}
                    disabled={isLoading}
                    className="inline-block px-3 py-1.5 bg-white border border-gray-200 hover:border-blue-400 text-[11px] text-gray-700 font-medium rounded-full cursor-pointer transition-colors active:scale-95 whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Footer Input Bar with Attachment Menu toggles (visible only inside AI Chat tab) */}
            {activeTab === 'chat' && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 relative"
              >
                {/* Hidden File input element for real computer file uploads */}
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />

                {/* Clip Button for Attachments */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                    disabled={isLoading}
                    className="w-9 h-9 border border-gray-200 hover:border-indigo-400 text-gray-500 hover:text-indigo-600 rounded-xl flex items-center justify-center transition-all bg-gray-50/50 cursor-pointer focus:outline-none"
                    title="Send PDF, folder or picture specs"
                  >
                    <Paperclip size={14} className={isAttachmentMenuOpen ? 'rotate-45 text-indigo-600 scale-110' : ''} />
                  </button>

                  <AnimatePresence>
                    {isAttachmentMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        className="absolute bottom-11 left-0 w-[240px] bg-white border border-gray-150 rounded-2xl shadow-xl p-3 z-50 space-y-2 border-l-4 border-l-indigo-500"
                      >
                        <p className="text-[10px] font-black uppercase text-indigo-500 tracking-wider mb-2">Select Upload Mode</p>
                        
                        {/* Option 1: Explore custom specs list preset */}
                        <div className="space-y-1 bg-gray-50 p-1.5 rounded-xl border">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wide px-1">Choose Mock Presets</span>
                          <button
                            type="button"
                            onClick={() => triggerAutoMockAttach('high-school-portal-spec.pdf', 'pdf', 'Schools requirement spec')}
                            className="w-full text-left p-1.5 hover:bg-white text-[10px] font-medium text-gray-700 rounded flex items-center gap-1.5"
                          >
                            <FileText size={10} className="text-red-500" /> Auto-Attach School Specs PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerAutoMockAttach('ecommerce-bazar.zip', 'folder_zip', 'ECommerce store source file info')}
                            className="w-full text-left p-1.5 hover:bg-white text-[10px] font-medium text-gray-700 rounded flex items-center gap-1.5"
                          >
                            <FolderOpen size={10} className="text-amber-500" /> Auto-Attach E-Comm Zip Archive
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerAutoMockAttach('layout-design-mock.jpg', 'image', 'Visual Figma wireframe output')}
                            className="w-full text-left p-1.5 hover:bg-white text-[10px] font-medium text-gray-700 rounded flex items-center gap-1.5"
                          >
                            <Image size={10} className="text-blue-500" /> Auto-Attach Wireframe Photo
                          </button>
                        </div>
                        
                        <div className="w-full h-[1.5px] bg-gray-100" />
                        
                        {/* Option 2: Upload real computer document */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full text-center py-2 bg-indigo-50 hover:bg-indigo-100 font-bold rounded-lg text-indigo-700 text-[10px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          Upload Files From PC 🛠️
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isLoading}
                  placeholder="Ask Bazer Assistant or upload spec..."
                  className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-205 border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={(!inputValue.trim() && stagedAttachments.filter(f => f.fakeProgress === 100).length === 0) || isLoading}
                  className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 shrink-0 focus:outline-none"
                  title="Speak with Assistant"
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              </form>
            )}

            {/* High-Fidelity PDF Viewer Modal Frame */}
            <AnimatePresence>
              {viewingPdf && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/90 z-50 flex flex-col"
                >
                  <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-red-400">
                      <FileText size={14} />
                      <span className="font-bold tracking-tight text-[11px] truncate max-w-[200px]">{viewingPdf.name}</span>
                    </div>
                    <button onClick={() => setViewingPdf(null)} className="p-1 hover:bg-slate-800 rounded">
                      <X size={14} />
                    </button>
                  </div>
                  
                  {/* PDF Document Simulation text rendering page */}
                  <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
                    <div className="bg-white w-full max-w-[340px] aspect-[4/5] rounded-xl shadow-2xl p-6 text-gray-800 text-[10px] space-y-3 relative overflow-hidden select-text">
                      <div className="absolute top-2 right-4 text-[8px] text-gray-400">PAGE {pdfPage} OF 3</div>
                      
                      {pdfPage === 1 && (
                        <>
                          <div className="border-b pb-2 text-center text-red-600 font-bold uppercase tracking-wider text-[11px]">
                            Requirement Specification sheet
                          </div>
                          <p className="font-bold text-gray-800">1. PROJECT TITLE: Web Portal</p>
                          <p className="text-gray-500 leading-relaxed text-[9px]">
                            We aim to establish a beautiful dynamic responsive portal for Website Bazer custom delivery. Must hook up standard MongoDB Atlas database cluster for backend, featuring custom product inventory collections.
                          </p>
                          <p className="font-bold">2. CHOSEN TECHNOLOGY FRAMEWORK:</p>
                          <div className="grid grid-cols-2 gap-1.5 font-mono text-[8px] text-gray-500">
                            <span className="p-1 bg-gray-50 rounded border">React.js & Vite</span>
                            <span className="p-1 bg-gray-50 rounded border">Tailwind CSS v4</span>
                            <span className="p-1 bg-gray-50 rounded border">TypeScript Strict</span>
                            <span className="p-1 bg-gray-50 rounded border">Local Node Server</span>
                          </div>
                        </>
                      )}

                      {pdfPage === 2 && (
                        <>
                          <div className="border-b pb-1 text-center font-bold text-indigo-700">
                            SYSTEM DESIGN & LAYOUT
                          </div>
                          <p className="font-bold">3. PAGES & NAVIGATION MAPPING</p>
                          <ul className="list-disc pl-3 space-y-1 text-gray-650">
                            <li>Home Landing Page with hero visual grids</li>
                            <li>Products list with dynamic filter searches</li>
                            <li>Secure checkout handling panel with bKash API</li>
                            <li>Dynamic Interactive Customizer Sandbox Page</li>
                          </ul>
                          <p className="font-bold mt-2">4. DATABASE STRUCTURE</p>
                          <p className="text-gray-500 text-[8px] font-mono leading-tight">
                            collection: Orders<br/>
                            schemas: productId, userEmail, paymentMethod, transactionId, senderPhone
                          </p>
                        </>
                      )}

                      {pdfPage === 3 && (
                        <>
                          <div className="border-b pb-1 text-center text-emerald-600 font-bold">
                            DELIVERY TIMELINE & FEES
                          </div>
                          <p className="font-bold text-gray-700">5. MILESTONES & FEES SCHEDULE</p>
                          <table className="w-full text-left text-[8px] border-collapse">
                            <thead>
                              <tr className="border-b">
                                <th className="pb-1">Milestone</th>
                                <th className="pb-1 text-right">Fee (BDT)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y text-gray-550">
                              <tr>
                                <td className="py-1">UI Mockup Design</td>
                                <td className="py-1 text-right">৳2,000</td>
                              </tr>
                              <tr>
                                <td className="py-1">Full-stack Release</td>
                                <td className="py-1 text-right">৳8,000</td>
                              </tr>
                              <tr className="font-bold text-gray-800">
                                <td className="py-1">Grand Total</td>
                                <td className="py-1 text-right">৳10,000 BDT</td>
                              </tr>
                            </tbody>
                          </table>
                          <div className="bg-emerald-50 border border-emerald-100 p-2 rounded text-[8px] text-emerald-800 leading-normal">
                             Deployment managed fully by Website Bazer Hub at Kaptai, Rangamati, Bangladesh. Contact us to initiate setup today!
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* PDF Navigation */}
                  <div className="bg-slate-950 p-3 flex items-center justify-between shrink-0 text-white border-t border-slate-800 text-[10px]">
                    <div className="flex gap-2">
                      <button 
                        disabled={pdfPage === 1}
                        onClick={() => setPdfPage(p => p - 1)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded Disabled:opacity-50 font-bold"
                      >
                        Prev Page
                      </button>
                      <button 
                        disabled={pdfPage === 3}
                        onClick={() => setPdfPage(p => p + 1)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded Disabled:opacity-50 font-bold"
                      >
                        Next Page
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        toast.success("Document downloaded (saved to local downloads)!");
                        setViewingPdf(null);
                      }}
                      className="px-3 py-1 bg-emerald-650 hover:bg-emerald-700 bg-emerald-600 rounded flex items-center gap-1 font-black text-white"
                    >
                      <Download size={11} /> Save PDF Info
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Folder ZIP Directory Tree Explorer Dialog Modal */}
            <AnimatePresence>
              {viewingFolder && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-900/90 z-50 flex flex-col"
                >
                  <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-amber-500">
                      <FolderOpen size={14} />
                      <span className="font-bold tracking-tight text-[11px] truncate max-w-[200px]">{viewingFolder.name}</span>
                    </div>
                    <button onClick={() => setViewingFolder(null)} className="p-1 hover:bg-slate-800 rounded">
                      <X size={14} />
                    </button>
                  </div>
                  
                  {/* Navigation Tab lists (acting as files inside project archive zip folder) */}
                  <div className="flex border-b border-slate-800 bg-slate-950 px-2 text-[9px] text-gray-400 shrink-0">
                    {['index.html', 'App.tsx', 'main.css', 'package.json'].map((fName) => (
                      <button
                        key={fName}
                        onClick={() => setActiveFolderTab(fName)}
                        className={`px-3 py-2 border-b-2 hover:bg-slate-900 ${activeFolderTab === fName ? 'border-amber-500 text-white font-bold bg-slate-900' : 'border-transparent text-gray-400'}`}
                      >
                        {fName}
                      </button>
                    ))}
                  </div>

                  {/* Simulator Code Content syntax viewer */}
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-[9px] text-emerald-400 select-all bg-slate-950">
                    {activeFolderTab === 'index.html' && (
                      <pre>{`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sajib Online Store Preset</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900">
    <div id="root">Loaded Website Bazer Live template</div>
</body>
</html>`}</pre>
                    )}

                    {activeFolderTab === 'App.tsx' && (
                      <pre>{`import React, { useState } from 'react';
import { ShoppingBag } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState([]);
  return (
    <div className="p-6 text-center space-y-4">
      <h1 className="text-3xl font-extrabold text-blue-650">Bazer Custom site</h1>
      <p>Uploaded configuration active.</p>
    </div>
  );
}`}</pre>
                    )}

                    {activeFolderTab === 'main.css' && (
                      <pre>{`@import "tailwindcss";

@theme {
  --color-primary-600: #1d4ed8;
  --font-sans: "Inter", sans-serif;
}`}</pre>
                    )}

                    {activeFolderTab === 'package.json' && (
                      <pre>{`{
  "name": "bazer-instant-custom-preset",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "lucide-react": "^0.390.0"
  }
}`}</pre>
                    )}
                  </div>

                  {/* Simulated folder actions */}
                  <div className="bg-slate-950 p-3 border-t border-slate-800 text-right shrink-0">
                    <button
                      onClick={() => {
                        toast.success("Triggered project compiler! Running on port 3000 index...");
                        // Also trigger sandbox with preset automatically!
                        setViewingFolder(null);
                        handleOpenSandbox('ecommerce', 'Zip Auto Compiled Demo');
                      }}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Compile & Launch Live Sandbox 🚀
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lightbox Overlay for Image Attachments */}
            <AnimatePresence>
              {activeLightboxImage && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveLightboxImage(null)}
                  className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 cursor-pointer"
                >
                  <img 
                    src={activeLightboxImage} 
                    alt="Wireframe visual lightbox" 
                    className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl transition-transform duration-300 hover:scale-[1.03]"
                  />
                  <div className="absolute top-4 right-4 text-white hover:text-red-500 font-bold p-2 bg-slate-900 rounded-full transition-colors text-xs flex items-center gap-1">
                    Close Overlay <X size={16} />
                  </div>
                  <p className="text-xs text-gray-400 mt-4 bg-slate-950/80 px-4 py-2 rounded-full font-bold">Screenshot specification view. Click anywhere to return.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
