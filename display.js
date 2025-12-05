// Display Screen JavaScript
let currentScreenId = null;
let currentZoom = 1;
let screens = {};
let clinics = {};
let doctors = [];
let currentDoctorIndex = 0;
let doctorRotationInterval = null;
let notificationTimeout = null;
let videoPlayer = null;

// Initialize display
document.addEventListener('DOMContentLoaded', () => {
    initializeDisplay();
    generateQRCode();
    startTimeUpdates();
    loadDisplayData();
});

function initializeDisplay() {
    // Load screens into selector
    database.ref('screens').on('value', (snapshot) => {
        screens = snapshot.val() || {};
        updateScreenSelector();
    });
    
    // Load center settings
    database.ref('settings/general').on('value', (snapshot) => {
        const settings = snapshot.val() || {};
        document.getElementById('centerName').textContent = settings.centerName || 'اسم المركز';
        document.getElementById('newsTickerContent').textContent = settings.newsTicker || 'مرحباً بكم في نظام إدارة الانتظار';
    });
    
    // Listen for calls and alerts
    database.ref('calls').on('child_added', (snapshot) => {
        const call = snapshot.val();
        handleCall(call);
    });
    
    database.ref('alerts').on('child_added', (snapshot) => {
        const alert = snapshot.val();
        handleAlert(alert);
    });
    
    // Load doctors for banner
    loadDoctors();
}

function loadDisplayData() {
    // Load clinics
    database.ref('clinics').on('value', (snapshot) => {
        clinics = snapshot.val() || {};
        if (currentScreenId) {
            displayClinicsForScreen(currentScreenId);
        }
    });
    
    // Load video settings
    database.ref('settings/video').on('value', (snapshot) => {
        const videoSettings = snapshot.val() || {};
        updateVideoSettings(videoSettings);
    });
}

function updateScreenSelector() {
    const selector = document.getElementById('screenSelector');
    selector.innerHTML = '<option value="">اختر الشاشة</option>';
    
    Object.entries(screens).forEach(([screenId, screen]) => {
        const option = document.createElement('option');
        option.value = screenId;
        option.textContent = `${screen.name} (${toArabicNumber(screen.number)})`;
        selector.appendChild(option);
    });
}

function changeScreen() {
    const selector = document.getElementById('screenSelector');
    currentScreenId = selector.value;
    
    if (currentScreenId) {
        const screen = screens[currentScreenId];
        document.getElementById('currentScreen').textContent = screen.name;
        displayClinicsForScreen(currentScreenId);
    } else {
        document.getElementById('currentScreen').textContent = 'الشاشة الرئيسية';
        displayAllClinics();
    }
}

function displayClinicsForScreen(screenId) {
    const container = document.getElementById('clinicsContainer');
    container.innerHTML = '';
    
    Object.entries(clinics).forEach(([clinicId, clinic]) => {
        if (clinic.screenId === screenId) {
            const clinicCard = createClinicCard(clinicId, clinic);
            container.appendChild(clinicCard);
        }
    });
    
    if (container.children.length === 0) {
        container.innerHTML = '<div class="text-center text-white text-xl">لا توجد عيادات مرتبطة بهذه الشاشة</div>';
    }
}

function displayAllClinics() {
    const container = document.getElementById('clinicsContainer');
    container.innerHTML = '';
    
    Object.entries(clinics).forEach(([clinicId, clinic]) => {
        const clinicCard = createClinicCard(clinicId, clinic);
        container.appendChild(clinicCard);
    });
}

function createClinicCard(clinicId, clinic) {
    const card = document.createElement('div');
    card.className = `clinic-card ${clinic.active ? 'active' : 'inactive'}`;
    card.id = `clinic-${clinicId}`;
    
    const lastCallTime = clinic.lastCall ? formatTime(clinic.lastCall) : '--:--';
    const statusText = clinic.active ? 'نشطة' : 'متوقفة';
    
    card.innerHTML = `
        <div class="text-center">
            <h3 class="text-lg font-bold mb-2">${clinic.name}</h3>
            <div class="queue-number text-4xl font-bold mb-2">
                ${toArabicNumber(clinic.currentNumber || 0)}
            </div>
            <div class="text-sm opacity-90">
                <div>آخر نداء: ${lastCallTime}</div>
                <div>الحالة: ${statusText}</div>
            </div>
        </div>
    `;
    
    return card;
}

