// Firebase Configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAvrOrtDrcvgp7Z2iJ1Ha4Jjj2-dl0rR9E",
  authDomain: "queue-bb674.firebaseapp.com",
  databaseURL: "https://queue-bb674-default-rtdb.firebaseio.com",
  projectId: "queue-bb674",
  storageBucket: "queue-bb674.firebasestorage.app",
  messagingSenderId: "74148025688",
  appId: "1:74148025688:web:c70208c78e6b34b9fd012d",
  measurementId: "G-4RVFXJ8HFH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const database = firebase.database();
const firestore = firebase.firestore();
const storage = firebase.storage();

// Arabic number conversion
const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicNumber(num) {
    return num.toString().replace(/\d/g, (d) => arabicNumbers[d]);
}

function fromArabicNumber(str) {
    return parseInt(str.replace(/[٠-٩]/g, (d) => arabicNumbers.indexOf(d)));
}

// Global variables
let currentUser = null;
let currentScreen = null;
let audioCache = {};

// Authentication state listener
auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        console.log('User logged in:', user.email);
    } else {
        console.log('User logged out');
    }
});

// Load audio files into cache
function preloadAudio() {
    const audioFiles = [
        'ding.mp3',
        ...Array.from({length: 200}, (_, i) => `${i + 1}.mp3`),
        ...Array.from({length: 20}, (_, i) => `clinic${i + 1}.mp3`),
        ...Array.from({length: 10}, (_, i) => `instant${i + 1}.mp3`)
    ];
    
    audioFiles.forEach(file => {
        const audio = new Audio(`audio/${file}`);
        audio.preload = 'auto';
        audioCache[file] = audio;
    });
}

// Play audio sequence
async function playAudioSequence(files) {
    for (const file of files) {
        if (audioCache[file]) {
            await new Promise((resolve) => {
                audioCache[file].currentTime = 0;
                audioCache[file].play();
                audioCache[file].onended = resolve;
            });
        }
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    } text-white`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    preloadAudio();
});
