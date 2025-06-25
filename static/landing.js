// Theme Management
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

// Initialize theme from localStorage or default to light
// Clean up any old theme keys for consistency
if (localStorage.getItem('aspiro-theme') && !localStorage.getItem('theme')) {
    localStorage.setItem('theme', localStorage.getItem('aspiro-theme'));
    localStorage.removeItem('aspiro-theme');
}

const currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);
updateThemeIcon(currentTheme);

// Theme toggle functionality
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
    } else {
        themeIcon.className = 'fas fa-moon';
    }
}

// Smooth scrolling for navigation links
function scrollToFeatures() {
    document.getElementById('features').scrollIntoView({
        behavior: 'smooth'
    });
}

function scrollToContact() {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
        contactSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Mobile menu functionality
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.querySelector('.nav-menu');

mobileMenuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    const icon = mobileMenuBtn.querySelector('i');
    
    if (navMenu.classList.contains('active')) {
        icon.className = 'fas fa-times';
    } else {
        icon.className = 'fas fa-bars';
    }
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        // Close mobile menu
        navMenu.classList.remove('active');
        mobileMenuBtn.querySelector('i').className = 'fas fa-bars';
        
        // Handle smooth scrolling for anchor links (except Aloqa which has onclick)
        const href = link.getAttribute('href');
        if (href.startsWith('#') && !link.hasAttribute('onclick')) {
            e.preventDefault();
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    
    if (window.scrollY > 50) {
        navbar.style.background = document.documentElement.getAttribute('data-theme') === 'dark' 
            ? 'rgba(15, 23, 42, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)';
    } else {
        navbar.style.background = document.documentElement.getAttribute('data-theme') === 'dark' 
            ? 'rgba(15, 23, 42, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)';
    }
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Animate elements on scroll with staggered delays
document.addEventListener('DOMContentLoaded', () => {
    // Add staggered delays to nav links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach((link, index) => {
        link.style.setProperty('--stagger-delay', `${0.1 + index * 0.1}s`);
    });
    
    // Add staggered delays to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.setProperty('--card-delay', `${0.2 + index * 0.1}s`);
        card.style.setProperty('--icon-delay', `${0.4 + index * 0.1}s`);
    });
    
    // Add staggered delays to stats
    const stats = document.querySelectorAll('.stat');
    stats.forEach((stat, index) => {
        stat.style.setProperty('--stat-delay', `${1.2 + index * 0.2}s`);
    });
    
    // Create sparkle effects
    createSparkles();
    
    // Observe elements for scroll animations
    const animateElements = document.querySelectorAll('.about-card, .section-header');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
});

// Hero stats counter animation
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start).toLocaleString();
        }
    }, 16);
}

// Trigger counter animation when hero is visible
const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = document.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const text = stat.textContent.replace(/[^0-9]/g, '');
                const target = parseInt(text);
                if (target && !stat.hasAttribute('data-animated')) {
                    stat.setAttribute('data-animated', 'true');
                    animateCounter(stat, target);
                }
            });
        }
    });
}, { threshold: 0.5 });

const heroSection = document.querySelector('.hero-stats');
if (heroSection) {
    heroObserver.observe(heroSection);
}

// Level button interaction in about section
document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// Parallax effect for hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroVisual = document.querySelector('.hero-visual');
    
    if (heroVisual && scrolled < window.innerHeight) {
        heroVisual.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// Demo chat animation
function animateDemoChat() {
    const demoMessages = document.querySelectorAll('.demo-message');
    const typingIndicator = document.querySelector('.demo-typing');
    
    if (!demoMessages.length) return;
    
    let currentMessage = 0;
    
    function showNextMessage() {
        if (currentMessage < demoMessages.length) {
            demoMessages[currentMessage].style.opacity = '1';
            demoMessages[currentMessage].style.transform = 'translateY(0)';
            currentMessage++;
            
            if (currentMessage < demoMessages.length) {
                typingIndicator.style.opacity = '1';
                setTimeout(() => {
                    typingIndicator.style.opacity = '0';
                    setTimeout(showNextMessage, 500);
                }, 1500);
            }
        } else {
            // Reset animation
            setTimeout(() => {
                currentMessage = 0;
                demoMessages.forEach(msg => {
                    msg.style.opacity = '0';
                    msg.style.transform = 'translateY(20px)';
                });
                setTimeout(showNextMessage, 1000);
            }, 3000);
        }
    }
    
    // Initialize messages as hidden
    demoMessages.forEach(msg => {
        msg.style.opacity = '0';
        msg.style.transform = 'translateY(20px)';
        msg.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
    });
    
    typingIndicator.style.transition = 'opacity 0.3s ease-out';
    
    // Start animation
    showNextMessage();
}

// Start demo animation when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(animateDemoChat, 1000);
});