function handleCall(call) {
    if (call.type === 'specific') {
        const clinic = clinics[call.clinicId];
        if (clinic) {
            showNotification(`على العميل رقم ${toArabicNumber(call.clientNumber)} التوجه إلى ${clinic.name}`, 'call');
            highlightClinic(call.clinicId);
            playCallSequence(call.clientNumber, clinic.number);
        }
    } else if (call.type === 'emergency') {
        const clinic = clinics[call.clinicId];
        if (clinic) {
            showNotification(`حالة طارئة في ${clinic.name} - الرجاء التوجه فوراً`, 'emergency');
            highlightClinic(call.clinicId);
        }
    }
}

function handleAlert(alert) {
    showNotification(alert.message, 'alert');
}

function showNotification(message, type = 'info') {
    const notificationBar = document.getElementById('notificationBar');
    notificationBar.textContent = message;
    notificationBar.className = 'notification-bar show';
    
    // Set different colors for different types
    if (type === 'call') {
        notificationBar.style.background = 'linear-gradient(90deg, #4facfe, #00f2fe)';
    } else if (type === 'emergency') {
        notificationBar.style.background = 'linear-gradient(90deg, #ff6b6b, #ee5a24)';
    } else if (type === 'alert') {
        notificationBar.style.background = 'linear-gradient(90deg, #feca57, #ff9ff3)';
    }
    
    // Hide notification after duration
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }
    
    notificationTimeout = setTimeout(() => {
        notificationBar.classList.remove('show');
    }, 5000);
}

function highlightClinic(clinicId) {
    const clinicCard = document.getElementById(`clinic-${clinicId}`);
    if (clinicCard) {
        clinicCard.classList.add('calling');
        setTimeout(() => {
            clinicCard.classList.remove('calling');
        }, 5000);
    }
}

function playCallSequence(clientNumber, clinicNumber) {
    const audioFiles = [
        'ding.mp3',
        `${clientNumber}.mp3`,
        `clinic${clinicNumber}.mp3`
    ];
    
    playAudioSequence(audioFiles);
}

// Doctor Banner Rotation
function loadDoctors() {
    firestore.collection('doctors').where('active', '==', true).onSnapshot((snapshot) => {
        doctors = [];
        snapshot.forEach((doc) => {
            doctors.push({ id: doc.id, ...doc.data() });
        });
        
        if (doctors.length > 0) {
            startDoctorRotation();
        }
    });
}

function startDoctorRotation() {
    if (doctorRotationInterval) {
        clearInterval(doctorRotationInterval);
    }
    
    showDoctorBanner();
    
    doctorRotationInterval = setInterval(() => {
        currentDoctorIndex = (currentDoctorIndex + 1) % doctors.length;
        showDoctorBanner();
    }, 20000); // Change doctor every 20 seconds
}

function showDoctorBanner() {
    if (doctors.length === 0) return;
    
    const doctor = doctors[currentDoctorIndex];
    const banner = document.getElementById('doctorBanner');
    
    banner.innerHTML = `
        <div class="doctor-slide bg-white rounded-lg p-4 shadow-lg">
            <img src="${doctor.image}" alt="${doctor.name}" class="w-20 h-20 rounded-full mx-auto mb-3 object-cover">
            <h3 class="text-lg font-bold text-center">${doctor.name}</h3>
            <p class="text-sm text-gray-600 text-center">${doctor.specialty}</p>
            <p class="text-xs text-gray-500 text-center mt-2">أيام العمل: ${doctor.workingDays ? doctor.workingDays.join(', ') : 'غير محدد'}</p>
            <p class="text-xs text-gray-500 text-center">الشيفت: ${doctor.shift === 'morning' ? 'صباحي' : doctor.shift === 'evening' ? 'مسائي' : 'الاثنين'}</p>
        </div>
    `;
    
    banner.classList.remove('hidden');
    
    // Hide banner after 10 seconds
    setTimeout(() => {
        banner.classList.add('hidden');
    }, 10000);
}

