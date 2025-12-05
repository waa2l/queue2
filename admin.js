// Admin Panel JavaScript
let currentSection = 'general';
let screens = [];
let clinics = [];
let doctors = [];

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    initializeAdminPanel();
});

function initializeAdminPanel() {
    // Check authentication state
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            document.getElementById('userEmail').textContent = user.email;
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('adminSection').classList.remove('hidden');
            loadAdminData();
        } else {
            document.getElementById('loginSection').classList.remove('hidden');
            document.getElementById('adminSection').classList.add('hidden');
        }
    });

    // Setup form handlers
    setupFormHandlers();
}

function setupFormHandlers() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // General settings form
    document.getElementById('generalSettingsForm').addEventListener('submit', handleGeneralSettingsSave);
    
    // Add screen form
    document.getElementById('addScreenForm').addEventListener('submit', handleAddScreen);
    
    // Add clinic form
    document.getElementById('addClinicForm').addEventListener('submit', handleAddClinic);
    
    // Add doctor form
    document.getElementById('addDoctorForm').addEventListener('submit', handleAddDoctor);
}

// Authentication functions
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            showNotification('تم تسجيل الدخول بنجاح', 'success');
        })
        .catch((error) => {
            showNotification('خطأ في تسجيل الدخول: ' + error.message, 'error');
        });
}

function logout() {
    auth.signOut().then(() => {
        showNotification('تم تسجيل الخروج بنجاح', 'success');
    });
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    document.getElementById(sectionName + 'Section').classList.remove('hidden');
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-blue-100', 'text-blue-800');
    });
    event.target.classList.add('bg-blue-100', 'text-blue-800');
    
    currentSection = sectionName;
    loadSectionData(sectionName);
}

function loadSectionData(sectionName) {
    switch(sectionName) {
        case 'screens':
            loadScreens();
            break;
        case 'clinics':
            loadClinics();
            break;
        case 'doctors':
            loadDoctors();
            break;
        case 'general':
            loadGeneralSettings();
            break;
    }
}

// General Settings
function loadGeneralSettings() {
    database.ref('settings/general').once('value', (snapshot) => {
        const settings = snapshot.val() || {};
        document.getElementById('centerName').value = settings.centerName || '';
        document.getElementById('newsTicker').value = settings.newsTicker || '';
        document.getElementById('alertDuration').value = settings.alertDuration || 5;
        document.getElementById('speechRate').value = settings.speechRate || 1;
        document.getElementById('audioPath').value = settings.audioPath || './audio/';
    });
}

function handleGeneralSettingsSave(e) {
    e.preventDefault();
    const settings = {
        centerName: document.getElementById('centerName').value,
        newsTicker: document.getElementById('newsTicker').value,
        alertDuration: parseInt(document.getElementById('alertDuration').value),
        speechRate: parseFloat(document.getElementById('speechRate').value),
        audioPath: document.getElementById('audioPath').value
    };
    
    database.ref('settings/general').set(settings)
        .then(() => {
            showNotification('تم حفظ الإعدادات بنجاح', 'success');
        })
        .catch((error) => {
            showNotification('خطأ في حفظ الإعدادات: ' + error.message, 'error');
        });
}

// Screens Management
function loadScreens() {
    database.ref('screens').on('value', (snapshot) => {
        screens = snapshot.val() || {};
        displayScreens();
        updateScreensDropdown();
    });
}

function displayScreens() {
    const container = document.getElementById('screensList');
    container.innerHTML = '';
    
    Object.entries(screens).forEach(([screenId, screen]) => {
        const screenCard = document.createElement('div');
        screenCard.className = 'bg-gray-50 p-4 rounded-lg border flex justify-between items-center';
        screenCard.innerHTML = `
            <div>
                <h4 class="font-semibold">${screen.name}</h4>
                <p class="text-sm text-gray-600">رقم الشاشة: ${toArabicNumber(screen.number)}</p>
                <p class="text-sm text-gray-600">الحالة: ${screen.active ? 'نشطة' : 'غير نشطة'}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="editScreen('${screenId}')" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                    تعديل
                </button>
                <button onclick="deleteScreen('${screenId}')" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors">
                    حذف
                </button>
            </div>
        `;
        container.appendChild(screenCard);
    });
}

