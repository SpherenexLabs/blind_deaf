import React, { useState, useEffect, useRef } from 'react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Upload, Play, Pause, CheckCircle, PlusCircle, XCircle, Trash2, Music, X, Loader, Wifi, WifiOff, Mic } from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref as dbRef, onValue, off, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAOFbpbOwdren9NlNtWvRVyf4DsDf9-2H4",
  authDomain: "procart-8d2f6.firebaseapp.com",
  databaseURL: "https://procart-8d2f6-default-rtdb.firebaseio.com",
  projectId: "procart-8d2f6",
  storageBucket: "procart-8d2f6.firebasestorage.app",
  messagingSenderId: "1026838026898",
  appId: "1:1026838026898:web:56b3889e347862ca37a44b",
  measurementId: "G-RW7V299RPY"
};

const isFirebaseConfigured = () => {
  return !firebaseConfig.apiKey.includes('your-') &&
    !firebaseConfig.projectId.includes('your-') &&
    !firebaseConfig.appId.includes('your-');
};

let app, storage, auth, database;
if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    auth = getAuth(app);
    database = getDatabase(app);
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
}

const IntegratedAudioVoiceApp = () => {
  const SELECTION_LIMIT = 7;

  // Audio Player States
  const [audioFiles, setAudioFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [currentFileName, setCurrentFileName] = useState(null);
  const [activeTab, setActiveTab] = useState('library');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState({});
  const [user, setUser] = useState(null);
  const [isDetectionConnected, setIsDetectionConnected] = useState(false);
  const [lastDetection, setLastDetection] = useState(null);
  const [buttonData, setButtonData] = useState(null);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [sequentialPlayEnabled, setSequentialPlayEnabled] = useState(false);
  const [currentSequentialIndex, setCurrentSequentialIndex] = useState(0);
  const [playingPromise, setPlayingPromise] = useState(null); // NEW: Track play promises

  // Voice Control States
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [mediaStream, setMediaStream] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionChecking, setPermissionChecking] = useState(true);

  // TTS States (kept for internal use but UI hidden)
  const [ttsText, setTtsText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState(null);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [speechVolume, setSpeechVolume] = useState(1);
  const [ttsError, setTtsError] = useState('');
  const [voiceControlEnabled, setVoiceControlEnabled] = useState(false);

  // Refs
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const detectionListenerRef = useRef(null);
  const selectedFilesRef = useRef(selectedFiles);
  const autoPlayEnabledRef = useRef(autoPlayEnabled);
  const lastDetectionRef = useRef(lastDetection);
  const audioFilesRef = useRef(audioFiles);
  const playingPromiseRef = useRef(null); // NEW: Ref for play promise

  // Speech recognition hook
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Voice command mapping
  const speechCommands = {
    'hi how are you': 1,
    'i am fine thank you': 2,      // removed comma
    'i need help': 3,
    'i need food': 4,
    'is anyone there': 5,
    'i am leaving': 6,
    'play': 'play',
    'pause': 'pause',
    'stop': 'stop',
    'next': 'next',
    'previous': 'previous',
    'play first': 1,
    'play second': 2,
    'play third': 3,
    'play fourth': 4,
    'play fifth': 5,
    'play sixth': 6,
    'play seventh': 7
  };


  // Keep refs in sync
  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  useEffect(() => {
    autoPlayEnabledRef.current = autoPlayEnabled;
  }, [autoPlayEnabled]);

  useEffect(() => {
    lastDetectionRef.current = lastDetection;
  }, [lastDetection]);

  useEffect(() => {
    audioFilesRef.current = audioFiles;
  }, [audioFiles]);

  useEffect(() => {
    playingPromiseRef.current = playingPromise;
  }, [playingPromise]);

  // Check browser support
  const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  const supportsTTS = 'speechSynthesis' in window;

  // AUTOMATIC MICROPHONE PERMISSION REQUEST
  useEffect(() => {
    const initializeMicrophone = async () => {
      setPermissionChecking(true);

      try {
        console.log('Requesting microphone permission automatically...');

        if (navigator.permissions && navigator.permissions.query) {
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

            console.log('Current permission state:', permissionStatus.state);

            permissionStatus.onchange = () => {
              console.log('Permission changed to:', permissionStatus.state);
              if (permissionStatus.state === 'granted') {
                setPermissionGranted(true);
                setError('');
                loadAudioDevices();
              } else if (permissionStatus.state === 'denied') {
                setPermissionGranted(false);
                setError('Microphone access denied. Please enable it in browser settings and refresh.');
              }
            };

            if (permissionStatus.state === 'granted') {
              await loadAudioDevices();
              setPermissionGranted(true);
              setError('');
              setPermissionChecking(false);
              showToast('🎤 Microphone ready!', '#10b981');
              return;
            }
          } catch (permErr) {
            console.log('Permission API not fully supported, using getUserMedia directly');
          }
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        console.log('Microphone permission granted!');
        setPermissionGranted(true);
        stream.getTracks().forEach(track => track.stop());
        await loadAudioDevices();
        setError('');
        setPermissionChecking(false);
        showToast('🎤 Microphone access granted!', '#10b981');

      } catch (err) {
        console.error('Microphone permission error:', err);
        setPermissionGranted(false);
        setPermissionChecking(false);

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Microphone permission denied. Click the button below to grant access or check your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No microphone found. Please connect a microphone and refresh the page.');
        } else if (err.name === 'NotReadableError') {
          setError('Microphone is being used by another application. Please close other apps and try again.');
        } else {
          setError(`Microphone error: ${err.message}. Please allow access and refresh.`);
        }
      }
    };

    initializeMicrophone();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');

      console.log('Available audio devices:', audioInputs);
      setAudioDevices(audioInputs);

      if (audioInputs.length > 0) {
        setSelectedDevice(audioInputs[0].deviceId);
      } else {
        console.warn('No audio input devices found');
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  };

  const requestMicrophonePermission = async () => {
    setPermissionChecking(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setPermissionGranted(true);
      stream.getTracks().forEach(track => track.stop());
      await loadAudioDevices();
      setError('');
      setPermissionChecking(false);
      showToast('🎤 Microphone access granted!', '#10b981');
    } catch (err) {
      setPermissionGranted(false);
      setPermissionChecking(false);

      if (err.name === 'NotAllowedError') {
        setError('Permission denied. Please check your browser address bar and allow microphone access.');
      } else {
        setError(`Error: ${err.message}`);
      }
    }
  };

  // Initialize Firebase
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      showToast('⚠️ Firebase not configured. Using local storage mode.', '#f59e0b');
      setUser({ uid: 'local-user', isLocal: true });
      setAudioFiles([]);
      setIsLoading(false);
      return;
    }

    if (!auth) {
      showToast('Firebase initialization failed. Using local storage.', '#ef4444');
      setUser({ uid: 'local-user', isLocal: true });
      setAudioFiles([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        loadAudioFilesFromFirebase(user.uid);
        setupDetectionListener();
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error('Anonymous sign-in failed:', error);
          const localUser = {
            uid: localStorage.getItem('audio-app-user-id') || 'user-' + Date.now(),
            isLocal: true
          };
          localStorage.setItem('audio-app-user-id', localUser.uid);
          setUser(localUser);
          setAudioFiles([]);
          setIsLoading(false);
        });
      }
    });

    return () => {
      unsubscribe();
      if (detectionListenerRef.current) {
        off(detectionListenerRef.current);
      }
    };
  }, []);

  // Load TTS voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      const englishVoice = availableVoices.find(voice => voice.lang.startsWith('en'));
      setSelectedVoice(englishVoice || availableVoices[0]);
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const showToast = (message, backgroundColor = '#10b981') => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 1000;
      background: ${backgroundColor}; color: white; padding: 12px 20px;
      border-radius: 8px; font-size: 14px; font-weight: 500;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 300px; word-wrap: break-word;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 4000);
  };

  const sendToFirebase = async (value, command) => {
    if (!database || !isDetectionConnected) {
      setError('Firebase not connected');
      return;
    }

    try {
      const servoRef = dbRef(database, 'Blind/motor');
      await set(servoRef, value);

      console.log(`Sent ${value} to Firebase for command: ${command}`);
      setLastDetection(`${command} → ${value}`);
      setError('');

    } catch (error) {
      console.error('Firebase write error:', error);
      setError(`Failed to send to Firebase: ${error.message}`);
    }
  };

  // UPDATED: Process voice commands with proper async handling
  const processCommand = async (text) => {
    const lowerText = text.toLowerCase().trim();

    // Audio control commands
    if (lowerText.includes('play') && !lowerText.includes('first') && !lowerText.includes('second')) {
      if (currentlyPlayingIndex !== null) {
        await playAudio(currentlyPlayingIndex);
      } else if (selectedFiles.length > 0) {
        await playSelectedFile(0, selectedFiles[0]);
      }
      return true;
    }

    if (lowerText.includes('pause')) {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        // Wait for play promise before pausing
        if (playingPromiseRef.current) {
          try {
            await playingPromiseRef.current;
          } catch (e) {
            // Ignore errors
          }
        }
        audio.pause();
      }
      return true;
    }

    if (lowerText.includes('stop')) {
      await stopAudio();
      return true;
    }

    if (lowerText.includes('next')) {
      if (selectedFiles.length > 0) {
        const nextIndex = (currentSequentialIndex + 1) % selectedFiles.length;
        await playSelectedFile(nextIndex, selectedFiles[nextIndex]);
      }
      return true;
    }

    if (lowerText.includes('previous')) {
      if (selectedFiles.length > 0) {
        const prevIndex = currentSequentialIndex === 0 ? selectedFiles.length - 1 : currentSequentialIndex - 1;
        await playSelectedFile(prevIndex, selectedFiles[prevIndex]);
      }
      return true;
    }

    // Number-based playback
    for (let i = 1; i <= 7; i++) {
      const patterns = [
        `play ${['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'][i - 1]}`,
        `play track ${i}`,
        `play number ${i}`
      ];

      if (patterns.some(pattern => lowerText.includes(pattern))) {
        if (selectedFiles[i - 1]) {
          await playSelectedFile(i - 1, selectedFiles[i - 1]);
        }
        return true;
      }
    }

    // Check for exact Firebase command matches
    if (speechCommands.hasOwnProperty(lowerText)) {
      const value = speechCommands[lowerText];
      if (typeof value === 'number') {
        sendToFirebase(value, lowerText);
        return true;
      }
    }

    // Check for partial matches
    for (const [command, value] of Object.entries(speechCommands)) {
      if (lowerText.includes(command) && typeof value === 'number') {
        sendToFirebase(value, command);
        return true;
      }
    }

    return false;
  };

  // UPDATED: Monitor transcript changes with async handling
  useEffect(() => {
    const handleTranscript = async () => {
      if (transcript && voiceControlEnabled) {
        const words = transcript.split(' ');
        const lastFewWords = words.slice(-3).join(' ');

        if (await processCommand(lastFewWords) || await processCommand(transcript)) {
          console.log('Command processed:', transcript);
        }
      }
    };

    handleTranscript();
  }, [transcript, database, isDetectionConnected, voiceControlEnabled]);

  // Setup Firebase listener
  const setupDetectionListener = () => {
    if (!database) {
      console.warn('Firebase Realtime Database not available');
      return;
    }

    try {
      const buttonRef = dbRef(database, 'Blind/Buttons');
      detectionListenerRef.current = buttonRef;

      onValue(buttonRef, (snapshot) => {
        const buttonValue = snapshot.val();

        if (buttonValue !== null && buttonValue !== undefined) {
          let buttonNumber;

          if (typeof buttonValue === 'string') {
            const cleaned = buttonValue.replace(/['\"]/g, '').trim();
            buttonNumber = parseInt(cleaned, 10);
          } else if (typeof buttonValue === 'number') {
            buttonNumber = buttonValue;
          } else {
            return;
          }

          if (isNaN(buttonNumber)) return;

          setButtonData({ button: buttonNumber });
          setIsDetectionConnected(true);

          const currentSelectedFiles = selectedFilesRef.current;
          const currentAutoPlay = autoPlayEnabledRef.current;
          const currentLastDetection = lastDetectionRef.current;

          const isValidRange = buttonNumber >= 1 && buttonNumber <= SELECTION_LIMIT;
          const hasChanged = buttonNumber !== currentLastDetection;
          const hasFiles = currentSelectedFiles.length > 0;

          const shouldAutoPlay = currentAutoPlay && hasChanged && isValidRange && hasFiles;

          if (shouldAutoPlay) {
            const fileIndex = buttonNumber - 1;

            if (fileIndex < currentSelectedFiles.length) {
              const fileToPlay = currentSelectedFiles[fileIndex];

              if (fileToPlay && fileToPlay.url) {
                playSelectedFile(fileIndex, fileToPlay);
                showToast(`Button ${buttonNumber}: ${fileToPlay.name}`, '#10b981');
              }
            } else {
              showToast(`Button ${buttonNumber}: No file assigned`, '#f59e0b');
            }
          }

          setLastDetection(buttonNumber);
        } else {
          setIsDetectionConnected(false);
        }
      }, (error) => {
        console.error('Firebase listener error:', error);
        setIsDetectionConnected(false);
      });

      showToast('Connected to button system', '#10b981');

    } catch (error) {
      console.error('Setup error:', error);
    }
  };

  // UPDATED: Play file from selection with proper promise handling
  const playSelectedFile = async (selectionIndex, file) => {
    const audio = audioRef.current;
    if (!audio || !file || !file.url) return;

    try {
      const currentFiles = audioFilesRef.current;
      const audioFileIndex = currentFiles.findIndex(audioFile =>
        audioFile && isSameFile(audioFile, file)
      );

      // Wait for any ongoing play promise before pausing
      if (!audio.paused) {
        if (playingPromiseRef.current) {
          try {
            await playingPromiseRef.current;
          } catch (e) {
            // Ignore abort errors
          }
        }
        audio.pause();
      }

      // Set source and load
      audio.src = file.url;
      audio.currentTime = 0;
      audio.load();

      // Play and handle promise
      const promise = audio.play();
      setPlayingPromise(promise);

      if (promise !== undefined) {
        await promise;

        if (audioFileIndex !== -1) {
          setCurrentlyPlayingIndex(audioFileIndex);
        }
        setCurrentFileName(file.name);
        setCurrentSequentialIndex(selectionIndex);
        setPlayingPromise(null);
      }

    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingPromise(null);

      // Only show toast for non-abort errors
      if (error.name !== 'AbortError') {
        showToast(`Playback error: ${error.message}`, '#ef4444');
      }
    }
  };

  const loadAudioFilesFromFirebase = async (userId) => {
    if (!userId || !isFirebaseConfigured() || !storage) {
      loadAudioFilesFromLocal();
      return;
    }

    setIsLoading(true);
    try {
      const audioRef = ref(storage, `audio-files/${userId}`);
      const result = await listAll(audioRef);

      const files = await Promise.all(
        result.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return {
            id: itemRef.name,
            name: itemRef.name,
            url: url,
            firebaseRef: itemRef,
            isFirebaseFile: true
          };
        })
      );

      setAudioFiles(files);
      setSelectedFiles(prev =>
        prev.filter(sel => files.some(file => isSameFile(file, sel)))
      );

    } catch (error) {
      console.error('Error loading files from Firebase:', error);
      if (error.code === 'storage/object-not-found') {
        setAudioFiles([]);
      } else {
        loadAudioFilesFromLocal();
        return;
      }
    }
    setIsLoading(false);
  };

  const loadAudioFilesFromLocal = () => {
    try {
      const savedFiles = JSON.parse(localStorage.getItem('audio-files') || '[]');
      const validFiles = savedFiles.filter(file => file.url && file.name);
      setAudioFiles(validFiles);
    } catch (error) {
      setAudioFiles([]);
    }
    setIsLoading(false);
  };

  const saveAudioFilesToLocal = (files) => {
    try {
      localStorage.setItem('audio-files', JSON.stringify(files));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleTimeUpdate = () => setPosition(audio.currentTime || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setPosition(0);

      if (sequentialPlayEnabled && selectedFiles.length > 0) {
        const nextIndex = (currentSequentialIndex + 1) % selectedFiles.length;
        setCurrentSequentialIndex(nextIndex);

        setTimeout(() => {
          const nextFile = selectedFiles[nextIndex];
          if (nextFile) {
            playAudioByData(nextFile);
            showToast(`Auto-playing next: ${nextFile.name}`, '#10b981');
          }
        }, 500);
      } else {
        setCurrentlyPlayingIndex(null);
        setCurrentFileName(null);
        setCurrentSequentialIndex(0);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [sequentialPlayEnabled, currentSequentialIndex, selectedFiles]);

  // Voice control functions
  const startListening = async () => {
    try {
      if (!permissionGranted) {
        setError('Microphone permission not granted');
        await requestMicrophonePermission();
        return;
      }

      if (selectedDevice) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        setMediaStream(stream);
      }

      await SpeechRecognition.startListening({
        continuous: true,
        interimResults: true,
        language: 'en-US'
      });

      setIsListening(true);
      setVoiceControlEnabled(true);
      setError('');
    } catch (err) {
      setError(`Failed to start listening: ${err.message}`);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    try {
      SpeechRecognition.stopListening();
      setIsListening(false);
      setVoiceControlEnabled(false);
    } catch (err) {
      setError(`Error stopping: ${err.message}`);
    }
  };

  // TTS Functions (kept for internal use)
  const createUtterance = (text) => {
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.voice = selectedVoice;
    newUtterance.rate = speechRate;
    newUtterance.pitch = speechPitch;
    newUtterance.volume = speechVolume;

    newUtterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setTtsError('');
    };

    newUtterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    newUtterance.onerror = (event) => {
      setTtsError(`TTS Error: ${event.error}`);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    newUtterance.onpause = () => setIsPaused(true);
    newUtterance.onresume = () => setIsPaused(false);

    return newUtterance;
  };

  const speakText = (text = ttsText) => {
    if (!text.trim()) {
      setTtsError('Please enter text to speak');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const newUtterance = createUtterance(text);
      setUtterance(newUtterance);
      window.speechSynthesis.speak(newUtterance);
    } catch (err) {
      setTtsError(`Failed to speak: ${err.message}`);
    }
  };

  const pauseSpeech = () => {
    try {
      window.speechSynthesis.pause();
    } catch (err) {
      setTtsError(`Failed to pause: ${err.message}`);
    }
  };

  const resumeSpeech = () => {
    try {
      window.speechSynthesis.resume();
    } catch (err) {
      setTtsError(`Failed to resume: ${err.message}`);
    }
  };

  const stopSpeech = () => {
    try {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    } catch (err) {
      setTtsError(`Failed to stop: ${err.message}`);
    }
  };

  // Audio player utility functions
  const formatDuration = (seconds) => {
    if (!seconds || seconds === Infinity || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isAudioFile = (file) => {
    const audioTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/mpeg'];
    return audioTypes.includes(file.type) || file.name.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/i);
  };

  const isSameFile = (a, b) => {
    return a.id === b.id || a.name === b.name;
  };

  const isInSelection = (file) => {
    return selectedFiles.some(selectedFile => isSameFile(selectedFile, file));
  };

  const handleFileUpload = async (event) => {
    if (!user) {
      showToast('Please wait for initialization...', '#f59e0b');
      return;
    }

    const files = Array.from(event.target.files);
    const audioOnlyFiles = files.filter(isAudioFile);

    if (audioOnlyFiles.length === 0) {
      showToast('Please select valid audio files.', '#ef4444');
      return;
    }

    event.target.value = '';

    if (user.isLocal || !isFirebaseConfigured() || !storage) {
      audioOnlyFiles.forEach(file => {
        const fileId = `${Date.now()}-${Math.random()}`;
        const fileData = {
          id: fileId,
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size,
          isFirebaseFile: false,
          file: file
        };

        setAudioFiles(prev => {
          const newFiles = [...prev, fileData];
          saveAudioFilesToLocal(newFiles);
          return newFiles;
        });
      });

      showToast(`${audioOnlyFiles.length} file(s) stored locally!`, '#10b981');
      return;
    }

    for (const file of audioOnlyFiles) {
      const fileId = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `audio-files/${user.uid}/${fileId}`);

      try {
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { name: file.name, progress: 0 }
        }));

        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        const fileData = {
          id: fileId,
          name: file.name,
          url: downloadURL,
          firebaseRef: storageRef,
          isFirebaseFile: true
        };

        setAudioFiles(prev => [...prev, fileData]);

        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });

        showToast(`${file.name} uploaded!`, '#10b981');

      } catch (error) {
        showToast(`Error uploading ${file.name}`, '#ef4444');

        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }
    }
  };

  // UPDATED: playAudio with proper promise handling
  const playAudio = async (index) => {
    const audio = audioRef.current;
    if (!audio || index < 0 || index >= audioFiles.length) return;

    const audioFile = audioFiles[index];
    if (!audioFile || !audioFile.url) return;

    try {
      // If currently playing the same track, toggle pause
      if (currentlyPlayingIndex === index && !audio.paused) {
        // Wait for any pending play promise before pausing
        if (playingPromiseRef.current) {
          try {
            await playingPromiseRef.current;
          } catch (e) {
            // Ignore abort errors
          }
        }
        audio.pause();
        return;
      }

      // Stop any current playback first
      if (!audio.paused) {
        if (playingPromiseRef.current) {
          try {
            await playingPromiseRef.current;
          } catch (e) {
            // Ignore abort errors
          }
        }
        audio.pause();
      }

      // Set the source and load
      if (audio.src !== audioFile.url) {
        audio.src = audioFile.url;
        audio.load();
      }

      // Play and store the promise
      const promise = audio.play();
      setPlayingPromise(promise);

      if (promise !== undefined) {
        await promise;
        // Playback started successfully
        setCurrentlyPlayingIndex(index);
        setCurrentFileName(audioFile.name);
        setPlayingPromise(null);
      }

    } catch (error) {
      console.error('Playback error:', error);
      setPlayingPromise(null);

      // Only show toast for non-abort errors
      if (error.name !== 'AbortError') {
        showToast(`Error: ${error.message}`, '#ef4444');
      }
    }
  };

  // UPDATED: playAudioByData with async
  const playAudioByData = async (file) => {
    if (!file || !file.url) return;

    const currentFiles = audioFilesRef.current;
    const currentSelected = selectedFilesRef.current;

    const selectedIndex = currentSelected.findIndex(selectedFile =>
      selectedFile && isSameFile(selectedFile, file)
    );

    if (selectedIndex !== -1) {
      await playSelectedFile(selectedIndex, file);
    } else {
      const index = currentFiles.findIndex(audioFile =>
        audioFile && isSameFile(audioFile, file)
      );

      if (index !== -1) {
        await playAudio(index);
      }
    }
  };

  // UPDATED: stopAudio with proper promise handling
  const stopAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      // Wait for any ongoing play promise before stopping
      if (playingPromiseRef.current) {
        try {
          await playingPromiseRef.current;
        } catch (e) {
          // Ignore abort errors
        }
      }

      audio.pause();
      audio.currentTime = 0;
      setCurrentlyPlayingIndex(null);
      setCurrentFileName(null);
      setPosition(0);
      setIsPlaying(false);
      setPlayingPromise(null);
    } catch (error) {
      console.error('Stop error:', error);
      setPlayingPromise(null);
    }
  };

  const handleSeek = (event) => {
    const audio = audioRef.current;
    if (!audio || duration === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const percentage = (event.clientX - rect.left) / rect.width;
    const newTime = percentage * duration;

    audio.currentTime = Math.max(0, Math.min(newTime, duration));
  };

  const toggleSelection = (file) => {
    const isSelected = isInSelection(file);

    if (isSelected) {
      setSelectedFiles(prev => prev.filter(selectedFile => !isSameFile(selectedFile, file)));
    } else {
      if (selectedFiles.length >= SELECTION_LIMIT) {
        showToast(`Selection limit is ${SELECTION_LIMIT} files.`, '#6b7280');
        return;
      }
      setSelectedFiles(prev => [...prev, file]);
    }
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  const deleteAudioFile = async (index) => {
    if (currentlyPlayingIndex === index) {
      await stopAudio();
    }

    const fileToDelete = audioFiles[index];

    try {
      if (fileToDelete.isFirebaseFile && fileToDelete.firebaseRef && storage) {
        await deleteObject(fileToDelete.firebaseRef);
      }

      if (!fileToDelete.isFirebaseFile && fileToDelete.url) {
        URL.revokeObjectURL(fileToDelete.url);
      }

      const newFiles = audioFiles.filter((_, i) => i !== index);
      setAudioFiles(newFiles);

      if (user?.isLocal) {
        saveAudioFilesToLocal(newFiles);
      }

      setSelectedFiles(prev => prev.filter(selectedFile => !isSameFile(selectedFile, fileToDelete)));

      if (currentlyPlayingIndex !== null && currentlyPlayingIndex > index) {
        setCurrentlyPlayingIndex(prev => prev - 1);
      }

      showToast('Audio file deleted!', '#f59e0b');
    } catch (error) {
      showToast(`Error deleting file: ${error.message}`, '#ef4444');
    }
  };

  // Render Library List
  const renderLibraryList = () => {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '256px', gap: '16px' }}>
          <Loader size={48} style={{ animation: 'spin 1s linear infinite' }} />
          <p>Loading your audio library...</p>
        </div>
      );
    }

    if (audioFiles.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '256px', color: '#6b7280' }}>
          <Music size={64} style={{ marginBottom: '16px', color: '#9ca3af' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No audio files found</h3>
          <p style={{ fontSize: '14px' }}>Upload some audio files to get started</p>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {audioFiles.map((file, index) => {
          const isCurrentlyPlaying = currentlyPlayingIndex === index;
          const isSelected = isInSelection(file);
          const canAddMore = selectedFiles.length < SELECTION_LIMIT || isSelected;

          return (
            <div
              key={file.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: isCurrentlyPlaying ? '0 4px 12px rgba(37, 99, 235, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                padding: '16px',
                border: '1px solid #e5e7eb',
                transition: 'box-shadow 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={() => playAudio(index)}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    backgroundColor: isCurrentlyPlaying ? '#2563eb' : '#9ca3af',
                    transition: 'opacity 0.2s'
                  }}
                >
                  {isCurrentlyPlaying && isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{
                    fontWeight: isCurrentlyPlaying ? 'bold' : '500',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: isCurrentlyPlaying ? '#1d4ed8' : '#111827'
                  }}>
                    {file.name}
                  </h4>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    {file.isFirebaseFile ? 'Cloud Storage' : 'Local Storage'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => toggleSelection(file)}
                    disabled={!canAddMore}
                    style={{
                      padding: '8px',
                      borderRadius: '50%',
                      border: 'none',
                      cursor: canAddMore ? 'pointer' : 'not-allowed',
                      backgroundColor: 'transparent',
                      color: isSelected ? '#059669' : canAddMore ? '#6b7280' : '#d1d5db'
                    }}
                    title={isSelected ? 'Remove from selection' : canAddMore ? 'Add to selection' : `Limit reached (${SELECTION_LIMIT})`}
                  >
                    {isSelected ? <CheckCircle size={20} /> : <PlusCircle size={20} />}
                  </button>

                  <button
                    onClick={() => deleteAudioFile(index)}
                    style={{
                      padding: '8px',
                      borderRadius: '50%',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      color: '#ef4444'
                    }}
                    title="Delete file"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Selection List
  const renderSelectionList = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {selectedFiles.length > 0 && (
          <div style={{ padding: '16px 16px 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Button sequence (1-{selectedFiles.length})</p>
            <button
              onClick={clearSelection}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#2563eb',
                backgroundColor: 'transparent',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
              <span>Clear</span>
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto' }}>
          {selectedFiles.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '256px', color: '#6b7280' }}>
              <Music size={64} style={{ marginBottom: '16px', color: '#9ca3af' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px' }}>No files in Selection</h3>
              <p style={{ fontSize: '14px' }}>Add files from the Library tab</p>
            </div>
          ) : (
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedFiles.map((file, index) => {
                const libIndex = audioFiles.findIndex(f => isSameFile(f, file));
                const playingHere = libIndex !== -1 && libIndex === currentlyPlayingIndex;
                const buttonNumber = index + 1;
                const isCurrentButton = buttonData?.button === buttonNumber;

                return (
                  <div
                    key={`selection-${file.id}`}
                    style={{
                      backgroundColor: isCurrentButton ? '#f0fdf4' : 'white',
                      borderRadius: '8px',
                      boxShadow: playingHere ? '0 4px 12px rgba(37, 99, 235, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                      padding: '16px',
                      border: isCurrentButton ? '2px solid #10b981' : '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <button
                        onClick={() => playAudioByData(file)}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          backgroundColor: playingHere ? '#2563eb' : '#9ca3af'
                        }}
                      >
                        {playingHere && isPlaying ? <Pause size={20} /> : <Play size={20} />}
                      </button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          fontWeight: playingHere ? 'bold' : '500',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: playingHere ? '#1d4ed8' : '#111827'
                        }}>
                          {file.name}
                        </h4>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                          Button {buttonNumber}{isCurrentButton && ' • CURRENT'}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleSelection(file)}
                        style={{
                          padding: '8px',
                          borderRadius: '50%',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                          color: '#ef4444'
                        }}
                        title="Remove from selection"
                      >
                        <XCircle size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main render
  if (!browserSupportsSpeechRecognition) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Browser Not Supported</h2>
        <p>Your browser doesn't support speech recognition.</p>
        <p>Please use Chrome, Edge, or Safari (latest version).</p>
      </div>
    );
  }

  if (!isHttps) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>HTTPS Required</h2>
        <p>Voice features require HTTPS or localhost.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <audio ref={audioRef} />

      {/* Header */}
      <header style={{ backgroundColor: '#1d4ed8', color: 'white', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              Voice-Controlled Audio Player
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}>
                {isDetectionConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
                <span>{isDetectionConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>
                Selected: {selectedFiles.length}/{SELECTION_LIMIT}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', marginTop: '16px', borderBottom: '1px solid #3b82f6' }}>
            <button
              onClick={() => setActiveTab('library')}
              style={{
                padding: '8px 24px',
                fontWeight: '500',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'library' ? '2px solid white' : 'none',
                color: activeTab === 'library' ? 'white' : '#bfdbfe'
              }}
            >
              Library
            </button>
            <button
              onClick={() => setActiveTab('selection')}
              style={{
                padding: '8px 24px',
                fontWeight: '500',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'selection' ? '2px solid white' : 'none',
                color: activeTab === 'selection' ? 'white' : '#bfdbfe'
              }}
            >
              Selection
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              style={{
                padding: '8px 24px',
                fontWeight: '500',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === 'voice' ? '2px solid white' : 'none',
                color: activeTab === 'voice' ? 'white' : '#bfdbfe'
              }}
            >
              Voice Control
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1024px', margin: '0 auto' }}>
        {/* Permission Status */}
        {activeTab === 'voice' && (
          <div style={{
            padding: '10px',
            margin: '16px 16px 0 16px',
            backgroundColor: permissionGranted ? '#e8f5e8' : permissionChecking ? '#fff9c4' : '#ffebee',
            borderRadius: '4px',
            border: `1px solid ${permissionGranted ? '#4CAF50' : permissionChecking ? '#FFC107' : '#f44336'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <strong>Microphone Permission:</strong> {
                permissionChecking ? '⏳ Checking...' :
                  permissionGranted ? '✓ Granted' : '✗ Not Granted'
              }
            </div>
            {!permissionGranted && !permissionChecking && (
              <button
                onClick={requestMicrophonePermission}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Mic size={16} />
                Grant Permission
              </button>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{
            color: 'red',
            backgroundColor: '#ffebee',
            padding: '10px',
            borderRadius: '4px',
            margin: '16px'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Detection Info */}
        {isFirebaseConfigured() && (
          <div style={{
            margin: '16px',
            padding: '16px',
            backgroundColor: isDetectionConnected ? '#f0f9ff' : '#fef3c7',
            border: `1px solid ${isDetectionConnected ? '#0ea5e9' : '#f59e0b'}`,
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ fontWeight: 'bold', color: isDetectionConnected ? '#0369a1' : '#92400e', margin: 0 }}>
                Button System {isDetectionConnected ? '🟢' : '🔴'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
                <span>Auto-play:</span>
                <button
                  style={{
                    width: '40px',
                    height: '20px',
                    borderRadius: '10px',
                    backgroundColor: autoPlayEnabled ? '#10b981' : '#d1d5db',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '2px',
                    left: autoPlayEnabled ? '22px' : '2px',
                    transition: 'left 0.2s'
                  }}></div>
                </button>
              </div>
            </div>
            <div style={{ fontSize: '14px', color: isDetectionConnected ? '#1e40af' : '#92400e', lineHeight: '1.5' }}>
              {buttonData ? (
                <>
                  <strong>Current Button:</strong> {buttonData.button} |
                  <strong> Status:</strong> {autoPlayEnabled ? 'Auto-play enabled' : 'Manual play only'} |
                  <strong> Files:</strong> {selectedFiles.length}/{SELECTION_LIMIT}
                </>
              ) : (
                isDetectionConnected ? 'Waiting for button press...' : 'Connection failed.'
              )}
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div style={{ padding: '16px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*"
            multiple
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#2563eb',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: user ? 'pointer' : 'not-allowed',
              width: '100%'
            }}
            disabled={!user}
          >
            <Upload size={20} />
            <span>
              {!user
                ? 'Initializing...'
                : user.isLocal || !isFirebaseConfigured()
                  ? 'Upload Audio Files (Local)'
                  : 'Upload Audio Files (Firebase)'
              }
            </span>
          </button>
        </div>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div style={{
            margin: '16px',
            padding: '16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px'
          }}>
            <h3>Uploading files...</h3>
            {Object.entries(uploadProgress).map(([fileId, data]) => (
              <div key={fileId} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Uploading {data.name}...</span>
              </div>
            ))}
          </div>
        )}

        {/* Now Playing */}
        {currentFileName && (
          <div style={{
            margin: '0 16px 16px 16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '8px' }}>
                Now Playing
              </h2>
              <p style={{ color: '#374151', fontWeight: '500' }}>{currentFileName}</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280', minWidth: '45px' }}>
                {formatDuration(position)}
              </span>
              <div
                style={{
                  flex: 1,
                  height: '8px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={handleSeek}
              >
                <div style={{
                  height: '100%',
                  backgroundColor: '#2563eb',
                  borderRadius: '4px',
                  width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
                  transition: 'width 0.1s ease'
                }} />
              </div>
              <span style={{ fontSize: '14px', color: '#6b7280', minWidth: '45px' }}>
                {formatDuration(duration)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <button
                onClick={stopAudio}
                style={{
                  padding: '12px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{ width: '24px', height: '24px', backgroundColor: '#374151', borderRadius: '2px' }} />
              </button>
              {currentlyPlayingIndex !== null && (
                <button
                  onClick={() => playAudio(currentlyPlayingIndex)}
                  style={{
                    padding: '12px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px 12px 0 0',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          minHeight: '400px'
        }}>
          {activeTab === 'library' && renderLibraryList()}
          {activeTab === 'selection' && renderSelectionList()}
          {activeTab === 'voice' && (
            <div style={{ padding: '20px' }}>
              <h2 style={{ marginTop: 0, color: '#2196F3' }}>🎤 Voice Control</h2>

              {/* Device Selection */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Microphone Device:
                </label>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  disabled={!permissionGranted}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                >
                  <option value="">Default Device</option>
                  {audioDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Device ${device.deviceId.slice(0, 8)}...`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Control Buttons */}
              <div style={{ marginBottom: '15px' }}>
                <button
                  onClick={startListening}
                  disabled={isListening || listening || !permissionGranted}
                  style={{
                    backgroundColor: listening ? '#4CAF50' : '#2196F3',
                    color: 'white',
                    padding: '10px 20px',
                    marginRight: '10px',
                    marginBottom: '5px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: (listening || !permissionGranted) ? 'not-allowed' : 'pointer',
                    opacity: (listening || !permissionGranted) ? 0.7 : 1
                  }}
                >
                  {listening ? '🔴 Listening...' : 'Start Voice Control'}
                </button>

                <button
                  onClick={stopListening}
                  disabled={!listening}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    padding: '10px 20px',
                    marginRight: '10px',
                    marginBottom: '5px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: !listening ? 'not-allowed' : 'pointer',
                    opacity: !listening ? 0.7 : 1
                  }}
                >
                  Stop
                </button>

                <button
                  onClick={resetTranscript}
                  style={{
                    backgroundColor: '#FF9800',
                    color: 'white',
                    padding: '10px 20px',
                    marginBottom: '5px',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>

              {/* Status */}
              <p style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: listening ? '#4CAF50' : '#666',
                margin: '10px 0'
              }}>
                Status: {listening ? '🔴 LISTENING' : '⚪ READY'}
              </p>

              {/* Voice Commands Help */}
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px'
              }}>

              </div>

              {/* Transcript Display */}
              <div style={{ marginTop: '20px' }}>
                <h3>Speech Recognition Results:</h3>
                <textarea
                  value={transcript}
                  readOnly
                  placeholder="Your speech will appear here..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '15px',
                    fontSize: '16px',
                    lineHeight: '1.5',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer style={{
        maxWidth: '1024px',
        margin: '20px auto',
        padding: '16px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        <div style={{ marginBottom: '12px' }}>
          <strong>App Status:</strong> {user?.isLocal ? 'Local Mode' : 'Firebase Connected'} |
          <strong> Files:</strong> {audioFiles.length} |
          <strong> Selected:</strong> {selectedFiles.length}/{SELECTION_LIMIT}
        </div>
        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
          <p style={{ margin: '4px 0' }}>
            <strong>Tips:</strong> Add files to your selection (max {SELECTION_LIMIT}), then use button system or voice commands to play them.
          </p>
          <p style={{ margin: '4px 0' }}>
            Voice commands work for both audio control and Firebase integration.
          </p>
        </div>
      </footer>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default IntegratedAudioVoiceApp;
