"use client";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface ChatSession {
  id: string;
  title: string;
  messages: { role: string; content: string; image?: string; fileData?: string }[];
}

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [selectedModel, setSelectedModel] = useState("Flash-Lite");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "preview" | "search" | "students" | "images" | "videos" | "library">("chat");
  const [previewCode, setPreviewCode] = useState<string>("");
  const [feedbackState, setFeedbackState] = useState<{ [key: string]: 'like' | 'dislike' | null }>({});
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem("aura_chat_sessions", JSON.stringify(updatedSessions));
  };

  const createNewChat = (existingSessions = sessions) => {
    const cleanedSessions = existingSessions.filter(s => s.messages.length > 0);
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: []
    };
    const updated = [newSession, ...cleanedSessions];
    saveSessions(updated);
    setCurrentSessionId(newSession.id);
    setActiveTab("chat");
    setInput("");
    setSelectedImage(null);
    setSelectedFile(null);
    if (isMobile) setIsSidebarOpen(false);
  };

  useEffect(() => {
    const localSessions = localStorage.getItem("aura_chat_sessions");
    if (localSessions) {
      try {
        const parsed = JSON.parse(localSessions);
        const cleaned = parsed.filter((s: ChatSession) => s.messages.length > 0);
        // മൊബൈലിൽ ഓപ്പൺ ആകുമ്പോൾ എപ്പോഴും പുതിയ സ്ക്രീൻ വരാൻ
        createNewChat(cleaned);
      } catch (e) {
        createNewChat([]);
      }
    } else {
      createNewChat([]);
    }

    const localTheme = localStorage.getItem("aura_theme");
    if (localTheme) {
      setTheme(localTheme as "dark" | "light");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [sessions, loading, isListening, activeTab]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const messages = currentSession ? currentSession.messages : [];

  const updateCurrentMessages = (newMessages: { role: string; content: string; image?: string; fileData?: string }[]) => {
    if (!currentSessionId) return;
    const updated = sessions.map(s => {
      if (s.id === currentSessionId) {
        let title = s.title;
        if (title === "New Chat" && newMessages.length > 0 && newMessages[0] && newMessages[0].content) {
          title = newMessages[0].content.slice(0, 25) + "...";
        }
        return { ...s, title, messages: newMessages };
      }
      return s;
    });
    saveSessions(updated);
  };

  const typeMessageEffect = (fullText: string, baseMessages: any[]) => {
    let index = 0;
    const messagesWithEmptyAssistant = [...baseMessages, { role: "assistant", content: "" }];
    updateCurrentMessages(messagesWithEmptyAssistant);

    const interval = setInterval(() => {
      if (index < fullText.length) {
        const nextChars = fullText.substr(index, 3); 
        setSessions(prevSessions => {
          return prevSessions.map(s => {
            if (s.id === currentSessionId) {
              const msgs = [...s.messages];
              if (msgs.length > 0) {
                const lastMsg = { ...msgs[msgs.length - 1] };
                lastMsg.content += nextChars;
                msgs[msgs.length - 1] = lastMsg;
              }
              return { ...s, messages: msgs };
            }
            return s;
          });
        });
        index += 3;
      } else {
        clearInterval(interval);
        setLoading(false);
      }
    }, 1);
  };

  const sendMessage = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if ((!messageText.trim() && !selectedImage && !selectedFile) || loading) return;

    const currentImage = selectedImage;
    const currentFile = selectedFile;
    setInput("");
    setSelectedImage(null);
    setSelectedFile(null);
    setShowMenu(false);
    setShowModelMenu(false);

    let enhancedMessage = messageText;
    if (currentFile) {
      enhancedMessage = `[Attached Document: ${currentFile.name}]\nContent:\n${currentFile.content}\n\nUser Query: ${messageText}`;
    }

    const newMessages = [...messages, { role: "user", content: messageText, image: currentImage || undefined, fileData: currentFile?.name }];
    updateCurrentMessages(newMessages);
    setLoading(true);

    const cleanText = messageText.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
    if (!currentImage && !currentFile) {
      let instantReply = "";

      if (/^(hi|hello|hey|hai|hii|loo|looo|gm|gn|sup|wsg|wassup)(\s|$)/.test(cleanText)) {         instantReply = "Hello! I'm Aura. How can I help you today?";       } else if (/^(how are u\vert{}how are you\vert{}hru\vert{}hw r u\vert{}how r u\vert{}hows it going)(\s\vert{}$)/.test(cleanText)) {
        instantReply = "I'm doing great, thank you for asking! How are you doing today? Is there anything I can help you with?";
      }

      if (instantReply) {
        setTimeout(() => {
          typeMessageEffect(instantReply, newMessages);
        }, 50);
        return;
      }
    }

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({ 
          message: enhancedMessage, 
          image: currentImage, 
          model: selectedModel, 
          webSearch: false,
          persona: "You are Aura, an extremely fast, highly intelligent, and helpful AI assistant. You natively understand and communicate fluently in all global languages. Always respond in the same language the user communicates in. Structure your responses well with headings and paragraphs when needed." 
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTimeout(() => {
          typeMessageEffect(data.reply, newMessages);
        }, 50);
      } else {
        updateCurrentMessages([...newMessages, { role: "assistant", content: `Error: ${data.error}` }]);
        setLoading(false);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
      } else {
        console.error(error);
        updateCurrentMessages([...newMessages, { role: "assistant", content: "Network error occurred." }]);
        setLoading(false);
      }
    }
  };

  const regenerateResponse = async (index: number) => {
    if (index === 0) return;
    const previousUserMsg = messages[index - 1];
    if (!previousUserMsg || previousUserMsg.role !== "user") return;

    const trimmedMessages = messages.slice(0, index);
    updateCurrentMessages(trimmedMessages);
    setLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({ 
          message: previousUserMsg.content, 
          model: selectedModel, 
          webSearch: false,
          persona: "You are Aura, an extremely fast, highly intelligent, and helpful AI assistant. You natively understand and communicate fluently in all global languages. Always respond in the same language the user communicates in." 
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTimeout(() => {
          typeMessageEffect(data.reply, trimmedMessages);
        }, 50);
      } else {
        updateCurrentMessages([...trimmedMessages, { role: "assistant", content: `Error: ${data.error}` }]);
        setLoading(false);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
      } else {
        console.error(error);
        updateCurrentMessages([...trimmedMessages, { role: "assistant", content: "Network error occurred." }]);
        setLoading(false);
      }
    }
  };

  const stopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;

    let finalTranscript = "";

    recognition.onstart = () => {
      setIsListening(true);
      finalTranscript = "";
    };

    recognition.onresult = (event: any) => {
      finalTranscript = event.results[0][0].transcript;
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript) {
        setInput(finalTranscript);
      }
    };

    recognition.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setSelectedFile({ name: file.name, content });
        setShowMenu(false);
      };
      reader.readAsText(file);
    }
  };

  const hasCodeBlock = (content: string) => {
    return content.includes("```");
  };

  const formatTime = (timestampStr: string) => {
    const ts = parseInt(timestampStr);
    if (isNaN(ts)) return "";
    const date = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const validSearchSessions = sessions.filter(s => s.messages.length > 0);
  const filteredSessions = validSearchSessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const bgMain = theme === "dark" ? "#131314" : "#f9f9f9";
  const bgSidebar = theme === "dark" ? "#1e1f20" : "#f0f0f0";
  const borderCol = theme === "dark" ? "#28292a" : "#e0e0e0";
  const textColor = theme === "dark" ? "#e3e3e3" : "#222222";
  const inputBg = theme === "dark" ? "#1e1f20" : "#ffffff";

  const navItems = [
    { id: "search", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>, label: "Search chats" },
    { id: "students", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>, label: "Students" },
    { id: "images", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>, label: "Images" },
    { id: "videos", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>, label: "Videos" },
    { id: "library", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>, label: "Library" }
  ];

  return (
    <div style={{ display: "flex", height: "100dvh", width: "100vw", backgroundColor: bgMain, color: textColor, overflow: "hidden", position: "relative" }}>
      
      {/* Pop-up Modals */}
      {activeModal && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" }} onClick={() => setActiveModal(null)}>
          <div style={{ backgroundColor: "#1e1f20", padding: "24px", borderRadius: "16px", width: "400px", maxWidth: "90%", border: `1px solid ${borderCol}`, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", color: "#fff", fontWeight: 500 }}>
                {activeModal === 'drive' && "Connect Google Drive"}
                {activeModal === 'photos' && "Google Photos"}
                {activeModal === 'avatar' && "Select Avatar"}
                {activeModal === 'importCode' && "Import GitHub Code"}
                {activeModal === 'notebook' && "New Notebook"}
              </h3>
              <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", fontSize: "20px" }}>✕</button>
            </div>
            
            {activeModal === 'importCode' && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#aaa" }}>Paste a link to your GitHub repository to analyze the code.</p>
                <input type="text" placeholder="[https://github.com/user/repo](https://github.com/user/repo)" style={{ padding: "12px", borderRadius: "8px", border: `1px solid ${borderCol}`, backgroundColor: "#131314", color: "#fff", outline: "none" }} />
                <button onClick={() => setActiveModal(null)} style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#1a73e8", border: "none", color: "#fff", cursor: "pointer", fontWeight: 500, marginTop: "8px" }}>Import Repository</button>
              </div>
            )}

            {(activeModal === 'drive' || activeModal === 'photos') && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "14px", color: "#aaa" }}>Connect your account to seamlessly access your files.</p>
                <button onClick={() => setActiveModal(null)} style={{ padding: "10px 20px", borderRadius: "24px", backgroundColor: "#fff", border: "none", color: "#000", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Sign in with Google
                </button>
              </div>
            )}

            {activeModal === 'notebook' && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <input type="text" placeholder="Notebook Name" style={{ padding: "12px", borderRadius: "8px", border: `1px solid ${borderCol}`, backgroundColor: "#131314", color: "#fff", outline: "none" }} />
                <button onClick={() => setActiveModal(null)} style={{ padding: "10px", borderRadius: "8px", backgroundColor: "#1a73e8", border: "none", color: "#fff", cursor: "pointer", fontWeight: 500, marginTop: "8px" }}>Create Notebook</button>
              </div>
            )}

            {activeModal === 'avatar' && (
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} onClick={() => setActiveModal(null)} className="gemini-circle-hover" style={{ width: "50px", height: "50px", backgroundColor: `hsl(${i * 60}, 70%, 50%)`, cursor: "pointer" }}></div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet Menu (For Plus button) */}
      {isMobile && showMenu && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={() => setShowMenu(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1e1f20", width: "100%", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "20px", animation: "slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
            
            <div style={{ width: "36px", height: "4px", backgroundColor: "#555", borderRadius: "2px", margin: "0 auto" }}></div>
            
            <div style={{ display: "flex", gap: "20px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", minWidth: "64px" }} onClick={() => { setActiveModal('photos'); setShowMenu(false); }}>
                <div className="gemini-circle-hover" style={{ width: "64px", height: "64px", backgroundColor: "#28292a", borderRadius: "50%" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </div>
                <span style={{ fontSize: "13px", color: "#e3e3e3", fontWeight: 500 }}>Photos</span>
              </div>

              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", minWidth: "64px", cursor: "pointer" }}>
                <div className="gemini-circle-hover" style={{ width: "64px", height: "64px", backgroundColor: "#28292a", borderRadius: "50%" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                </div>
                <span style={{ fontSize: "13px", color: "#e3e3e3", fontWeight: 500 }}>Files</span>
                <input type="file" accept="image/*,.txt,.js,.ts,.html,.css,.json,.md" onChange={(e) => { handleFileUpload(e); setShowMenu(false); }} style={{ display: "none" }} />
              </label>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", minWidth: "64px" }} onClick={() => { setActiveModal('avatar'); setShowMenu(false); }}>
                <div className="gemini-circle-hover" style={{ width: "64px", height: "64px", backgroundColor: "#28292a", borderRadius: "50%" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                </div>
                <span style={{ fontSize: "13px", color: "#e3e3e3", fontWeight: 500 }}>Avatar</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", minWidth: "64px" }} onClick={() => { setActiveModal('drive'); setShowMenu(false); }}>
                <div className="gemini-circle-hover" style={{ width: "64px", height: "64px", backgroundColor: "#28292a", borderRadius: "50%" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><polygon points="12 2 2 22 22 22"></polygon></svg>
                </div>
                <span style={{ fontSize: "13px", color: "#e3e3e3", fontWeight: 500 }}>Drive</span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", minWidth: "64px" }} onClick={() => { setActiveModal('notebook'); setShowMenu(false); }}>
                <div className="gemini-circle-hover" style={{ width: "64px", height: "64px", backgroundColor: "#28292a", borderRadius: "50%" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </div>
                <span style={{ fontSize: "13px", color: "#e3e3e3", fontWeight: 500 }}>Notebooks</span>
              </div>
            </div>

            <div style={{ height: "1px", backgroundColor: borderCol, margin: "4px 0" }}></div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div onClick={() => { setActiveTab('images'); setShowMenu(false); }} className="gemini-pill-hover" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", borderRadius: "12px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "16px", color: "#e3e3e3", fontWeight: 500 }}>Images</span>
                  <span style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Create and edit</span>
                </div>
              </div>

              <div onClick={() => { setActiveTab('videos'); setShowMenu(false); }} className="gemini-pill-hover" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", borderRadius: "12px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "16px", color: "#e3e3e3", fontWeight: 500 }}>Videos</span>
                  <span style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Bring ideas to life</span>
                </div>
              </div>

              <div onClick={() => setShowMenu(false)} className="gemini-pill-hover" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", borderRadius: "12px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "16px", color: "#e3e3e3", fontWeight: 500 }}>Music</span>
                  <span style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Make audio tracks</span>
                </div>
              </div>

              <div onClick={() => setShowMenu(false)} className="gemini-pill-hover" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", borderRadius: "12px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><path d="M12 2L2 22h20L12 2z"></path></svg>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "16px", color: "#e3e3e3", fontWeight: 500 }}>Canvas</span>
                  <span style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Code, write or make slides</span>
                </div>
              </div>

              <div onClick={() => setShowMenu(false)} className="gemini-pill-hover" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", borderRadius: "12px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "16px", color: "#e3e3e3", fontWeight: 500 }}>Deep Research</span>
                  <span style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Get detailed reports</span>
                </div>
              </div>

              <div onClick={() => setShowMenu(false)} className="gemini-pill-hover" style={{ display: "flex", alignItems: "center", gap: "16px", padding: "12px", borderRadius: "12px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "16px", color: "#e3e3e3", fontWeight: 500 }}>Guided Learning</span>
                  <span style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Get step-by-step help</span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", borderRadius: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e3e3e3" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px", color: "#e3e3e3", fontWeight: 500 }}>Personal Intelligence</span>
                      <span style={{ fontSize: "10px", backgroundColor: "#333", color: "#e3e3e3", padding: "2px 6px", borderRadius: "10px" }}>Labs</span>
                    </div>
                    <span style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>Personalise chat if helpful</span>
                  </div>
                </div>
                <div style={{ width: "40px", height: "24px", backgroundColor: "#e3e3e3", borderRadius: "12px", position: "relative", cursor: "pointer" }}>
                  <div style={{ width: "20px", height: "20px", backgroundColor: "#1e1f20", borderRadius: "50%", position: "absolute", right: "2px", top: "2px" }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
        
        /* New Waving Dots Animation */
        @keyframes waveDots {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }

        @keyframes waveAnim {
          0%, 100% { height: 6px; }
          50% { height: 22px; }
        }
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes auraGlow1 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50% { transform: translate(30px, -30px) scale(1.1); opacity: 0.7; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
        }
        @keyframes auraGlow2 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50% { transform: translate(-30px, 30px) scale(1.15); opacity: 0.6; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .wave-bar {
          width: 3px;
          background-color: #4ade80;
          border-radius: 2px;
          animation: waveAnim 0.8s infinite ease-in-out;
        }
        .gemini-circle-hover {
          transition: background-color 0.2s ease;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: transparent;
        }
        .gemini-circle-hover:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
        }
        .gemini-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 18px;
          cursor: pointer;
          color: #e3e3e3;
          background-color: transparent;
          transition: background-color 0.2s ease;
        }
        .gemini-icon-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        .gemini-pill-hover {
          transition: background-color 0.2s ease;
          cursor: pointer;
        }
        .gemini-pill-hover:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        .gemini-model-hover {
          transition: background-color 0.2s ease;
          border-radius: 16px;
          padding: 6px 12px;
          color: #ffffff !important;
        }
        .gemini-model-hover:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        .gemini-submit-btn {
          transition: background-color 0.2s ease;
        }
        .gemini-submit-btn:hover {
          background-color: #1a73e8 !important;
          filter: brightness(1.15);
        }
        .gemini-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          color: #ffffff;
          background-color: transparent;
          transition: background-color 0.2s ease;
        }
        .gemini-action-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        
        /* Gemini Content Styling */
        .gemini-content {
          width: 100%;
          overflow-wrap: break-word;
        }
        .gemini-content h1, 
        .gemini-content h2, 
        .gemini-content h3 {
          color: #ffffff;
          font-weight: 600;
          margin-bottom: 8px;
          margin-top: 16px;
        }
        .gemini-content h1 { font-size: 22px; }
        .gemini-content h2 { font-size: 18px; }
        .gemini-content h3 { font-size: 16px; }
        
        .gemini-content p {
          color: #e3e3e3;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 12px;
        }
        
        .gemini-content code {
          background-color: rgba(255,255,255,0.1);
          padding: 2px 4px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
        }
        
        .gemini-content pre {
          background-color: rgba(255,255,255,0.05);
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin-bottom: 16px;
        }
        
        .gemini-content pre code {
          background-color: transparent;
          padding: 0;
          color: inherit;
        }
      `}</style>

      {/* Responsive Collapsible Sidebar */}
      <aside style={{ width: isSidebarOpen ? (isMobile ? "280px" : "260px") : (isMobile ? "0px" : "64px"), backgroundColor: isSidebarOpen ? bgSidebar : "transparent", borderRight: isSidebarOpen ? `1px solid ${borderCol}` : "none", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: isMobile && !isSidebarOpen ? "0px" : "12px 0px", transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease", overflow: "visible", flexShrink: 0, zIndex: 100, position: isMobile ? "absolute" : "relative", height: "100%", boxShadow: isMobile && isSidebarOpen ? "4px 0 24px rgba(0,0,0,0.5)" : "none" }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, whiteSpace: "nowrap", padding: isMobile && !isSidebarOpen ? "0" : "0 14px", opacity: isMobile && !isSidebarOpen ? 0 : 1, transition: "opacity 0.2s ease" }}>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: isSidebarOpen ? "space-between" : "center", height: "36px", marginBottom: "4px" }}>
            {!isSidebarOpen ? (
              <div style={{ position: "relative", display: "flex", justifyContent: "center" }}
                   onMouseEnter={() => { setIsLogoHovered(true); setHoveredTooltip("open-sidebar"); }}
                   onMouseLeave={() => { setIsLogoHovered(false); setHoveredTooltip(null); }}>
                <div onClick={() => setIsSidebarOpen(true)} className="gemini-circle-hover" style={{ cursor: "pointer", color: "#e3e3e3", width: "36px", height: "36px" }}>
                  {isLogoHovered ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                      <polyline points="11 10 14 13 11 16"></polyline>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)">
                      <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#a_grad_logo)"/>
                      <defs>
                        <linearGradient id="a_grad_logo" x1="2" y1="2" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#3B82F6"/>
                          <stop offset="1" stopColor="#A855F7"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  )}
                </div>
                {hoveredTooltip === "open-sidebar" && (
                  <div style={{ position: "absolute", top: "50%", left: "48px", transform: "translateY(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                    Open sidebar
                  </div>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)">
                    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#a_grad_side)"/>
                    <defs>
                      <linearGradient id="a_grad_side" x1="2" y1="2" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3B82F6"/>
                        <stop offset="1" stopColor="#A855F7"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  <span style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff" }}>Aura</span>
                </div>

                <div style={{ position: "relative" }}
                     onMouseEnter={() => setHoveredTooltip("close-sidebar")}
                     onMouseLeave={() => setHoveredTooltip(null)}>
                  <div onClick={() => setIsSidebarOpen(false)} className="gemini-circle-hover" style={{ cursor: "pointer", color: "#e3e3e3", width: "36px", height: "36px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                      <polyline points="15 10 12 13 15 16"></polyline>
                    </svg>
                  </div>
                  {hoveredTooltip === "close-sidebar" && (
                    <div style={{ position: "absolute", top: "50%", right: "44px", transform: "translateY(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                      Close sidebar
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: isSidebarOpen ? "flex-start" : "center", width: "100%" }}>
            {isSidebarOpen ? (
              <div onClick={() => createNewChat()} className="gemini-pill-hover" style={{ color: "#e3e3e3", padding: "10px 12px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", fontWeight: 500, width: "100%", marginBottom: "4px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span style={{ overflow: "hidden" }}>New chat</span>
              </div>
            ) : (
              <div style={{ position: "relative", display: "flex", justifyContent: "center" }}
                   onMouseEnter={() => setHoveredTooltip("new-chat")}
                   onMouseLeave={() => setHoveredTooltip(null)}>
                <div onClick={() => createNewChat()} className="gemini-icon-btn" style={{ marginBottom: "4px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                {hoveredTooltip === "new-chat" && (
                  <div style={{ position: "absolute", top: "50%", left: "48px", transform: "translateY(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                    New chat
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%", alignItems: isSidebarOpen ? "stretch" : "center" }}>
            {navItems.map((item) => (
              isSidebarOpen ? (
                <div key={item.id} onClick={() => { setActiveTab(item.id as any); if(isMobile) setIsSidebarOpen(false); }} className="gemini-pill-hover" style={{ backgroundColor: activeTab === item.id ? "rgba(255,255,255,0.08)" : "transparent", padding: "10px 12px", borderRadius: "10px", fontSize: "14px", color: "#e3e3e3", display: "flex", alignItems: "center", gap: "12px" }}>
                  {item.icon} <span style={{ overflow: "hidden" }}>{item.label}</span>
                </div>
              ) : (
                <div key={item.id} style={{ position: "relative", display: "flex", justifyContent: "center" }}
                     onMouseEnter={() => setHoveredTooltip(item.id)}
                     onMouseLeave={() => setHoveredTooltip(null)}>
                  <div onClick={() => { setActiveTab(item.id as any); if(isMobile) setIsSidebarOpen(false); }} className="gemini-icon-btn" style={{ backgroundColor: activeTab === item.id ? "rgba(255,255,255,0.08)" : "transparent" }}>
                    {item.icon}
                  </div>
                  {hoveredTooltip === item.id && (
                    <div style={{ position: "absolute", top: "50%", left: "48px", transform: "translateY(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                      {item.label}
                    </div>
                  )}
                </div>
              )
            ))}

            {isSidebarOpen && (
              <>
                <div style={{ fontSize: "12px", color: "#888", marginTop: "16px", marginBottom: "2px", paddingLeft: "12px" }}>Notebooks</div>
                <div onClick={() => { setActiveModal('notebook'); setIsSidebarOpen(false); }} className="gemini-pill-hover" style={{ padding: "10px 12px", borderRadius: "10px", fontSize: "14px", color: "#e3e3e3", display: "flex", alignItems: "center", gap: "12px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  <span style={{ overflow: "hidden" }}>New notebook</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: isSidebarOpen ? `1px solid ${borderCol}` : "none", paddingTop: "12px", padding: isMobile && !isSidebarOpen ? "0" : "0 14px", width: "100%", alignItems: isSidebarOpen ? "stretch" : "center", opacity: isMobile && !isSidebarOpen ? 0 : 1, transition: "opacity 0.2s ease" }}>
          {isSidebarOpen ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#fff", fontSize: "12px" }}>
                  S
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#fff" }}>Sefvan P P</span>
                  <span style={{ fontSize: "11px", color: "#888" }}>Pro</span>
                </div>
              </div>
              
              <div style={{ position: "relative" }}
                   onMouseEnter={() => setHoveredTooltip("settings")}
                   onMouseLeave={() => setHoveredTooltip(null)}>
                <button onClick={() => alert("Settings")} className="gemini-circle-hover" style={{ background: "none", border: "none", color: "#e3e3e3", cursor: "pointer", width: "32px", height: "32px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </button>
                {hoveredTooltip === "settings" && (
                  <div style={{ position: "absolute", bottom: "40px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                    Settings
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <div style={{ position: "relative", display: "flex", justifyContent: "center" }}
                   onMouseEnter={() => setHoveredTooltip("settings-closed")}
                   onMouseLeave={() => setHoveredTooltip(null)}>
                <button onClick={() => alert("Settings")} className="gemini-icon-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </button>
                {hoveredTooltip === "settings-closed" && (
                  <div style={{ position: "absolute", top: "50%", left: "48px", transform: "translateY(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                    Settings
                  </div>
                )}
              </div>

              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#fff", fontSize: "12px" }}>
                S
              </div>
            </div>
          )}
        </div>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
        
        {isMobile && !isSidebarOpen && (
          <header style={{ padding: "12px 16px", display: "flex", alignItems: "center", zIndex: 10 }}>
            <div onClick={() => setIsSidebarOpen(true)} className="gemini-circle-hover" style={{ cursor: "pointer", color: "#e3e3e3", width: "36px", height: "36px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)">
                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#m_grad_logo)"/>
                <defs>
                  <linearGradient id="m_grad_logo" x1="2" y1="2" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3B82F6"/>
                    <stop offset="1" stopColor="#A855F7"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </header>
        )}

        {activeTab === "chat" && messages.length === 0 && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{ position: "absolute", width: "350px", height: "350px", background: "radial-gradient(circle, rgba(66,133,244,0.15) 0%, rgba(0,0,0,0) 70%)", top: "35%", left: "35%", filter: "blur(40px)", animation: "auraGlow1 8s ease-in-out infinite" }}></div>
            <div style={{ position: "absolute", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(192,132,252,0.12) 0%, rgba(0,0,0,0) 70%)", top: "45%", left: "55%", filter: "blur(50px)", animation: "auraGlow2 10s ease-in-out infinite" }}></div>
            <div style={{ position: "absolute", width: "300px", height: "300px", background: "radial-gradient(circle, rgba(217,101,112,0.1) 0%, rgba(0,0,0,0) 70%)", top: "60%", left: "45%", filter: "blur(40px)", animation: "auraGlow1 12s ease-in-out infinite" }}></div>
          </div>
        )}

        {/* VIEW ROUTER AND TABS ... (Same content) */}
        {activeTab === "preview" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: isMobile ? "10px" : "20px", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "18px" }}>Live Code Runner & Preview</h2>
              <button onClick={() => setActiveTab("chat")} style={{ background: "none", border: `1px solid ${borderCol}`, color: textColor, padding: "6px 12px", borderRadius: "8px", cursor: "pointer" }}>← Back to Chat</button>
            </div>
            <iframe srcDoc={previewCode} style={{ flex: 1, backgroundColor: "#fff", border: `1px solid ${borderCol}`, borderRadius: "12px", width: "100%" }} title="Preview" />
          </div>
        )}

        {activeTab === "search" && (
          <div style={{ flex: 1, padding: isMobile ? "20px 16px" : "40px 80px", color: "#e3e3e3", overflowY: "auto", zIndex: 1 }}>
             <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
                <div style={{ position: "relative", marginBottom: "32px" }}>
                  <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#aaa" }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input 
                    placeholder="Search chats" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "100%", padding: "16px 16px 16px 48px", borderRadius: "24px", backgroundColor: "#1e1f20", border: `1px solid ${borderCol}`, color: "#fff", outline: "none", fontSize: "16px" }} 
                  />
                </div>
                <div style={{ fontSize: "14px", color: "#aaa", marginBottom: "16px", paddingLeft: "8px" }}>Recent</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {filteredSessions.length > 0 ? (
                    filteredSessions.map((session) => (
                      <div 
                        key={session.id} 
                        onClick={() => { setCurrentSessionId(session.id); setActiveTab("chat"); if(isMobile) setIsSidebarOpen(false); }} 
                        className="gemini-pill-hover" 
                        style={{ padding: "16px 12px", display: "flex", justifyContent: "space-between", cursor: "pointer", borderBottom: `1px solid ${borderCol}` }}
                      >
                        <span style={{ fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginRight: "16px" }}>{session.title || "New Chat"}</span>
                        <span style={{ fontSize: "13px", color: "#888", flexShrink: 0 }}>{formatTime(session.id)}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "16px 12px", color: "#888", textAlign: "center" }}>No recent chats found.</div>
                  )}
                </div>
             </div>
          </div>
        )}

        {/* DEFAULT CHAT VIEW */}
        {activeTab === "chat" && (
          <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 16px" : "20px 80px", display: "flex", flexDirection: "column", gap: "24px", zIndex: 1 }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <h1 style={{ fontSize: isMobile ? "28px" : "42px", fontWeight: 500, marginBottom: "24px", textAlign: "center", background: "linear-gradient(90deg, #4285f4, #c084fc, #d96570, #4285f4)", backgroundSize: "200% auto", animation: "gradientFlow 5s linear infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  What&apos;s on your mind today?
                </h1>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === "user";

                return (
                  <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", width: "100%" }}>
                    {isUser ? (
                      <div style={{ maxWidth: isMobile ? "90%" : "75%", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                        {msg.image && <img src={msg.image} alt="Uploaded" style={{ maxWidth: "100%", maxHeight: "300px", objectFit: "contain", borderRadius: "12px" }} />}
                        {msg.fileData && <div style={{ fontSize: "12px", background: "#333", padding: "4px 8px", borderRadius: "6px" }}>📄 {msg.fileData}</div>}
                        
                        <div style={{ padding: "14px 20px", borderRadius: "24px", backgroundColor: "#2b2c2f", color: "#fff", fontSize: "15px", lineHeight: "1.6" }}>
                          {msg.content}
                        </div>

                        <div style={{ display: "flex", gap: "8px", color: "#aaa", marginTop: "4px", fontSize: "14px", alignItems: "center" }}>
                          <div className="gemini-action-btn" style={{ position: "relative" }}>
                            <svg 
                              onClick={() => navigator.clipboard.writeText(msg.content)}
                              onMouseEnter={() => setHoveredTooltip(`user-copy-${index}`)}
                              onMouseLeave={() => setHoveredTooltip(null)}
                              style={{ width: "16px", height: "16px", fill: "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                              viewBox="0 0 24 24"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            {hoveredTooltip === `user-copy-${index}` && (
                              <div style={{ position: "absolute", top: "34px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                Copy
                              </div>
                            )}
                          </div>

                          <div className="gemini-action-btn" style={{ position: "relative" }}>
                            <svg 
                              onClick={() => setInput(msg.content)}
                              onMouseEnter={() => setHoveredTooltip(`user-edit-${index}`)}
                              onMouseLeave={() => setHoveredTooltip(null)}
                              style={{ width: "16px", height: "16px", fill: "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                              <path d="M2 2l7.586 7.586"></path>
                              <circle cx="11" cy="11" r="2"></circle>
                            </svg>
                            {hoveredTooltip === `user-edit-${index}` && (
                              <div style={{ position: "absolute", top: "34px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                Edit
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ maxWidth: isMobile ? "100%" : "85%", display: "flex", flexDirection: "column", width: "100%" }}>
                        <div className="gemini-content" style={{ color: textColor, width: "100%" }}>
                          {msg.image && <img src={msg.image} alt="Generated" style={{ maxWidth: "100%", maxHeight: "400px", objectFit: "contain", borderRadius: "12px", marginBottom: "16px" }} />}
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        
                        {msg.content && (
                          <div style={{ display: "flex", gap: "8px", color: "#aaa", marginTop: "4px", fontSize: "16px", alignItems: "center" }}>
                            
                            <div className="gemini-action-btn" style={{ position: "relative" }}>
                              <svg 
                                onClick={() => setFeedbackState({ ...feedbackState, [index]: feedbackState[index] === 'like' ? null : 'like' })}
                                onMouseEnter={() => setHoveredTooltip(`like-${index}`)}
                                onMouseLeave={() => setHoveredTooltip(null)}
                                style={{ width: "16px", height: "16px", fill: feedbackState[index] === 'like' ? "#60a5fa" : "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                                viewBox="0 0 24 24"
                              >
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                              </svg>
                              {hoveredTooltip === `like-${index}` && (
                                <div style={{ position: "absolute", top: "34px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                  Good
                                </div>
                              )}
                            </div>

                            <div className="gemini-action-btn" style={{ position: "relative" }}>
                              <svg 
                                onClick={() => setFeedbackState({ ...feedbackState, [index]: feedbackState[index] === 'dislike' ? null : 'dislike' })}
                                onMouseEnter={() => setHoveredTooltip(`dislike-${index}`)}
                                onMouseLeave={() => setHoveredTooltip(null)}
                                style={{ width: "16px", height: "16px", fill: feedbackState[index] === 'dislike' ? "#ef4444" : "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                                viewBox="0 0 24 24"
                              >
                                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                              </svg>
                              {hoveredTooltip === `dislike-${index}` && (
                                <div style={{ position: "absolute", top: "34px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                  Bad
                                </div>
                              )}
                            </div>

                            {index === messages.length - 1 && (
                              <div className="gemini-action-btn" style={{ position: "relative" }}>
                                <svg 
                                  onClick={() => regenerateResponse(index)}
                                  onMouseEnter={() => setHoveredTooltip(`regen-${index}`)}
                                  onMouseLeave={() => setHoveredTooltip(null)}
                                  style={{ width: "16px", height: "16px", fill: "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                                {hoveredTooltip === `regen-${index}` && (
                                  <div style={{ position: "absolute", top: "34px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                    Redo
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="gemini-action-btn" style={{ position: "relative" }}>
                              <svg 
                                onClick={() => navigator.clipboard.writeText(msg.content)}
                                onMouseEnter={() => setHoveredTooltip(`copy-${index}`)}
                                onMouseLeave={() => setHoveredTooltip(null)}
                                style={{ width: "16px", height: "16px", fill: "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                                viewBox="0 0 24 24"
                              >
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                              {hoveredTooltip === `copy-${index}` && (
                                <div style={{ position: "absolute", top: "34px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                  Copy
                                </div>
                              )}
                            </div>

                            {hasCodeBlock(msg.content) && (
                              <span 
                                title="Run Code Preview" 
                                style={{ cursor: "pointer", color: "#60a5fa", fontWeight: 500, fontSize: "13px", padding: "6px 10px" }} 
                                onClick={() => { setPreviewCode(msg.content); setActiveTab("preview"); }}
                              >
                                ▶️ Run Preview
                              </span>
                            )}

                            <div className="gemini-action-btn" style={{ position: "relative" }}>
                              <svg 
                                onMouseEnter={() => setHoveredTooltip(`more-${index}`)}
                                onMouseLeave={() => setHoveredTooltip(null)}
                                style={{ width: "16px", height: "16px", fill: "currentColor", cursor: "pointer", display: "block" }} 
                                viewBox="0 0 24 24"
                              >
                                <circle cx="5" cy="12" r="2"></circle>
                                <circle cx="12" cy="12" r="2"></circle>
                                <circle cx="19" cy="12" r="2"></circle>
                              </svg>
                              {hoveredTooltip === `more-${index}` && (
                                <div style={{ position: "absolute", top: "34px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                  More
                                </div>
                              )}
                            </div>

                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            
            {/* The animated waiting dots */}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0", marginLeft: "4px" }}>
                <div style={{ width: "8px", height: "8px", backgroundColor: "#aaa", borderRadius: "50%", animation: "waveDots 1.2s infinite ease-in-out both", animationDelay: "0s" }}></div>
                <div style={{ width: "8px", height: "8px", backgroundColor: "#aaa", borderRadius: "50%", animation: "waveDots 1.2s infinite ease-in-out both", animationDelay: "0.15s" }}></div>
                <div style={{ width: "8px", height: "8px", backgroundColor: "#aaa", borderRadius: "50%", animation: "waveDots 1.2s infinite ease-in-out both", animationDelay: "0.3s" }}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Global Bottom Input Section */}
        {(activeTab === "chat" || activeTab === "students") && (
          <div style={{ padding: isMobile ? "10px" : "16px 20px 28px 20px", maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", zIndex: 10 }}>
            <form 
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              style={{ backgroundColor: inputBg, border: `1px solid ${borderCol}`, borderRadius: "32px", padding: isMobile ? "8px 16px" : "12px 20px", display: "flex", alignItems: "center", gap: "12px", width: "100%", boxShadow: "0 6px 16px rgba(0,0,0,0.35)", position: "relative" }}
            >
              {/* Gemini Model Selector Popup Menu */}
              {showModelMenu && (
                <div style={{ position: "absolute", left: isMobile ? "10px" : "420px", bottom: "65px", backgroundColor: "#1e1f20", border: `1px solid ${borderCol}`, borderRadius: "16px", padding: "8px", width: "240px", boxShadow: "0 8px 32px rgba(0,0,0,0.7)", zIndex: 100, display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div onClick={() => { setSelectedModel("Flash-Lite"); setShowModelMenu(false); }} style={{ padding: "10px 12px", borderRadius: "10px", cursor: "pointer", backgroundColor: selectedModel === "Flash-Lite" ? "#28292a" : "transparent", display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>Flash-Lite</div>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>Fastest answers</div>
                  </div>
                  <div onClick={() => { setSelectedModel("3.7 Flash"); setShowModelMenu(false); }} style={{ padding: "10px 12px", borderRadius: "10px", cursor: "pointer", backgroundColor: selectedModel === "3.7 Flash" ? "#28292a" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>3.7 Flash</div>
                      <div style={{ fontSize: "11px", color: "#aaa" }}>All-around help</div>
                    </div>
                    <span style={{ fontSize: "10px", backgroundColor: "#333", color: "#60a5fa", padding: "2px 6px", borderRadius: "6px", fontWeight: "bold" }}>New</span>
                  </div>
                  <div onClick={() => { setSelectedModel("3.1 Pro"); setShowModelMenu(false); }} style={{ padding: "10px 12px", borderRadius: "10px", cursor: "pointer", backgroundColor: selectedModel === "3.1 Pro" ? "#28292a" : "transparent", display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>3.1 Pro</div>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>Advanced reasoning</div>
                  </div>
                  <div style={{ height: "1px", backgroundColor: borderCol, margin: "4px 0" }}></div>
                  <div onClick={() => { setSelectedModel("Extended thinking"); setShowModelMenu(false); }} style={{ padding: "10px 12px", borderRadius: "10px", cursor: "pointer", backgroundColor: selectedModel === "Extended thinking" ? "#28292a" : "transparent", display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>Extended thinking</div>
                    <div style={{ fontSize: "11px", color: "#aaa" }}>Complex problem solving</div>
                  </div>
                </div>
              )}

              {/* PLUS MENU WITH SUB-MENUS (Desktop & Mobile handled via CSS/Logic) */}
              
              {/* Desktop Plus Menu */}
              {!isMobile && showMenu && (
                <div 
                  onMouseLeave={() => setActiveSubMenu(null)}
                  style={{ position: "absolute", left: "16px", bottom: "65px", backgroundColor: "#1e1f20", border: `1px solid ${borderCol}`, borderRadius: "16px", padding: "8px", width: "280px", boxShadow: "0 8px 32px rgba(0,0,0,0.7)", zIndex: 100, display: "flex", flexDirection: "column", gap: "2px" }}
                >
                  
                  {/* Upload files */}
                  <label 
                    className="gemini-pill-hover" 
                    onMouseEnter={() => setActiveSubMenu(null)}
                    style={{ padding: "10px 12px", fontSize: "14px", color: "#e3e3e3", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", borderRadius: "10px" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    Upload files
                    <input type="file" accept="image/*,.txt,.js,.ts,.html,.css,.json,.md" onChange={(e) => { handleFileUpload(e); setShowMenu(false); }} style={{ display: "none" }} />
                  </label>

                  {/* Add from Drive */}
                  <div 
                    className="gemini-pill-hover" 
                    onClick={() => { setActiveModal('drive'); setShowMenu(false); setActiveSubMenu(null); }} 
                    onMouseEnter={() => setActiveSubMenu(null)}
                    style={{ padding: "10px 12px", fontSize: "14px", color: "#e3e3e3", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", borderRadius: "10px" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 22 22 22"></polygon></svg>
                    Add from Drive
                  </div>

                  {/* More uploads */}
                  <div 
                    className="gemini-pill-hover" 
                    onMouseEnter={() => setActiveSubMenu('uploads')}
                    style={{ position: "relative", padding: "10px 12px", fontSize: "14px", color: "#e3e3e3", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "10px", backgroundColor: activeSubMenu === 'uploads' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                      More uploads
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    
                    {activeSubMenu === 'uploads' && (
                      <div style={{ position: "absolute", left: "100%", top: "-40px", marginLeft: "12px", backgroundColor: "#1e1f20", border: `1px solid ${borderCol}`, borderRadius: "16px", padding: "8px", width: "200px", boxShadow: "0 8px 32px rgba(0,0,0,0.7)", zIndex: 101, display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div onClick={() => { setActiveModal('photos'); setShowMenu(false); setActiveSubMenu(null); }} className="gemini-pill-hover" style={{ padding: "10px 12px", color: "#e3e3e3", display: "flex", gap: "12px", alignItems: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Photos</div>
                        <div onClick={() => { setActiveModal('avatar'); setShowMenu(false); setActiveSubMenu(null); }} className="gemini-pill-hover" style={{ padding: "10px 12px", color: "#e3e3e3", display: "flex", gap: "12px", alignItems: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg> Avatar</div>
                        <div onClick={() => { setActiveModal('importCode'); setShowMenu(false); setActiveSubMenu(null); }} className="gemini-pill-hover" style={{ padding: "10px 12px", color: "#e3e3e3", display: "flex", gap: "12px", alignItems: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> Import code</div>
                        <div onClick={() => { setActiveModal('notebook'); setShowMenu(false); setActiveSubMenu(null); }} className="gemini-pill-hover" style={{ padding: "10px 12px", color: "#e3e3e3", display: "flex", gap: "12px", alignItems: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> Notebooks</div>
                      </div>
                    )}
                  </div>

                  <div style={{ height: "1px", backgroundColor: borderCol, margin: "4px 0" }}></div>

                  {/* Create image */}
                  <div 
                    className="gemini-pill-hover" 
                    onClick={() => { setActiveTab('images'); setShowMenu(false); }}
                    onMouseEnter={() => { setActiveSubMenu(null); setHoveredTooltip('menu-img'); }}
                    onMouseLeave={() => setHoveredTooltip(null)}
                    style={{ position: "relative", padding: "10px 12px", fontSize: "14px", color: "#e3e3e3", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", borderRadius: "10px" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    Create image
                    {hoveredTooltip === 'menu-img' && <div style={{ position: "absolute", left: "100%", marginLeft: "12px", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 102, fontWeight: 500 }}>Visualize and edit</div>}
                  </div>

                  {/* Create video */}
                  <div 
                    className="gemini-pill-hover" 
                    onClick={() => { setActiveTab('videos'); setShowMenu(false); }}
                    onMouseEnter={() => { setActiveSubMenu(null); setHoveredTooltip('menu-vid'); }}
                    onMouseLeave={() => setHoveredTooltip(null)}
                    style={{ position: "relative", padding: "10px 12px", fontSize: "14px", color: "#e3e3e3", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", borderRadius: "10px" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    Create video
                    {hoveredTooltip === 'menu-vid' && <div style={{ position: "absolute", left: "100%", marginLeft: "12px", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 102, fontWeight: 500 }}>Bring ideas to life</div>}
                  </div>

                  {/* Create music */}
                  <div 
                    className="gemini-pill-hover" 
                    onClick={() => setShowMenu(false)}
                    onMouseEnter={() => { setActiveSubMenu(null); setHoveredTooltip('menu-mus'); }}
                    onMouseLeave={() => setHoveredTooltip(null)}
                    style={{ position: "relative", padding: "10px 12px", fontSize: "14px", color: "#e3e3e3", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", borderRadius: "10px" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    Create music
                    {hoveredTooltip === 'menu-mus' && <div style={{ position: "absolute", left: "100%", marginLeft: "12px", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 102, fontWeight: 500 }}>Make audio tracks</div>}
                  </div>

                  <div style={{ height: "1px", backgroundColor: borderCol, margin: "4px 0" }}></div>

                  {/* More tools */}
                  <div 
                    className="gemini-pill-hover" 
                    onMouseEnter={() => setActiveSubMenu('tools')}
                    style={{ position: "relative", padding: "10px 12px", fontSize: "14px", color: "#e3e3e3", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "10px", backgroundColor: activeSubMenu === 'tools' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                      More tools
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    
                    {/* Submenu for Tools */}
                    {activeSubMenu === 'tools' && (
                      <div style={{ position: "absolute", left: "100%", bottom: "-10px", marginLeft: "12px", backgroundColor: "#1e1f20", border: `1px solid ${borderCol}`, borderRadius: "16px", padding: "8px", width: "260px", boxShadow: "0 8px 32px rgba(0,0,0,0.7)", zIndex: 101, display: "flex", flexDirection: "column", gap: "2px" }}>
                        
                        {/* Canvas */}
                        <div onClick={() => setShowMenu(false)} className="gemini-pill-hover" onMouseEnter={() => setHoveredTooltip('tool-can')} onMouseLeave={() => setHoveredTooltip(null)} style={{ position: "relative", padding: "10px 12px", color: "#e3e3e3", display: "flex", alignItems: "center", gap: "12px" }}>
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 22h20L12 2z"></path></svg> Canvas
                           {hoveredTooltip === 'tool-can' && <div style={{ position: "absolute", left: "100%", marginLeft: "12px", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 102, fontWeight: 500 }}>Code writer or make slides</div>}
                        </div>
                        
                        {/* Deep Research */}
                        <div onClick={() => setShowMenu(false)} className="gemini-pill-hover" onMouseEnter={() => setHoveredTooltip('tool-deep')} onMouseLeave={() => setHoveredTooltip(null)} style={{ position: "relative", padding: "10px 12px", color: "#e3e3e3", display: "flex", alignItems: "center", gap: "12px" }}>
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> Deep Research
                           {hoveredTooltip === 'tool-deep' && <div style={{ position: "absolute", left: "100%", marginLeft: "12px", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 102, fontWeight: 500 }}>Get detailed reports</div>}
                        </div>
                        
                        {/* Guided Learning */}
                        <div onClick={() => setShowMenu(false)} className="gemini-pill-hover" onMouseEnter={() => setHoveredTooltip('tool-learn')} onMouseLeave={() => setHoveredTooltip(null)} style={{ position: "relative", padding: "10px 12px", color: "#e3e3e3", display: "flex", alignItems: "center", gap: "12px" }}>
                           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> Guided Learning
                           {hoveredTooltip === 'tool-learn' && <div style={{ position: "absolute", left: "100%", marginLeft: "12px", backgroundColor: "#e3e3e3", color: "#131314", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 102, fontWeight: 500 }}>Study and learn new things</div>}
                        </div>

                        {/* Personal Intelligence */}
                        <div className="gemini-pill-hover" style={{ padding: "10px 12px", color: "#e3e3e3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                           <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> 
                             <div style={{ display: "flex", flexDirection: "column" }}>
                               <span style={{ lineHeight: "1" }}>Personal Intelligence</span>
                               <span style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>Labs</span>
                             </div>
                           </div>
                           {/* Toggle Switch */}
                           <div style={{ width: "32px", height: "18px", backgroundColor: "#60a5fa", borderRadius: "9px", position: "relative" }}>
                             <div style={{ width: "14px", height: "14px", backgroundColor: "#fff", borderRadius: "50%", position: "absolute", right: "2px", top: "2px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                               <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                             </div>
                           </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              <div className="gemini-circle-hover" style={{ cursor: "pointer", transform: showMenu && !isMobile ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s ease", width: "36px", height: "36px" }} onClick={() => setShowMenu(!showMenu)}>
                <span style={{ fontSize: "24px", color: "#ffffff", fontWeight: 400, lineHeight: 1 }}>+</span>
              </div>

              <textarea
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                    e.currentTarget.style.height = 'auto';
                  }
                }}
                placeholder={isListening ? "Listening..." : "Ask Aura"}
                style={{ flex: 1, backgroundColor: "transparent", border: "none", color: textColor, fontSize: "15px", outline: "none", minWidth: "0", resize: "none", padding: "8px 0", maxHeight: "150px", fontFamily: "inherit" }}
              />

              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", flexShrink: 0, paddingBottom: "2px" }}>
                {!isMobile && (
                  <div className="gemini-model-hover" style={{ cursor: "pointer", display: "flex", alignItems: "center" }} onClick={() => setShowModelMenu(!showModelMenu)}>
                    <span style={{ fontSize: "14px", color: "#ffffff", fontWeight: 500 }}>{selectedModel} ▼</span>
                  </div>
                )}

                {isListening ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "20px" }}>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                    </div>
                    <button type="button" onClick={stopVoiceInput} style={{ background: "#ef4444", border: "none", color: "#fff", width: "24px", height: "24px", borderRadius: "50%", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center" }}>■</button>
                  </div>
                ) : (
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }} onMouseEnter={() => setHoveredTooltip("dictate-btn")} onMouseLeave={() => setHoveredTooltip(null)}>
                    <div onClick={handleVoiceInput} className="gemini-circle-hover" style={{ cursor: "pointer", color: "#ffffff", width: "36px", height: "36px" }}>
                      <svg style={{ width: "18px", height: "18px", fill: "currentColor" }} viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    </div>
                    {hoveredTooltip === "dictate-btn" && (
                      <div style={{ position: "absolute", top: "42px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                        Dictate
                      </div>
                    )}
                  </div>
                )}

                {loading ? (
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }} onMouseEnter={() => setHoveredTooltip("stop-btn")} onMouseLeave={() => setHoveredTooltip(null)}>
                    <button type="button" onClick={stopResponse} style={{ backgroundColor: "#e3e3e3", color: "#131314", border: "none", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: "10px", height: "10px", backgroundColor: "#131314", borderRadius: "2px" }}></div>
                    </button>
                    {hoveredTooltip === "stop-btn" && (
                      <div style={{ position: "absolute", top: "42px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                        Stop
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }} onMouseEnter={() => setHoveredTooltip("submit-btn")} onMouseLeave={() => setHoveredTooltip(null)}>
                    <button 
                      type={(input.trim() || selectedImage || selectedFile) ? "submit" : "button"} 
                      className={(input.trim() || selectedImage || selectedFile) ? "gemini-submit-btn" : ""}
                      style={{ 
                        backgroundColor: (input.trim() || selectedImage || selectedFile) ? "#1a73e8" : "#28292a", 
                        color: (input.trim() || selectedImage || selectedFile) ? "#fff" : "#555", 
                        border: "none", width: "32px", height: "32px", borderRadius: "50%", 
                        cursor: (input.trim() || selectedImage || selectedFile) ? "pointer" : "default", 
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <svg style={{ width: "16px", height: "16px", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }} viewBox="0 0 24 24">
                        <line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline>
                      </svg>
                    </button>
                    {hoveredTooltip === "submit-btn" && (input.trim() || selectedImage || selectedFile) && (
                      <div style={{ position: "absolute", top: "42px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                        Submit
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
            <div style={{ fontSize: "12px", color: "#777", textAlign: "center", marginTop: "12px", paddingBottom: "12px" }}>Aura is AI and can make mistakes.</div>
          </div>
        )}
      </main>
    </div>
  );
}
