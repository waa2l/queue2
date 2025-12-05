// Control Panel JavaScript
let currentClinic = null;
let currentClinicId = null;
let clinics = {};
let isLoggedIn = false;

// Initialize control panel
document.addEventListener('DOMContentLoaded', () => {
    initializeControlPanel();
    startTimeUpdates();
});

function initializeControlPanel() {
    // Load clinics for selection
    loadClinics();
    
    // Setup login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Listen for admin alerts
    database.ref('adminAlerts').on('child_added', (snapshot) => {
        const alert = snapshot.val();
        showNotification(`تنبيه من الإدارة: ${alert.message}`, 'warning');
    });
}

function loadClinics() {
    database.ref('clinics').on('value', (snapshot) => {
        clinics = snapshot.val() || {};
        updateClinicSelector();
        updateTransferClinics();
    });
}

function updateClinicSelector() {
    const selector = document.getElementById('clinicSelect');
    selector.innerHTML = '<option value="">اختر العيادة</option>';
    
    Object.entries(clinics).forEach(([clinicId, clinic]) => {
        const option = document.createElement('option');
        option.value = clinicId;
        option.textContent = `${clinic.name} (${toArabicNumber(clinic.number)})`;
        selector.appendChild(option);
    });
}

function updateTransferClinics() {
    const selector = document.getElementById('targetClinic');
    selector.innerHTML = '<option value="">اختر العيادة</option>';
    
    Object.entries(clinics).forEach(([clinicId, clinic]) => {
        if (clinicId !== currentClinicId) {
            const option = document.createElement('option');
            option.value = clinicId;
            option.textContent = `${clinic.name} (${toArabicNumber(clinic.number)})`;
            selector.appendChild(option);
        }
    });
}

function handleLogin(e) {
    e.preventDefault();
    
    const clinicId = document.getElementById('clinicSelect').value;
    const password = document.getElementById('passwordInput').value;
    
    if (!clinicId || !password) {
        showNotification('الرجاء إكمال جميع الحقول', 'error');
        return;
    }
    
    const clinic = clinics[clinicId];
    if (!clinic) {
        showNotification('العيادة غير موجودة', 'error');
        return;
    }
    
    if (clinic.password !== password) {
        showNotification('كلمة السر غير صحيحة', 'error');
        return;
    }
    
    // Successful login
    currentClinicId = clinicId;
    currentClinic = clinic;
    isLoggedIn = true;
    
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('controlSection').classList.remove('hidden');
    
    // Update UI
    document.getElementById('clinicName').textContent = clinic.name;
    updateCurrentNumber(clinic.currentNumber || 0);
    updateClinicStatus(clinic.active !== false);
    
    // Load statistics
    loadStatistics();
    loadRecentActions();
    
    // Listen for clinic updates
    listenToClinicUpdates();
    
    showNotification(`تم الدخول إلى ${clinic.name} بنجاح`, 'success');
    
    // Log the action
    logAction('دخول إلى لوحة التحكم', clinic.name);
}

function listenToClinicUpdates() {
    database.ref(`clinics/${currentClinicId}`).on('value', (snapshot) => {
        const updatedClinic = snapshot.val();
        if (updatedClinic) {
            currentClinic = updatedClinic;
            updateCurrentNumber(updatedClinic.currentNumber || 0);
            updateClinicStatus(updatedClinic.active !== false);
        }
    });
}

function updateCurrentNumber(number) {
    const numberElement = document.getElementById('currentNumber');
    const arabicNumber = toArabicNumber(number);
    
    // Animate number change
    anime({
        targets: numberElement,
        scale: [1, 1.2, 1],
        duration: 500,
        easing: 'easeInOutQuad',
        complete: () => {
            numberElement.textContent = arabicNumber;
        }
    });
}

function updateClinicStatus(active) {
    const statusIndicator = document.getElementById('clinicStatus');
    const statusText = document.getElementById('statusText');
    const statusBtn = document.getElementById('statusBtn');
    
    if (active) {
        statusIndicator.className = 'status-indicator status-active';
        statusText.textContent = 'نشطة';
        statusBtn.innerHTML = '<div class="text-3xl mb-2">⏸️</div><div>إيقاف العيادة</div>';
    } else {
        statusIndicator.className = 'status-indicator status-inactive';
        statusText.textContent = 'متوقفة';
        statusBtn.innerHTML = '<div class="text-3xl mb-2">▶️</div><div>تشغيل العيادة</div>';
    }
}

// Control Functions
function nextClient() {
    if (!isLoggedIn) return;
    
    const newNumber = (currentClinic.currentNumber || 0) + 1;
    
    database.ref(`clinics/${currentClinicId}/currentNumber`).set(newNumber)
        .then(() => {
            playCallSequence(newNumber, currentClinic.number);
            showNotification(`تم النداء على العميل رقم ${toArabicNumber(newNumber)}`, 'success');
            logAction('العميل التالي', `رقم ${toArabicNumber(newNumber)}`);
            
            // Update last call time
            database.ref(`clinics/${currentClinicId}/lastCall`).set(Date.now());
        })
        .catch((error) => {
            showNotification('خطأ في الانتقال للعميل التالي: ' + error.message, 'error');
        });
}