// Video Player Controls
function updateVideoSettings(settings) {
    const iframe = document.getElementById('youtubePlayer');
    let src = 'https://www.youtube.com/embed/videoseries?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf';
    
    if (settings.playlistId) {
        src = `https://www.youtube.com/embed/videoseries?list=${settings.playlistId}`;
    }
    
    if (settings.autoPlay) {
        src += '&autoplay=1';
    }
    
    if (settings.loop) {
        src += '&loop=1';
    }
    
    iframe.src = src;
}

function togglePlayPause() {
    const iframe = document.getElementById('youtubePlayer');
    // YouTube iframe API would be needed for full control
    showNotification('التحكم في الفيديو يتطلب YouTube API', 'info');
}

function previousVideo() {
    showNotification('التحكم في الفيديو يتطلب YouTube API', 'info');
}

function nextVideo() {
    showNotification('التحكم في الفيديو يتطلب YouTube API', 'info');
}

function toggleMute() {
    const iframe = document.getElementById('youtubePlayer');
    // Toggle mute functionality would require YouTube API
    showNotification('التحكم في الفيديو يتطلب YouTube API', 'info');
}

function setVolume() {
    const volume = document.getElementById('volumeSlider').value;
    // Volume control would require YouTube API
    showNotification('التحكم في الفيديو يتطلب YouTube API', 'info');
}

// Control Functions
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showNotification('خطأ في تفعيل ملء الشاشة: ' + err.message, 'error');
        });
    } else {
        document.exitFullscreen();
    }
}

function zoomIn() {
    currentZoom = Math.min(currentZoom + 0.1, 2);
    applyZoom();
}

function zoomOut() {
    currentZoom = Math.max(currentZoom - 0.1, 0.5);
    applyZoom();
}

function resetZoom() {
    currentZoom = 1;
    applyZoom();
}

function applyZoom() {
    document.body.style.transform = `scale(${currentZoom})`;
    document.body.style.transformOrigin = 'top right';
}

// Time Updates
function startTimeUpdates() {
    updateTime();
    setInterval(updateTime, 1000);
}

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    const dateString = now.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('currentTime').textContent = timeString;
    document.getElementById('currentDate').textContent = dateString;
}

// QR Code Generation
function generateQRCode() {
    const clientUrl = window.location.origin + '/client.html';
    QRCode.toCanvas(document.getElementById('qrcode'), clientUrl, {
        width: 100,
        margin: 1,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, (error) => {
        if (error) {
            console.error('خطأ في إنشاء QR Code:', error);
        }
    });
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'F11':
            e.preventDefault();
            toggleFullScreen();
            break;
        case '+':
        case '=':
            if (e.ctrlKey) {
                e.preventDefault();
                zoomIn();
            }
            break;
        case '-':
            if (e.ctrlKey) {
                e.preventDefault();
                zoomOut();
            }
            break;
        case '0':
            if (e.ctrlKey) {
                e.preventDefault();
                resetZoom();
            }
            break;
    }
});

// Auto-hide cursor after inactivity
let cursorTimeout;
document.addEventListener('mousemove', () => {
    document.body.style.cursor = 'default';
    clearTimeout(cursorTimeout);
    cursorTimeout = setTimeout(() => {
        document.body.style.cursor = 'none';
    }, 3000);
});

// Prevent context menu on right click
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Handle visibility change (tab switching)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations when tab is not visible
        if (doctorRotationInterval) {
            clearInterval(doctorRotationInterval);
        }
    } else {
        // Resume animations when tab becomes visible
        if (doctors.length > 0) {
            startDoctorRotation();
        }
    }
});

// Error handling
window.addEventListener('error', (e) => {
    console.error('Display Error:', e.error);
    showNotification('حدث خطأ في عرض الشاشة', 'error');
});

// Connection status monitoring
database.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === false) {
        showNotification('فقد الاتصال بقاعدة البيانات', 'error');
    } else {
        showNotification('تم إعادة الاتصال بقاعدة البيانات', 'success');
    }
});