// Add smooth hover effects to cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0) scale(1)';
    });
});

// Button click effects
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        // Create ripple effect
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.3)';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s ease-out';
        ripple.style.pointerEvents = 'none';
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Add ripple animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .nav-menu.active {
        display: flex !important;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--surface);
        flex-direction: column;
        padding: 1rem 2rem;
        border-bottom: 1px solid var(--border-color);
        box-shadow: var(--shadow-lg);
    }
    
    @media (max-width: 768px) {
        .nav-menu {
            display: none;
        }
        
        .nav-menu.active .nav-link {
            padding: 0.75rem 0;
            border-bottom: 1px solid var(--border-color);
        }
        
        .nav-menu.active .nav-link:last-child {
            border-bottom: none;
        }
        
        .nav-menu.active .theme-toggle,
        .nav-menu.active .nav-cta {
            margin-top: 1rem;
            align-self: flex-start;
        }
    }
`;
document.head.appendChild(style);

// Performance optimization: Debounce scroll events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debouncing to scroll events
window.addEventListener('scroll', debounce(() => {
    // Navbar effect
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = body.getAttribute('data-theme') === 'dark' 
            ? 'rgba(15, 23, 42, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)';
    } else {
        navbar.style.background = body.getAttribute('data-theme') === 'dark' 
            ? 'rgba(15, 23, 42, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)';
    }
    
    // Parallax effect
    const scrolled = window.pageYOffset;
    const heroVisual = document.querySelector('.hero-visual');
    if (heroVisual && scrolled < window.innerHeight) {
        heroVisual.style.transform = `translateY(${scrolled * 0.3}px)`;
    }
}, 10));

// Create sparkle effects
function createSparkles() {
    const sparkleContainer = document.createElement('div');
    sparkleContainer.className = 'sparkle-container';
    sparkleContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1;
        overflow: hidden;
    `;
    document.body.appendChild(sparkleContainer);
    
    function createSparkle() {
        const sparkle = document.createElement('div');
        sparkle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: var(--primary-color);
            border-radius: 50%;
            animation: sparkle 3s linear infinite;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 3}s;
        `;
        sparkleContainer.appendChild(sparkle);
        
        setTimeout(() => {
            sparkle.remove();
        }, 3000);
    }
    
    // Create sparkles periodically
    setInterval(createSparkle, 800);
}

// Advanced scroll animations
function addAdvancedScrollEffects() {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.style.transform = 'translateY(50px)';
        section.style.opacity = '0';
        section.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    });
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.transform = 'translateY(0)';
                entry.target.style.opacity = '1';
            }
        });
    }, { threshold: 0.1 });
    
    sections.forEach(section => sectionObserver.observe(section));
}

// Enhanced page load animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.8s ease-in-out';
    
    // Create initial burst of sparkles
    setTimeout(() => {
        for(let i = 0; i < 10; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.style.cssText = `
                    position: fixed;
                    width: 6px;
                    height: 6px;
                    background: var(--primary-color);
                    border-radius: 50%;
                    left: 50%;
                    top: 50%;
                    pointer-events: none;
                    z-index: 1000;
                    animation: burstSparkle 1s ease-out forwards;
                `;
                document.body.appendChild(sparkle);
                
                setTimeout(() => sparkle.remove(), 1000);
            }, i * 50);
        }
    }, 100);
    
    setTimeout(() => {
        document.body.style.opacity = '1';
        addAdvancedScrollEffects();
    }, 200);
}); 