// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const quickButtons = document.querySelectorAll('.quick-btn');
const themeToggle = document.getElementById('themeToggle');
const typingIndicator = document.getElementById('typingIndicator');
const floatingAssistant = document.getElementById('floatingAssistant');
const charCount = document.querySelector('.char-count');
const attachBtn = document.getElementById('attachBtn');
const voiceBtn = document.getElementById('voiceBtn');
const quickActions = document.getElementById('quickActions');
const quickToggle = document.getElementById('quickToggle');
const assistantMenu = document.getElementById('assistantMenu');
const menuOverlay = document.getElementById('menuOverlay');

// Authentication state
let currentUser = null;
let accessToken = null;

// Chat state
let isTyping = false;
let chatHistory = [];
let isFirstMessage = true;

// File and audio state
let attachedFiles = [];
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// Utility function to detect mobile devices
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768) ||
           ('ontouchstart' in window);
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    checkAuthentication();
    
    initializeTheme();
    loadChatHistory();
    setupEventListeners();
    setupUserEventListeners();
    updateUserInterface();
    
    // Only focus input on load for non-mobile devices
    if (!isMobileDevice()) {
        messageInput.focus();
    }
});

// Authentication Functions
function checkAuthentication() {
    accessToken = localStorage.getItem('access_token');
    const userInfo = localStorage.getItem('user_info');
    
    if (!accessToken) {
        // No token, redirect to login
        window.location.href = '/login-page';
        return;
    }
    
    if (userInfo) {
        try {
            currentUser = JSON.parse(userInfo);
        } catch (e) {
            console.error('Error parsing user info:', e);
            logout();
            return;
        }
    }
    
    // Verify token is still valid
    verifyToken();
}

async function verifyToken() {
    try {
        const response = await fetch('/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token is invalid, redirect to login
                logout();
                return;
            }
        }
        
        const userData = await response.json();
        currentUser = userData;
        localStorage.setItem('user_info', JSON.stringify(userData));
        
    } catch (error) {
        console.error('Error verifying token:', error);
        // Don't logout on network errors, just log the error
    }
}

function logout() {
    // Clear local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_info');
    
    // Clear state
    accessToken = null;
    currentUser = null;
    
    // Redirect to login page
    window.location.href = '/login-page';
}

function updateUserInterface() {
    if (currentUser) {
        // Update welcome message if it exists
        const welcomeMessage = document.querySelector('.welcome-message .message');
        if (welcomeMessage) {
            welcomeMessage.innerHTML = `<p>Salom ${currentUser.full_name}! Men Aspiro AI man. Ingliz tili bo'yicha har qanday savolingizga javob beraman. Qanday yordam berishim mumkin? 🎓</p>`;
        }
        
        // Add user info to menu if needed
        updateMenuWithUserInfo();
    }
}

function updateMenuWithUserInfo() {
    const menuHeader = document.querySelector('.menu-header .menu-title');
    if (menuHeader && currentUser) {
        menuHeader.innerHTML = `
            <h3>Aspiro AI</h3>
            <p>${currentUser.full_name}</p>
            <small>${currentUser.subscription_plan} rejasi</small>
        `;
    }
}

function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
}

// Theme Management
function initializeTheme() {
    // Clean up any old theme keys for consistency
    if (localStorage.getItem('aspiro-theme') && !localStorage.getItem('theme')) {
        localStorage.setItem('theme', localStorage.getItem('aspiro-theme'));
        localStorage.removeItem('aspiro-theme');
    }
    
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Event Listeners
function setupEventListeners() {
    // Send button click
    sendButton.addEventListener('click', handleSendMessage);
    
    // Enter key press (Shift+Enter for new line, Enter to send)
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Quick buttons
    quickButtons.forEach(button => {
        button.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            sendMessage(question);
        });
    });
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Floating assistant - toggle menu
    if (floatingAssistant) {
        floatingAssistant.addEventListener('click', function() {
            console.log('Floating assistant clicked'); // Debug log
            toggleAssistantMenu();
        });
    } else {
        console.error('Floating assistant element not found');
    }
    
    // Menu overlay - close menu when clicked
    if (menuOverlay) {
        menuOverlay.addEventListener('click', function() {
            closeAssistantMenu();
        });
    } else {
        console.error('Menu overlay element not found');
    }
    
    // Modal event listeners
    document.getElementById('closeHistoryModal').addEventListener('click', function() {
        hideModal('chatHistoryModal');
    });
    
    document.getElementById('closeSettingsModal').addEventListener('click', function() {
        hideModal('settingsModal');
    });
    
    document.getElementById('closeHelpModal').addEventListener('click', function() {
        hideModal('helpModal');
    });
    
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target.id);
        }
    });
    
    // Menu items functionality
    document.getElementById('newChatBtn').addEventListener('click', function() {
        startNewChat();
        closeAssistantMenu();
    });
    
    document.getElementById('clearHistoryBtn').addEventListener('click', function() {
        clearChatHistory();
        closeAssistantMenu();
    });
    
    document.getElementById('chatHistoryBtn').addEventListener('click', function() {
        showChatHistory();
        closeAssistantMenu();
    });
    
    document.getElementById('settingsBtn').addEventListener('click', function() {
        showSettings();
        closeAssistantMenu();
    });
    
    document.getElementById('helpBtn').addEventListener('click', function() {
        showHelp();
        closeAssistantMenu();
    });
    
    // aboutBtn was removed in the new menu structure
    // document.getElementById('aboutBtn').addEventListener('click', function() {
    //     showAbout();
    //     closeAssistantMenu();
    // });
    
    // Add logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }

    // New user-related menu items
    const profileBtn = document.getElementById('profileBtn');
    const upgradeBtn = document.getElementById('upgradeBtn');
    const usageStatsBtn = document.getElementById('usageStatsBtn');
    const feedbackBtn = document.getElementById('feedbackBtn');
    
    if (profileBtn) {
        profileBtn.addEventListener('click', function() {
            showProfile();
            closeAssistantMenu();
        });
    }
    
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', function() {
            showUpgrade();
            closeAssistantMenu();
        });
    }
    
    if (usageStatsBtn) {
        usageStatsBtn.addEventListener('click', function() {
            showUsageStats();
            closeAssistantMenu();
        });
    }
    
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', function() {
            showFeedback();
            closeAssistantMenu();
        });
    }
    
    // Auto-resize textarea and update char count
    messageInput.addEventListener('input', function() {
        // Auto-resize textarea
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        
        // Update character count
        const currentLength = this.value.length;
        charCount.textContent = `${currentLength}/2000`;
        
        // Enable/disable send button based on input
        sendButton.disabled = this.value.trim() === '';
        
        // Change char count color if approaching limit
        if (currentLength > 1800) {
            charCount.style.color = 'var(--error)';
        } else if (currentLength > 1500) {
            charCount.style.color = 'var(--warning)';
        } else {
            charCount.style.color = 'var(--text-secondary)';
        }
    });
    
    // Action buttons functionality
    attachBtn.addEventListener('click', function() {
        handleFileAttachment();
    });
    
    voiceBtn.addEventListener('click', function() {
        handleVoiceRecording();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+K to focus input (only on non-mobile devices)
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            if (!isMobileDevice()) {
                messageInput.focus();
            }
        }
        
        // Escape to clear input or close modals
        if (e.key === 'Escape') {
            if (document.querySelector('.modal.show')) {
                const openModal = document.querySelector('.modal.show');
                hideModal(openModal.id);
            } else {
                messageInput.value = '';
                sendButton.disabled = true;
            }
        }
        
        // Ctrl+S to open settings
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            showSettings();
        }
    });
}

// Message Handling
function handleSendMessage() {
    const message = messageInput.value.trim();
    if (message && !isTyping) {
        sendMessage(message);
    }
}