function updateScreensDropdown() {
    const dropdown = document.getElementById('clinicScreen');
    dropdown.innerHTML = '<option value="">اختر الشاشة</option>';
    
    Object.entries(screens).forEach(([screenId, screen]) => {
        const option = document.createElement('option');
        option.value = screenId;
        option.textContent = `${screen.name} (${toArabicNumber(screen.number)})`;
        dropdown.appendChild(option);
    });
}

function showAddScreenModal() {
    document.getElementById('addScreenModal').classList.remove('hidden');
}

function hideAddScreenModal() {
    document.getElementById('addScreenModal').classList.add('hidden');
    document.getElementById('addScreenForm').reset();
}

function handleAddScreen(e) {
    e.preventDefault();
    const screenData = {
        name: document.getElementById('screenName').value,
        number: parseInt(document.getElementById('screenNumber').value),
        password: document.getElementById('screenPassword').value,
        active: true,
        createdAt: Date.now()
    };
    
    const newScreenRef = database.ref('screens').push();
    newScreenRef.set(screenData)
        .then(() => {
            showNotification('تم إضافة الشاشة بنجاح', 'success');
            hideAddScreenModal();
        })
        .catch((error) => {
            showNotification('خطأ في إضافة الشاشة: ' + error.message, 'error');
        });
}

function deleteScreen(screenId) {
    if (confirm('هل أنت متأكد من حذف هذه الشاشة؟')) {
        database.ref(`screens/${screenId}`).remove()
            .then(() => {
                showNotification('تم حذف الشاشة بنجاح', 'success');
            })
            .catch((error) => {
                showNotification('خطأ في حذف الشاشة: ' + error.message, 'error');
            });
    }
}

// Clinics Management
function loadClinics() {
    database.ref('clinics').on('value', (snapshot) => {
        clinics = snapshot.val() || {};
        displayClinics();
    });
}

function displayClinics() {
    const container = document.getElementById('clinicsList');
    container.innerHTML = '';
    
    Object.entries(clinics).forEach(([clinicId, clinic]) => {
        const clinicCard = document.createElement('div');
        clinicCard.className = 'bg-gray-50 p-4 rounded-lg border flex justify-between items-center';
        clinicCard.innerHTML = `
            <div>
                <h4 class="font-semibold">${clinic.name}</h4>
                <p class="text-sm text-gray-600">رقم العيادة: ${toArabicNumber(clinic.number)}</p>
                <p class="text-sm text-gray-600">الشاشة: ${screens[clinic.screenId]?.name || 'غير محدد'}</p>
                <p class="text-sm text-gray-600">الرقم الحالي: ${toArabicNumber(clinic.currentNumber || 0)}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="editClinic('${clinicId}')" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                    تعديل
                </button>
                <button onclick="resetClinic('${clinicId}')" class="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors">
                    تصفير
                </button>
                <button onclick="deleteClinic('${clinicId}')" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors">
                    حذف
                </button>
            </div>
        `;
        container.appendChild(clinicCard);
    });
}

function showAddClinicModal() {
    document.getElementById('addClinicModal').classList.remove('hidden');
}

function hideAddClinicModal() {
    document.getElementById('addClinicModal').classList.add('hidden');
    document.getElementById('addClinicForm').reset();
}

function handleAddClinic(e) {
    e.preventDefault();
    const clinicData = {
        name: document.getElementById('clinicName').value,
        number: parseInt(document.getElementById('clinicNumber').value),
        screenId: document.getElementById('clinicScreen').value,
        password: document.getElementById('clinicPassword').value,
        currentNumber: 0,
        active: true,
        createdAt: Date.now()
    };
    
    const newClinicRef = database.ref('clinics').push();
    newClinicRef.set(clinicData)
        .then(() => {
            showNotification('تم إضافة العيادة بنجاح', 'success');
            hideAddClinicModal();
        })
        .catch((error) => {
            showNotification('خطأ في إضافة العيادة: ' + error.message, 'error');
        });
}

function resetClinic(clinicId) {
    database.ref(`clinics/${clinicId}/currentNumber`).set(0)
        .then(() => {
            showNotification('تم تصفير العيادة بنجاح', 'success');
        })
        .catch((error) => {
            showNotification('خطأ في تصفير العيادة: ' + error.message, 'error');
        });
}

