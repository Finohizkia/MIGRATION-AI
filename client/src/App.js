import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { marked } from 'marked';

const LANGUAGES = {
  en: { name: 'English', flag: '🇬🇧', code: 'en' },
  zh: { name: '中文', flag: '🇨🇳', code: 'zh' },
  es: { name: 'Español', flag: '🇪🇸', code: 'es' },
  fr: { name: 'Français', flag: '🇫🇷', code: 'fr' }
};

const AGENTS = {
  australia: [
    {
      company: "LearnStay.World",
      phone: "+61 413892060",
      email: "info@learnstay.world",
      website: "LearnStay.World"
    },
    {
      company: "Wealthskey Migration",
      name: "Ken Poon",
      registration: "2418441",
      phone: "+852 54867893",
      email: "admin@wealthskey.com",
      website: "https://wealthskey.com"
    }
  ],
  britain: [
    {
      company: "Wealthskey Migration",
      phone: "+852 54867893",
      email: "admin@wealthskey.com",
      website: "https://wealthskey.com"
    }
  ],
  canada: [
    {
      company: "LearnStay.World",
      phone: "+61 413892060",
      email: "info@learnstay.world",
      website: "LearnStay.World"
    },
    {
      company: "Wealthskey Migration",
      phone: "+852 54867893",
      email: "admin@wealthskey.com",
      website: "https://wealthskey.com"
    }
  ],
  usa: [
    {
      company: "Wealthskey Migration",
      phone: "+852 54867893",
      email: "admin@wealthskey.com",
      website: "https://wealthskey.com"
    }
  ]
};