async function sendMessage(message) {
    if (isTyping) return;
    
    // Check authentication before sending
    if (!accessToken) {
        logout();
        return;
    }
    
    // Collapse quick actions after first message
    if (isFirstMessage) {
        collapseQuickActions();
        isFirstMessage = false;
    }
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    
    // Clear input
    messageInput.value = '';
    sendButton.disabled = true;
    
    // Show typing indicator
    showTypingIndicator();
    
    // Disable input while processing
    setInputState(false);
    
    try {
        // Send to API with authentication
        const response = await fetch('/chat', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, redirect to login
                logout();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Hide typing indicator
        hideTypingIndicator();
        
        // Add AI response to chat
        addMessageToChat(data.response, 'ai');
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        addErrorMessage('Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
    } finally {
        // Re-enable input
        setInputState(true);
        // Only focus on non-mobile devices to prevent unwanted keyboard popup
        if (!isMobileDevice()) {
            messageInput.focus();
        }
    }
}

// Chat UI Functions
function addMessageToChat(message, sender, attachments = null) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${sender === 'user' ? 'user-container user-turn' : 'ai-turn'}`;
    
    const avatar = document.createElement('div');
    avatar.className = sender === 'user' ? 'user-avatar' : 'ai-avatar';
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<img src="/src/aspiro_ai.png" alt="Aspiro AI" class="avatar-img">';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'user' ? 'user-message' : 'ai-message'}`;
    
    // Create message content wrapper
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Add attachments if any (for user messages)
    if (attachments && attachments.length > 0) {
        const attachmentContainer = document.createElement('div');
        attachmentContainer.className = 'message-attachments';
        
        attachments.forEach(file => {
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = 'attachment-item';
            
            if (file.type.startsWith('image/')) {
                attachmentDiv.innerHTML = `
                    <img src="${file.url}" alt="${file.name}" class="attachment-image" />
                    <span class="attachment-name">${file.name}</span>
                `;
            } else if (file.type.startsWith('audio/')) {
                attachmentDiv.innerHTML = `
                    <audio controls class="attachment-audio">
                        <source src="${file.url}" type="${file.type}">
                    </audio>
                    <span class="attachment-name">${file.name}</span>
                `;
            } else {
                attachmentDiv.innerHTML = `
                    <i class="fas fa-file"></i>
                    <span class="attachment-name">${file.name}</span>
                    <span class="attachment-size">${formatFileSize(file.size)}</span>
                `;
            }
            
            attachmentContainer.appendChild(attachmentDiv);
        });
        
        messageContent.appendChild(attachmentContainer);
    }
    
    // Add text content
    const formattedMessage = formatMessage(message);
    const textContent = document.createElement('div');
    textContent.className = 'message-text';
    textContent.innerHTML = formattedMessage;
    messageContent.appendChild(textContent);
    
    // Add action buttons for messages
    const actionButtons = document.createElement('div');
    actionButtons.className = 'message-actions';
    
    if (sender === 'ai') {
        actionButtons.innerHTML = `
            <button class="action-btn-small copy-btn" title="Nusxalash" onclick="copyMessage(this)">
                <i class="fas fa-copy"></i>
            </button>
            <button class="action-btn-small edit-btn" title="Tahrirlash" onclick="editMessage(this)">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn-small share-btn" title="Ulashish" onclick="shareMessage(this)">
                <i class="fas fa-share"></i>
            </button>
            <button class="action-btn-small speak-btn" title="O'qish" onclick="speakMessage(this)">
                <i class="fas fa-volume-up"></i>
            </button>
            <button class="action-btn-small save-btn" title="Saqlash" onclick="saveMessage(this)">
                <i class="fas fa-bookmark"></i>
            </button>
            <button class="action-btn-small export-btn" title="Eksport" onclick="exportMessage(this)">
                <i class="fas fa-download"></i>
            </button>
            <button class="action-btn-small regenerate-btn" title="Qayta yaratish" onclick="regenerateMessage(this)">
                <i class="fas fa-redo"></i>
            </button>
        `;
    } else {
        // User message actions
        actionButtons.innerHTML = `
            <button class="action-btn-small copy-btn" title="Nusxalash" onclick="copyMessage(this)">
                <i class="fas fa-copy"></i>
            </button>
            <button class="action-btn-small edit-btn" title="Tahrirlash" onclick="editUserMessage(this)">
                <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn-small delete-btn" title="O'chirish" onclick="deleteMessage(this)">
                <i class="fas fa-trash"></i>
            </button>
        `;
    }
    
    messageContent.appendChild(actionButtons);
    
    messageDiv.appendChild(messageContent);
    messageContainer.appendChild(avatar);
    messageContainer.appendChild(messageDiv);
    
    chatMessages.appendChild(messageContainer);
    
    // Scroll to bottom
    scrollToBottom();
    
    // Save to history
    saveChatMessage(message, sender, attachments);
}

function addErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    chatMessages.appendChild(errorDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    isTyping = true;
    typingIndicator.classList.add('show');
    scrollToBottom();
}

function hideTypingIndicator() {
    isTyping = false;
    typingIndicator.classList.remove('show');
}

function setInputState(enabled) {
    messageInput.disabled = !enabled;
    sendButton.disabled = !enabled || messageInput.value.trim() === '';
    
    if (enabled) {
        messageInput.classList.remove('loading');
    } else {
        messageInput.classList.add('loading');
    }
}

function scrollToBottom() {
    setTimeout(() => {
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

// Quick Actions Functions
function collapseQuickActions() {
    quickActions.classList.add('collapsed');
    // Remove the toggle button functionality - quick questions stay hidden after first prompt
}

// Assistant Menu Functions
function toggleAssistantMenu() {
    if (!assistantMenu) {
        console.error('Assistant menu element not found');
        return;
    }
    
    if (assistantMenu.classList.contains('show')) {
        closeAssistantMenu();
    } else {
        openAssistantMenu();
    }
}

function openAssistantMenu() {
    if (!assistantMenu || !menuOverlay || !floatingAssistant) {
        console.error('Required menu elements not found');
        return;
    }
    
    assistantMenu.classList.add('show');
    menuOverlay.classList.add('show');
    floatingAssistant.classList.add('menu-open');
    document.body.style.overflow = 'hidden';
}

function closeAssistantMenu() {
    if (!assistantMenu || !menuOverlay || !floatingAssistant) {
        console.error('Required menu elements not found');
        return;
    }
    
    assistantMenu.classList.remove('show');
    menuOverlay.classList.remove('show');
    floatingAssistant.classList.remove('menu-open');
    document.body.style.overflow = 'auto';
}

// Modal functionality
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Settings management
let settings = {
    voiceResponse: false,
    autoSave: true,
    historyLimit: 50
};

function loadSettings() {
    const savedSettings = localStorage.getItem('aspiro_settings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
    }
    
    // Apply settings to UI
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    document.getElementById('darkModeToggle').checked = currentTheme === 'dark';
    document.getElementById('voiceResponseToggle').checked = settings.voiceResponse;
    document.getElementById('autoSaveToggle').checked = settings.autoSave;
    document.getElementById('historyLimitSelect').value = settings.historyLimit;
}

function saveSettings() {
    // Handle dark mode toggle (sync with main theme system)
    const darkModeChecked = document.getElementById('darkModeToggle').checked;
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = darkModeChecked ? 'dark' : 'light';
    
    if (currentTheme !== newTheme) {
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    }
    
    // Save other settings
    settings.voiceResponse = document.getElementById('voiceResponseToggle').checked;
    settings.autoSave = document.getElementById('autoSaveToggle').checked;
    settings.historyLimit = parseInt(document.getElementById('historyLimitSelect').value);
    
    localStorage.setItem('aspiro_settings', JSON.stringify(settings));
    
    hideModal('settingsModal');
    showNotification('Sozlamalar saqlandi!');
}

function resetSettings() {
    if (confirm('Barcha sozlamalarni standart holatga qaytarishni xohlaysizmi?')) {
        // Reset theme to light
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        updateThemeIcon('light');
        
        // Reset other settings
        settings = {
            voiceResponse: false,
            autoSave: true,
            historyLimit: 50
        };
        localStorage.removeItem('aspiro_settings');
        loadSettings();
        showNotification('Sozlamalar tiklandi!');
    }
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10B981;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 3000;
        font-size: 0.9rem;
        font-weight: 500;
        transform: translateX(100%);
        transition: transform 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function formatChatHistory() {
    const historyModalBody = document.getElementById('historyModalBody');
    
    if (chatHistory.length === 0) {
        historyModalBody.innerHTML = `
            <div class="history-empty">
                <i class="fas fa-comments"></i>
                <p>Hali suhbat tarixi mavjud emas</p>
            </div>
        `;
        return;
    }
    
    let historyHTML = '';
    chatHistory.forEach((message, index) => {
        const time = new Date(message.timestamp || Date.now()).toLocaleString('uz-UZ');
        const text = message.message.length > 100 ? message.message.substring(0, 100) + '...' : message.message;
        
        historyHTML += `
            <div class="history-item" data-index="${index}">
                <div class="history-time">${time}</div>
                <div class="history-message">
                    <strong>${message.sender === 'user' ? 'Siz' : 'Aspiro AI'}:</strong> ${text}
                </div>
            </div>
        `;
    });
    
    historyModalBody.innerHTML = historyHTML;
    
    // Add event listeners to history items
    const historyItems = historyModalBody.querySelectorAll('.history-item');
    historyItems.forEach(item => {
        item.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            loadHistoryMessage(index);
        });
    });
}

function loadHistoryMessage(index) {
    const message = chatHistory[index];
    
    if (message) {
        if (message.sender === 'user') {
            messageInput.value = message.message;
            hideModal('chatHistoryModal');
            // Only focus on non-mobile devices to prevent unwanted keyboard popup
            if (!isMobileDevice()) {
                messageInput.focus();
            }
            showNotification('Xabar matn maydoniga yuklandi!');
        } else {
            // If it's an AI message, just close the modal
            hideModal('chatHistoryModal');
            showNotification('Faqat foydalanuvchi xabarlarini yuklab olish mumkin');
        }
    } else {
        showNotification('Xabar topilmadi');
    }
}

function startNewChat() {
    if (confirm('Yangi suhbat boshlamoqchimisiz? Joriy suhbat yo\'qoladi.')) {
        // Clear current chat
        const messages = chatMessages.querySelectorAll('.message-container:not(.welcome-message)');
        messages.forEach(msg => msg.remove());
        
        // Reset state
        isFirstMessage = true;
        
        // Show quick actions again
        quickActions.classList.remove('collapsed');
        quickToggle.classList.remove('show');
        
        // Clear input
        messageInput.value = '';
        sendButton.disabled = true;
        
        // Only focus on non-mobile devices to prevent unwanted keyboard popup
        if (!isMobileDevice()) {
            messageInput.focus();
        }
        
        showNotification('Yangi suhbat boshlandi!');
    }
}

function showChatHistory() {
    formatChatHistory();
    showModal('chatHistoryModal');
}

function showSettings() {
    loadSettings();
    showModal('settingsModal');
}

function showHelp() {
    showModal('helpModal');
}

function showAbout() {
    alert(`🚀 Aspiro AI v1.0

📖 Ingliz tili o'rganish yordamchisi
🎯 O'zbek talabalar uchun AI-ga asoslangan ta'lim platformasi

✨ Xususiyatlar:
• IELTS tayyorlash
• Grammatika ko'rsatmalari
• Lug'at va tarjima
• Amaliy mashqlar
• O'zbek tilida tushuntirishlar

💡 Savollaringiz bo'lsa, yordam bo'limiga qarang!`);
}

// Local Storage Functions
function saveChatMessage(message, sender) {
    const timestamp = new Date().toISOString();
    const chatMessage = {
        id: Date.now(),
        message,
        sender,
        timestamp
    };
    
    chatHistory.push(chatMessage);
    
    // Keep only last 50 messages to prevent localStorage bloat
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(-50);
    }
    
    localStorage.setItem('aspiro-chat-history', JSON.stringify(chatHistory));
}

function loadChatHistory() {
    try {
        const saved = localStorage.getItem('aspiro-chat-history');
        if (saved) {
            chatHistory = JSON.parse(saved);
            
            // Only load recent messages (last 10) to avoid cluttering
            const recentMessages = chatHistory.slice(-10);
            
            recentMessages.forEach(msg => {
                if (msg.sender !== 'welcome') {
                    addMessageToUI(msg.message, msg.sender);
                }
            });
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        chatHistory = [];
    }
}

function addMessageToUI(message, sender) {
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${sender === 'user' ? 'user-container' : ''}`;
    
    const avatar = document.createElement('div');
    avatar.className = sender === 'user' ? 'user-avatar' : 'ai-avatar';
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<img src="/src/aspiro_ai.png" alt="Aspiro AI" class="avatar-img">';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender === 'user' ? 'user-message' : 'ai-message'}`;
    messageDiv.innerHTML = `<p>${message.replace(/\n/g, '<br>')}</p>`;
    
    messageContainer.appendChild(avatar);
    messageContainer.appendChild(messageDiv);
    
    // Insert before welcome message or at the end
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage && chatMessages.children.length === 1) {
        chatMessages.insertBefore(messageContainer, welcomeMessage.nextSibling);
    } else {
        chatMessages.appendChild(messageContainer);
    }
}

function clearChatHistory() {
    if (confirm('Suhbat tarixini butunlay o\'chirmoqchimisiz? Bu amalni qaytarib bo\'lmaydi.')) {
        localStorage.removeItem('aspiro-chat-history');
        chatHistory = [];
        
        // Remove all messages except welcome
        const messages = chatMessages.querySelectorAll('.message-container:not(.welcome-message)');
        messages.forEach(msg => msg.remove());
        
        showNotification('Suhbat tarixi tozalandi!');
        
        // Close modal if open
        hideModal('chatHistoryModal');
    }
}

// Utility Functions
function formatMessage(text) {
    // Simple text formatting
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K to focus input (only on non-mobile devices)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!isMobileDevice()) {
            messageInput.focus();
        }
    }
    
    // Escape to clear input
    if (e.key === 'Escape' && document.activeElement === messageInput) {
        messageInput.value = '';
        sendButton.disabled = true;
    }
});