function previousClient() {
    if (!isLoggedIn) return;
    
    const currentNumber = currentClinic.currentNumber || 0;
    if (currentNumber > 0) {
        const newNumber = currentNumber - 1;
        
        database.ref(`clinics/${currentClinicId}/currentNumber`).set(newNumber)
            .then(() => {
                showNotification(`تم الرجوع إلى العميل رقم ${toArabicNumber(newNumber)}`, 'info');
                logAction('العميل السابق', `رقم ${toArabicNumber(newNumber)}`);
            })
            .catch((error) => {
                showNotification('خطأ في الرجوع للعميل السابق: ' + error.message, 'error');
            });
    }
}

function repeatCall() {
    if (!isLoggedIn) return;
    
    const currentNumber = currentClinic.currentNumber || 0;
    if (currentNumber > 0) {
        playCallSequence(currentNumber, currentClinic.number);
        showNotification(`تم تكرار النداء على العميل رقم ${toArabicNumber(currentNumber)}`, 'info');
        logAction('تكرار النداء', `رقم ${toArabicNumber(currentNumber)}`);
    }
}

function resetClinic() {
    if (!isLoggedIn) return;
    
    if (confirm('هل أنت متأكد من تصفير العيادة؟ سيتم إعادة الرقم إلى صفر.')) {
        database.ref(`clinics/${currentClinicId}/currentNumber`).set(0)
            .then(() => {
                showNotification('تم تصفير العيادة بنجاح', 'success');
                logAction('تصفير العيادة', 'تم تصفير الرقم الحالي');
            })
            .catch((error) => {
                showNotification('خطأ في تصفير العيادة: ' + error.message, 'error');
            });
    }
}

function callSpecificNumber() {
    if (!isLoggedIn) return;
    
    document.getElementById('numberModal').classList.remove('hidden');
}

function hideNumberModal() {
    document.getElementById('numberModal').classList.add('hidden');
    document.getElementById('specificNumber').value = '';
}

function confirmCallSpecific() {
    const number = parseInt(document.getElementById('specificNumber').value);
    
    if (number && number > 0) {
        playCallSequence(number, currentClinic.number);
        showNotification(`تم النداء على العميل رقم ${toArabicNumber(number)}`, 'success');
        logAction('نداء رقم معين', `رقم ${toArabicNumber(number)}`);
        hideNumberModal();
    } else {
        showNotification('الرجاء إدخال رقم صحيح', 'error');
    }
}

function callByName() {
    if (!isLoggedIn) return;
    
    document.getElementById('nameModal').classList.remove('hidden');
}

function hideNameModal() {
    document.getElementById('nameModal').classList.add('hidden');
    document.getElementById('clientName').value = '';
}

function confirmCallByName() {
    const clientName = document.getElementById('clientName').value.trim();
    
    if (clientName) {
        const callData = {
            type: 'byName',
            clinicId: currentClinicId,
            clientName: clientName,
            timestamp: Date.now()
        };
        
        database.ref('calls').push(callData);
        showNotification(`تم النداء على العميل ${clientName}`, 'success');
        logAction('نداء باسم', clientName);
        hideNameModal();
    } else {
        showNotification('الرجاء إدخال اسم العميل', 'error');
    }
}

function sendDoctorAlert() {
    if (!isLoggedIn) return;
    
    const alertData = {
        type: 'doctorAlert',
        fromClinic: currentClinicId,
        fromClinicName: currentClinic.name,
        timestamp: Date.now()
    };
    
    database.ref('alerts').push(alertData);
    showNotification('تم إرسال تنبيه إلى الطبيب', 'success');
    logAction('تنبيه طبيب', 'تم إرسال تنبيه إلى الطبيب');
}

function transferClient() {
    if (!isLoggedIn) return;
    
    updateTransferClinics();
    document.getElementById('transferModal').classList.remove('hidden');
}

function hideTransferModal() {
    document.getElementById('transferModal').classList.add('hidden');
    document.getElementById('transferNumber').value = '';
    document.getElementById('targetClinic').value = '';
}

function confirmTransfer() {
    const clientNumber = parseInt(document.getElementById('transferNumber').value);
    const targetClinicId = document.getElementById('targetClinic').value;
    
    if (!clientNumber || !targetClinicId) {
        showNotification('الرجاء إكمال جميع الحقول', 'error');
        return;
    }
    
    const targetClinic = clinics[targetClinicId];
    if (!targetClinic) {
        showNotification('العيادة المستهدفة غير موجودة', 'error');
        return;
    }
    
    const transferData = {
        clientNumber: clientNumber,
        fromClinic: currentClinicId,
        fromClinicName: currentClinic.name,
        toClinic: targetClinicId,
        toClinicName: targetClinic.name,
        timestamp: Date.now()
    };
    
    database.ref('transfers').push(transferData);
    
    // Show notification on target clinic
    const alertData = {
        type: 'transfer',
        message: `تم تحويل العميل رقم ${toArabicNumber(clientNumber)} من ${currentClinic.name}`,
        timestamp: Date.now()
    };
    
    database.ref('alerts').push(alertData);
    
    showNotification(`تم تحويل العميل رقم ${toArabicNumber(clientNumber)} إلى ${targetClinic.name}`, 'success');
    logAction('تحويل عميل', `من ${currentClinic.name} إلى ${targetClinic.name}`);
    hideTransferModal();
}