function App() {
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [showHybridPlanModal, setShowHybridPlanModal] = useState(false);
  const [showContactAgentModal, setShowContactAgentModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState('login');
  const [useSerpApi, setUseSerpApi] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ai-mmi-token'));
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const chatEndRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false); // Added this line
  // Configure axios to include auth token
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/api/profile');
      setUser(response.data.user);
      setIsAuthenticated(true);
      
      // Check if user needs to upgrade
      if (response.data.user.subscription === 'free' && response.data.user.promptCount >= 5) {
        setShowUpgradeModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      localStorage.removeItem('ai-mmi-token');
      setToken(null);
    }
  };

  useEffect(() => {
    const savedChats = localStorage.getItem('ai-mmi-chats');
    const savedFiles = localStorage.getItem('ai-mmi-files');
    const savedSerpApi = localStorage.getItem('useSerpApi');
    
    if (savedChats) {
      setChatHistory(JSON.parse(savedChats));
    } else if (isAuthenticated) {
      addMessage('ai', "Welcome to AI-MMI Immigration Assistant! How can I help you with your immigration questions today?");
    }
    
    if (savedFiles) {
      setUploadedFiles(JSON.parse(savedFiles));
    }

    if (savedSerpApi) {
      setUseSerpApi(savedSerpApi === 'true');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('ai-mmi-chats', JSON.stringify(chatHistory));
    localStorage.setItem('ai-mmi-files', JSON.stringify(uploadedFiles));
    localStorage.setItem('useSerpApi', useSerpApi.toString());
  }, [chatHistory, uploadedFiles, useSerpApi]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, showSearch, showDocuments]);

  // Check for payment success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment');
    const plan = urlParams.get('plan');
    
    if (paymentSuccess === 'success' && plan) {
      alert(`Payment successful! Your ${plan} plan has been activated.`);
      fetchUserProfile();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const addMessage = (role, content, files = []) => {
    const newMessage = {
      role,
      content,
      files,
      timestamp: new Date().toISOString()
    };
    setChatHistory(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!input && uploadedFiles.length === 0) return;
    
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    
    const userMessage = input;
    addMessage('user', userMessage, uploadedFiles);
    setInput('');
    setUploadedFiles([]);
    setShowFileUpload(false);
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('message', userMessage);
      formData.append('useSerpApi', useSerpApi.toString());
      
      uploadedFiles.forEach(file => {
        formData.append('files', file, file.name);
      });

      const response = await axios.post('/api/chat', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      addMessage('ai', response.data.response);
      
      // Update user prompt count
      if (user && user.subscription === 'free') {
        setUser({
          ...user,
          promptCount: response.data.promptCount
        });
        
        // Show upgrade modal if reached limit
        if (response.data.promptCount >= 5) {
          setShowUpgradeModal(true);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (error.response?.status === 402 && error.response.data.requiresUpgrade) {
        setShowUpgradeModal(true);
        addMessage('ai', "You've reached your free prompt limit. Please upgrade your subscription to continue using AI-MMI.");
      } else {
        addMessage('ai', "Sorry, I encountered an error processing your request. Please try again later.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file => file.size <= 5 * 1024 * 1024);
    if (files.length !== e.target.files.length) {
      alert('Some files were too large (max 5MB) and were not added.');
    }
    setUploadedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAuth = async (type, credentials) => {
    try {
      let response;
      
      if (type === 'login') {
        response = await axios.post('/api/login', credentials);
      } else {
        response = await axios.post('/api/register', credentials);
      }
      
      const { user: userData, token: authToken } = response.data;
      
      setUser(userData);
      setToken(authToken);
      localStorage.setItem('ai-mmi-token', authToken);
      setIsAuthenticated(true);
      setShowAuthModal(false);
      
      addMessage('ai', type === 'login' 
        ? "Welcome back! How can I assist with your immigration needs today?" 
        : "Welcome to AI-MMI! Let's get started with your immigration journey.");
    } catch (error) {
      console.error('Authentication error:', error);
      alert(error.response?.data?.error || 'Authentication failed');
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('ai-mmi-token');
      setIsAuthenticated(false);
      setChatHistory([]);
      addMessage('ai', "You have been logged out. Please log in again to access your profile.");
    }
  };

  const selectPlan = async (planName) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      setShowHybridPlanModal(false);
      return;
    }
    
    try {
      // Plan prices
      const planPrices = {
        'basic': 39,
        'premium': 299,
        'platinum': 699,
        'vip': 999
      };

      // Create payment using the NEW endpoint
      const response = await axios.post('/api/payment/create', {
        plan: planName,
        userId: user._id,
        amount: planPrices[planName]
      });
      
      if (response.data.success) {
        // Redirect to success page
        window.location.href = response.data.redirectUrl;
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  const toggleSerpApi = () => {
    const newValue = !useSerpApi;
    setUseSerpApi(newValue);
  };

  const filteredChats = chatHistory.filter(chat => {
    if (!searchQuery) return true;
    return chat.content.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const allDocuments = chatHistory.reduce((docs, chat) => {
    if (chat.role === 'user' && chat.files && chat.files.length > 0) {
      return [...docs, ...chat.files.map(file => ({
        ...file,
        uploadDate: chat.timestamp
      }))];
    }
    return docs;
  }, []);

  const renderFileIcon = (file) => {
    const type = file.type || file.mimetype;
    if (type === 'application/pdf') return 'fa-file-pdf';
    if (type.includes('word')) return 'fa-file-word';
    if (type === 'text/plain') return 'fa-file-alt';
    if (type.includes('image')) return 'fa-file-image';
    return 'fa-file';
  };

  const contactAgent = (agentName) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      setShowContactAgentModal(false);
      return;
    }
    alert(`Connecting you with ${agentName}...`);
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-brand">
          <img 
            src="https://i.ibb.co/pjR8wxhR/ai-mmi-logo-dark-background.png" 
            alt="AI-MMI Logo" 
            className="header-icon" 
          />
          <h1 className="header-title">AI-MMI</h1>
        </div>
        
        <div className="header-controls">
          <div className="language-dropdown">
            <img 
              src="https://i.ibb.co/tMDdT4bd/icon-lang.png" 
              alt="Language" 
              className="header-icon" 
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            />
            {isLanguageDropdownOpen && (
              <div className="language-options">
                {Object.values(LANGUAGES).map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setCurrentLanguage(lang.code);
                      setIsLanguageDropdownOpen(false);
                    }}
                    className={currentLanguage === lang.code ? 'active' : ''}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {isAuthenticated && user && (
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              {user.subscription === 'free' && (
                <span className="promot-count">
                  ({user.promptCount}/5 free prompts)
                </span>
              )}
            </div>
          )}
          
          <img 
            src={isAuthenticated ? "https://i.imgur.com/FcJiNT7.png" : "https://i.ibb.co/3mmnZvWc/icon-member.png"} 
            alt="User" 
            className="header-icon" 
            onClick={() => isAuthenticated ? logout() : setShowAuthModal(true)}
          />
          <img 
            src="https://i.ibb.co/NdFXvqSk/icon-menu.png" 
            alt="Menu" 
            className="header-icon" 
          />
        </div>
      </header>

      <div className="main-content">
        <div className="sidebar">
          <div className="sidebar-container">
            {isAuthenticated && user && user.subscription === 'free' && (
              <div className="promo-banner free-tier">
                <h4>Free Tier</h4>
                <p>{5 - user.promptCount} free prompts remaining</p>
                <button 
                  className="btn-custom" 
                  onClick={() => setShowHybridPlanModal(true)}
                >
                  Upgrade Now
                </button>
              </div>
            )}
            
            <div className="promo-banner">
              <button 
                className="btn-custom" 
                onClick={() => setShowContactAgentModal(true)}
              >
                Contact a Migration Lawyer/Agent
              </button>
            </div>
            
            <button 
              className="sidebar-item"
              onClick={() => {
                setShowSearch(true);
                setShowDocuments(false);
              }}
            >
              <span className="sidebar-icon"></span> Search chats
            </button>
            <button className="sidebar-item">
              <span className="sidebar-icon"></span> My profile
            </button>
            <button 
              className="sidebar-item"
              onClick={() => {
                setShowDocuments(true);
                setShowSearch(false);
              }}
            >
              <span className="sidebar-icon"></span> My documents
            </button>
            <button className="sidebar-item">
              <span className="sidebar-icon"></span> AI-MMI's recommendations
            </button>
            
            <div className="promo-banner">
              <button 
                className="btn-custom" 
                onClick={() => setShowHybridPlanModal(true)}
              >
                Upgrade your service plan
              </button>
            </div>
          </div>
        </div>

        <div className="chat-container">
          {showSearch ? (
            <div className="search-container">
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search your chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={() => setShowSearch(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="search-results">
                {filteredChats.length === 0 ? (
                  <p>No matching chats found</p>
                ) : (
                  filteredChats.map((chat, index) => (
                    <div key={index} className={`search-result ${chat.role}-message`}>
                      <div dangerouslySetInnerHTML={{ __html: marked.parse(chat.content) }} />
                      <div className="timestamp">
                        {new Date(chat.timestamp).toLocaleString()}
                      </div>
                      {chat.files && chat.files.length > 0 && (
                        <div className="file-attachments">
                          {chat.files.map((file, i) => (
                            <div key={i} className="file-preview">
                              <i className={`fas ${renderFileIcon(file)} file-icon`}></i>
                              <span className="file-name">{file.name || file.filename}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : showDocuments ? (
            <div className="documents-container">
              <div className="documents-header">
                <h2>My Documents</h2>
                <button onClick={() => setShowDocuments(false)}>
                  <i className="fas fa-times"></i> Close
                </button>
              </div>
              <div className="documents-list">
                {allDocuments.length === 0 ? (
                  <p>No documents submitted yet</p>
                ) : (
                                    allDocuments.map((doc, index) => (
                    <div key={index} className="document-item">
                      <i className={`fas ${renderFileIcon(doc)}`}></i>
                      <span className="document-name">{doc.name || doc.filename}</span>
                      <span className="document-date">
                        Uploaded on {new Date(doc.uploadDate || Date.now()).toLocaleDateString()}
                      </span>
                      <button className="document-download">
                        <i className="fas fa-download"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="chat-history">
                {chatHistory.length === 0 ? (
                  <div className="welcome-message">
                    <h2>Welcome to AI-MMI Immigration Assistant</h2>
                    <p>Ask me anything about visas, immigration processes, or upload your documents for analysis.</p>
                    <p>Current language: {LANGUAGES[currentLanguage].flag} {LANGUAGES[currentLanguage].name}</p>
                    {!isAuthenticated && (
                      <button 
                        className="btn-custom"
                        onClick={() => setShowAuthModal(true)}
                      >
                        Sign In to Get Started
                      </button>
                    )}
                  </div>
                ) : (
                  chatHistory.map((msg, index) => (
                    <div key={index} className={`message ${msg.role}-message`}>
                      <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }} />
                      {msg.files && msg.files.length > 0 && (
                        <div className="file-attachments">
                          {msg.files.map((file, i) => (
                            <div key={i} className="file-preview">
                              <i className={`fas ${renderFileIcon(file)} file-icon`}></i>
                              <span className="file-name">{file.name || file.filename}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
                {isProcessing && (
                  <div className="message ai-message">
                    <div className="text-center">
                      <div className="spinner-border spinner-border-sm" role="status"></div> Processing...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="input-area">
                <div className="search-toggle">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={useSerpApi} 
                      onChange={toggleSerpApi} 
                    />
                    Include web search results
                  </label>
                </div>
                
                {showFileUpload && (
                  <div className="file-upload-container">
                    <div className="file-previews">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="file-preview">
                          <i className={`fas ${renderFileIcon(file)} file-icon`}></i>
                          <span className="file-name">{file.name}</span>
                          <button 
                            className="remove-file-btn"
                            onClick={() => removeFile(index)}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                    <label htmlFor="fileUpload" className="btn-custom-outline">
                      <i className="fas fa-plus"></i> Add Files
                    </label>
                    <input 
                      type="file" 
                      id="fileUpload" 
                      multiple 
                      style={{ display: 'none' }} 
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                    />
                    <p className="file-upload-note">Supported: PDF, Word, TXT, PNG, JPG (Max 5MB each)</p>
                  </div>
                )}
                
                <div className="input-group">
                  <button 
                    className="btn-custom-outline attachment-btn" 
                    onClick={() => setShowFileUpload(!showFileUpload)}
                  >
                    <i className="fas fa-paperclip"></i>
                  </button>
                  <textarea
                    className="chat-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={isAuthenticated 
                      ? `Type your question in ${LANGUAGES[currentLanguage].name}...` 
                      : 'Please sign in to use AI-MMI...'
                    }
                    rows={3}
                    disabled={!isAuthenticated}
                  />
                  <button 
                    className="btn-custom send-btn" 
                    onClick={handleSendMessage}
                    disabled={(!input && uploadedFiles.length === 0) || isProcessing || !isAuthenticated}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showUpgradeModal && (
        <div className="modal-overlay">
          <div className="hybrid-plan-container">
            <div className="hybrid-plan-header">
              <h2>Upgrade Required</h2>
              <button className="hybrid-plan-close" onClick={() => setShowUpgradeModal(false)}>
                &times;
              </button>
            </div>
            <div className="hybrid-plan-body">
              <p>You've used all your free prompts. Upgrade your subscription to continue using AI-MMI.</p>
              
              <div className="plan-cards">
                <div className="plan-card plan-card-basic">
                  <div className="plan-card-header">
                    <h3>Basic Plan</h3>
                    <p>Online consultation only</p>
                  </div>
                  <div className="plan-card-body">
                    <ul className="plan-features">
                      <li><i className="fas fa-check"></i> Unlimited online consultation with AI-MMI for 3 months</li>
                      <li><i className="fas fa-check"></i> Document analysis (up to 5/month)</li>
                      <li><i className="fas fa-check"></i> Basic visa eligibility check</li>
                      <li><i className="fas fa-times"></i> No migration agent access</li>
                    </ul>
                    <div className="plan-price">
                      AUD $39 <span>one-time payment</span>
                    </div>
                    <button 
                      className="plan-select-btn"
                      onClick={() => selectPlan('basic')}
                    >
                      Select Basic Plan
                    </button>
                  </div>
                </div>
                
                <div className="plan-card plan-card-pro">
                  <div className="plan-card-header">
                    <h3>Pro Plan</h3>
                    <p>Basic + agent access</p>
                  </div>
                  <div className="plan-card-body">
                    <ul className="plan-features">
                      <li><i className="fas fa-check"></i> Everything in Basic Plan</li>
                      <li><i className="fas fa-check"></i> Access to registered migration agent/lawyer</li>
                      <li><i className="fas fa-check"></i> 2-hour free consultation</li>
                      <li><i className="fas fa-check"></i> Email support (24h response)</li>
                    </ul>
                    <div className="plan-price">
                      AUD $299 <span>one-time payment</span>
                    </div>
                    <button 
                      className="plan-select-btn"
                      onClick={() => selectPlan('premium')}
                    >
                      Select Pro Plan
                    </button>
                  </div>
                </div>
                
                <div className="plan-card plan-card-premium">
                  <div className="plan-card-header">
                    <h3>Premium Plan</h3>
                    <p>Pro + validation check</p>
                  </div>
                  <div className="plan-card-body">
                    <ul className="plan-features">
                      <li><i className="fas fa-check"></i> Everything in Pro Plan</li>
                      <li><i className="fas fa-check"></i> Final validation check by agent</li>
                      <li><i className="fas fa-check"></i> For DIY application submission</li>
                      <li><i className="fas fa-check"></i> Priority support</li>
                    </ul>
                    <div className="plan-price">
                      AUD $699 <span>one-time payment</span>
                    </div>
                    <button 
                      className="plan-select-btn"
                      onClick={() => selectPlan('platinum')}
                    >
                      Select Premium Plan
                    </button>
                  </div>
                </div>

                <div className="plan-card plan-card-vip">
                  <div className="plan-card-header">
                    <h3>VIP Plan</h3>
                    <p>Full service package</p>
                  </div>
                  <div className="plan-card-body">
                    <ul className="plan-features">
                      <li><i className="fas fa-check"></i> Everything in Premium Plan</li>
                      <li><i className="fas fa-check"></i> Full visa consultation</li>
                      <li><i className="fas fa-check"></i> Application submission service</li>
                      <li><i className="fas fa-check"></i> AI + agent blended services</li>
                    </ul>
                    <div className="plan-price">
                      AUD $999 <span>one-time payment</span>
                    </div>
                    <button 
                      className="plan-select-btn"
                      onClick={() => selectPlan('vip')}
                    >
                      Select VIP Plan
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="hybrid-plan-footer">
                <p>All plans come with a 7-day money back guarantee. Cancel anytime.</p>
                <button className="back-to-home" onClick={() => setShowUpgradeModal(false)}>
                  <i className="fas fa-arrow-left"></i> Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHybridPlanModal && (
        <div className="modal-overlay">
          <div className="hybrid-plan-container">
            <div className="hybrid-plan-header">
              <h2>Upgrade Your Service Plan</h2>
              <button className="hybrid-plan-close" onClick={() => setShowHybridPlanModal(false)}>
                &times;
              </button>
            </div>
            <div className="hybrid-plan-body">
              <p>Choose the plan that best fits your immigration needs:</p>
              
              <div className="plan-cards">
                <div className="plan-card plan-card-basic">
                  <div className="plan-card-header">
                    <h3>Basic Plan</h3>
                    <p>Online consultation only</p>
                  </div>
                  <div className="plan-card-body">
                    <ul className="plan-features">
                      <li><i className="fas fa-check"></i> Unlimited online consultation with AI-MMI for 3 months</li>
                      <li><i className="fas fa-check"></i> Document analysis (up to 5/month)</li>
                      <li><i className="fas fa-check"></i> Basic visa eligibility check</li>
                      <li><i className="fas fa-times"></i> No migration agent access</li>
                    </ul>
                    <div className="plan-price">
                      AUD $39 <span>one-time payment</span>
                    </div>
                    <button 
                      className="plan-select-btn"
                      onClick={() => selectPlan('basic')}
                    >
                      Select Basic Plan
                    </button>
                  </div>
                </div>
                
                <div className="plan-card plan-card-pro">
                  <div className="plan-card-header">
                    <h3>Pro Plan</h3>
                    <p>Basic + agent access</p>
                  </div>
                  <div className="plan-card-body">
                    <ul className="plan-features">
                      <li><i className="fas fa-check"></i> Everything in Basic Plan</li>
                      <li><i className="fas fa-check"></i> Access to registered migration agent/lawyer</li>
                      <li><i className="fas fa-check"></i> 2-hour free consultation</li>
                      <li><i className="fas fa-check"></i> Email support (24h response)</li>
                    </ul>
                    <div className="plan-price">
                      AUD $299 <span>one-time payment</span>
                    </div>
                    <button 
                      className="plan-select-btn"
                      onClick={() => selectPlan('premium')}
                    >
                      Select Pro Plan
                    </button>
                  </div>
                </div>
                
                <div className="plan-card plan-card-premium">
                  <div className="plan-card-header">
                    <h3>Premium Plan</h3>
                    <p>Pro + validation check</p>
                  </div>
                  <div className="plan-card-body">
                    <ul className="plan-features">
                      <li><i className="fas fa-check"></i> Everything in Pro Plan</li>
                      <li><i className="fas fa-check"></i> Final validation check by agent</li>
                      <li><i className="fas fa-check"></i> For DIY application submission</li>
                      <li><i className="fas fa-check"></i> Priority support</li>
                    </ul>
                    <div className="plan-price">
                      AUD $699 <span>one-time payment</span>
                    </div>
                    <button 
                      className="plan-select-btn"
                      onClick={() => selectPlan('platinum')}
                    >
                      Select Premium Plan
                    </button>
                  </div>
                </div>

                <div className="plan-card plan-card-vip">
                  <div className="plan-card-header">
                    <h3>VIP Plan</h3>
                    <p>Full service package</p>
                  </div>
                  <div className="plan-card-body">
                    <ul className="plan-features">
                      <li><i className="fas fa-check"></i> Everything in Premium Plan</li>
                      <li><i className="fas fa-check"></i> Full visa consultation</li>
                      <li><i className="fas fa-check"></i> Application submission service</li>
                      <li><i className="fas fa-check"></i> AI + agent blended services</li>
                    </ul>
                    <div className="plan-price">
                      AUD $999 <span>one-time payment</span>
                    </div>
                    <button 
                      className="plan-select-btn"
                      onClick={() => selectPlan('vip')}
                    >
                      Select VIP Plan
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="hybrid-plan-footer">
                <p>All plans come with a 7-day money back guarantee. Cancel anytime.</p>
                <button className="back-to-home" onClick={() => setShowHybridPlanModal(false)}>
                  <i className="fas fa-arrow-left"></i> Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showContactAgentModal && (
        <div className="modal-overlay">
          <div className="contact-agent-container">
            <div className="contact-agent-header">
              <h2>Contact a Migration Expert</h2>
              <button className="contact-agent-close" onClick={() => setShowContactAgentModal(false)}>
                &times;
              </button>
            </div>
            <div className="contact-agent-body">
              <p>Connect with our network of registered migration agents and lawyers for personalized assistance with your case.</p>
              
              <div className="country-section">
                <h3 className="country-title">Australia</h3>
                <div className="agent-cards">
                  {AGENTS.australia.map((agent, index) => (
                    <div key={`aus-${index}`} className="agent-card">
                      <div className="agent-card-header">
                        <h4 className="agent-company">{agent.company}</h4>
                      </div>
                      <div className="agent-card-body">
                        <div className="agent-details">
                          <p><i className="fas fa-phone"></i> {agent.phone}</p>
                          <p><i className="fas fa-envelope"></i> {agent.email}</p>
                          <p><i className="fas fa-globe"></i> {agent.website}</p>
                        </div>
                        {agent.name && (
                          <div style={{ marginTop: '10px' }}>
                            <p className="agent-name">{agent.name}</p>
                            {agent.registration && (
                              <p className="agent-registration">Registration: {agent.registration}</p>
                            )}
                          </div>
                        )}
                        <button 
                          className="agent-contact-btn" 
                          onClick={() => contactAgent(agent.company)}
                        >
                          Contact Agent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="country-section">
                <h3 className="country-title">Britain</h3>
                <div className="agent-cards">
                  {AGENTS.britain.map((agent, index) => (
                    <div key={`uk-${index}`} className="agent-card">
                      <div className="agent-card-header">
                        <h4 className="agent-company">{agent.company}</h4>
                      </div>
                      <div className="agent-card-body">
                        <div className="agent-details">
                          <p><i className="fas fa-phone"></i> {agent.phone}</p>
                          <p><i className="fas fa-envelope"></i> {agent.email}</p>
                          <p><i className="fas fa-globe"></i> {agent.website}</p>
                        </div>
                        <button 
                          className="agent-contact-btn" 
                          onClick={() => contactAgent(agent.company)}
                        >
                          Contact Agent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="country-section">
                <h3 className="country-title">Canada</h3>
                <div className="agent-cards">
                  {AGENTS.canada.map((agent, index) => (
                    <div key={`ca-${index}`} className="agent-card">
                      <div className="agent-card-header">
                        <h4 className="agent-company">{agent.company}</h4>
                      </div>
                      <div className="agent-card-body">
                        <div className="agent-details">
                          <p><i className="fas fa-phone"></i> {agent.phone}</p>
                          <p><i className="fas fa-envelope"></i> {agent.email}</p>
                          <p><i className="fas fa-globe"></i> {agent.website}</p>
                        </div>
                        <button 
                          className="agent-contact-btn" 
                          onClick={() => contactAgent(agent.company)}
                        >
                          Contact Agent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="country-section">
                <h3 className="country-title">United States</h3>
                <div className="agent-cards">
                  {AGENTS.usa.map((agent, index) => (
                    <div key={`us-${index}`} className="agent-card">
                      <div className="agent-card-header">
                        <h4 className="agent-company">{agent.company}</h4>
                      </div>
                      <div className="agent-card-body">
                        <div className="agent-details">
                          <p><i className="fas fa-phone"></i> {agent.phone}</p>
                          <p><i className="fas fa-envelope"></i> {agent.email}</p>
                          <p><i className="fas fa-globe"></i> {agent.website}</p>
                        </div>
                        <button 
                          className="agent-contact-btn" 
                          onClick={() => contactAgent(agent.company)}
                        >
                          Contact Agent
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="contact-agent-footer">
                <p>All our agents are registered with the appropriate regulatory bodies in their jurisdictions.</p>
                <button className="back-to-home" onClick={() => setShowContactAgentModal(false)}>
                  <i className="fas fa-arrow-left"></i> Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="modal-overlay">
          <div className="auth-modal">
            <div className="auth-tabs">
              <div 
                className={`auth-tab ${authTab === 'login' ? 'active' : ''}`} 
                onClick={() => setAuthTab('login')}
              >
                Login
              </div>
              <div 
                className={`auth-tab ${authTab === 'signup' ? 'active' : ''}`} 
                onClick={() => setAuthTab('signup')}
              >
                Sign Up
              </div>
            </div>
            
            {authTab === 'login' ? (
              <LoginForm 
                onSubmit={(credentials) => handleAuth('login', credentials)}
                onCancel={() => setShowAuthModal(false)}
              />
            ) : (
              <SignupForm 
                onSubmit={(credentials) => handleAuth('signup', credentials)}
                onCancel={() => setShowAuthModal(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Form components for better organization
const LoginForm = ({ onSubmit, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="auth-form active">
      <div className="form-group">
        <label htmlFor="loginEmail">Email</label>
        <input 
          type="email" 
          id="loginEmail" 
          placeholder="Enter your email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="loginPassword">Password</label>
        <input 
          type="password" 
          id="loginPassword" 
          placeholder="Enter your password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="auth-actions">
        <button className="btn-custom-outline" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-custom" onClick={() => onSubmit({ email, password })}>
          Login
        </button>
      </div>
    </div>
  );
};

const SignupForm = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <div className="auth-form active">
      <div className="form-group">
        <label htmlFor="signupName">Full Name</label>
        <input 
          type="text" 
          id="signupName" 
          placeholder="Enter your full name" 
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="signupEmail">Email</label>
        <input 
          type="email" 
          id="signupEmail" 
          placeholder="Enter your email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="signupPassword">Password</label>
        <input 
          type="password" 
          id="signupPassword" 
          placeholder="Create a password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="signupConfirmPassword">Confirm Password</label>
        <input 
          type="password" 
          id="signupConfirmPassword" 
          placeholder="Confirm your password" 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <div className="auth-actions">
        <button className="btn-custom-outline" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn-custom" onClick={() => onSubmit({ name, email, password })}>
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default App;