function deleteClinic(clinicId) {
    if (confirm('هل أنت متأكد من حذف هذه العيادة؟')) {
        database.ref(`clinics/${clinicId}`).remove()
            .then(() => {
                showNotification('تم حذف العيادة بنجاح', 'success');
            })
            .catch((error) => {
                showNotification('خطأ في حذف العيادة: ' + error.message, 'error');
            });
    }
}

// Doctors Management
function loadDoctors() {
    firestore.collection('doctors').onSnapshot((snapshot) => {
        doctors = [];
        snapshot.forEach((doc) => {
            doctors.push({ id: doc.id, ...doc.data() });
        });
        displayDoctors();
    });
}

function displayDoctors() {
    const container = document.getElementById('doctorsList');
    container.innerHTML = '';
    
    doctors.forEach((doctor) => {
        const doctorCard = document.createElement('div');
        doctorCard.className = 'bg-gray-50 p-4 rounded-lg border flex justify-between items-center';
        doctorCard.innerHTML = `
            <div class="flex items-center gap-4">
                <img src="${doctor.image || 'https://via.placeholder.com/80'}" alt="${doctor.name}" class="w-16 h-16 rounded-full object-cover">
                <div>
                    <h4 class="font-semibold">${doctor.name}</h4>
                    <p class="text-sm text-gray-600">${doctor.specialty}</p>
                    <p class="text-sm text-gray-600">${doctor.phone}</p>
                    <p class="text-sm text-gray-600">الشيفت: ${doctor.shift === 'morning' ? 'صباحي' : doctor.shift === 'evening' ? 'مسائي' : 'الاثنين'}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="editDoctor('${doctor.id}')" class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                    تعديل
                </button>
                <button onclick="deleteDoctor('${doctor.id}')" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors">
                    حذف
                </button>
            </div>
        `;
        container.appendChild(doctorCard);
    });
}

function showAddDoctorModal() {
    document.getElementById('addDoctorModal').classList.remove('hidden');
}

function hideAddDoctorModal() {
    document.getElementById('addDoctorModal').classList.add('hidden');
    document.getElementById('addDoctorForm').reset();
}

