import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import axios from "axios";
import "./ChatApp.css";
import SourcePopup from "../components/SourcePopup";
import PolicyPdfPopup from "../components/PolicyPdfPopup";
import PolicyDiffCompare from "../components/PolicyDiffCompare";



const Typewriter = ({ text, delay = 20, onComplete, onUpdate, formatFn }) => {
  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const words = useMemo(() => text.split(" "), [text]);

  useEffect(() => {
    if (currentIndex < words.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prev => prev + (currentIndex > 0 ? " " : "") + words[currentIndex]);
        setCurrentIndex(prev => prev + 1);
        if (onUpdate) onUpdate(); 
      }, delay);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, words, delay, onComplete, onUpdate]);

  return <span>{formatFn ? formatFn(currentText) : currentText}</span>;
};

function ChatApp() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState({});


  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);


  const [popupSource, setPopupSource] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [showPolicies, setShowPolicies] = useState(false);
  const [showDiffCompare, setShowDiffCompare] = useState(false);


  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showPdfPopup, setShowPdfPopup] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);


  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackStars, setFeedbackStars] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);


  const [sidebarSearch, setSidebarSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [currentHitIndex, setCurrentHitIndex] = useState(-1);
  const [totalHits, setTotalHits] = useState(0);

  const [greetingText, setGreetingText] = useState("");
  const [showLogoutBye, setShowLogoutBye] = useState(false);
  const [selectedModel, setSelectedModel] = useState("phi3:mini");
  const [modelStats, setModelStats] = useState(() => {
    const saved = localStorage.getItem("modelStats");
    if (saved) return JSON.parse(saved);
    return {
      "phi3:mini": { total: 0, count: 0, avg: 0 },
      "qwen3.5:2b": { total: 0, count: 0, avg: 0 },
      "bitnet": { total: 0.05, count: 1, avg: 0.05 }
    };
  });
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const speechRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQ(transcript);



        send(transcript);
      };
      recognition.onerror = () => setIsListening(false);

      recognitionRef.current = recognition;
    }

  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      window.speechSynthesis.cancel(); 
      recognitionRef.current?.start();
    }
  };

  const handleSpeak = (text, index) => {

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }


    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);


    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v =>
      v.name.includes("Google UK English Female") ||
      v.name.includes("Serena")
    );
    if (premiumVoice) utterance.voice = premiumVoice;

    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
    speechRef.current = utterance;
  };

  const [suggestions] = useState([
    "What is the minimum attendance required?",
    "What are the rules for university email use?",
    "How do I report a sexual harassment case?",
    "Can I use the SRM logo on my presentation?"
  ]);

  const messagesEndRef = useRef(null);
  const chatWindowRef = useRef(null);


  const [placeholderText] = useState("Type a question...");
  const inputRef = useRef(null);


  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [q]);

  const createNewChat = useCallback(() => {
    const newSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      timestamp: new Date().toISOString()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setError("");
    setQ("");
  }, []);

  const switchSession = (id) => {
    setCurrentSessionId(id);
    setError("");
    setQ("");
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (id === currentSessionId) {
        if (filtered.length > 0) {
          setCurrentSessionId(filtered[0].id);
        } else {

          const fresh = {
            id: Date.now().toString(),
            title: "New Chat",
            messages: [],
            timestamp: new Date().toISOString()
          };
          setCurrentSessionId(fresh.id);
          return [fresh];
        }
      }
      return filtered;
    });
  };

  const updateSessionMessages = (sessionId, newMessages) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {

        let title = s.title;
        if (s.messages.length === 0 && newMessages.length > 0) {
          const firstMsg = newMessages[0].text;
          title = firstMsg.length > 30 ? firstMsg.substring(0, 30) + "..." : firstMsg;
        }
        return { ...s, messages: newMessages, title };
      }
      return s;
    }));
  };




  useEffect(() => {
    if (isAuthenticated && userEmail && isSidebarOpen) {

      const match = userEmail.match(/^([^@._]+)/);
      const namePart = match ? match[1] : "User";
      const firstName = namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
      const fullGreeting = `Hi ${firstName}!`;

      let i = 0;
      setGreetingText("");
      const timer = setInterval(() => {
        if (i < fullGreeting.length) {
          setGreetingText(fullGreeting.slice(0, i + 1));
          i++;
        } else {
          clearInterval(timer);
        }
      }, 100);
      return () => clearInterval(timer);
    } else if (!isSidebarOpen) {
      setGreetingText(""); 
    }
  }, [isAuthenticated, userEmail, isSidebarOpen]);


  const conversation = useMemo(() => sessions.find(s => s.id === currentSessionId)?.messages || [], [sessions, currentSessionId]);

  const modelRef = useRef(selectedModel);
  const sessionIdRef = useRef(currentSessionId);
  const conversationRef = useRef(conversation);


  useEffect(() => { modelRef.current = selectedModel; }, [selectedModel]);
  useEffect(() => { sessionIdRef.current = currentSessionId; }, [currentSessionId]);
  useEffect(() => { conversationRef.current = conversation; }, [conversation]);


  const scrollToBottom = useCallback(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
    const msgContainer = document.querySelector('.messages-container');
    if (msgContainer) {
      msgContainer.scrollTop = msgContainer.scrollHeight;
    }
    const mainArea = document.querySelector('.chat-main-area');
    if (mainArea) {
      mainArea.scrollTop = mainArea.scrollHeight;
    }
  }, []);

  useEffect(() => {

    if (!chatSearch.trim()) {
      scrollToBottom();
    }

  }, [conversation, isTyping, scrollToBottom]);


  useEffect(() => {
    if (!chatSearch.trim()) {
      setTotalHits(0);
      setCurrentHitIndex(-1);
      return;
    }

    const escaped = chatSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let count = 0;
    try {
      const regex = new RegExp(escaped, 'gi');
      conversation.forEach((msg, i) => {
        if (msg.text) {
          const matches = msg.text.match(regex);
          if (matches) count += matches.length;
        }


        if (msg.sources) {
          let hasSourceMatch = false;
          msg.sources.forEach(src => {
            const srcText = (src.text_snippet || src.text || "");
            const srcMatches = srcText.match(regex);
            if (srcMatches) {
              count += srcMatches.length;
              hasSourceMatch = true;
            }
          });

          if (hasSourceMatch && !expandedEvidence[i]) {
            setExpandedEvidence(prev => ({ ...prev, [i]: true }));
          }
        }
      });
    } catch (e) {
      console.warn("Search error:", e);
    }

    setTotalHits(count);
    setCurrentHitIndex(count > 0 ? 0 : -1);
  }, [chatSearch, conversation, expandedEvidence]);

  const navigateSearch = (direction) => {
    if (totalHits === 0) return;
    if (direction === 'next') {
      setCurrentHitIndex(prev => (prev + 1) % totalHits);
    } else {
      setCurrentHitIndex(prev => (prev - 1 + totalHits) % totalHits);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (totalHits === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      navigateSearch('next');
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      navigateSearch('prev');
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigateSearch('next');
    } else if (e.key === "Escape") {
      setChatSearch("");
    }
  };


  useEffect(() => {
    if (currentHitIndex !== -1) {
      const highlights = document.querySelectorAll('.search-highlight');
      const active = highlights[currentHitIndex];
      if (active) {
        active.scrollIntoView({ behavior: 'smooth', block: 'center' });

        active.classList.add('highlight-focused');
        setTimeout(() => active.classList.remove('highlight-focused'), 1000);
      }
    }
  }, [currentHitIndex, chatSearch]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("userEmail");
    if (savedEmail) {
      setUserEmail(savedEmail);
      setIsAuthenticated(true);


      axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/auth/check`, { email: savedEmail })
        .then(res => {
          if (res.data.valid) {
            setHasSubmittedFeedback(res.data.hasSubmittedFeedback);
            if (res.data.hasSubmittedFeedback) {
              localStorage.setItem(`feedback_${savedEmail}`, "true");
            }
          }
        })
        .catch(err => console.error("Sync error:", err));


      const savedSessions = localStorage.getItem(`chatSessions_${savedEmail}`);
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        if (parsed && parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
        } else {
          createNewChat();
        }
      } else {
        createNewChat();
      }
    }


    axios.get(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/policies`)
      .then(res => setPolicies(res.data))
      .catch(() => setPolicies([]));
  }, [createNewChat]);


  useEffect(() => {
    if (isAuthenticated && userEmail && !hasSubmittedFeedback) {
      if (!localStorage.getItem(`feedback_${userEmail}`)) {
        const timer = setTimeout(() => setShowFeedback(true), 15000);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, userEmail, hasSubmittedFeedback]);


  useEffect(() => {
    if (isAuthenticated && userEmail && sessions.length > 0) {
      localStorage.setItem(`chatSessions_${userEmail}`, JSON.stringify(sessions));
    }
  }, [sessions, isAuthenticated, userEmail]);


  const handlePolicyClick = async (policy) => {
    try {
      const normalizedPolicy = typeof policy === 'string'
        ? { name: policy, page: 0 }
        : {
            name: policy?.name || policy?.pdf || policy?.filename || '',
            page: policy?.page !== undefined ? policy.page : 0,
            highlightText: policy?.highlightText || policy?.text_snippet || policy?.text || ''
          };

      setSelectedPolicy(normalizedPolicy);
      setShowPdfPopup(true);
      setPdfLoading(false);
      setPdfError(null);
    } catch (error) {
      console.error("Error preparing PDF view:", error);
      setPdfError(error.message || "Failed to load PDF");
      setPdfLoading(false);
    }
  };


  const handleClosePdfPopup = () => {
    setShowPdfPopup(false);
    setSelectedPolicy(null);
    setPdfError(null);
  };

  const handleEmailSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoginLoading(true);
    if (otpRequired) {
      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/auth/validate`, {
          email: userEmail,
          otp: otp
        });

        if (response.data.valid) {
          setIsAuthenticated(true);
          setError(""); 
          localStorage.setItem("userEmail", userEmail);
          setHasSubmittedFeedback(response.data.hasSubmittedFeedback);

          if (response.data.hasSubmittedFeedback) {
            localStorage.setItem(`feedback_${userEmail}`, "true");
          }

          localStorage.setItem(`otp_verified_${userEmail}`, Date.now().toString());
        }
      } catch (error) {
        setError(error.response?.data?.error || "Invalid OTP. Please try again.");
      } finally {
        setLoginLoading(false);
      }
    } else {
      setError("");


      const lastVerified = localStorage.getItem(`otp_verified_${userEmail}`);
      if (lastVerified) {
        const timePassed = Date.now() - parseInt(lastVerified);
        const twoHours = 2 * 60 * 60 * 1000;

        if (timePassed < twoHours) {
          setIsAuthenticated(true);
          localStorage.setItem("userEmail", userEmail);
          setLoginLoading(false);
          return; 
        }
      }

      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/auth/request-otp`, {
          email: userEmail
        });

        if (response.data.bypass) {

          setIsAuthenticated(true);
          localStorage.setItem("userEmail", userEmail);

          if (response.data.hasSubmittedFeedback) {
            setHasSubmittedFeedback(true);
            localStorage.setItem(`feedback_${userEmail}`, "true");
          }

          localStorage.setItem(`otp_verified_${userEmail}`, Date.now().toString());
          return;
        }

        if (response.data.success) {
          setOtpRequired(true);
          setError("OTP sent successfully!");
        }
      } catch (error) {
        setError(error.response?.data?.error || "Invalid email domain. Please use @srmap.edu.in");
      } finally {
        setLoginLoading(false);
      }
    }
  };

  const handleLoginKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleEmailSubmit(e);
    }
  };

  const handleSuggestionClick = (s) => {
    setQ(s);

    setTimeout(() => {
      const btn = document.getElementById('send-btn');
      if (btn) btn.click();
    }, 50);
  };




  const closeSourcePopup = () => {
    setPopupSource(null);
  };


  const handleReportInaccuracy = (msgIndex) => {
    alert("Thank you for your feedback! This response has been flagged for review by the administrators to improve accuracy.");
  };

  const send = async (voiceQuestion = null) => {

    const isVoice = typeof voiceQuestion === 'string';
    const questionToAsk = isVoice ? voiceQuestion : q;

    if (!questionToAsk || typeof questionToAsk !== 'string' || !questionToAsk.trim()) {
      setError("Please enter a question");
      return;
    }


    let sessionId = sessionIdRef.current;
    let currentMessages = conversationRef.current;

    if (!sessionId) {
      const newSession = {
        id: Date.now().toString(),
        title: "New Chat",
        messages: [],
        timestamp: new Date().toISOString() 
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      sessionId = newSession.id;
      currentMessages = [];

      sessionIdRef.current = sessionId;
    }

    const userMessage = {
      type: "user",
      text: questionToAsk,
      time: new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(new Date()),
      isNew: true
    };

    const updatedMessages = [...currentMessages, userMessage];
    updateSessionMessages(sessionId, updatedMessages);

    setLoading(true);
    setError("");

    const question = questionToAsk;
    setQ("");

    try {
      const startTime = performance.now();
      const currentMod = modelRef.current; 
      const res = await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/chat`, {
        question: question,
        user_email: localStorage.getItem("userEmail"),
        model: currentMod
      });
      const endTime = performance.now();
      const fetchTime = ((endTime - startTime) / 1000).toFixed(2);

      setIsTyping(true);
      await new Promise(r => setTimeout(r, 800));

      const botMessage = {
        type: "bot",
        text: res.data.answer,
        time: new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).format(new Date()),
        fetchTime: fetchTime,
        sources: res.data.sources || [],
        isNew: true,
        chatId: res.data.chat_id
      };


      setModelStats(prev => {
        const stats = prev[currentMod] || { total: 0, count: 0, avg: 0 };
        const newTotal = stats.total + parseFloat(fetchTime);
        const newCount = stats.count + 1;
        const newAvg = (newTotal / newCount).toFixed(2);
        const updated = {
          ...prev,
          [currentMod]: { total: newTotal, count: newCount, avg: parseFloat(newAvg) }
        };

        localStorage.setItem("modelStats", JSON.stringify(updated));
        return updated;
      });

      updateSessionMessages(sessionId, [...updatedMessages, botMessage]);
      setIsTyping(false);



      if (document.activeElement?.className?.includes('mic-btn') || isListening) {
        handleSpeak(res.data.answer, updatedMessages.length);
      }

    } catch (error) {
      if (error.response?.status === 403) {
        setError("Access denied. Please login with @srmap.edu.in email");
        setIsAuthenticated(false);
        localStorage.removeItem("userEmail");
      } else {
        setError("Backend not responding. Please make sure the server is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !loading) {
      e.preventDefault();
      send();
    }
  };

  const handleSatisfaction = async (chatId, satisfaction, msgIndex) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || `${process.env.REACT_APP_API_URL || "http://localhost:5001"}`}/chat/${chatId}/satisfaction`, {
        satisfaction: satisfaction
      });

      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMessages = [...s.messages];
          if (updatedMessages[msgIndex]) {
            updatedMessages[msgIndex].satisfactionGiven = satisfaction;
          }
          return { ...s, messages: updatedMessages };
        }
        return s;
      }));
    } catch (e) {
      console.error("Error saving satisfaction:", e);
    }
  };


  const handleLogout = () => {
    setShowLogoutBye(true);
  };

  const confirmLogout = () => {
    setIsAuthenticated(false);
    setUserEmail("");
    localStorage.removeItem("userEmail");



    window.location.reload();
  };

  const formatText = (text, sources = [], chatSearchText = chatSearch) => {
    if (!text) return "";

    const lines = text.split("\n");
    const escapedSearch = chatSearchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return lines.map((l, i) => {
      let content = l;
      const footnoteRegex = /\[(\d+)\]/g;
      const parts = l.split(footnoteRegex);

      content = parts.map((part, index) => {
        if (index % 2 === 1) { 
          const num = parseInt(part);
          const source = sources[num - 1];
          if (source) {
            return (
              <sup key={index} className="footnote-sup"
                onClick={() => handlePolicyClick({
                  name: source.pdf,
                  highlightText: source.text_snippet || source.text,
                  page: source.page
                })}
                title={`Source: ${source.pdf} - Click to open`}>
                [{num}]
              </sup>
            );
          }
          return `[${part}]`;
        }


        if (chatSearchText.trim() && part.toLowerCase().includes(chatSearchText.toLowerCase())) {
          const subParts = part.split(new RegExp(`(${escapedSearch})`, 'gi'));
          return subParts.map((sub, sIdx) =>
            sub.toLowerCase() === chatSearchText.toLowerCase() ?
              <span key={sIdx} className="search-highlight">{sub}</span> : sub
          );
        }
        return part;
      });

      return (
        <React.Fragment key={i}>
          {content}
          {i !== lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  const submitFeedback = async () => {
    if (feedbackStars === 0) return;
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || "http://localhost:5001"}/feedback`, {
        user_email: userEmail,
        stars: feedbackStars,
        review: feedbackText
      });
      localStorage.setItem(`feedback_${userEmail}`, "true");
      setFeedbackSubmitted(true);
      setHasSubmittedFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    } catch (e) {
      console.error("Error submitting feedback:", e);
    }
  };


  if (!isAuthenticated) {
    return (
      <div className="app-container page-entrance">
        <div className="email-login-card">

          <div className="login-branding">
            <img
              src="/plogo.png"
              alt="SRM University"
              style={{ objectFit: 'contain' }}
            />
            <h2>PolicyHub AI</h2>
            <p>Your AI-powered assistant for instant, accurate policy insights at SRM University AP.</p>
          </div>


          <div className="login-form-panel">
            <div className="login-header" style={{ width: '100%', maxWidth: '360px', marginTop: '40px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '6px', color: '#0f172a' }}>Sign In</h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0' }}>Access with your university email</p>
              <div className="accent-line"></div>
            </div>

            <form onSubmit={handleEmailSubmit} className="login-form" style={{ width: '100%', maxWidth: '360px' }}>
              <div className="form-group">
                <label>University Email</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="username@srmap.edu.in"
                  className="email-input"
                  required
                  pattern=".*@srmap\.edu\.in$"
                  title="Must be @srmap.edu.in email"
                  disabled={otpRequired || loginLoading}
                  onKeyDown={handleLoginKeyDown}
                />
              </div>

              {otpRequired && (
                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>One-Time Password (OTP)</label>
                  <input
                    type="password"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="email-input"
                    required
                    maxLength={6}
                    disabled={loginLoading}
                    onKeyDown={handleLoginKeyDown}
                  />
                  <div style={{ fontSize: '12px', marginTop: '5px', cursor: 'pointer', color: '#0f172a' }}
                    onClick={() => { setOtpRequired(false); setOtp(""); setError(""); }}>
                    Change Email
                  </div>
                </div>
              )}

              {error && (
                <div className="error-message" style={{ color: error.includes("successfully") ? 'green' : '' }}>
                  {error.includes("successfully") ? '✅ ' : '⚠️ '} {error}
                </div>
              )}

              <button type="submit" className={`login-btn ${loginLoading ? 'loading' : ''}`} disabled={loginLoading}>
                {loginLoading ? (
                  <span className="btn-spinner"></span>
                ) : (
                  otpRequired ? "Verify OTP" : "Send OTP"
                )}
              </button>
            </form>

            <div className="login-footer" style={{ width: '100%', maxWidth: '360px' }}>
              <p>Only @srmap.edu.in emails are allowed</p>
              <p className="admin-hint">
                Admin? <a href="/admin" onClick={(e) => { e.preventDefault(); window.location.href = '/admin'; }}>Login here</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }




  return (
    <div className="app-container">

      <aside className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-greeting">
            {greetingText}
            {isSidebarOpen && <span className="typewriter-cursor">|</span>}
          </div>
          <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(false)}>
            <span className="toggle-icon">◀</span>
          </button>
        </div>

        <div className="sidebar-search-container">
          <input
            type="text"
            placeholder="Search chats..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            className="sidebar-search-input"
          />
        </div>

        <div className="sidebar-sessions">
          <div className="session-group-label">Recent Chats</div>
          {sessions
            .filter(s => s.title.toLowerCase().includes(sidebarSearch.toLowerCase()))
            .map(session => (
              <div
                key={session.id}
                className={`session-item ${session.id === currentSessionId ? 'active' : ''}`}
                onClick={() => switchSession(session.id)}
              >
                <span className="session-icon">💬</span>
                <span className="session-title">{session.title}</span>
                <button className="delete-session-btn" onClick={(e) => deleteSession(e, session.id)} title="Delete Chat">
                  🗑️
                </button>
              </div>
            ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile-row">
            <span className="user-avatar-icon">👤</span>
            <span className="user-name-text">
              {(() => {
                const localPart = userEmail.split('@')[0];
                return localPart
                  .split(/[._]/)
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                  .join(' ');
              })()}
            </span>
          </div>
          <button className="logout-sidebar-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>


      {!isSidebarOpen && (
        <button className="sidebar-open-btn" onClick={() => setIsSidebarOpen(true)}>
          <span className="toggle-icon">▶</span>
        </button>
      )}

      <div className="chat-container">
        <div className="chat-main-area">


          {popupSource && (
            <SourcePopup
              source={popupSource}
              onClose={closeSourcePopup}
              onOpenPdf={(src) => {
                closeSourcePopup();
                handlePolicyClick({ name: src.pdf, highlightText: src.text_snippet, page: src.page });
              }}
            />
          )}


          {showPdfPopup && (
            <PolicyPdfPopup
              policy={selectedPolicy}
              onClose={handleClosePdfPopup}
              loading={pdfLoading}
              error={pdfError}
            />
          )}


          {showDiffCompare && (
            <PolicyDiffCompare
              policies={policies}
              credentials={{ username: "", password: "" }}
              onClose={() => setShowDiffCompare(false)}
            />
          )}


          <header className="chat-header">
            <div className="header-content">
              <div className="title-group">
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <img
                    src="/plogo.png"
                    alt="SRM Logo"
                    style={{
                      width: '36px',
                      height: '36px',
                      objectFit: 'contain'
                    }}
                  />
                  <span className="app-title">
                    <span className="app-title-main">PolicyHub</span>
                    <span className="app-title-accent"> AI</span>
                  </span>
                  <button
                    className={`policy-bulb-btn ${showPolicies ? 'active' : ''}`}
                    title="Show available policies"
                    onClick={() => setShowPolicies(!showPolicies)}
                  >
                    💡
                  </button>
                </div>
              </div>
            </div>
            <div className="header-actions">
              <div className="chat-search-container">
                <i className="fas fa-search search-icon-left"></i>
                <input
                  type="text"
                  placeholder="Search in chat..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="chat-search-input"
                  aria-label="Search in current chat"
                />

                {chatSearch && (
                  <div className={`search-results-tab ${totalHits >= 0 ? 'visible' : ''}`}>
                    <span className="search-stats">
                      {totalHits > 0 ? `${currentHitIndex + 1} of ${totalHits}` : 'No results'}
                    </span>
                    <div className="search-nav-btns">
                      <button
                        className="search-nav-btn"
                        onClick={() => navigateSearch('prev')}
                        disabled={totalHits === 0}
                        title="Previous match"
                      >
                        <i className="fas fa-chevron-up"></i>
                      </button>
                      <button
                        className="search-nav-btn nav-btn-primary"
                        onClick={() => navigateSearch('next')}
                        disabled={totalHits === 0}
                        title="Next match (Apparent)"
                      >
                        <i className="fas fa-chevron-down"></i>
                      </button>
                    </div>
                    <div className="tab-divider"></div>
                    <button className="clear-search-btn" onClick={() => setChatSearch("")} aria-label="Clear search">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                )}
              </div>
              <button
                className="header-comparison-btn"
                onClick={() => setShowDiffCompare(true)}
                title="Compare different policy versions"
              >
                🔀 Comparison
              </button>
              <button className="header-new-chat-btn" onClick={createNewChat}>
                + New Chat
              </button>
            </div>
          </header>


          {showPolicies && (
            <div className="policy-popup">
              <div className="policy-popup-header">
                <b>Available Policies ({policies.length})</b>
                <button onClick={() => setShowPolicies(false)} className="close-popup">×</button>
              </div>

              {policies.length === 0 ? (
                <p>No policies uploaded</p>
              ) : (
                <ul className="policy-list">
                  {policies.map((p, i) => (
                    <li
                      key={i}
                      className="policy-item clickable"
                      onClick={() => handlePolicyClick(p)}
                    >
                      <span className="policy-name">📄 {p.name || p}</span>
                      <span className="policy-badge">{p.pages || '?'} pages</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}


          <div className="main-content">
            <div className="conversation-window" ref={chatWindowRef}>

              {conversation.length === 0 ? (
                <div className="empty-state">
                  <div className="icon-circle">
                    <img
                      src="/plogo.png"
                      alt="SRM University"
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'contain',
                        borderRadius: '80%',
                        padding: '2px'
                      }}
                    />
                  </div>
                  <h3>Welcome to PolicyHub AI – Intelligent Policy Assistance System 🤖</h3>
                  <p>Your AI-powered assistant for instant, accurate policy insights.</p>

                  <div className="suggestions-grid">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        className="suggestion-chip"
                        onClick={() => handleSuggestionClick(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="messages-container">
                  {conversation.map((msg, i) => (
                    <div key={i} className={`message-bubble ${msg.type}-bubble ${msg.isNew ? 'new' : ''} ${msg.isNew && msg.type === "user" ? 'genie-new' : ''}`}>
                      <div className="message-header">
                        <span className={`message-avatar ${msg.type}-avatar`}>
                          {msg.type === "user" ? "Y" : "P"}
                        </span>
                        <div className="message-info">
                          <span className="message-sender">
                            {msg.type === "user" ? "You" : "Policy Assistant"}
                          </span>
                          <span className="message-time">{msg.time}</span>
                        </div>
                      </div>

                      <div className="message-content">
                        {msg.type === "bot" && msg.isNew ? (
                          <Typewriter
                            text={msg.text}
                            onUpdate={scrollToBottom}
                            formatFn={(txt) => formatText(txt, [], chatSearch)}
                            onComplete={() => {

                              const updated = [...conversation];
                              if (updated[i]) updated[i].isNew = false;
                              updateSessionMessages(currentSessionId, updated);
                              scrollToBottom();
                            }}
                          />
                        ) : (
                          formatText(msg.text, msg.sources || [])
                        )}
                      </div>


                      {msg.type === "bot" && msg.sources && msg.sources.length > 0 && (
                        <div className="explain-answer-container">
                          <button
                            className="explain-toggle-btn"
                            onClick={() => setExpandedEvidence(prev => ({ ...prev, [i]: !prev[i] }))}
                          >
                            {expandedEvidence[i] ? "⬇ Hide Evidence" : "🔍 Show Evidence"}
                          </button>

                          <button
                            className={`speak-btn ${speakingIndex === i ? "is-speaking" : ""}`}
                            onClick={() => handleSpeak(msg.text, i)}
                            title={speakingIndex === i ? "Stop Reading" : "Read Aloud"}
                          >
                            {speakingIndex === i ? "🛑 Stop" : "🔊 Read Aloud"}
                          </button>

                          {expandedEvidence[i] && (
                            <div className="evidence-panel page-entrance">
                              <div className="evidence-header">
                                <span>Grounding Context (Raw Sources)</span>
                              </div>
                              <div className="evidence-list">
                                {msg.sources.map((source, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="evidence-item clickable-evidence"
                                    onClick={() => handlePolicyClick({
                                      name: source.pdf,
                                      highlightText: source.text_snippet || source.text,
                                      page: source.page
                                    })}
                                    title={`Click to open ${source.pdf} at page ${source.page + 1}`}
                                  >
                                    <div className="evidence-meta">
                                      <span className="evidence-index">[{sIdx + 1}]</span>
                                      <span className="evidence-source link-style">{source.pdf} - Page {source.page + 1}</span>
                                    </div>
                                    <p className="evidence-text">
                                      "{formatText(source.text_snippet || source.text || "")}"
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.type === "bot" && msg.fetchTime && (
                        <div className="message-fetch-time" style={{ fontSize: '11px', color: '#888', marginTop: '4px', textAlign: 'right' }}>
                          Response time: {msg.fetchTime}s
                        </div>
                      )}



                      {msg.type === "bot" && msg.chatId && !msg.isNew && (
                        <div className="satisfaction-widget">
                          <button
                            className="feedback-btn report-btn"
                            onClick={() => handleReportInaccuracy(i)}
                          >
                            <i className="fas fa-flag"></i> Report Inaccuracy
                          </button>

                          <button
                            className="satisfaction-btn thumbs-up"
                            onClick={() => handleSatisfaction(msg.chatId, true, i)}
                            disabled={msg.satisfactionGiven !== undefined}
                            style={{
                              background: msg.satisfactionGiven === true ? '#e6f4ea' : 'transparent',
                              opacity: msg.satisfactionGiven === false ? 0.4 : 1
                            }}
                          >👍</button>
                          <button
                            className="satisfaction-btn thumbs-down"
                            onClick={() => handleSatisfaction(msg.chatId, false, i)}
                            disabled={msg.satisfactionGiven !== undefined}
                            style={{
                              background: msg.satisfactionGiven === false ? '#fce8e6' : 'transparent',
                              opacity: msg.satisfactionGiven === true ? 0.4 : 1
                            }}
                          >👎</button>
                        </div>
                      )}
                    </div>
                  ))}

                  {isTyping && (
                    <div className="skeleton-bubble">
                      <div className="skeleton-header">
                        <div className="skeleton-avatar"></div>
                        <div className="skeleton-meta">
                          <div className="skeleton-name"></div>
                          <div className="skeleton-time"></div>
                        </div>
                      </div>
                      <div className="skeleton-content">
                        <div className="skeleton-line"></div>
                        <div className="skeleton-line"></div>
                        <div className="skeleton-line"></div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>


            <div className="input-section">
              {error && <div className="error-message">{error}</div>}


              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>

                <div className="model-selector" style={{ marginBottom: 0 }}>
                  <button
                    className={`model-pill ${selectedModel === "qwen3.5:2b" ? "active" : ""}`}
                    onClick={() => setSelectedModel("qwen3.5:2b")}
                    title="Qwen 3.5: High Reasoning Accuracy">
                    <span className="pill-icon">🧠</span> Qwen 3.5
                    <span className="latency-badge">
                      {modelStats["qwen3.5:2b"].avg > 0 ? `${modelStats["qwen3.5:2b"].avg}s (Avg)` : "---"}
                    </span>
                  </button>
                  <button
                    className={`model-pill ${selectedModel === "bitnet" ? "active" : ""}`}
                    onClick={() => setSelectedModel("bitnet")}
                    title="BitNet 1.58b: Sustainable 1-bit AI">
                    <span className="pill-icon">⚡</span> BitNet
                    <span className="latency-badge ultra-fast">
                      {modelStats["bitnet"].avg}s (Low-Energy)
                    </span>
                  </button>
                  <button
                    className={`model-pill ${selectedModel === "phi3:mini" ? "active" : ""}`}
                    onClick={() => setSelectedModel("phi3:mini")}
                    title="Phi-3: Efficient Local Model">
                    <span className="pill-icon">💎</span> Phi-3
                    <span className="latency-badge">
                      {modelStats["phi3:mini"].avg > 0 ? `${modelStats["phi3:mini"].avg}s (Avg)` : "---"}
                    </span>
                  </button>
                </div>


                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); scrollToBottom(); }}
                  className="scroll-to-bottom-btn"
                  title="Scroll to bottom"
                  style={{
                    background: 'var(--color-copper, #2563EB)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                  }}
                >
                  <i className="fas fa-arrow-down"></i>
                </button>
              </div>

              <div className="input-wrapper">
                <button
                  className={`mic-btn ${isListening ? "is-listening" : ""}`}
                  onClick={toggleListening}
                  title="Voice Command"
                  type="button"
                >
                  {isListening ? "⏹️" : "🎙️"}
                </button>
                <textarea
                  ref={inputRef}
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? "Listening..." : (placeholderText || "Type your policy question...")}
                  className="chat-input"
                  disabled={loading}
                  rows="1"
                  style={{ paddingLeft: '50px' }}
                />

                <button
                  id="send-btn"
                  onClick={send}
                  className="send-btn"
                  disabled={loading || !q.trim()}
                >
                  {loading ? (
                    <div className="spinner-small"></div>
                  ) : (
                    <>✈️ Send</>
                  )}
                </button>
              </div>
              <div className="input-hints">
                Press Enter to send • Shift + Enter for new line
              </div>
            </div>
          </div>


          <footer className="app-footer">
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '10px' }}>
              <a href="https://srmap.edu.in" target="_blank" rel="noreferrer" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 500, fontSize: '12.5px', transition: 'color 0.2s' }}>SRM AP Home</a>
              <span style={{ color: '#e2e8f0' }}>·</span>
              <a href="https://srmap.edu.in/library" target="_blank" rel="noreferrer" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 500, fontSize: '12.5px', transition: 'color 0.2s' }}>Library</a>
              <span style={{ color: '#e2e8f0' }}>·</span>
              <a href="https://student.srmap.edu.in" target="_blank" rel="noreferrer" style={{ color: '#64748b', textDecoration: 'none', fontWeight: 500, fontSize: '12.5px', transition: 'color 0.2s' }}>SRM AP Student Portal</a>
            </div>
            <div className="footer-content">
              <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>🔒 PolicyHub AI — Authorized Access Only</span>
              <span className="user-badge">
                {localStorage.getItem("userEmail")}
              </span>
            </div>
          </footer>


          {showFeedback && isAuthenticated && (
            <div className="feedback-widget" style={{
              position: 'fixed', bottom: '20px', left: '20px', background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-backdrop)', padding: '20px', borderRadius: '15px',
              boxShadow: 'var(--shadow-glow)', zIndex: 1000, width: '300px', border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {!feedbackSubmitted ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, color: 'var(--color-navy, #1E293B)' }}>Rate your experience!</h4>
                    <button onClick={() => setShowFeedback(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>×</button>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', fontSize: '24px', cursor: 'pointer', marginBottom: '10px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        onClick={() => setFeedbackStars(star)}
                        style={{ color: star <= feedbackStars ? '#FFD700' : '#ccc' }}
                      >★</span>
                    ))}
                  </div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us what you think..."
                    style={{
                      width: '100%',
                      height: '60px',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      marginBottom: '10px',
                      fontSize: '13px',
                      resize: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                  <button
                    onClick={submitFeedback}
                    disabled={feedbackStars === 0}
                    style={{
                      width: '100%', padding: '8px', background: 'var(--color-copper, #2563EB)',
                      color: 'white', border: 'none', borderRadius: '8px', cursor: feedbackStars === 0 ? 'not-allowed' : 'pointer',
                      opacity: feedbackStars === 0 ? 0.5 : 1
                    }}
                  >
                    Submit
                  </button>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-navy, #1E293B)' }}>
                  <div style={{ fontSize: '30px', marginBottom: '10px' }}>🙏</div>
                  <h4>Thank you for your feedback!</h4>
                </div>
              )}
            </div>
          )}

        </div>
      </div>


      {showLogoutBye && (
        <div className="logout-bye-overlay">
          <div className="logout-bye-modal">
            <div className="logout-bye-icon">😊</div>
            <h3>Hope you had a great experience with PolicyBot AI</h3>
            <p>Thank you for using our intelligent policy assistance system.</p>
            <button className="confirm-logout-btn" onClick={confirmLogout}>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatApp;