function toggleClinicStatus() {
    if (!isLoggedIn) return;
    
    const newStatus = !(currentClinic.active !== false);
    
    database.ref(`clinics/${currentClinicId}/active`).set(newStatus)
        .then(() => {
            const statusText = newStatus ? 'نشطة' : 'متوقفة';
            showNotification(`تم تغيير حالة العيادة إلى ${statusText}`, 'success');
            logAction('تغيير حالة العيادة', statusText);
        })
        .catch((error) => {
            showNotification('خطأ في تغيير حالة العيادة: ' + error.message, 'error');
        });
}

function emergencyAlert() {
    if (!isLoggedIn) return;
    
    if (confirm('هل أنت متأكد من إرسال تنبيه طوارئ؟')) {
        const alertData = {
            type: 'emergency',
            clinicId: currentClinicId,
            clinicName: currentClinic.name,
            timestamp: Date.now()
        };
        
        database.ref('calls').push(alertData);
        showNotification('تم إرسال تنبيه طوارئ', 'error');
        logAction('تنبيه طوارئ', 'تم إرسال تنبيه طوارئ');
    }
}

// Utility Functions
function playCallSequence(clientNumber, clinicNumber) {
    const audioFiles = [
        'ding.mp3',
        `${clientNumber}.mp3`,
        `clinic${clinicNumber}.mp3`
    ];
    
    playAudioSequence(audioFiles);
}

function loadStatistics() {
    // Calculate statistics based on today's data
    const today = new Date().toDateString();
    
    database.ref(`statistics/${currentClinicId}/${today}`).once('value', (snapshot) => {
        const stats = snapshot.val() || { served: 0, waiting: 0, avgWaitTime: 0 };
        
        document.getElementById('totalServed').textContent = toArabicNumber(stats.served);
        document.getElementById('waitingCount').textContent = toArabicNumber(stats.waiting);
        document.getElementById('averageWaitTime').textContent = toArabicNumber(stats.avgWaitTime);
    });
}

function loadRecentActions() {
    const actionsContainer = document.getElementById('recentActions');
    
    database.ref(`logs/${currentClinicId}`).limitToLast(5).on('value', (snapshot) => {
        actionsContainer.innerHTML = '';
        
        const actions = snapshot.val() || {};
        Object.values(actions).reverse().forEach(action => {
            const actionElement = document.createElement('div');
            actionElement.className = 'flex justify-between items-center p-2 bg-white bg-opacity-10 rounded';
            actionElement.innerHTML = `
                <span>${action.action}</span>
                <span class="text-sm opacity-75">${formatTime(action.timestamp)}</span>
            `;
            actionsContainer.appendChild(actionElement);
        });
    });
}

function logAction(action, details) {
    const logData = {
        action: action,
        details: details,
        timestamp: Date.now(),
        user: 'control-panel'
    };
    
    database.ref(`logs/${currentClinicId}`).push(logData);
}

function logout() {
    if (confirm('هل أنت متأكد من الخروج من لوحة التحكم؟')) {
        isLoggedIn = false;
        currentClinic = null;
        currentClinicId = null;
        
        document.getElementById('controlSection').classList.add('hidden');
        document.getElementById('loginSection').classList.remove('hidden');
        
        // Clear form
        document.getElementById('loginForm').reset();
        
        // Stop listening to clinic updates
        if (currentClinicId) {
            database.ref(`clinics/${currentClinicId}`).off();
        }
        
        showNotification('تم الخروج بنجاح', 'info');
    }
}

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
        month: 'short',
        day: 'numeric'
    });
    
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    if (timeElement) timeElement.textContent = timeString;
    if (dateElement) dateElement.textContent = dateString;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (!isLoggedIn) return;
    
    switch(e.key) {
        case 'ArrowRight':
        case ' ':
            e.preventDefault();
            nextClient();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            previousClient();
            break;
        case 'r':
        case 'R':
            e.preventDefault();
            repeatCall();
            break;
        case 'Escape':
            e.preventDefault();
            logout();
            break;
        case 'e':
        case 'E':
            e.preventDefault();
            emergencyAlert();
            break;
    }
});

// Prevent context menu on right click
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isLoggedIn) {
        showNotification('لوحة التحكم غير نشطة', 'warning');
    }
});

// Error handling
window.addEventListener('error', (e) => {
    console.error('Control Panel Error:', e.error);
    showNotification('حدث خطأ في لوحة التحكم', 'error');
});

// Connection status monitoring
database.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === false && isLoggedIn) {
        showNotification('فقد الاتصال بقاعدة البيانات', 'error');
    }
});