function handleAddDoctor(e) {
    e.preventDefault();
    
    const workingDays = [];
    document.querySelectorAll('#addDoctorForm input[type="checkbox"]:checked').forEach(checkbox => {
        workingDays.push(checkbox.value);
    });
    
    const doctorData = {
        name: document.getElementById('doctorName').value,
        phone: document.getElementById('doctorPhone').value,
        specialty: document.getElementById('doctorSpecialty').value,
        image: document.getElementById('doctorImage').value || 'https://via.placeholder.com/80',
        workingDays: workingDays,
        shift: document.getElementById('doctorShift').value,
        active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    firestore.collection('doctors').add(doctorData)
        .then(() => {
            showNotification('تم إضافة الطبيب بنجاح', 'success');
            hideAddDoctorModal();
        })
        .catch((error) => {
            showNotification('خطأ في إضافة الطبيب: ' + error.message, 'error');
        });
}

function deleteDoctor(doctorId) {
    if (confirm('هل أنت متأكد من حذف هذا الطبيب؟')) {
        firestore.collection('doctors').doc(doctorId).delete()
            .then(() => {
                showNotification('تم حذف الطبيب بنجاح', 'success');
            })
            .catch((error) => {
                showNotification('خطأ في حذف الطبيب: ' + error.message, 'error');
            });
    }
}

// Calling Functions
function callSpecificClient() {
    const clinicId = prompt('أدخل رقم العيادة:');
    const clientNumber = prompt('أدخل رقم العميل:');
    
    if (clinicId && clientNumber) {
        const callData = {
            clinicId: clinicId,
            clientNumber: parseInt(clientNumber),
            type: 'specific',
            timestamp: Date.now()
        };
        
        database.ref('calls').push(callData);
        showNotification(`تم إرسال نداء للعميل رقم ${toArabicNumber(clientNumber)} في العيادة ${toArabicNumber(clinicId)}`, 'success');
    }
}

function emergencyCall() {
    const clinicId = prompt('أدخل رقم العيادة للحالة الطارئة:');
    
    if (clinicId) {
        const callData = {
            clinicId: clinicId,
            type: 'emergency',
            timestamp: Date.now()
        };
        
        database.ref('calls').push(callData);
        showNotification('تم إرسال نداء طارئ', 'success');
    }
}

function sendTextAlert() {
    const message = prompt('أدخل نص التنبيه:');
    
    if (message) {
        const alertData = {
            message: message,
            type: 'text',
            timestamp: Date.now()
        };
        
        database.ref('alerts').push(alertData);
        showNotification('تم إرسال التنبيه النصي', 'success');
    }
}

function resetAllClinics() {
    if (confirm('هل أنت متأكد من تصفير جميع العيادات؟')) {
        database.ref('clinics').once('value', (snapshot) => {
            const updates = {};
            snapshot.forEach((clinicSnapshot) => {
                updates[`${clinicSnapshot.key}/currentNumber`] = 0;
            });
            
            database.ref('clinics').update(updates)
                .then(() => {
                    showNotification('تم تصفير جميع العيادات بنجاح', 'success');
                })
                .catch((error) => {
                    showNotification('خطأ في تصفير العيادات: ' + error.message, 'error');
                });
        });
    }
}

function sendAdminAlert() {
    const message = prompt('أدخل نص التنبيه للوحة التحكم:');
    
    if (message) {
        const alertData = {
            message: message,
            from: currentUser.email,
            timestamp: Date.now()
        };
        
        database.ref('adminAlerts').push(alertData);
        showNotification('تم إرسال التنبيه إلى لوحة التحكم', 'success');
    }
}

function recordVoiceMessage() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        showNotification('جاري تسجيل الصوت...', 'info');
        
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                const mediaRecorder = new MediaRecorder(stream);
                const audioChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    
                    // Here you would typically upload to Firebase Storage
                    showNotification('تم تسجيل الصوت بنجاح', 'success');
                };
                
                mediaRecorder.start();
                
                // Stop recording after 10 seconds
                setTimeout(() => {
                    mediaRecorder.stop();
                    stream.getTracks().forEach(track => track.stop());
                }, 10000);
            })
            .catch((error) => {
                showNotification('خطأ في تسجيل الصوت: ' + error.message, 'error');
            });
    } else {
        showNotification('المتصفح لا يدعم تسجيل الصوت', 'error');
    }
}

// Appointment Settings
function saveAppointmentSettings() {
    const settings = {
        morningSlots: parseInt(document.getElementById('morningSlots').value),
        eveningSlots: parseInt(document.getElementById('eveningSlots').value),
        morningStart: document.getElementById('morningStart').value,
        morningEnd: document.getElementById('morningEnd').value,
        eveningStart: document.getElementById('eveningStart').value,
        eveningEnd: document.getElementById('eveningEnd').value
    };
    
    database.ref('settings/appointments').set(settings)
        .then(() => {
            showNotification('تم حفظ إعدادات الحجز بنجاح', 'success');
        })
        .catch((error) => {
            showNotification('خطأ في حفظ الإعدادات: ' + error.message, 'error');
        });
}

// Video Management
function addVideoLink() {
    const url = prompt('أدخل رابط الفيديو:');
    if (url) {
        const videoData = {
            url: url,
            title: prompt('أدخل عنوان الفيديو:') || 'فيديو بدون عنوان',
            addedAt: Date.now()
        };
        
        database.ref('videos').push(videoData)
            .then(() => {
                showNotification('تم إضافة الفيديو بنجاح', 'success');
            })
            .catch((error) => {
                showNotification('خطأ في إضافة الفيديو: ' + error.message, 'error');
            });
    }
}

// Load admin data
function loadAdminData() {
    loadGeneralSettings();
    loadScreens();
    loadClinics();
    loadDoctors();
}

// Auto-reset clinics at 6 AM
document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const resetTime = new Date();
    resetTime.setHours(6, 0, 0, 0);
    
    if (now > resetTime) {
        resetTime.setDate(resetTime.getDate() + 1);
    }
    
    const timeUntilReset = resetTime.getTime() - now.getTime();
    
    setTimeout(() => {
        resetAllClinics();
        // Set daily reset
        setInterval(resetAllClinics, 24 * 60 * 60 * 1000);
    }, timeUntilReset);
});