// File Upload Functions
function handleFileAttachment() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,audio/*,.pdf,.txt,.doc,.docx,.ppt,.pptx,.xls,.xlsx';
    
    input.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                showNotification(`Fayl juda katta: ${file.name}. Maksimal hajmi 10MB.`);
                return;
            }
            
            const fileObj = {
                file: file,
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file)
            };
            
            attachedFiles.push(fileObj);
        });
        
        updateAttachmentPreview();
    });
    
    input.click();
}

function updateAttachmentPreview() {
    // Remove existing preview
    const existingPreview = document.querySelector('.attachment-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    if (attachedFiles.length === 0) return;
    
    // Create preview container
    const previewContainer = document.createElement('div');
    previewContainer.className = 'attachment-preview';
    
    attachedFiles.forEach((file, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        if (file.type.startsWith('image/')) {
            previewItem.innerHTML = `
                <img src="${file.url}" alt="${file.name}" class="preview-image" />
                <button class="remove-attachment" onclick="removeAttachment(${index})">&times;</button>
                <span class="preview-name">${file.name}</span>
            `;
        } else {
            previewItem.innerHTML = `
                <div class="preview-file">
                    <i class="fas fa-file"></i>
                    <span>${file.name}</span>
                    <button class="remove-attachment" onclick="removeAttachment(${index})">&times;</button>
                </div>
            `;
        }
        
        previewContainer.appendChild(previewItem);
    });
    
    // Insert before input section
    const inputSection = document.querySelector('.input-section');
    inputSection.parentNode.insertBefore(previewContainer, inputSection);
}

function removeAttachment(index) {
    URL.revokeObjectURL(attachedFiles[index].url);
    attachedFiles.splice(index, 1);
    updateAttachmentPreview();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Voice Recording Functions
async function handleVoiceRecording() {
    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            startRecording(stream);
        } catch (error) {
            showNotification('Mikrofonga kirish rad etildi yoki mavjud emas.');
        }
    } else {
        stopRecording();
    }
}

function startRecording(stream) {
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = function(event) {
        audioChunks.push(event.data);
    };
    
    mediaRecorder.onstop = function() {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioFile = {
            file: audioBlob,
            name: `Ovozli xabar ${new Date().toLocaleTimeString()}.wav`,
            size: audioBlob.size,
            type: 'audio/wav',
            url: URL.createObjectURL(audioBlob)
        };
        
        attachedFiles.push(audioFile);
        updateAttachmentPreview();
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
    };
    
    mediaRecorder.start();
    isRecording = true;
    
    // Update button appearance
    voiceBtn.classList.add('recording');
    voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
    voiceBtn.title = 'Yozishni to\'xtatish';
    
    showNotification('Ovoz yozish boshlandi...');
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        // Reset button appearance
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        voiceBtn.title = 'Ovozli xabar';
        
        showNotification('Ovoz yozish tugadi!');
    }
}

// Message Action Functions
function copyMessage(button) {
    const messageText = button.closest('.message').querySelector('.message-text').textContent;
    
    navigator.clipboard.writeText(messageText).then(() => {
        showNotification('Xabar nusxalandi!');
        
        // Temporary feedback
        const originalIcon = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            button.innerHTML = originalIcon;
        }, 1000);
    }).catch(() => {
        showNotification('Nusxalash xatosi yuz berdi.');
    });
}

function shareMessage(button) {
    const messageText = button.closest('.message').querySelector('.message-text').textContent;
    
    if (navigator.share) {
        navigator.share({
            title: 'Aspiro AI Javobi',
            text: messageText,
            url: window.location.href
        }).catch(() => {
            fallbackShare(messageText);
        });
    } else {
        fallbackShare(messageText);
    }
}

function fallbackShare(text) {
    const shareData = `Aspiro AI javobi:\n\n${text}\n\n${window.location.href}`;
    
    navigator.clipboard.writeText(shareData).then(() => {
        showNotification('Ulashish uchun matn nusxalandi!');
    }).catch(() => {
        showNotification('Ulashish mumkin bo\'lmadi.');
    });
}

function speakMessage(button) {
    const messageText = button.closest('.message').querySelector('.message-text').textContent;
    
    if ('speechSynthesis' in window) {
        // Reset other speaking buttons
        const otherSpeakingButtons = document.querySelectorAll('.speak-btn.speaking');
        otherSpeakingButtons.forEach(btn => {
            if (btn !== button) {
                btn.innerHTML = '<i class="fas fa-volume-up"></i>';
                btn.title = 'O\'qish';
                btn.classList.remove('speaking');
            }
        });
        
        // Check if this specific button is currently speaking
        const isThisButtonSpeaking = button.classList.contains('speaking');
        
        if (speechSynthesis.speaking && isThisButtonSpeaking) {
            if (speechSynthesis.paused) {
                // Resume if paused
                speechSynthesis.resume();
                button.innerHTML = '<i class="fas fa-pause"></i>';
                button.title = 'To\'xtatish';
                showNotification('O\'qish davom ettirildi');
            } else {
                // Pause if speaking
                speechSynthesis.pause();
                button.innerHTML = '<i class="fas fa-play"></i>';
                button.title = 'Davom ettirish';
                showNotification('O\'qish to\'xtatildi');
            }
        } else {
            // Start new speech
            speechSynthesis.cancel(); // Clear any pending speech
            
            const utterance = new SpeechSynthesisUtterance(messageText);
            utterance.lang = 'en-US'; // English for English learning content
            utterance.rate = 0.9;
            utterance.pitch = 1;
            
            utterance.onstart = () => {
                button.innerHTML = '<i class="fas fa-pause"></i>';
                button.title = 'To\'xtatish';
                button.classList.add('speaking');
            };
            
            utterance.onend = () => {
                button.innerHTML = '<i class="fas fa-volume-up"></i>';
                button.title = 'O\'qish';
                button.classList.remove('speaking');
            };
            
            utterance.onerror = () => {
                button.innerHTML = '<i class="fas fa-volume-up"></i>';
                button.title = 'O\'qish';
                button.classList.remove('speaking');
                showNotification('O\'qishda xatolik yuz berdi');
            };
            
            speechSynthesis.speak(utterance);
            showNotification('Matn o\'qilmoqda...');
        }
    } else {
        showNotification('Ovozli o\'qish qo\'llab-quvvatlanmaydi.');
    }
}

function regenerateMessage(button) {
    const messageContainer = button.closest('.message-container');
    const previousUserMessage = messageContainer.previousElementSibling;
    
    if (previousUserMessage && previousUserMessage.classList.contains('user-container')) {
        const userMessageText = previousUserMessage.querySelector('.message-text').textContent;
        
        // Remove the AI message
        messageContainer.remove();
        
        // Regenerate response
        showTypingIndicator();
        sendMessage(userMessageText);
        
        showNotification('Javob qayta yaratilmoqda...');
    }
}

// Enhanced Message Actions
function editMessage(button) {
    const messageText = button.closest('.message').querySelector('.message-text');
    const originalText = messageText.textContent;
    
    // Create editable textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = originalText;
    textarea.rows = Math.max(3, originalText.split('\n').length);
    
    // Create edit controls
    const editControls = document.createElement('div');
    editControls.className = 'edit-controls';
    editControls.innerHTML = `
        <button class="btn-small save-edit" onclick="saveEdit(this)">
            <i class="fas fa-check"></i> Saqlash
        </button>
        <button class="btn-small cancel-edit" onclick="cancelEdit(this, '${originalText.replace(/'/g, "\\'")}')">
            <i class="fas fa-times"></i> Bekor qilish
        </button>
    `;
    
    // Replace content
    messageText.innerHTML = '';
    messageText.appendChild(textarea);
    messageText.appendChild(editControls);
    
    // Hide action buttons during edit
    const actionButtons = button.closest('.message-actions');
    actionButtons.style.display = 'none';
    
    // Focus textarea
    textarea.focus();
    textarea.select();
}

function editUserMessage(button) {
    const messageContainer = button.closest('.message-container');
    const messageText = messageContainer.querySelector('.message-text');
    const originalText = messageText.textContent;
    
    // Create edit interface
    const editInterface = document.createElement('div');
    editInterface.className = 'edit-interface';
    editInterface.innerHTML = `
        <textarea class="edit-textarea" rows="3">${originalText}</textarea>
        <div class="edit-controls">
            <button class="btn-small resend-edit" onclick="resendEditedMessage(this)">
                <i class="fas fa-paper-plane"></i> Qayta yuborish
            </button>
            <button class="btn-small save-edit" onclick="saveUserEdit(this)">
                <i class="fas fa-check"></i> Saqlash
            </button>
            <button class="btn-small cancel-edit" onclick="cancelUserEdit(this, '${originalText.replace(/'/g, "\\'")}')">
                <i class="fas fa-times"></i> Bekor qilish
            </button>
        </div>
    `;
    
    messageText.innerHTML = '';
    messageText.appendChild(editInterface);
    
    // Hide actions
    button.closest('.message-actions').style.display = 'none';
    
    editInterface.querySelector('textarea').focus();
}

function saveEdit(button) {
    const messageText = button.closest('.message-text');
    const textarea = messageText.querySelector('.edit-textarea');
    const newText = textarea.value;
    
    // Update message content
    messageText.innerHTML = formatMessage(newText);
    
    // Show action buttons
    const actionButtons = messageText.closest('.message-content').querySelector('.message-actions');
    actionButtons.style.display = 'flex';
    
    showNotification('Xabar tahrirlandi!');
}

function cancelEdit(button, originalText) {
    const messageText = button.closest('.message-text');
    messageText.innerHTML = formatMessage(originalText);
    
    // Show action buttons
    const actionButtons = messageText.closest('.message-content').querySelector('.message-actions');
    actionButtons.style.display = 'flex';
}

function saveUserEdit(button) {
    const messageText = button.closest('.message-text');
    const textarea = messageText.querySelector('.edit-textarea');
    const newText = textarea.value;
    
    messageText.innerHTML = formatMessage(newText);
    
    const actionButtons = messageText.closest('.message-content').querySelector('.message-actions');
    actionButtons.style.display = 'flex';
    
    showNotification('Xabar saqlandi!');
}

function cancelUserEdit(button, originalText) {
    const messageText = button.closest('.message-text');
    messageText.innerHTML = formatMessage(originalText);
    
    const actionButtons = messageText.closest('.message-content').querySelector('.message-actions');
    actionButtons.style.display = 'flex';
}

function resendEditedMessage(button) {
    const textarea = button.closest('.edit-interface').querySelector('.edit-textarea');
    const newText = textarea.value.trim();
    
    if (newText) {
        // Remove the current message and any AI responses after it
        const messageContainer = button.closest('.message-container');
        let nextElement = messageContainer.nextElementSibling;
        
        // Remove subsequent AI responses
        while (nextElement && !nextElement.classList.contains('user-container')) {
            const toRemove = nextElement;
            nextElement = nextElement.nextElementSibling;
            toRemove.remove();
        }
        
        // Remove current message
        messageContainer.remove();
        
        // Send new message
        sendMessage(newText);
        showNotification('Yangi xabar yuborildi!');
    }
}

function deleteMessage(button) {
    if (confirm('Bu xabarni o\'chirmoqchimisiz?')) {
        const messageContainer = button.closest('.message-container');
        messageContainer.remove();
        showNotification('Xabar o\'chirildi!');
    }
}

function saveMessage(button) {
    const messageText = button.closest('.message').querySelector('.message-text').textContent;
    const timestamp = new Date().toLocaleString('uz-UZ');
    
    // Save to localStorage
    const savedMessages = JSON.parse(localStorage.getItem('aspiro-saved-messages') || '[]');
    const savedMessage = {
        id: Date.now(),
        text: messageText,
        timestamp: timestamp,
        type: 'ai-response'
    };
    
    savedMessages.push(savedMessage);
    localStorage.setItem('aspiro-saved-messages', JSON.stringify(savedMessages));
    
    // Visual feedback
    const originalIcon = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i>';
    button.style.color = 'var(--success)';
    
    setTimeout(() => {
        button.innerHTML = originalIcon;
        button.style.color = '';
    }, 2000);
    
    showNotification('Xabar saqlandi!');
}

function exportMessage(button) {
    const messageText = button.closest('.message').querySelector('.message-text').textContent;
    const timestamp = new Date().toLocaleString('uz-UZ');
    
    // Create export options modal
    showExportModal(messageText, timestamp);
}

function showExportModal(messageText, timestamp) {
    const modal = document.createElement('div');
    modal.className = 'modal export-modal show';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-download"></i> Xabarni eksport qilish</h3>
                <button class="modal-close" onclick="closeExportModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="export-options">
                    <button class="export-option" onclick="exportAsText('${messageText.replace(/'/g, "\\'")}', '${timestamp}')">
                        <i class="fas fa-file-alt"></i>
                        <span>Matn fayli (.txt)</span>
                    </button>
                    <button class="export-option" onclick="exportAsMarkdown('${messageText.replace(/'/g, "\\'")}', '${timestamp}')">
                        <i class="fab fa-markdown"></i>
                        <span>Markdown (.md)</span>
                    </button>
                    <button class="export-option" onclick="exportAsPDF('${messageText.replace(/'/g, "\\'")}', '${timestamp}')">
                        <i class="fas fa-file-pdf"></i>
                        <span>PDF fayli</span>
                    </button>
                    <button class="export-option" onclick="exportToEmail('${messageText.replace(/'/g, "\\'")}')">
                        <i class="fas fa-envelope"></i>
                        <span>Email orqali yuborish</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeExportModal() {
    const modal = document.querySelector('.export-modal');
    if (modal) {
        modal.remove();
    }
}

function exportAsText(messageText, timestamp) {
    const content = `Aspiro AI Javobi\n================\n\nVaqt: ${timestamp}\n\n${messageText}`;
    downloadFile(content, `aspiro-ai-javob-${Date.now()}.txt`, 'text/plain');
    closeExportModal();
    showNotification('Matn fayli yuklab olindi!');
}

function exportAsMarkdown(messageText, timestamp) {
    const content = `# Aspiro AI Javobi\n\n**Vaqt:** ${timestamp}\n\n${messageText}`;
    downloadFile(content, `aspiro-ai-javob-${Date.now()}.md`, 'text/markdown');
    closeExportModal();
    showNotification('Markdown fayli yuklab olindi!');
}

function exportAsPDF(messageText, timestamp) {
    // Simple PDF export using browser print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Aspiro AI Javobi</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #2563eb; }
                    .timestamp { color: #666; margin-bottom: 20px; }
                    .content { line-height: 1.6; }
                </style>
            </head>
            <body>
                <h1>Aspiro AI Javobi</h1>
                <div class="timestamp">Vaqt: ${timestamp}</div>
                <div class="content">${messageText.replace(/\n/g, '<br>')}</div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    closeExportModal();
    showNotification('PDF eksport oynasi ochildi!');
}

function exportToEmail(messageText) {
    const subject = encodeURIComponent('Aspiro AI Javobi');
    const body = encodeURIComponent(`Aspiro AI dan javob:\n\n${messageText}\n\nYuborilgan: ${new Date().toLocaleString('uz-UZ')}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    closeExportModal();
    showNotification('Email ilovasi ochildi!');
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function showMoreActions(button) {
    const messageContainer = button.closest('.message-container');
    const moreMenu = document.createElement('div');
    moreMenu.className = 'more-actions-menu';
    moreMenu.innerHTML = `
        <button onclick="translateMessage(this)" class="more-action-item">
            <i class="fas fa-language"></i> Tarjima qilish
        </button>
        <button onclick="explainMessage(this)" class="more-action-item">
            <i class="fas fa-question-circle"></i> Tushuntirish
        </button>
        <button onclick="continueMessage(this)" class="more-action-item">
            <i class="fas fa-arrow-right"></i> Davom ettirish
        </button>
        <button onclick="summarizeMessage(this)" class="more-action-item">
            <i class="fas fa-compress"></i> Qisqacha
        </button>
        <button onclick="improveMessage(this)" class="more-action-item">
            <i class="fas fa-magic"></i> Yaxshilash
        </button>
    `;
    
    // Position menu
    const rect = button.getBoundingClientRect();
    moreMenu.style.position = 'fixed';
    moreMenu.style.top = (rect.top - 200) + 'px';
    moreMenu.style.left = rect.left + 'px';
    moreMenu.style.zIndex = '3000';
    
    document.body.appendChild(moreMenu);
    
    // Close menu when clicking outside
    const closeMenu = (e) => {
        if (!moreMenu.contains(e.target) && e.target !== button) {
            moreMenu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
}

function translateMessage(button) {
    const messageText = button.closest('.message-container').querySelector('.message-text').textContent;
    sendMessage(`Quyidagi matnni o'zbek tiliga tarjima qiling: "${messageText}"`);
    button.closest('.more-actions-menu').remove();
    showNotification('Tarjima so\'rovi yuborildi!');
}

function explainMessage(button) {
    const messageText = button.closest('.message-container').querySelector('.message-text').textContent;
    sendMessage(`Quyidagi matnni batafsil tushuntirib bering: "${messageText}"`);
    button.closest('.more-actions-menu').remove();
    showNotification('Tushuntirish so\'rovi yuborildi!');
}

function continueMessage(button) {
    const messageText = button.closest('.message-container').querySelector('.message-text').textContent;
    sendMessage(`Quyidagi matnni davom ettiring: "${messageText}"`);
    button.closest('.more-actions-menu').remove();
    showNotification('Davom ettirish so\'rovi yuborildi!');
}

function summarizeMessage(button) {
    const messageText = button.closest('.message-container').querySelector('.message-text').textContent;
    sendMessage(`Quyidagi matnni qisqacha shaklda ifoda eting: "${messageText}"`);
    button.closest('.more-actions-menu').remove();
    showNotification('Qisqacha so\'rovi yuborildi!');
}

function improveMessage(button) {
    const messageText = button.closest('.message-container').querySelector('.message-text').textContent;
    sendMessage(`Quyidagi matnni yaxshilang va qayta yozing: "${messageText}"`);
    button.closest('.more-actions-menu').remove();
    showNotification('Yaxshilash so\'rovi yuborildi!');
}

// Enhanced sendMessage function to handle attachments
async function sendMessageWithAttachments(message) {
    if (isTyping) return;
    
    // Check authentication before sending
    if (!accessToken) {
        logout();
        return;
    }
    
    // Collapse quick actions after first message
    if (isFirstMessage) {
        collapseQuickActions();
        isFirstMessage = false;
    }
    
    // Add user message to chat with attachments
    const attachmentsToSend = [...attachedFiles];
    addMessageToChat(message, 'user', attachmentsToSend);
    
    // Clear input and attachments
    messageInput.value = '';
    sendButton.disabled = true;
    clearAttachments();
    
    // Show typing indicator
    showTypingIndicator();
    setInputState(false);
    
    try {
        // Prepare FormData for file uploads
        const formData = new FormData();
        formData.append('message', message);
        
        attachmentsToSend.forEach((file, index) => {
            formData.append('files', file.file);
        });
        
        // Send to API with authentication
        const response = await fetch('/chat-with-files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, redirect to login
                logout();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        hideTypingIndicator();
        addMessageToChat(data.response, 'ai');
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        addErrorMessage('Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
    } finally {
        setInputState(true);
        // Only focus on non-mobile devices to prevent unwanted keyboard popup
        if (!isMobileDevice()) {
            messageInput.focus();
        }
    }
}

function clearAttachments() {
    attachedFiles.forEach(file => {
        URL.revokeObjectURL(file.url);
    });
    attachedFiles = [];
    updateAttachmentPreview();
}

// Update the original sendMessage function
const originalSendMessage = sendMessage;
sendMessage = function(message) {
    if (attachedFiles.length > 0) {
        sendMessageWithAttachments(message);
    } else {
        originalSendMessage(message);
    }
};

// Update saveChatMessage to handle attachments
function saveChatMessage(message, sender, attachments = null) {
    const timestamp = new Date().toISOString();
    const chatMessage = {
        id: Date.now(),
        message,
        sender,
        timestamp,
        attachments: attachments ? attachments.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size
        })) : null
    };
    
    chatHistory.push(chatMessage);
    
    // Keep only last 50 messages to prevent localStorage bloat
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(-50);
    }
    
    localStorage.setItem('aspiro-chat-history', JSON.stringify(chatHistory));
}

// Add some helpful console messages
console.log('🎓 Aspiro AI yuklandi!');
console.log('💡 Maslahatlar:');
console.log('   • Ctrl/Cmd + K: Inputga fokus');
console.log('   • Escape: Inputni tozalash');
console.log('   • Enter: Xabar yuborish');
console.log('   • Fayl yuklash: Qisqichdan foydalaning');
console.log('   • Ovoz yozish: Mikrofon tugmasini bosing');

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Register service worker if available
        // This is optional and can be implemented later
    });
}

// Error handling for fetch requests
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    if (isTyping) {
        hideTypingIndicator();
        addErrorMessage('Kutilmagan xatolik yuz berdi.');
        setInputState(true);
    }
});

// Initial input state
sendButton.disabled = true;

// Voice Recognition and Pronunciation Scoring
class VoicePronunciationScorer {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.targetWord = '';
        this.initializeVoiceRecognition();
    }

    initializeVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.log('Speech recognition not supported');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const spokenText = event.results[0][0].transcript.toLowerCase();
            this.analyzePronunciation(spokenText);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stopListening();
        };

        this.recognition.onend = () => {
            this.stopListening();
        };
    }

    startListening(targetWord) {
        if (!this.recognition) {
            alert('Ovozni tanish qo\'llab-quvvatlanmaydi');
            return;
        }

        this.targetWord = targetWord.toLowerCase();
        this.isListening = true;
        this.recognition.start();
        
        // Update UI
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
            voiceBtn.classList.add('listening');
        }
        
        // Show listening indicator
        this.showListeningIndicator();
    }

    stopListening() {
        this.isListening = false;
        if (this.recognition) {
            this.recognition.stop();
        }
        
        // Reset UI
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            voiceBtn.classList.remove('listening');
        }
        this.hideListeningIndicator();
    }

    analyzePronunciation(spokenText) {
        // Simple pronunciation scoring algorithm
        const similarity = this.calculateSimilarity(spokenText, this.targetWord);
        const score = Math.round(similarity * 100);
        
        this.displayPronunciationResult(spokenText, score);
    }

    calculateSimilarity(spoken, target) {
        // Levenshtein distance-based similarity
        const matrix = [];
        const n = spoken.length;
        const m = target.length;

        if (n === 0) return m === 0 ? 1 : 0;
        if (m === 0) return 0;

        // Initialize matrix
        for (let i = 0; i <= n; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= m; j++) {
            matrix[0][j] = j;
        }

        // Fill matrix
        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                if (spoken[i - 1] === target[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        const maxLength = Math.max(n, m);
        return (maxLength - matrix[n][m]) / maxLength;
    }

    displayPronunciationResult(spokenText, score) {
        const resultHtml = `
            <div class="pronunciation-result">
                <div class="result-header">
                    <h3>🎤 Talaffuz natijasi</h3>
                </div>
                <div class="result-body">
                    <div class="score-circle ${score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'needs-improvement'}">
                        <span class="score">${score}</span>
                        <span class="score-text">%</span>
                    </div>
                    <div class="result-details">
                        <p><strong>Siz aytdingiz:</strong> "${spokenText}"</p>
                        <p><strong>Maqsad so'z:</strong> "${this.targetWord}"</p>
                        <p class="feedback">${this.getFeedback(score)}</p>
                    </div>
                </div>
                <div class="result-actions">
                    <button onclick="voiceScorer.startListening('${this.targetWord}')" class="retry-btn">
                        <i class="fas fa-redo"></i> Qayta urinish
                    </button>
                </div>
            </div>
        `;
        
        this.appendToChat(resultHtml);
    }

    getFeedback(score) {
        if (score >= 90) return "🎉 Ajoyib! Talaffuzingiz mukammal!";
        if (score >= 80) return "😊 Yaxshi! Talaffuzingiz juda yaxshi!";
        if (score >= 60) return "👍 Yaxshi! Biroz mashq qilsangiz yanada yaxshi bo'ladi.";
        if (score >= 40) return "💪 Yaxshi harakat! Qayta urinib ko'ring.";
        return "🤔 Qayta urinib ko'ring. Sekinroq va aniqroq gapiring.";
    }

    showListeningIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'listeningIndicator';
        indicator.className = 'listening-indicator';
        indicator.innerHTML = `
            <div class="listening-animation">
                <div class="wave"></div>
                <div class="wave"></div>
                <div class="wave"></div>
            </div>
            <p>Gapiring... 🎤</p>
        `;
        document.body.appendChild(indicator);
    }

    hideListeningIndicator() {
        const indicator = document.getElementById('listeningIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    appendToChat(html) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        messageDiv.innerHTML = html;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Initialize voice scorer
const voiceScorer = new VoicePronunciationScorer();

// Add pronunciation practice button to quick actions
document.addEventListener('DOMContentLoaded', function() {
    // Add new quick action button for pronunciation practice
    const quickButtons = document.querySelector('.quick-buttons');
    if (quickButtons) {
        const pronunciationBtn = document.createElement('button');
        pronunciationBtn.className = 'quick-btn';
        pronunciationBtn.innerHTML = `
            <i class="fas fa-microphone"></i>
            <span>Talaffuz amaliyoti</span>
        `;
        pronunciationBtn.onclick = () => startPronunciationPractice();
        quickButtons.appendChild(pronunciationBtn);

        // Add camera learning button
        const cameraBtn = document.createElement('button');
        cameraBtn.className = 'quick-btn';
        cameraBtn.innerHTML = `
            <i class="fas fa-camera"></i>
            <span>Rasm orqali o'rganish</span>
        `;
        cameraBtn.onclick = () => startCameraLearning();
        quickButtons.appendChild(cameraBtn);

        // Add proverb translation button
        const proverbBtn = document.createElement('button');
        proverbBtn.className = 'quick-btn';
        proverbBtn.innerHTML = `
            <i class="fas fa-quote-right"></i>
            <span>Maqol tarjimasi</span>
        `;
        proverbBtn.onclick = () => startProverbTranslation();
        quickButtons.appendChild(proverbBtn);
    }
});

function startPronunciationPractice() {
    const words = ['hello', 'world', 'beautiful', 'education', 'pronunciation', 'excellent'];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    
    const practiceHtml = `
        <div class="pronunciation-practice">
            <h3>🎤 Talaffuz amaliyoti</h3>
            <p>Quyidagi so'zni ayting:</p>
            <div class="practice-word">${randomWord}</div>
            <div class="practice-controls">
                <button onclick="voiceScorer.startListening('${randomWord}')" class="practice-btn">
                    <i class="fas fa-microphone"></i> Boshlash
                </button>
                <button onclick="playPronunciation('${randomWord}')" class="practice-btn">
                    <i class="fas fa-volume-up"></i> Tinglash
                </button>
            </div>
        </div>
    `;
    
    voiceScorer.appendToChat(practiceHtml);
}

function playPronunciation(word) {
    // Use Web Speech API to pronounce the word
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
    }
}

// Camera Learning Feature
function startCameraLearning() {
    const cameraHtml = `
        <div class="camera-learning">
            <h3>📸 Rasm orqali o'rganish</h3>
            <p>Biror narsaning rasmini oling va ingliz tilini o'rganing!</p>
            <div class="camera-container">
                <video id="cameraVideo" style="display:none;" width="300" height="200"></video>
                <canvas id="cameraCanvas" style="display:none;" width="300" height="200"></canvas>
                <div class="camera-controls">
                    <input type="file" id="imageInput" accept="image/*" style="display:none;">
                    <button onclick="openCamera()" class="camera-btn">
                        <i class="fas fa-camera"></i> Kameradan rasm olish
                    </button>
                    <button onclick="document.getElementById('imageInput').click()" class="camera-btn">
                        <i class="fas fa-image"></i> Rasm tanlash
                    </button>
                </div>
            </div>
        </div>
    `;
    
    voiceScorer.appendToChat(cameraHtml);
    
    // Handle file input with a small delay to ensure DOM is ready
    setTimeout(() => {
        const imageInput = document.getElementById('imageInput');
        if (imageInput) {
            imageInput.onchange = (event) => {
                const file = event.target.files[0];
                if (file) {
                    processImage(file);
                }
            };
        }
    }, 100);
}

function openCamera() {
    const video = document.getElementById('cameraVideo');
    if (!video) {
        alert('Video element not found');
        return;
    }
    video.style.display = 'block';
    
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.play();
            
            // Add capture button
            const captureBtn = document.createElement('button');
            captureBtn.className = 'camera-btn';
            captureBtn.innerHTML = '<i class="fas fa-camera"></i> Rasmga tushirish';
            captureBtn.onclick = () => captureImage(stream);
            video.parentNode.appendChild(captureBtn);
        })
        .catch(err => {
            alert('Kameraga ruxsat berilmadi: ' + err.message);
        });
}

function captureImage(stream) {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    if (!video || !canvas) {
        alert('Camera elements not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Stop camera
    stream.getTracks().forEach(track => track.stop());
    video.style.display = 'none';
    
    // Convert to blob and process
    canvas.toBlob(blob => {
        processImage(blob);
    }, 'image/jpeg', 0.8);
}

function processImage(imageFile) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const imageData = e.target.result;
        
        // Show loading
        const loadingHtml = `
            <div class="image-processing">
                <h3>🔍 Rasmni tahlil qilmoqda...</h3>
                <div class="loading-spinner"></div>
                <p>Biroz kuting, rasmingizni o'rganmoqda...</p>
            </div>
        `;
        voiceScorer.appendToChat(loadingHtml);
        
        // Send to backend (simplified version)
        // In production, you'd send the actual image data
        fetch('/image-learn', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_data: imageData.split(',')[1] // base64 data
            })
        })
        .then(response => response.json())
        .then(data => {
            const resultHtml = `
                <div class="image-result">
                    <h3>📸 Rasm natijasi</h3>
                    <div class="image-preview">
                        <img src="${imageData}" alt="Analyzed image" style="max-width: 200px; border-radius: 10px;">
                    </div>
                    <div class="learning-content">
                        ${data.response}
                    </div>
                </div>
            `;
            voiceScorer.appendToChat(resultHtml);
        })
        .catch(error => {
            console.error('Error:', error);
            voiceScorer.appendToChat(`
                <div class="error-message">
                    <h3>❌ Xatolik</h3>
                    <p>Rasmni tahlil qilishda xatolik yuz berdi. Qayta urinib ko'ring.</p>
                </div>
            `);
        });
    };
    reader.readAsDataURL(imageFile);
}

// Proverb Translation Feature
function startProverbTranslation() {
    const proverbHtml = `
        <div class="proverb-translation">
            <h3>📜 O'zbek maqollarini ingliz tiliga tarjima qilish</h3>
            <p>O'zbek maqolini kiriting va uning ingliz ekvivalentini bilib oling:</p>
            <div class="proverb-input">
                <textarea id="proverbInput" placeholder="Masalan: 'Mehnat - baxt kaliti'" rows="3"></textarea>
                <button onclick="translateProverb()" class="proverb-btn">
                    <i class="fas fa-language"></i> Tarjima qilish
                </button>
            </div>
            <div class="proverb-examples">
                <h4>Mashhur maqollar:</h4>
                <div class="example-proverbs">
                    <button onclick="useExampleProverb('Ilm olish - beshikdan qabrgacha')" class="example-btn">
                        "Ilm olish - beshikdan qabrgacha"
                    </button>
                    <button onclick="useExampleProverb('Sabr tubi - sarg\'ish')" class="example-btn">
                        "Sabr tubi - sarg'ish"
                    </button>
                    <button onclick="useExampleProverb('Mehr - eng katta boylik')" class="example-btn">
                        "Mehr - eng katta boylik"
                    </button>
                </div>
            </div>
        </div>
    `;
    voiceScorer.appendToChat(proverbHtml);
}

function useExampleProverb(proverb) {
    const proverbInput = document.getElementById('proverbInput');
    if (proverbInput) {
        proverbInput.value = proverb;
    }
}

function translateProverb() {
    const proverbInput = document.getElementById('proverbInput');
    if (!proverbInput) {
        alert('Proverb input not found');
        return;
    }
    
    const proverbText = proverbInput.value.trim();
    
    if (!proverbText) {
        alert('Maqol kiriting!');
        return;
    }
    
    // Show loading
    const loadingHtml = `
        <div class="proverb-processing">
            <h3>🔄 Maqolni tarjima qilmoqda...</h3>
            <div class="loading-spinner"></div>
        </div>
    `;
    voiceScorer.appendToChat(loadingHtml);
    
    fetch('/proverb-translate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            uzbek_proverb: proverbText
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        const resultHtml = `
            <div class="proverb-result">
                <h3>📜 Maqol tarjimasi</h3>
                <div class="original-proverb">
                    <strong>O'zbek maqol:</strong> "${proverbText}"
                </div>
                <div class="translation-content">
                    ${data.proverb_analysis}
                </div>
                <div class="proverb-actions">
                    <button onclick="startProverbTranslation()" class="action-btn">
                        <i class="fas fa-plus"></i> Yana
                    </button>
                </div>
            </div>
        `;
        voiceScorer.appendToChat(resultHtml);
    })
    .catch(error => {
        console.error('Error:', error);
        voiceScorer.appendToChat(`
            <div class="error-message">
                <h3>❌ Xatolik</h3>
                <p>Maqolni tarjima qilishda xatolik yuz berdi. Qayta urinib ko'ring.</p>
            </div>
        `);
    });
}

// Enhanced User Interface Functions
function updateUserInterface() {
    if (currentUser) {
        // Update menu user info only
        const menuUserName = document.getElementById('menuUserName');
        const menuUserEmail = document.getElementById('menuUserEmail');
        const menuUserPlan = document.getElementById('menuUserPlan');
        
        if (menuUserName) menuUserName.textContent = currentUser.full_name;
        if (menuUserEmail) menuUserEmail.textContent = currentUser.email;
        if (menuUserPlan) menuUserPlan.textContent = `${currentUser.subscription_plan} Plan`;
        
        // Update welcome message
        const welcomeMessage = document.querySelector('.welcome-message .message');
        if (welcomeMessage) {
            welcomeMessage.innerHTML = `<p>Salom ${currentUser.full_name}! Men Aspiro AI man. Ingliz tili bo'yicha har qanday savolingizga javob beraman. Qanday yordam berishim mumkin? 🎓</p>`;
        }
        
        // Load user stats
        loadUserStats();
    }
}

// Profile Functions
function showProfile() {
    if (!currentUser) return;
    
    // Populate profile modal with user data
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileJoinDate = document.getElementById('profileJoinDate');
    const profilePlan = document.getElementById('profilePlan');
    
    if (profileName) profileName.value = currentUser.full_name;
    if (profileEmail) profileEmail.value = currentUser.email;
    if (profileJoinDate) {
        const joinDate = new Date(currentUser.created_at).toLocaleDateString('uz-UZ');
        profileJoinDate.value = joinDate;
    }
    if (profilePlan) profilePlan.textContent = currentUser.subscription_plan;
    
    showModal('profileModal');
}

function editProfile() {
    const profileName = document.getElementById('profileName');
    const editBtn = document.getElementById('editProfileBtn');
    const saveBtn = document.getElementById('saveProfileBtn');
    
    if (profileName) {
        profileName.removeAttribute('readonly');
        profileName.focus();
    }
    
    if (editBtn) editBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'inline-block';
}

async function saveProfile() {
    const profileName = document.getElementById('profileName');
    const editBtn = document.getElementById('editProfileBtn');
    const saveBtn = document.getElementById('saveProfileBtn');
    
    if (!profileName) return;
    
    const newName = profileName.value.trim();
    if (!newName) {
        showNotification('Ism bo\'sh bo\'lishi mumkin emas');
        return;
    }
    
    try {
        const response = await fetch('/update-profile', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                full_name: newName
            })
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            currentUser = updatedUser;
            localStorage.setItem('user_info', JSON.stringify(updatedUser));
            
            // Update UI
            updateUserInterface();
            
            showNotification('Profil muvaffaqiyatli yangilandi');
        } else {
            showNotification('Profil yangilanmadi. Qayta urinib ko\'ring.');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
    
    // Reset form state
    if (profileName) profileName.setAttribute('readonly', true);
    if (editBtn) editBtn.style.display = 'inline-block';
    if (saveBtn) saveBtn.style.display = 'none';
}

// Usage Stats Functions
async function loadUserStats() {
    try {
        const response = await fetch('/user-stats', {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const stats = await response.json();
            updateStatsDisplay(stats);
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

function updateStatsDisplay(stats) {
    const totalChats = document.getElementById('totalChats');
    const totalMessages = document.getElementById('totalMessages');
    const totalTime = document.getElementById('totalTime');
    const streakDays = document.getElementById('streakDays');
    
    if (totalChats) totalChats.textContent = stats.total_chats || 0;
    if (totalMessages) totalMessages.textContent = stats.total_messages || 0;
    if (totalTime) totalTime.textContent = `${Math.round((stats.total_time || 0) / 3600)} soat`;
    if (streakDays) streakDays.textContent = stats.streak_days || 0;
}

function showUsageStats() {
    loadUserStats();
    showModal('usageStatsModal');
}

// Upgrade Functions
function showUpgrade() {
    showModal('upgradeModal');
}

// Feedback Functions
function showFeedback() {
    // Reset feedback form
    const stars = document.querySelectorAll('.star');
    const feedbackType = document.getElementById('feedbackType');
    const feedbackMessage = document.getElementById('feedbackMessage');
    
    stars.forEach(star => star.classList.remove('active'));
    if (feedbackType) feedbackType.value = 'general';
    if (feedbackMessage) feedbackMessage.value = '';
    
    showModal('feedbackModal');
}

function handleStarRating(event) {
    const clickedStar = event.target;
    const rating = parseInt(clickedStar.dataset.rating);
    const stars = document.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

async function submitFeedback() {
    const activeStars = document.querySelectorAll('.star.active');
    const feedbackType = document.getElementById('feedbackType');
    const feedbackMessage = document.getElementById('feedbackMessage');
    
    const rating = activeStars.length;
    const type = feedbackType ? feedbackType.value : 'general';
    const message = feedbackMessage ? feedbackMessage.value.trim() : '';
    
    if (!message) {
        showNotification('Iltimos, fikr-mulohazangizni yozing');
        return;
    }
    
    try {
        const response = await fetch('/submit-feedback', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                rating: rating,
                type: type,
                message: message
            })
        });
        
        if (response.ok) {
            showNotification('Fikr-mulohazangiz uchun rahmat!');
            hideModal('feedbackModal');
        } else {
            showNotification('Xatolik yuz berdi. Qayta urinib ko\'ring.');
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showNotification('Xatolik yuz berdi. Qayta urinib ko\'ring.');
    }
}

// This DOMContentLoaded listener is removed to avoid conflicts with the main one

function setupUserEventListeners() {
    // User-related menu items - these are handled in main setupEventListeners now
    // const profileBtn = document.getElementById('profileBtn');
    // const upgradeBtn = document.getElementById('upgradeBtn');
    // const usageStatsBtn = document.getElementById('usageStatsBtn');
    // const feedbackBtn = document.getElementById('feedbackBtn');
    
    // if (profileBtn) profileBtn.addEventListener('click', showProfile);
    // if (upgradeBtn) upgradeBtn.addEventListener('click', showUpgrade);
    // if (usageStatsBtn) usageStatsBtn.addEventListener('click', showUsageStats);
    // if (feedbackBtn) feedbackBtn.addEventListener('click', showFeedback);
    
    // Profile modal buttons
    const editProfileBtn = document.getElementById('editProfileBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const upgradeFromProfile = document.getElementById('upgradeFromProfile');
    
    if (editProfileBtn) editProfileBtn.addEventListener('click', editProfile);
    if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
    if (upgradeFromProfile) {
        upgradeFromProfile.addEventListener('click', function() {
            hideModal('profileModal');
            showUpgrade();
        });
    }
    
    // Feedback modal elements
    const stars = document.querySelectorAll('.star');
    const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
    const cancelFeedbackBtn = document.getElementById('cancelFeedbackBtn');
    
    stars.forEach(star => {
        star.addEventListener('click', handleStarRating);
    });
    
    if (submitFeedbackBtn) submitFeedbackBtn.addEventListener('click', submitFeedback);
    if (cancelFeedbackBtn) {
        cancelFeedbackBtn.addEventListener('click', function() {
            hideModal('feedbackModal');
        });
    }
    
    // Modal close buttons for new modals
    const closeProfileModal = document.getElementById('closeProfileModal');
    const closeUsageStatsModal = document.getElementById('closeUsageStatsModal');
    const closeUpgradeModal = document.getElementById('closeUpgradeModal');
    const closeFeedbackModal = document.getElementById('closeFeedbackModal');
    
    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', function() {
            hideModal('profileModal');
        });
    }
    if (closeUsageStatsModal) {
        closeUsageStatsModal.addEventListener('click', function() {
            hideModal('usageStatsModal');
        });
    }
    if (closeUpgradeModal) {
        closeUpgradeModal.addEventListener('click', function() {
            hideModal('upgradeModal');
        });
    }
    if (closeFeedbackModal) {
        closeFeedbackModal.addEventListener('click', function() {
            hideModal('feedbackModal');
        });
    }
    
    // Add general modal close functionality for all modals
    const allCloseButtons = document.querySelectorAll('.modal-close');
    allCloseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
} 