"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedChats, setSavedChats] = useState<string[]>(["Previous Python Code Help", "AI Image Generation Prompt", "Next.js Deployment Guide"]);
  const [activeTab, setActiveTab] = useState("chat"); // chat, search, students, images, videos, library, settings
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  const sendMessage = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || loading) return;

    setInput("");
    setShowMenu(false);
    setMessages((prev) => [...prev, { role: "user", content: messageText }]);
    setSavedChats((prev) => [messageText, ...prev]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error occurred." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      setInput(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const suggestions = [
    "Improve relationship communication",
    "Explain recursion in Java",
    "Find cool Instagram gaming names"
  ];

  const handleFeatureClick = (featureName: string) => {
    setShowMenu(false);
    setInput(`[Selected Feature: ${featureName}] `);
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", backgroundColor: "#131314", color: "#e3e3e3", overflow: "hidden", position: "relative" }}>
      {/* Sidebar with Tooltips on Hover */}
      <aside style={{ width: "72px", backgroundColor: "#131314", borderRight: "1px solid #28292a", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", padding: "16px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "22px" }}>
          
          {/* Menu */}
          <div style={{ position: "relative" }} onMouseEnter={() => setHoveredIcon("Menu")} onMouseLeave={() => setHoveredIcon(null)}>
            <button onClick={() => setActiveTab("chat")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <svg style={{ width: "24px", height: "24px", fill: "#e3e3e3" }} viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
            </button>
            {hoveredIcon === "Menu" && <span style={{ position: "absolute", left: "50px", top: "0", backgroundColor: "#28292a", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 10 }}>Menu</span>}
          </div>

          {/* New Chat */}
          <div style={{ position: "relative" }} onMouseEnter={() => setHoveredIcon("New Chat")} onMouseLeave={() => setHoveredIcon(null)}>
            <button onClick={() => { setMessages([]); setActiveTab("chat"); }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <svg style={{ width: "24px", height: "24px", fill: "#c084fc" }} viewBox="0 0 24 24"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>
            </button>
            {hoveredIcon === "New Chat" && <span style={{ position: "absolute", left: "50px", top: "0", backgroundColor: "#28292a", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 10 }}>New Chat</span>}
          </div>

          {/* Search Chats */}
          <div style={{ position: "relative" }} onMouseEnter={() => setHoveredIcon("Search Chats")} onMouseLeave={() => setHoveredIcon(null)}>
            <button onClick={() => setActiveTab("search")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <svg style={{ width: "22px", height: "22px", fill: activeTab === "search" ? "#60a5fa" : "#888" }} viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
            </button>
            {hoveredIcon === "Search Chats" && <span style={{ position: "absolute", left: "50px", top: "0", backgroundColor: "#28292a", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 10 }}>Search Chats</span>}
          </div>

          {/* Students */}
          <div style={{ position: "relative" }} onMouseEnter={() => setHoveredIcon("Students")} onMouseLeave={() => setHoveredIcon(null)}>
            <button onClick={() => setActiveTab("students")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <svg style={{ width: "22px", height: "22px", fill: activeTab === "students" ? "#60a5fa" : "#888" }} viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>
            </button>
            {hoveredIcon === "Students" && <span style={{ position: "absolute", left: "50px", top: "0", backgroundColor: "#28292a", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 10 }}>Students</span>}
          </div>

          {/* Images */}
          <div style={{ position: "relative" }} onMouseEnter={() => setHoveredIcon("Images")} onMouseLeave={() => setHoveredIcon(null)}>
            <button onClick={() => setActiveTab("images")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <svg style={{ width: "22px", height: "22px", fill: activeTab === "images" ? "#60a5fa" : "#888" }} viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
            </button>
            {hoveredIcon === "Images" && <span style={{ position: "absolute", left: "50px", top: "0", backgroundColor: "#28292a", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 10 }}>Images</span>}
          </div>

          {/* Videos */}
          <div style={{ position: "relative" }} onMouseEnter={() => setHoveredIcon("Videos")} onMouseLeave={() => setHoveredIcon(null)}>
            <button onClick={() => setActiveTab("videos")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <svg style={{ width: "22px", height: "22px", fill: activeTab === "videos" ? "#60a5fa" : "#888" }} viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>
            </button>
            {hoveredIcon === "Videos" && <span style={{ position: "absolute", left: "50px", top: "0", backgroundColor: "#28292a", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 10 }}>Videos</span>}
          </div>

          {/* Library */}
          <div style={{ position: "relative" }} onMouseEnter={() => setHoveredIcon("Library")} onMouseLeave={() => setHoveredIcon(null)}>
            <button onClick={() => setActiveTab("library")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <svg style={{ width: "22px", height: "22px", fill: activeTab === "library" ? "#60a5fa" : "#888" }} viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0-2-.9-2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
            </button>
            {hoveredIcon === "Library" && <span style={{ position: "absolute", left: "50px", top: "0", backgroundColor: "#28292a", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 10 }}>Library</span>}
          </div>

        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          {/* Settings Button */}
          <div style={{ position: "relative" }} onMouseEnter={() => setHoveredIcon("Settings")} onMouseLeave={() => setHoveredIcon(null)}>
            <button onClick={() => setActiveTab("settings")} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <svg style={{ width: "22px", height: "22px", fill: activeTab === "settings" ? "#60a5fa" : "#888" }} viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.47l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.47l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            </button>
            {hoveredIcon === "Settings" && <span style={{ position: "absolute", left: "50px", top: "0", backgroundColor: "#28292a", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", whiteSpace: "nowrap", zIndex: 10 }}>Settings</span>}
          </div>

          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#fff", fontSize: "14px" }}>
            S
          </div>
        </div>
      </aside>

      {/* Main Section */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
        <header style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "18px", fontWeight: 600, background: "linear-gradient(90deg, #60a5fa, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Aura</span>
          <span style={{ fontSize: "12px", backgroundColor: "#1e1f20", padding: "6px 12px", borderRadius: "20px", border: "1px solid #333" }}>Aura 3.6 Flash</span>
        </header>

        {/* Dynamic Tabs view */}
        {activeTab === "search" ? (
          <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto", width: "100%" }}>
            <h2 style={{ fontSize: "24px", marginBottom: "20px" }}>Search Saved Chats</h2>
            <input 
              type="text" 
              placeholder="Search previous queries..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "12px 16px", backgroundColor: "#1e1f20", border: "1px solid #444", borderRadius: "12px", color: "#fff", fontSize: "15px", outline: "none", marginBottom: "20px" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {savedChats.filter(c => c.toLowerCase().includes(searchQuery.toLowerCase())).map((chat, idx) => (
                <div key={idx} onClick={() => { setActiveTab("chat"); sendMessage(chat); }} style={{ padding: "12px 16px", backgroundColor: "#1e1f20", border: "1px solid #333", borderRadius: "12px", cursor: "pointer" }}>
                  {chat}
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === "students" ? (
          <div style={{ padding: "40px", textAlign: "center" }}><h2>Students Workspace & Study Tools</h2><p style={{ color: "#888", marginTop: "10px" }}>Access learning modules and summaries here.</p></div>
        ) : activeTab === "images" ? (
          <div style={{ padding: "40px", textAlign: "center" }}><h2>Generated Images Gallery</h2><p style={{ color: "#888", marginTop: "10px" }}>Your AI-generated imagery appears here.</p></div>
        ) : activeTab === "videos" ? (
          <div style={{ padding: "40px", textAlign: "center" }}><h2>Video Generation Hub</h2><p style={{ color: "#888", marginTop: "10px" }}>Create and manage cinematic video prompts.</p></div>
        ) : activeTab === "library" ? (
          <div style={{ padding: "40px", textAlign: "center" }}><h2>Prompt Library</h2><p style={{ color: "#888", marginTop: "10px" }}>Saved prompts and custom instructions.</p></div>
        ) : activeTab === "settings" ? (
          <div style={{ padding: "40px", maxWidth: "500px", margin: "0 auto", width: "100%" }}>
            <h2 style={{ fontSize: "24px", marginBottom: "20px" }}>Settings</h2>
            <div style={{ backgroundColor: "#1e1f20", padding: "20px", borderRadius: "16px", border: "1px solid #333", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Theme</span><span style={{ color: "#888" }}>Dark Mode</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Active Model</span><span style={{ color: "#888" }}>Aura 3.6 Flash</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Developer</span><span style={{ color: "#888" }}>Sefvan</span></div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
            <h1 style={{ fontSize: "40px", fontWeight: 600, marginBottom: "24px", background: "linear-gradient(90deg, #60a5fa, #c084fc, #f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Where should we start?
            </h1>

            <div style={{ width: "100%", maxWidth: "650px", position: "relative" }}>
              {showMenu && (
                <div style={{ position: "absolute", bottom: "75px", left: "12px", backgroundColor: "#1e1f20", border: "1px solid #333", borderRadius: "16px", padding: "8px 0", width: "240px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 100, display: "flex", flexDirection: "column" }}>
                  <button onClick={() => handleFeatureClick("Add photos and files")} style={{ background: "none", border: "none", color: "#e3e3e3", padding: "10px 16px", textAlign: "left", fontSize: "14px", cursor: "pointer" }}>📎 Add photos and files</button>
                  <button onClick={() => handleFeatureClick("Add from Drive")} style={{ background: "none", border: "none", color: "#e3e3e3", padding: "10px 16px", textAlign: "left", fontSize: "14px", cursor: "pointer" }}>📁 Add from Drive</button>
                  <div style={{ height: "1px", backgroundColor: "#333", margin: "4px 0" }}></div>
                  <button onClick={() => handleFeatureClick("Create image")} style={{ background: "none", border: "none", color: "#e3e3e3", padding: "10px 16px", textAlign: "left", fontSize: "14px", cursor: "pointer" }}>🖼️ Create image</button>
                  <button onClick={() => handleFeatureClick("Create video")} style={{ background: "none", border: "none", color: "#e3e3e3", padding: "10px 16px", textAlign: "left", fontSize: "14px", cursor: "pointer" }}>🎬 Create video</button>
                  <button onClick={() => handleFeatureClick("Create music")} style={{ background: "none", border: "none", color: "#e3e3e3", padding: "10px 16px", textAlign: "left", fontSize: "14px", cursor: "pointer" }}>🎵 Create music</button>
                </div>
              )}

              <form 
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                style={{ backgroundColor: "#1e1f20", border: "1px solid #444", borderRadius: "28px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
              >
                <button 
                  type="button" 
                  onClick={() => setShowMenu(!showMenu)}
                  style={{ background: "none", border: "none", color: "#aaa", fontSize: "20px", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title="Add files or features"
                >
                  +
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={isListening ? "Listening..." : "Ask Aura"}
                  style={{ flex: 1, backgroundColor: "transparent", border: "none", color: "#fff", fontSize: "16px", outline: "none" }}
                />

                <span style={{ fontSize: "12px", color: "#aaa", backgroundColor: "#28292a", padding: "4px 10px", borderRadius: "12px" }}>Flash-Lite</span>

                <button
                  type="button"
                  onClick={handleVoiceInput}
                  style={{ background: "none", border: "none", color: isListening ? "#f472b6" : "#aaa", cursor: "pointer", padding: "6px", fontSize: "16px" }}
                  title="Use voice input"
                >
                  🎙️
                </button>

                <button
                  type="submit"
                  disabled={!input.trim()}
                  style={{ backgroundColor: input.trim() ? "#fff" : "#333", color: input.trim() ? "#000" : "#777", border: "none", width: "36px", height: "36px", borderRadius: "50%", cursor: input.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}
                >
                  ↑
                </button>
              </form>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "20px" }}>
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(item)}
                    style={{ backgroundColor: "#1e1f20", border: "1px solid #333", color: "#ccc", padding: "8px 16px", borderRadius: "20px", fontSize: "13px", cursor: "pointer" }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: "30px", fontSize: "12px", color: "#777" }}>
              Aura is AI and can make mistakes.
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 80px", display: "flex", flexDirection: "column", gap: "24px" }}>
              {messages.map((msg, index) => (
                <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", width: "100%" }}>
                  {msg.role === "user" ? (
                    <div style={{ maxWidth: "75%", padding: "12px 18px", borderRadius: "20px", backgroundColor: "#2b2c2f", color: "#fff", fontSize: "15px", lineHeight: "1.5" }}>
                      {msg.content}
                    </div>
                  ) : (
                    <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ color: "#e3e3e3", fontSize: "15px", lineHeight: "1.6" }}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      <div style={{ display: "flex", gap: "16px", color: "#aaa", marginTop: "4px", fontSize: "15px" }}>
                        <span title="Good response" style={{ cursor: "pointer" }}>👍</span>
                        <span title="Bad response" style={{ cursor: "pointer" }}>👎</span>
                        <span title="Modify / Regenerate" style={{ cursor: "pointer" }}>🔄</span>
                        <span title="Copy" style={{ cursor: "pointer" }} onClick={() => navigator.clipboard.writeText(msg.content)}>📋</span>
                        <span title="More" style={{ cursor: "pointer" }}>⋯</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <div style={{ color: "#888", fontSize: "14px" }}>
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: "16px", maxWidth: "750px", margin: "0 auto", width: "100%", position: "relative" }}>
              {showMenu && (
                <div style={{ position: "absolute", bottom: "75px", left: "16px", backgroundColor: "#1e1f20", border: "1px solid #333", borderRadius: "16px", padding: "8px 0", width: "240px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 100, display: "flex", flexDirection: "column" }}>
                  <button onClick={() => handleFeatureClick("Add photos and files")} style={{ background: "none", border: "none", color: "#e3e3e3", padding: "10px 16px", textAlign: "left", fontSize: "14px", cursor: "pointer" }}>📎 Add photos and files</button>
                  <button onClick={() => handleFeatureClick("Add from Drive")} style={{ background: "none", border: "none", color: "#e3e3e3", padding: "10px 16px", textAlign: "left", fontSize: "14px", cursor: "pointer" }}>📁 Add from Drive</button>
                  <div style={{ height: "1px", backgroundColor: "#333", margin: "4px 0" }}></div>
                  <button onClick={() => handleFeatureClick("Create image")} style={{ background: "none", border: "none", color: "#e3e3e3", padding: "10px 16px", textAlign: "left", fontSize: "14px", cursor: "pointer" }}>🖼️ Create image</button>
                  <button onClick={() => handleFeatureClick("Create video")} style={{ background: "none", border: "none", color: "#e3e3e3", padding: "10px 16px", textAlign: "left", fontSize: "14px", cursor: "pointer" }}>🎬 Create video</button>
                  <button onClick={() => handleFeatureClick("Create music")} style={{ background: "none", border: "none", color: "#e3e3e3", padding: "10px 16px", textAlign: "left", fontSize: "14px", cursor: "pointer" }}>🎵 Create music</button>
                </div>
              )}

              <form 
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                style={{ backgroundColor: "#1e1f20", border: "1px solid #444", borderRadius: "28px", padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
              >
                <button 
                  type="button" 
                  onClick={() => setShowMenu(!showMenu)}
                  style={{ background: "none", border: "none", color: "#aaa", fontSize: "20px", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title="Add files or features"
                >
                  +
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={isListening ? "Listening..." : "Ask Aura"}
                  style={{ flex: 1, backgroundColor: "transparent", border: "none", color: "#fff", fontSize: "16px", outline: "none" }}
                />

                <button
                  type="button"
                  onClick={handleVoiceInput}
                  style={{ background: "none", border: "none", color: isListening ? "#f472b6" : "#aaa", cursor: "pointer", padding: "6px", fontSize: "16px" }}
                  title="Use voice input"
                >
                  🎙️
                </button>

                <button
                  type="submit"
                  disabled={!input.trim()}
                  style={{ backgroundColor: input.trim() ? "#fff" : "#333", color: input.trim() ? "#000" : "#777", border: "none", width: "36px", height: "36px", borderRadius: "50%", cursor: input.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}
                >
                  ↑
                </button>
              </form>
              <div style={{ textAlign: "center", marginTop: "8px", fontSize: "11px", color: "#777" }}>
                Aura is AI and can make mistakes.
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
