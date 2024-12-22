import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Send, 
  Volume2, 
  Languages, 
  Plus, 
  Repeat, 
  Search, 
  Upload, 
  X,
  Trash2,
  Mic,
  StopCircle, 
  Video,
  Play,
  Loader,
  Download,
   Link,
  Image as ImageIcon
} from "lucide-react";

const TranslationChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(Date.now());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("content");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [voices, setVoices] = useState([]);
  

  const chatContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const imageInputRef = useRef(null);

  const languages = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    ar: "Arabic",
    hi: "Hindi",
    ta: "Tamil",
    kn: "Kannada",
    te: "Telugu"
  };

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const ALLOWED_DOC_TYPES = ['.txt', '.pdf', '.docx'];


  // File upload handlers
  const handleFileSelect = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };
   const validateImage = (file) => {
    if (!file) {
      throw new Error('No file selected');
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, or GIF image.');
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error('Image size must be less than 5MB');
    }

    return true;
  };

  const validateDocument = (file) => {
    if (!file) {
      throw new Error('No file selected');
    }

    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_DOC_TYPES.includes(fileExtension)) {
      throw new Error('Invalid file type. Please upload a TXT, PDF, or DOCX file.');
    }

    return true;
  };

  const handleFileUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('target_language', selectedLanguage);

      const fileMessage = {
        id: Date.now(),
        text: `Uploading: ${file.name}`,
        fileName: file.name,
        timestamp: new Date().toLocaleTimeString(),
        isUser: true,
        status: 'uploading'
      };

      setMessages(prev => [...prev, fileMessage]);

      const response = await fetch('http://localhost:8000/api/translate/file', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const translationMessage = {
        id: Date.now() + 1,
        text: `Translation completed: ${file.name}`,
        downloadUrl: downloadUrl,
        downloadFileName: `translated_${file.name}`,
        timestamp: new Date().toLocaleTimeString(),
        isUser: false,
        status: 'completed'
      };

      setMessages(prev => [...prev, translationMessage]);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = {
        id: Date.now(),
        text: `Error uploading ${file.name}: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
        isUser: false,
        status: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      setError('');
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImage) return;

    try {
      setIsUploading(true);
      setError('');
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('target_language', selectedLanguage);

      const response = await fetch('http://localhost:8000/api/translate/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      const translationMessage = {
        id: Date.now(),
        text: data.translated_text,
        timestamp: new Date().toLocaleTimeString(),
        isUser: false,
        language: languages[selectedLanguage]
      };

      setMessages(prev => [...prev, translationMessage]);
      setShowImageModal(false);
    } catch (err) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const initializeRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleVoiceTranslation(audioBlob);
        audioChunksRef.current = [];
      };
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "Error accessing microphone. Please check permissions.",
        timestamp: new Date().toLocaleTimeString(),
        isUser: false,
        status: 'error'
      }]);
    }
  };

  const startRecording = async () => {
    await initializeRecording();
    setIsRecording(true);
    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceTranslation = async (audioBlob) => {
    try {
      setIsProcessingVoice(true);
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'voice-message.wav');
      formData.append('target_language', selectedLanguage);

      const voiceMessage = {
        id: Date.now(),
        text: "🎤 Voice message sent",
        timestamp: new Date().toLocaleTimeString(),
        isUser: true,
        isVoice: true,
        audioUrl: URL.createObjectURL(audioBlob)
      };
      setMessages(prev => [...prev, voiceMessage]);

      const response = await fetch('http://localhost:8000/api/translate/voice', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      const translationResult = {
        id: Date.now() + 1,
        text: data.translated_text,
        originalText: data.detected_text,
        translated: true,
        language: languages[selectedLanguage],
        timestamp: new Date().toLocaleTimeString(),
        isUser: false,
        isVoice: true
      };

      setMessages(prev => [...prev, translationResult]);
    } catch (error) {
      console.error('Voice translation error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Voice translation failed: ${error.message}`,
        timestamp: new Date().toLocaleTimeString(),
        isUser: false,
        status: 'error'
      }]);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const translateText = async (text, targetLang) => {
    try {
      setIsTranslating(true);
      const response = await fetch("http://localhost:8000/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          target_language: targetLang,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Translation failed");
      }

      const data = await response.json();
      return data.translated_text;
    } catch (error) {
      console.error("Translation error:", error);
      throw error;
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslateMessage = async (message, targetLang) => {
    if (!message.text) return;
    
    try {
      const translatedText = await translateText(message.text, targetLang);
      const translationMessage = {
        id: Date.now(),
        text: translatedText,
        originalText: message.text,
        translated: true,
        language: languages[targetLang],
        timestamp: new Date().toLocaleTimeString(),
        isUser: false,
      };

      setMessages(prev => [...prev, translationMessage]);
    } catch (error) {
      console.error("Translation error:", error);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTranslating) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      translated: false,
      language: "Original",
      timestamp: new Date().toLocaleTimeString(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");

    try {
      const translatedText = await translateText(inputText, selectedLanguage);
      const translationMessage = {
        id: Date.now() + 1,
        text: translatedText,
        originalText: inputText,
        translated: true,
        language: languages[selectedLanguage],
        timestamp: new Date().toLocaleTimeString(),
        isUser: false,
      };

      setMessages(prev => [...prev, translationMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: error.message || "Translation failed. Please try again.",
        translated: false,
        language: "Error",
        timestamp: new Date().toLocaleTimeString(),
        isUser: false,
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSpeak = (text, language) => {
    if (!text || !language) return;
    
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    const languageCodes = {
      English: "en-IN",
      Spanish: "es-ES",
      French: "fr-FR",
      German: "de-DE",
      Italian: "it-IT",
      Portuguese: "pt-PT",
      Russian: "ru-RU",
      Japanese: "ja-JP",
      Korean: "ko-KR",
      Chinese: "zh-CN",
      Arabic: "ar-SA",
      Hindi: "hi-IN",
      Tamil: "ta-IN",
      Kannada: "kn-IN",
      Telugu: "te-IN"
    };

    utterance.lang = languageCodes[language] || "en-US";

    const availableVoice = voices.find(voice => voice.lang.startsWith(utterance.lang));
    if (availableVoice) {
      utterance.voice = availableVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const startNewChat = () => {
    setCurrentChatId(Date.now());
    setMessages([]);
  };

  const loadChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setCurrentChatId(chatId);
      setMessages(chat.messages || []);
    }
  };

  const handleDeleteChat = (chatId) => {
    const updatedHistory = chatHistory.filter((chat) => chat.id !== chatId);
    setChatHistory(updatedHistory);
    localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
    
    if (chatId === currentChatId) {
      startNewChat();
    }
  };

  const filterChatHistory = () => {
    if (!searchQuery) return chatHistory;
    
    return chatHistory.filter((chat) => {
      if (!chat.messages || chat.messages.length === 0) return false;

      if (searchType === "content") {
        return chat.messages.some((msg) =>
          (msg.text || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
      } else if (searchType === "language") {
        return chat.messages.some((msg) =>
          (msg.language || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return true;
    });
  };

  useEffect(() => {
    const loadVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {window.speechSynthesis.onvoiceschanged = null;
  };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('chatHistory');
      if (savedHistory) {
        setChatHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setChatHistory([]);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const updatedHistory = chatHistory.map(chat =>
        chat.id === currentChatId ? { ...chat, messages } : chat
      );
      if (!chatHistory.find(chat => chat.id === currentChatId)) {
        updatedHistory.push({
          id: currentChatId,
          timestamp: new Date().toLocaleString(),
          messages,
          lastMessage: messages[messages.length - 1].text || ""
        });
      }
      setChatHistory(updatedHistory);
      localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
    }
  }, [messages, chatHistory, currentChatId]);

  const renderVoiceControls = () => (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="p-2 text-blue-600 hover:text-blue-700 rounded-full hover:bg-blue-50"
          title="Start Recording"
        >
          <Mic size={20} />
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="p-2 text-red-600 hover:text-red-700 rounded-full hover:bg-red-50"
          title="Stop Recording"
        >
          <StopCircle size={20} />
        </button>
      )}
      {isProcessingVoice && (
        <Loader size={20} className="animate-spin text-blue-600" />
      )}
    </div>
  );

  const renderMessage = (message) => (
    <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[70%] ${message.isUser ? "bg-[#E0F2F9]" : "bg-white"} rounded-lg p-3 shadow`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-blue-500 mr-2">
            {message.language || " "}
          </span>
          <div className="flex gap-2">
            {message.isVoice && message.audioUrl && (
              <button
                onClick={() => {
                  const audio = new Audio(message.audioUrl);
                  audio.play();
                }}
                className="text-gray-500 hover:text-blue-600"
                title="Play Voice"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            {!message.isVoice && (
              <button
                onClick={() => handleSpeak(message.text, message.language)}
                className="text-gray-500 hover:text-blue-600"
                title="Speak"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
            <div className="relative group">
              <button
                className="text-gray-500 hover:text-emerald-600"
                title="Translate to another language"
              >
                <Repeat className="w-4 h-4" />
              </button>
              <div className="absolute right-0 mt-2 py-2 w-48 bg-white rounded-lg shadow-xl hidden group-hover:block z-10">
                {Object.entries(languages)
                  .filter(([code, name]) => name !== message.language)
                  .map(([code, name]) => (
                    <button
                      key={code}
                      onClick={() => handleTranslateMessage(message, code)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Translate to {name}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-800">
          {message.text}
          {message.downloadUrl && (
            <div className="mt-2">
              <a
                href={message.downloadUrl}
                download={message.downloadFileName}
                className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <Download size={16} />
                Download Translated File
              </a>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">{message.timestamp}</div>
      </div>
    </div>
  );
  const navigateToLink = () => {
    window.location.href = 'https://voice-translate-1.onrender.com/';
  };
  const navigateToLinks = () => {
    window.location.href = 'https://translate-web-jade.vercel.app/';
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-white border-r transition-all duration-300 overflow-hidden`}>
        <div className="p-4 bg-[#6CB4EE] text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Chats</h2>
            <button 
              onClick={startNewChat}
              className="p-2 hover:bg-blue-500  rounded"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1 text-gray-800 rounded text-sm"
              />
              <button className="p-1 hover:bg-blue-500 rounded">
                <Search className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => setSearchType("content")}
                className={`px-2 py-1 rounded ${searchType === "content" ? "bg-blue-500" : "hover:bg-blue-600"}`}
              >
                Content
              </button>
              <button
                onClick={() => setSearchType("language")}
                className={`px-2 py-1 rounded ${searchType === "language" ? "bg-blue-500" : "hover:bg-blue-600"}`}
              >
                Language
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto h-full">
          {filterChatHistory().map((chat) => (
            <div
              key={chat.id}
              onClick={() => loadChat(chat.id)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                currentChatId === chat.id ? 'bg-[#E0F2F9]' : ''
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium truncate">
                    {chat.lastMessage || "No messages"}
                  </div>
                  <div className="text-xs text-gray-500">{chat.timestamp}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-[#6CB4EE] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-[#6CB4EE] rounded"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <Languages className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Quadra Translator</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImageModal(true)}
              className="p-2 hover:bg-blue-500 rounded"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="p-2 hover:bg-blue-500 rounded"
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-blue-10">
          {messages.map(renderMessage)}
        </div>

        <div className="p-4 bg-white border-t">
          <div className="flex items-center gap-2">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-white border text-gray-700 px-3 py-2 rounded"
            >
              {Object.entries(languages).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            
            <div className="flex-1 flex items-center gap-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 p-2 border rounded"
                rows="1"
              />

              <div
              className="cursor-pointer p-2 transition-transform duration-200 ease-in-out"
              onClick={navigateToLink}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Video className="w-6 h-6 text-blue-500 hover:text-blue-600" />
            </div>
      
              <div>
              {/* Clickable icon */}
              <Link
                size={24} // Adjust the icon size
                strokeWidth={2} // Adjust stroke width
                onClick={navigateToLinks} // Handle navigation
                style={{ cursor: 'pointer', color:"#6CB4EE" }} // Optional styles
                />
                </div>
              <button 
                onClick={handleSend} 
                disabled={isTranslating} 
                className={`p-2 rounded ${
                  isTranslating 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Upload File</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".txt,.pdf,.docx"
                  className="hidden"
                />
                <div className="space-y-2">
                  <p className="text-gray-500">Drag and drop a file here or</p>
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Browse files
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Upload Image</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
               
              
              <div className="space-y-4">
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer"
                  onClick={() => imageInputRef.current.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-w-full max-h-48 mx-auto" />
                  ) : (
                    <p className="text-gray-500">Click to select an image</p>
                  )}
                </div>

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <button
                  onClick={handleImageUpload}
                  disabled={!selectedImage || isUploading}
                  className={`w-full p-2 rounded ${
                    !selectedImage || isUploading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  } text-white`}
                >
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationChat;