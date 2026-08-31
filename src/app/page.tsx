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
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [selectedModel, setSelectedModel] = useState("Flash-Lite");
  const [selectedPersona, setSelectedPersona] = useState("General Assistant");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "templates" | "preview">("chat");
  const [previewCode, setPreviewCode] = useState<string>("");
  const [feedbackState, setFeedbackState] = useState<{ [key: string]: 'like' | 'dislike' | null }>({});
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const localSessions = localStorage.getItem("aura_chat_sessions");
    if (localSessions) {
      try {
        const parsed = JSON.parse(localSessions);
        setSessions(parsed);
        if (parsed.length > 0) {
          setCurrentSessionId(parsed[0].id);
        } else {
          createNewChat(parsed);
        }
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
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, loading, isListening]);

  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem("aura_chat_sessions", JSON.stringify(updatedSessions));
  };

  const createNewChat = (existingSessions = sessions) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: []
    };
    const updated = [newSession, ...existingSessions];
    saveSessions(updated);
    setCurrentSessionId(newSession.id);
    setActiveTab("chat");
    setInput("");
    setSelectedImage(null);
    setSelectedFile(null);
  };

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

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("aura_theme", newTheme);
  };

  const typeMessageEffect = (fullText: string, baseMessages: any[]) => {
    let index = 0;
    const messagesWithEmptyAssistant = [...baseMessages, { role: "assistant", content: "" }];
    updateCurrentMessages(messagesWithEmptyAssistant);

    const interval = setInterval(() => {
      if (index < fullText.length) {
        const nextChar = fullText.charAt(index);
        setSessions(prevSessions => {
          return prevSessions.map(s => {
            if (s.id === currentSessionId) {
              const msgs = [...s.messages];
              if (msgs.length > 0) {
                const lastMsg = { ...msgs[msgs.length - 1] };
                lastMsg.content += nextChar;
                msgs[msgs.length - 1] = lastMsg;
              }
              return { ...s, messages: msgs };
            }
            return s;
          });
        });
        index++;
      } else {
        clearInterval(interval);
        setLoading(false);
      }
    }, 10);
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

      if (/^(hi|hello|hey|hai|hii|loo|looo|gm|gn|sup|wsg|wassup)(\s|$)/.test(cleanText)) {
        instantReply = "Hello! I'm Aura. How can I help you today?";
      } else if (/^(how are u|how are you|hru|hw r u|how r u|hows it going)(\s|$)/.test(cleanText)) {         instantReply = "I'm doing great, thank you for asking! How are you doing today? Is there anything I can help you with?";       } else if (/^(thanks\vert{}thank you\vert{}thx\vert{}tnks)(\s\vert{}$)/.test(cleanText)) {
        instantReply = "You're very welcome! Feel free to reach out if you have any more questions. Have a great day!";
      } else if (/^(i need help|help|need help|can you help)(\s|$)/.test(cleanText)) {         instantReply = "I'd be happy to help! Please let me know what you're working on or what question you have, and we can get started right away.";       } else if (/^(ok\vert{}okay\vert{}k\vert{}alright)(\s\vert{}$)/.test(cleanText)) {
        instantReply = "Awesome! Let me know if you need anything else.";
      } else if (/^(fine|good|great)(\s|$)/.test(cleanText)) {         instantReply = "Glad to hear that! What would you like to explore next?";       } else if (/^(cool\vert{}awesome\vert{}super)(\s\vert{}$)/.test(cleanText)) {
        instantReply = "Thank you! How can I assist you further?";
      }

      if (instantReply) {
        setTimeout(() => {
          typeMessageEffect(instantReply, newMessages);
        }, 350);
        return;
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: enhancedMessage, 
          image: currentImage, 
          model: selectedModel, 
          webSearch: false,
          persona: selectedPersona 
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTimeout(() => {
          typeMessageEffect(data.reply, newMessages);
        }, 400);
      } else {
        updateCurrentMessages([...newMessages, { role: "assistant", content: `Error: ${data.error}` }]);
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      updateCurrentMessages([...newMessages, { role: "assistant", content: "Network error occurred." }]);
      setLoading(false);
    }
  };

  const regenerateResponse = async (index: number) => {
    if (index === 0) return;
    const previousUserMsg = messages[index - 1];
    if (!previousUserMsg || previousUserMsg.role !== "user") return;

    const trimmedMessages = messages.slice(0, index);
    updateCurrentMessages(trimmedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: previousUserMsg.content, 
          model: selectedModel, 
          webSearch: false,
          persona: selectedPersona 
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTimeout(() => {
          typeMessageEffect(data.reply, trimmedMessages);
        }, 400);
      } else {
        updateCurrentMessages([...trimmedMessages, { role: "assistant", content: `Error: ${data.error}` }]);
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      updateCurrentMessages([...trimmedMessages, { role: "assistant", content: "Network error occurred." }]);
      setLoading(false);
    }
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setShowMenu(false);
      };
      reader.readAsDataURL(file);
    }
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

  const templates = [
    { title: "Bug Debugger", prompt: "Review this code and find bugs with optimal fixes:" },
    { title: "Blog Writer", prompt: "Write an engaging blog post about modern web development trends in 2026." },
    { title: "SQL Architect", prompt: "Design an optimized PostgreSQL schema for an e-commerce platform." }
  ];

  const bgMain = theme === "dark" ? "#131314" : "#f9f9f9";
  const bgSidebar = theme === "dark" ? "#1e1f20" : "#f0f0f0";
  const borderCol = theme === "dark" ? "#28292a" : "#e0e0e0";
  const textColor = theme === "dark" ? "#e3e3e3" : "#222222";
  const inputBg = theme === "dark" ? "#1e1f20" : "#ffffff";

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", backgroundColor: bgMain, color: textColor, overflow: "hidden", position: "relative" }}>
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
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
        @keyframes waveAnim {
          0%, 100% { height: 6px; }
          50% { height: 22px; }
        }
        .wave-bar {
          width: 3px;
          background-color: #4ade80;
          border-radius: 2px;
          animation: waveAnim 0.8s infinite ease-in-out;
        }
        .wave-bar:nth-child(2) { animation-delay: 0.1s; }
        .wave-bar:nth-child(3) { animation-delay: 0.2s; }
        .wave-bar:nth-child(4) { animation-delay: 0.3s; }
        .wave-bar:nth-child(5) { animation-delay: 0.4s; }
        .gemini-circle-hover {
          transition: background-color 0.2s ease;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
        }
        .gemini-circle-hover:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
        .gemini-pill-hover {
          transition: background-color 0.2s ease;
        }
        .gemini-pill-hover:hover {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
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
          width: 34px;
          height: 34px;
          border-radius: 50%;
          cursor: pointer;
          color: #ffffff;
          transition: background-color 0.2s ease;
        }
        .gemini-action-btn:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>

      {/* Sidebar */}
      {isSidebarOpen && (
        <aside style={{ width: "260px", backgroundColor: bgSidebar, borderRight: `1px solid ${borderCol}`, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "12px", transition: "all 0.3s ease" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flex: 1 }}>
            <button 
              onClick={() => createNewChat()}
              style={{ backgroundColor: "#28292a", border: "none", color: "#fff", padding: "10px 14px", borderRadius: "20px", cursor: "pointer", textAlign: "left", fontSize: "14px", fontWeight: 500 }}
            >
              + New chat
            </button>

            <button 
              onClick={() => setActiveTab("templates")}
              style={{ backgroundColor: activeTab === "templates" ? "#333" : "transparent", border: `1px solid ${borderCol}`, color: textColor, padding: "8px 12px", borderRadius: "12px", cursor: "pointer", textAlign: "left", fontSize: "13px" }}
            >
              📚 Prompt Templates
            </button>

            <div style={{ fontSize: "12px", color: "#888", marginTop: "10px", paddingLeft: "6px" }}>Recent Chats</div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setCurrentSessionId(s.id); setActiveTab("chat"); }}
                  style={{
                    backgroundColor: s.id === currentSessionId && activeTab === "chat" ? (theme === "dark" ? "#333" : "#e0e0e0") : "transparent",
                    border: "none",
                    color: textColor,
                    padding: "8px 12px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "13px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                >
                  💬 {s.title}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: `1px solid ${borderCol}`, paddingTop: "8px" }}>
            <select 
              value={selectedPersona} 
              onChange={(e) => setSelectedPersona(e.target.value)}
              style={{ backgroundColor: inputBg, color: textColor, border: `1px solid ${borderCol}`, padding: "6px", borderRadius: "8px", fontSize: "12px" }}
            >
              <option value="General Assistant">🧑‍💻 General Assistant</option>
              <option value="Coding Expert">🚀 Coding Expert</option>
              <option value="Content Writer">✍️ Content Writer</option>
              <option value="Life Coach">🧘 Life Coach</option>
            </select>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={toggleTheme} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "15px" }}>
                {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
              </button>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#fff", fontSize: "12px" }}>
                S
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Section */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
        <header style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ background: "none", border: "none", color: textColor, fontSize: "20px", cursor: "pointer", padding: "4px" }}
              title="Toggle Sidebar"
            >
              ☰
            </button>
            <span style={{ fontSize: "18px", fontWeight: 600, background: "linear-gradient(90deg, #60a5fa, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Aura</span>
          </div>
        </header>

        {activeTab === "templates" ? (
          <div style={{ padding: "40px", maxWidth: "700px", margin: "0 auto", width: "100%", overflowY: "auto", flex: 1 }}>
            <h2 style={{ fontSize: "24px", marginBottom: "20px" }}>Prompt Templates Library</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {templates.map((t, idx) => (
                <div key={idx} style={{ backgroundColor: inputBg, border: `1px solid ${borderCol}`, padding: "20px", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h3 style={{ fontSize: "18px", color: "#60a5fa" }}>{t.title}</h3>
                  <p style={{ fontSize: "14px", color: "#aaa" }}>{t.prompt}</p>
                  <button 
                    onClick={() => { setActiveTab("chat"); createNewChat(); sendMessage(t.prompt); }}
                    style={{ alignSelf: "flex-start", backgroundColor: "#fff", color: "#000", border: "none", padding: "8px 16px", borderRadius: "12px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", marginTop: "8px" }}
                  >
                    Use Template →
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "preview" ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "18px" }}>Live Code Runner & Preview</h2>
              <button onClick={() => setActiveTab("chat")} style={{ background: "none", border: `1px solid ${borderCol}`, color: textColor, padding: "6px 12px", borderRadius: "8px", cursor: "pointer" }}>← Back to Chat</button>
            </div>
            <iframe 
              srcDoc={previewCode} 
              style={{ flex: 1, backgroundColor: "#fff", border: `1px solid ${borderCol}`, borderRadius: "12px", width: "100%" }} 
              title="Preview"
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 80px", display: "flex", flexDirection: "column", gap: "24px" }}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <h1 style={{ fontSize: "40px", fontWeight: 600, marginBottom: "24px", background: "linear-gradient(90deg, #60a5fa, #c084fc, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Where should we start?
                  </h1>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isUser = msg.role === "user";

                  return (
                    <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", width: "100%" }}>
                      {isUser ? (
                        <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                          {msg.image && <img src={msg.image} alt="Uploaded" style={{ maxWidth: "200px", borderRadius: "12px" }} />}
                          {msg.fileData && <div style={{ fontSize: "12px", background: "#333", padding: "4px 8px", borderRadius: "6px" }}>📄 {msg.fileData}</div>}
                          
                          <div style={{ padding: "14px 20px", borderRadius: "24px", backgroundColor: "#2b2c2f", color: "#fff", fontSize: "16px", lineHeight: "1.6" }}>
                            {msg.content}
                          </div>

                          <div style={{ display: "flex", gap: "4px", color: "#ffffff", marginTop: "4px", fontSize: "14px", alignItems: "center" }}>
                            <div className="gemini-action-btn" style={{ position: "relative" }}>
                              <svg 
                                onClick={() => navigator.clipboard.writeText(msg.content)}
                                onMouseEnter={() => setHoveredTooltip(`user-copy-${index}`)}
                                onMouseLeave={() => setHoveredTooltip(null)}
                                style={{ width: "18px", height: "18px", fill: "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                                viewBox="0 0 24 24"
                              >
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                              {hoveredTooltip === `user-copy-${index}` && (
                                <div style={{ position: "absolute", top: "36px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                  Copy prompt
                                </div>
                              )}
                            </div>

                            <div className="gemini-action-btn" style={{ position: "relative" }}>
                              <svg 
                                onClick={() => setInput(msg.content)}
                                onMouseEnter={() => setHoveredTooltip(`user-edit-${index}`)}
                                onMouseLeave={() => setHoveredTooltip(null)}
                                style={{ width: "18px", height: "18px", fill: "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                                <path d="M2 2l7.586 7.586"></path>
                                <circle cx="11" cy="11" r="2"></circle>
                              </svg>
                              {hoveredTooltip === `user-edit-${index}` && (
                                <div style={{ position: "absolute", top: "36px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                  Edit prompt
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div style={{ color: textColor, fontSize: "16px", lineHeight: "1.7" }}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          
                          {msg.content && (
                            <div style={{ display: "flex", gap: "4px", color: "#ffffff", marginTop: "8px", fontSize: "16px", alignItems: "center" }}>
                              
                              {/* Good Response Icon */}
                              <div className="gemini-action-btn" style={{ position: "relative" }}>
                                <svg 
                                  onClick={() => setFeedbackState({ ...feedbackState, [index]: feedbackState[index] === 'like' ? null : 'like' })}
                                  onMouseEnter={() => setHoveredTooltip(`like-${index}`)}
                                  onMouseLeave={() => setHoveredTooltip(null)}
                                  style={{ width: "18px", height: "18px", fill: feedbackState[index] === 'like' ? "#60a5fa" : "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                </svg>
                                {hoveredTooltip === `like-${index}` && (
                                  <div style={{ position: "absolute", top: "36px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                    Good response
                                  </div>
                                )}
                              </div>

                              {/* Bad Response Icon */}
                              <div className="gemini-action-btn" style={{ position: "relative" }}>
                                <svg 
                                  onClick={() => setFeedbackState({ ...feedbackState, [index]: feedbackState[index] === 'dislike' ? null : 'dislike' })}
                                  onMouseEnter={() => setHoveredTooltip(`dislike-${index}`)}
                                  onMouseLeave={() => setHoveredTooltip(null)}
                                  style={{ width: "18px", height: "18px", fill: feedbackState[index] === 'dislike' ? "#ef4444" : "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                                </svg>
                                {hoveredTooltip === `dislike-${index}` && (
                                  <div style={{ position: "absolute", top: "36px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                    Bad response
                                  </div>
                                )}
                              </div>

                              {/* Redo Button (Tooltip updated to "Redo") */}
                              {index === messages.length - 1 && (
                                <div className="gemini-action-btn" style={{ position: "relative" }}>
                                  <svg 
                                    onClick={() => regenerateResponse(index)}
                                    onMouseEnter={() => setHoveredTooltip(`regen-${index}`)}
                                    onMouseLeave={() => setHoveredTooltip(null)}
                                    style={{ width: "18px", height: "18px", fill: "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                  </svg>
                                  {hoveredTooltip === `regen-${index}` && (
                                    <div style={{ position: "absolute", top: "36px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                                      Redo
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Copy Icon */}
                              <div className="gemini-action-btn" style={{ position: "relative" }}>
                                <svg 
                                  onClick={() => navigator.clipboard.writeText(msg.content)}
                                  onMouseEnter={() => setHoveredTooltip(`copy-${index}`)}
                                  onMouseLeave={() => setHoveredTooltip(null)}
                                  style={{ width: "18px", height: "18px", fill: "none", stroke: "currentColor", strokeWidth: "2", cursor: "pointer", display: "block" }} 
                                  viewBox="0 0 24 24"
                                >
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                {hoveredTooltip === `copy-${index}` && (
                                  <div style={{ position: "absolute", top: "36px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
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

                              {/* More Icon */}
                              <div className="gemini-action-btn" style={{ position: "relative" }}>
                                <svg 
                                  onMouseEnter={() => setHoveredTooltip(`more-${index}`)}
                                  onMouseLeave={() => setHoveredTooltip(null)}
                                  style={{ width: "18px", height: "18px", fill: "currentColor", cursor: "pointer", display: "block" }} 
                                  viewBox="0 0 24 24"
                                >
                                  <circle cx="5" cy="12" r="2"></circle>
                                  <circle cx="12" cy="12" r="2"></circle>
                                  <circle cx="19" cy="12" r="2"></circle>
                                </svg>
                                {hoveredTooltip === `more-${index}` && (
                                  <div style={{ position: "absolute", top: "36px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "12px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
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
              
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 0" }}>
                  <div style={{ width: "8px", height: "8px", backgroundColor: "#aaa", borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both", animationDelay: "-0.32s" }}></div>
                  <div style={{ width: "8px", height: "8px", backgroundColor: "#aaa", borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both", animationDelay: "-0.16s" }}></div>
                  <div style={{ width: "8px", height: "8px", backgroundColor: "#aaa", borderRadius: "50%", animation: "bounce 1.4s infinite ease-in-out both" }}></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Section matching Original Gemini Size & Hover Effects */}
            <div style={{ padding: "16px 20px 28px 20px", maxWidth: "800px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <form 
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                style={{ backgroundColor: inputBg, border: `1px solid ${borderCol}`, borderRadius: "32px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "12px", width: "100%", boxShadow: "0 6px 16px rgba(0,0,0,0.35)", position: "relative" }}
              >
                {/* Gemini Model Selector Popup Menu */}
                {showModelMenu && (
                  <div style={{ position: "absolute", left: "420px", bottom: "65px", backgroundColor: "#1e1f20", border: `1px solid ${borderCol}`, borderRadius: "16px", padding: "8px", width: "240px", boxShadow: "0 8px 32px rgba(0,0,0,0.7)", zIndex: 100, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div 
                      onClick={() => { setSelectedModel("Flash-Lite"); setShowModelMenu(false); }}
                      style={{ padding: "10px 12px", borderRadius: "10px", cursor: "pointer", backgroundColor: selectedModel === "Flash-Lite" ? "#28292a" : "transparent", display: "flex", flexDirection: "column", gap: "2px" }}
                    >
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>Flash-Lite</div>
                      <div style={{ fontSize: "11px", color: "#aaa" }}>Fastest answers</div>
                    </div>

                    <div 
                      onClick={() => { setSelectedModel("3.7 Flash"); setShowModelMenu(false); }}
                      style={{ padding: "10px 12px", borderRadius: "10px", cursor: "pointer", backgroundColor: selectedModel === "3.7 Flash" ? "#28292a" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>3.7 Flash</div>
                        <div style={{ fontSize: "11px", color: "#aaa" }}>All-around help</div>
                      </div>
                      <span style={{ fontSize: "10px", backgroundColor: "#333", color: "#60a5fa", padding: "2px 6px", borderRadius: "6px", fontWeight: "bold" }}>New</span>
                    </div>

                    <div 
                      onClick={() => { setSelectedModel("3.1 Pro"); setShowModelMenu(false); }}
                      style={{ padding: "10px 12px", borderRadius: "10px", cursor: "pointer", backgroundColor: selectedModel === "3.1 Pro" ? "#28292a" : "transparent", display: "flex", flexDirection: "column", gap: "2px" }}
                    >
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>3.1 Pro</div>
                      <div style={{ fontSize: "11px", color: "#aaa" }}>Advanced reasoning</div>
                    </div>

                    <div style={{ height: "1px", backgroundColor: borderCol, margin: "4px 0" }}></div>

                    <div 
                      onClick={() => { setSelectedModel("Extended thinking"); setShowModelMenu(false); }}
                      style={{ padding: "10px 12px", borderRadius: "10px", cursor: "pointer", backgroundColor: selectedModel === "Extended thinking" ? "#28292a" : "transparent", display: "flex", flexDirection: "column", gap: "2px" }}
                    >
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>Extended thinking</div>
                      <div style={{ fontSize: "11px", color: "#aaa" }}>Complex problem solving</div>
                    </div>
                  </div>
                )}

                {/* Gemini Upload Popup Menu when Plus is clicked */}
                {showMenu && (
                  <div style={{ position: "absolute", left: "16px", bottom: "65px", backgroundColor: "#1e1f20", border: `1px solid ${borderCol}`, borderRadius: "16px", padding: "8px", width: "260px", boxShadow: "0 8px 32px rgba(0,0,0,0.7)", zIndex: 100, display: "flex", flexDirection: "column", gap: "2px" }}>
                    <label className="gemini-pill-hover" style={{ padding: "10px 12px", fontSize: "14px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                      📎 Add photos and files
                      <input type="file" accept="image/*,.txt,.js,.ts,.html,.css,.json,.md" onChange={(e) => { handleFileUpload(e); setShowMenu(false); }} style={{ display: "none" }} />
                    </label>

                    <div className="gemini-pill-hover" onClick={() => { alert("Google Drive integration coming soon!"); setShowMenu(false); }} style={{ padding: "10px 12px", fontSize: "14px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                      🔺 Add from Drive
                    </div>

                    <div className="gemini-pill-hover" onClick={() => alert("More uploads")} style={{ padding: "10px 12px", fontSize: "14px", color: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>⋯ More uploads</span>
                      <span>›</span>
                    </div>

                    <div style={{ height: "1px", backgroundColor: borderCol, margin: "4px 0" }}></div>

                    <div className="gemini-pill-hover" onClick={() => alert("Create image")} style={{ padding: "10px 12px", fontSize: "14px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                      🎨 Create image
                    </div>

                    <div className="gemini-pill-hover" onClick={() => alert("Create video")} style={{ padding: "10px 12px", fontSize: "14px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                      🎬 Create video
                    </div>

                    <div className="gemini-pill-hover" onClick={() => alert("Create music")} style={{ padding: "10px 12px", fontSize: "14px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                      🎵 Create music
                    </div>

                    <div style={{ height: "1px", backgroundColor: borderCol, margin: "4px 0" }}></div>

                    <div className="gemini-pill-hover" onClick={() => alert("More tools")} style={{ padding: "10px 12px", fontSize: "14px", color: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>⋯ More tools</span>
                      <span>›</span>
                    </div>
                  </div>
                )}

                {/* Plus button with proper rotating cross animation */}
                <div 
                  className="gemini-circle-hover" 
                  style={{ cursor: "pointer", transform: showMenu ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} 
                  onClick={() => setShowMenu(!showMenu)}
                >
                  <span style={{ fontSize: "24px", color: "#ffffff", fontWeight: 400, lineHeight: 1 }}>
                    +
                  </span>
                </div>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
                  placeholder={isListening ? "Listening..." : "Ask Aura"}
                  style={{ flex: 1, backgroundColor: "transparent", border: "none", color: textColor, fontSize: "16px", outline: "none", minWidth: "0" }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {/* Model Selector with white text & hover */}
                  <div className="gemini-model-hover" style={{ cursor: "pointer", display: "flex", alignItems: "center" }} onClick={() => setShowModelMenu(!showModelMenu)}>
                    <span style={{ fontSize: "14px", color: "#ffffff", fontWeight: 500 }}>{selectedModel} ▼</span>
                  </div>

                  {/* Microphone with circular hover & bottom tooltip */}
                  {isListening ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "20px" }}>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                      </div>
                      <button
                        type="button"
                        onClick={stopVoiceInput}
                        style={{ background: "#ef4444", border: "none", color: "#fff", width: "24px", height: "24px", borderRadius: "50%", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="Stop listening"
                      >
                        ■
                      </button>
                    </div>
                  ) : (
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <div
                        onClick={handleVoiceInput}
                        onMouseEnter={() => setHoveredTooltip("dictate-btn")}
                        onMouseLeave={() => setHoveredTooltip(null)}
                        className="gemini-circle-hover"
                        style={{ cursor: "pointer", color: "#ffffff" }}
                      >
                        <svg style={{ width: "20px", height: "20px", fill: "currentColor" }} viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                      </div>
                      {hoveredTooltip === "dictate-btn" && (
                        <div style={{ position: "absolute", top: "46px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                          Dictate (^⇧D)
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stop Response or Submit Button with Light Blue Hover */}
                  {loading ? (
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setLoading(false)}
                        onMouseEnter={() => setHoveredTooltip("stop-btn")}
                        onMouseLeave={() => setHoveredTooltip(null)}
                        style={{ backgroundColor: "#e3e3e3", color: "#131314", border: "none", width: "34px", height: "34px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <div style={{ width: "12px", height: "12px", backgroundColor: "#131314", borderRadius: "2px" }}></div>
                      </button>
                      {hoveredTooltip === "stop-btn" && (
                        <div style={{ position: "absolute", top: "46px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                          Stop response
                        </div>
                      )}
                    </div>
                  ) : (
                    (input.trim() || selectedImage || selectedFile) && (
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <button
                          type="submit"
                          onMouseEnter={() => setHoveredTooltip("submit-btn")}
                          onMouseLeave={() => setHoveredTooltip(null)}
                          className="gemini-submit-btn"
                          style={{ backgroundColor: "#1a73e8", color: "#fff", border: "none", width: "34px", height: "34px", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <svg style={{ width: "16px", height: "16px", fill: "none", stroke: "currentColor", strokeWidth: "2.5" }} viewBox="0 0 24 24">
                            <line x1="12" y1="19" x2="12" y2="5"></line>
                            <polyline points="5 12 12 5 19 12"></polyline>
                          </svg>
                        </button>
                        {hoveredTooltip === "submit-btn" && (
                          <div style={{ position: "absolute", top: "46px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#e3e3e3", color: "#131314", padding: "4px 10px", borderRadius: "10px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                            Submit
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </form>

              <div style={{ fontSize: "12px", color: "#777", textAlign: "center" }}>
                Aura is AI and can make mistakes.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
