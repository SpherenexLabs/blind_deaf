// import React, { useState, useRef, useEffect, useCallback } from 'react';
// import { Upload, Play, Pause, CheckCircle, PlusCircle, XCircle, Trash2, Music, X, Loader, Wifi, WifiOff } from 'lucide-react';

// // Firebase imports
// import { initializeApp } from 'firebase/app';
// import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
// import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
// import { getDatabase, ref as dbRef, onValue, off } from 'firebase/database';

// // Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyAOFbpbOwdren9NlNtWvRVyf4DsDf9-2H4",
//   authDomain: "procart-8d2f6.firebaseapp.com",
//   databaseURL: "https://procart-8d2f6-default-rtdb.firebaseio.com",
//   projectId: "procart-8d2f6",
//   storageBucket: "procart-8d2f6.firebasestorage.app",
//   messagingSenderId: "1026838026898",
//   appId: "1:1026838026898:web:56b3889e347862ca37a44b",
//   measurementId: "G-RW7V299RPY"
// };

// // Check if Firebase is properly configured
// const isFirebaseConfigured = () => {
//   return !firebaseConfig.apiKey.includes('your-') && 
//          !firebaseConfig.projectId.includes('your-') &&
//          !firebaseConfig.appId.includes('your-');
// };

// // Only initialize Firebase if properly configured
// let app, storage, auth, database;
// if (isFirebaseConfigured()) {
//   try {
//     app = initializeApp(firebaseConfig);
//     storage = getStorage(app);
//     auth = getAuth(app);
//     database = getDatabase(app);
//   } catch (error) {
//     console.error('Firebase initialization failed:', error);
//   }
// }

// const AudioPlayerApp = () => {
//   // Constants
//   const SELECTION_LIMIT = 7;
  
//   // State
//   const [audioFiles, setAudioFiles] = useState([]);
//   const [selectedFiles, setSelectedFiles] = useState([]);
//   const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState(null);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [duration, setDuration] = useState(0);
//   const [position, setPosition] = useState(0);
//   const [currentFileName, setCurrentFileName] = useState(null);
//   const [activeTab, setActiveTab] = useState('library');
//   const [isLoading, setIsLoading] = useState(true);
//   const [uploadProgress, setUploadProgress] = useState({});
//   const [user, setUser] = useState(null);
  
//   // New state for Firebase detection
//   const [isDetectionConnected, setIsDetectionConnected] = useState(false);
//   const [lastDetection, setLastDetection] = useState(null);
//   const [buttonData, setButtonData] = useState(null);
//   const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  
//   // Sequential auto-play state
//   const [sequentialPlayEnabled, setSequentialPlayEnabled] = useState(false);
//   const [currentSequentialIndex, setCurrentSequentialIndex] = useState(0);
  
//   // Refs
//   const audioRef = useRef(null);
//   const fileInputRef = useRef(null);
//   const detectionListenerRef = useRef(null);
  
//   useEffect(() => {
//     if (!isFirebaseConfigured()) {
//       showToast('⚠️ Firebase not configured. Using local storage mode.', '#f59e0b');
//       setUser({ uid: 'local-user', isLocal: true });
//       setAudioFiles([]);
//       setIsLoading(false);
//       return;
//     }

//     if (!auth) {
//       showToast('Firebase initialization failed. Using local storage.', '#ef4444');
//       setUser({ uid: 'local-user', isLocal: true });
//       setAudioFiles([]);
//       setIsLoading(false);
//       return;
//     }

//     const unsubscribe = onAuthStateChanged(auth, (user) => {
//       if (user) {
//         setUser(user);
//         loadAudioFilesFromFirebase(user.uid);
//       } else {
//         signInAnonymously(auth).catch((error) => {
//           console.error('Anonymous sign-in failed:', error);
//           let message = 'Authentication failed. ';
          
//           if (error.code === 'auth/admin-restricted-operation') {
//             message += 'Enable Anonymous Authentication in Firebase Console.';
//           } else {
//             message += 'Using local session.';
//           }
          
//           showToast(message, '#f59e0b');
          
//           const localUser = { 
//             uid: localStorage.getItem('audio-app-user-id') || 'user-' + Date.now(),
//             isLocal: true 
//           };
//           localStorage.setItem('audio-app-user-id', localUser.uid);
//           setUser(localUser);
//           setAudioFiles([]);
//           setIsLoading(false);
//         });
//       }
//     });
    
//     return () => {
//       unsubscribe();
//       if (detectionListenerRef.current) {
//         off(detectionListenerRef.current);
//       }
//     };
//   }, []);

//   // Toast notification function
//   const showToast = (message, backgroundColor = '#10b981') => {
//     const toast = document.createElement('div');
//     toast.textContent = message;
//     toast.style.cssText = `
//       position: fixed; top: 20px; right: 20px; z-index: 1000;
//       background: ${backgroundColor}; color: white; padding: 12px 20px;
//       border-radius: 8px; font-size: 14px; font-weight: 500;
//       box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//       max-width: 300px; word-wrap: break-word;
//     `;
//     document.body.appendChild(toast);
//     setTimeout(() => {
//       if (document.body.contains(toast)) {
//         document.body.removeChild(toast);
//       }
//     }, 4000);
//   };

//   // Helper functions
//   const isSameFile = useCallback((a, b) => {
//     return a.id === b.id || a.name === b.name;
//   }, []);

//   // Updated playAudioByData with useCallback
//   const playAudioByData = useCallback((file) => {
//     setAudioFiles(currentAudioFiles => {
//       const index = currentAudioFiles.findIndex(audioFile => isSameFile(audioFile, file));
//       if (index !== -1) {
//         playAudio(index);
        
//         setSelectedFiles(currentSelectedFiles => {
//           const selectedIndex = currentSelectedFiles.findIndex(selectedFile => isSameFile(selectedFile, file));
//           if (selectedIndex !== -1) {
//             setCurrentSequentialIndex(selectedIndex);
//           }
//           return currentSelectedFiles;
//         });
//       } else {
//         showToast('File not found in library.', '#ef4444');
//       }
      
//       return currentAudioFiles;
//     });
//   }, [isSameFile]);

//   // FIXED: Setup Firebase Realtime Database listener with proper state management
//   useEffect(() => {
//     if (user && !user.isLocal && isFirebaseConfigured() && database) {
//       console.log('Setting up listener for Blind/Buttons');
      
//       // Clean up existing listener
//       if (detectionListenerRef.current) {
//         off(detectionListenerRef.current);
//       }
      
//       const buttonRef = dbRef(database, 'Blind/Buttons');
//       detectionListenerRef.current = buttonRef;
      
//       onValue(buttonRef, (snapshot) => {
//         const buttonValue = snapshot.val();
//         console.log('Firebase button data received:', buttonValue);
        
//         if (buttonValue !== null && buttonValue !== undefined) {
//           const buttonNumber = typeof buttonValue === 'string' ? parseInt(buttonValue) : buttonValue;
          
//           setButtonData({ button: buttonNumber });
//           setIsDetectionConnected(true);
          
//           // Use callback form to get latest state
//           setLastDetection(prevLastDetection => {
//             // Check if we should trigger auto-play
//             setAutoPlayEnabled(currentAutoPlayEnabled => {
//               if (currentAutoPlayEnabled && 
//                   buttonNumber !== prevLastDetection && 
//                   buttonNumber >= 1 && 
//                   buttonNumber <= SELECTION_LIMIT) {
                
//                 // Access selectedFiles from state snapshot
//                 const fileIndex = buttonNumber - 1;
                
//                 // Get current selected files
//                 setSelectedFiles(currentSelectedFiles => {
//                   console.log('Auto-play conditions:', {
//                     autoPlayEnabled: currentAutoPlayEnabled,
//                     detectionChanged: buttonNumber !== prevLastDetection,
//                     validRange: buttonNumber >= 1 && buttonNumber <= SELECTION_LIMIT,
//                     hasFiles: currentSelectedFiles.length > 0,
//                     fileIndex: fileIndex,
//                     filesLength: currentSelectedFiles.length
//                   });
                  
//                   if (fileIndex < currentSelectedFiles.length) {
//                     const fileToPlay = currentSelectedFiles[fileIndex];
                    
//                     console.log(`Auto-playing button ${buttonNumber}: ${fileToPlay.name}`);
                    
//                     setTimeout(() => {
//                       playAudioByData(fileToPlay);
//                       showToast(
//                         `Button ${buttonNumber} pressed! Playing: ${fileToPlay.name}`,
//                         '#10b981'
//                       );
//                     }, 200);
//                   } else {
//                     console.warn(`Button ${buttonNumber} pressed but only ${currentSelectedFiles.length} files selected`);
//                     showToast(
//                       `Button ${buttonNumber} pressed, but no file assigned to slot ${buttonNumber}`,
//                       '#f59e0b'
//                     );
//                   }
                  
//                   return currentSelectedFiles; // Don't modify selectedFiles
//                 });
//               }
              
//               return currentAutoPlayEnabled; // Don't modify autoPlayEnabled
//             });
            
//             return buttonNumber; // Update lastDetection
//           });
//         } else {
//           setIsDetectionConnected(false);
//           console.log('No button data received (null or undefined)');
//         }
//       }, (error) => {
//         console.error('Error listening to button detection:', error);
//         setIsDetectionConnected(false);
//         showToast('Failed to connect to button system: ' + error.message, '#ef4444');
//       });
      
//       showToast('Connected to button detection system', '#10b981');
//     }
    
//     return () => {
//       if (detectionListenerRef.current) {
//         off(detectionListenerRef.current);
//       }
//     };
//   }, [user, database, playAudioByData, SELECTION_LIMIT]);
  
//   // Load audio files from Firebase Storage or local storage
//   const loadAudioFilesFromFirebase = async (userId) => {
//     if (!userId || !isFirebaseConfigured() || !storage) {
//       loadAudioFilesFromLocal();
//       return;
//     }
    
//     setIsLoading(true);
//     try {
//       const audioRef = ref(storage, `audio-files/${userId}`);
//       const result = await listAll(audioRef);
      
//       const files = await Promise.all(
//         result.items.map(async (itemRef) => {
//           const url = await getDownloadURL(itemRef);
//           return {
//             id: itemRef.name,
//             name: itemRef.name,
//             url: url,
//             firebaseRef: itemRef,
//             isFirebaseFile: true
//           };
//         })
//       );
      
//       setAudioFiles(files);
      
//       setSelectedFiles(prev => 
//         prev.filter(sel => 
//           files.some(file => isSameFile(file, sel))
//         )
//       );
      
//     } catch (error) {
//       console.error('Error loading files from Firebase:', error);
      
//       if (error.code === 'storage/unauthorized') {
//         showToast('Storage access denied. Check Firebase Storage rules.', '#ef4444');
//       } else if (error.code === 'storage/object-not-found') {
//         setAudioFiles([]);
//       } else {
//         showToast('Firebase storage error. Switching to local mode.', '#f59e0b');
//         loadAudioFilesFromLocal();
//         return;
//       }
//     }
//     setIsLoading(false);
//   };

//   // Load audio files from local storage (fallback)
//   const loadAudioFilesFromLocal = () => {
//     try {
//       const savedFiles = JSON.parse(localStorage.getItem('audio-files') || '[]');
//       const validFiles = savedFiles.filter(file => file.url && file.name);
//       setAudioFiles(validFiles);
//     } catch (error) {
//       console.error('Error loading local files:', error);
//       setAudioFiles([]);
//     }
//     setIsLoading(false);
//   };

//   // Save audio files to local storage
//   const saveAudioFilesToLocal = (files) => {
//     try {
//       localStorage.setItem('audio-files', JSON.stringify(files));
//     } catch (error) {
//       console.error('Error saving to local storage:', error);
//     }
//   };
  
//   // Audio event handlers
//   useEffect(() => {
//     const audio = audioRef.current;
//     if (!audio) return;
    
//     const handleLoadedMetadata = () => {
//       setDuration(audio.duration || 0);
//     };
    
//     const handleTimeUpdate = () => {
//       setPosition(audio.currentTime || 0);
//     };
    
//     const handleEnded = () => {
//       setIsPlaying(false);
//       setPosition(0);
      
//       if (sequentialPlayEnabled && selectedFiles.length > 0) {
//         const nextIndex = (currentSequentialIndex + 1) % selectedFiles.length;
//         setCurrentSequentialIndex(nextIndex);
        
//         setTimeout(() => {
//           const nextFile = selectedFiles[nextIndex];
//           if (nextFile) {
//             playAudioByData(nextFile);
//             showToast(
//               `Auto-playing next: ${nextFile.name} (${nextIndex + 1}/${selectedFiles.length})`,
//               '#10b981'
//             );
//           }
//         }, 500);
//       } else {
//         setCurrentlyPlayingIndex(null);
//         setCurrentFileName(null);
//         setCurrentSequentialIndex(0);
//       }
//     };
    
//     const handlePlay = () => setIsPlaying(true);
//     const handlePause = () => setIsPlaying(false);
    
//     audio.addEventListener('loadedmetadata', handleLoadedMetadata);
//     audio.addEventListener('timeupdate', handleTimeUpdate);
//     audio.addEventListener('ended', handleEnded);
//     audio.addEventListener('play', handlePlay);
//     audio.addEventListener('pause', handlePause);
    
//     return () => {
//       audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
//       audio.removeEventListener('timeupdate', handleTimeUpdate);
//       audio.removeEventListener('ended', handleEnded);
//       audio.removeEventListener('play', handlePlay);
//       audio.removeEventListener('pause', handlePause);
//     };
//   }, [sequentialPlayEnabled, currentSequentialIndex, selectedFiles, playAudioByData]);
  
//   // Helper functions
//   const formatDuration = (seconds) => {
//     if (!seconds || seconds === Infinity || isNaN(seconds)) return '00:00';
//     const mins = Math.floor(seconds / 60);
//     const secs = Math.floor(seconds % 60);
//     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   };
  
//   const isAudioFile = (file) => {
//     const audioTypes = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/mpeg'];
//     return audioTypes.includes(file.type) || file.name.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/i);
//   };
  
//   const isInSelection = (file) => {
//     return selectedFiles.some(selectedFile => isSameFile(selectedFile, file));
//   };
  
//   // File upload handler with Firebase Storage and local fallback
//   const handleFileUpload = async (event) => {
//     if (!user) {
//       showToast('Please wait for initialization...', '#f59e0b');
//       return;
//     }
    
//     const files = Array.from(event.target.files);
//     const audioOnlyFiles = files.filter(isAudioFile);
    
//     if (audioOnlyFiles.length === 0) {
//       showToast('Please select valid audio files.', '#ef4444');
//       return;
//     }
    
//     event.target.value = '';
    
//     if (user.isLocal || !isFirebaseConfigured() || !storage) {
//       audioOnlyFiles.forEach(file => {
//         const fileId = `${Date.now()}-${Math.random()}`;
//         const fileData = {
//           id: fileId,
//           name: file.name,
//           url: URL.createObjectURL(file),
//           size: file.size,
//           isFirebaseFile: false,
//           file: file
//         };
        
//         setAudioFiles(prev => {
//           const newFiles = [...prev, fileData];
//           saveAudioFilesToLocal(newFiles);
//           return newFiles;
//         });
//       });
      
//       const message = audioOnlyFiles.length === 1 
//         ? 'Audio file stored locally!' 
//         : `${audioOnlyFiles.length} audio files stored locally!`;
//       showToast(message, '#10b981');
//       return;
//     }
    
//     for (const file of audioOnlyFiles) {
//       const fileId = `${Date.now()}-${file.name}`;
//       const storageRef = ref(storage, `audio-files/${user.uid}/${fileId}`);
      
//       try {
//         setUploadProgress(prev => ({
//           ...prev,
//           [fileId]: { name: file.name, progress: 0 }
//         }));
        
//         await uploadBytes(storageRef, file);
//         const downloadURL = await getDownloadURL(storageRef);
        
//         const fileData = {
//           id: fileId,
//           name: file.name,
//           url: downloadURL,
//           firebaseRef: storageRef,
//           isFirebaseFile: true
//         };
        
//         setAudioFiles(prev => [...prev, fileData]);
        
//         setUploadProgress(prev => {
//           const newProgress = { ...prev };
//           delete newProgress[fileId];
//           return newProgress;
//         });
        
//         showToast(`${file.name} uploaded to Firebase!`, '#10b981');
        
//       } catch (error) {
//         console.error('Error uploading file:', error);
        
//         let errorMessage = `Error uploading ${file.name}`;
//         if (error.code === 'storage/unauthorized') {
//           errorMessage += ': Storage access denied. Check Firebase rules.';
//         } else if (error.code === 'storage/quota-exceeded') {
//           errorMessage += ': Storage quota exceeded.';
//         } else {
//           errorMessage += `: ${error.message}`;
//         }
        
//         showToast(errorMessage, '#ef4444');
        
//         setUploadProgress(prev => {
//           const newProgress = { ...prev };
//           delete newProgress[fileId];
//           return newProgress;
//         });
//       }
//     }
//   };
  
//   // Audio playback functions
//   const playAudio = async (index) => {
//     const audio = audioRef.current;
//     if (!audio) return;
    
//     try {
//       if (currentlyPlayingIndex === index && !audio.paused) {
//         audio.pause();
//         return;
//       }
      
//       const audioFile = audioFiles[index];
//       if (audio.src !== audioFile.url) {
//         audio.src = audioFile.url;
//         showToast('Loading audio...', '#3b82f6');
//       }
      
//       await audio.play();
//       setCurrentlyPlayingIndex(index);
//       setCurrentFileName(audioFile.name);
//     } catch (error) {
//       console.error('Error playing audio:', error);
//       showToast(`Error playing audio: ${error.message}`, '#ef4444');
//     }
//   };

//   // Start sequential playback
//   const startSequentialPlay = () => {
//     if (selectedFiles.length === 0) {
//       showToast('Add files to selection first', '#f59e0b');
//       return;
//     }
    
//     setSequentialPlayEnabled(true);
//     setCurrentSequentialIndex(0);
    
//     const firstFile = selectedFiles[0];
//     playAudioByData(firstFile);
//     showToast(
//       `Started sequential playback: ${firstFile.name} (1/${selectedFiles.length})`,
//       '#10b981'
//     );
//   };

//   // Stop sequential playback
//   const stopSequentialPlay = () => {
//     setSequentialPlayEnabled(false);
//     setCurrentSequentialIndex(0);
//     stopAudio();
//     showToast('Sequential playback stopped', '#f59e0b');
//   };
  
//   const stopAudio = () => {
//     const audio = audioRef.current;
//     if (!audio) return;
    
//     audio.pause();
//     audio.currentTime = 0;
//     setCurrentlyPlayingIndex(null);
//     setCurrentFileName(null);
//     setPosition(0);
//     setIsPlaying(false);
//   };
  
//   const handleSeek = (event) => {
//     const audio = audioRef.current;
//     if (!audio || duration === 0) return;
    
//     const rect = event.currentTarget.getBoundingClientRect();
//     const percentage = (event.clientX - rect.left) / rect.width;
//     const newTime = percentage * duration;
    
//     audio.currentTime = Math.max(0, Math.min(newTime, duration));
//   };
  
//   // Selection management
//   const toggleSelection = (file) => {
//     const isSelected = isInSelection(file);
    
//     if (isSelected) {
//       setSelectedFiles(prev => prev.filter(selectedFile => !isSameFile(selectedFile, file)));
//     } else {
//       if (selectedFiles.length >= SELECTION_LIMIT) {
//         showToast(`Selection limit is ${SELECTION_LIMIT} files.`, '#6b7280');
//         return;
//       }
//       setSelectedFiles(prev => [...prev, file]);
//     }
//   };
  
//   const clearSelection = () => {
//     setSelectedFiles([]);
//   };
  
//   // Delete file from Firebase Storage or local storage
//   const deleteAudioFile = async (index) => {
//     if (currentlyPlayingIndex === index) {
//       stopAudio();
//     }
    
//     const fileToDelete = audioFiles[index];
    
//     try {
//       if (fileToDelete.isFirebaseFile && fileToDelete.firebaseRef && storage) {
//         await deleteObject(fileToDelete.firebaseRef);
//       }
      
//       if (!fileToDelete.isFirebaseFile && fileToDelete.url) {
//         URL.revokeObjectURL(fileToDelete.url);
//       }
      
//       const newFiles = audioFiles.filter((_, i) => i !== index);
//       setAudioFiles(newFiles);
      
//       if (user?.isLocal) {
//         saveAudioFilesToLocal(newFiles);
//       }
      
//       setSelectedFiles(prev => prev.filter(selectedFile => !isSameFile(selectedFile, fileToDelete)));
      
//       if (currentlyPlayingIndex !== null && currentlyPlayingIndex > index) {
//         setCurrentlyPlayingIndex(prev => prev - 1);
//       }
      
//       showToast('Audio file deleted successfully!', '#f59e0b');
//     } catch (error) {
//       console.error('Error deleting file:', error);
//       showToast(`Error deleting file: ${error.message}`, '#ef4444');
//     }
//   };
  
//   // Styles
//   const styles = {
//     container: {
//       minHeight: '100vh',
//       backgroundColor: '#f9fafb',
//       fontFamily: 'system-ui, -apple-system, sans-serif'
//     },
//     header: {
//       backgroundColor: '#1d4ed8',
//       color: 'white',
//       boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
//     },
//     headerContent: {
//       maxWidth: '1024px',
//       margin: '0 auto',
//       padding: '16px'
//     },
//     headerTop: {
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'space-between'
//     },
//     title: {
//       fontSize: '20px',
//       fontWeight: 'bold',
//       margin: 0
//     },
//     headerRight: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '16px'
//     },
//     detectionStatus: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '8px',
//       fontSize: '14px',
//       fontWeight: '500'
//     },
//     selectionCounter: {
//       fontSize: '14px',
//       fontWeight: '600'
//     },
//     tabs: {
//       display: 'flex',
//       marginTop: '16px',
//       borderBottom: '1px solid #3b82f6'
//     },
//     tab: {
//       padding: '8px 24px',
//       fontWeight: '500',
//       backgroundColor: 'transparent',
//       border: 'none',
//       cursor: 'pointer',
//       transition: 'color 0.2s'
//     },
//     tabActive: {
//       borderBottom: '2px solid white',
//       color: 'white'
//     },
//     tabInactive: {
//       color: '#bfdbfe'
//     },
//     main: {
//       maxWidth: '1024px',
//       margin: '0 auto'
//     },
//     detectionInfo: {
//       margin: '16px',
//       padding: '16px',
//       backgroundColor: isDetectionConnected ? '#f0f9ff' : '#fef3c7',
//       border: `1px solid ${isDetectionConnected ? '#0ea5e9' : '#f59e0b'}`,
//       borderRadius: '8px'
//     },
//     detectionHeader: {
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'space-between',
//       marginBottom: '12px'
//     },
//     detectionTitle: {
//       fontWeight: 'bold',
//       color: isDetectionConnected ? '#0369a1' : '#92400e'
//     },
//     autoPlayToggle: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '8px',
//       color: '#6b7280',
//       fontSize: '14px'
//     },
//     toggleSwitch: {
//       width: '40px',
//       height: '20px',
//       borderRadius: '10px',
//       backgroundColor: autoPlayEnabled ? '#10b981' : '#d1d5db',
//       border: 'none',
//       cursor: 'pointer',
//       position: 'relative',
//       transition: 'background-color 0.2s'
//     },
//     toggleKnob: {
//       width: '16px',
//       height: '16px',
//       borderRadius: '50%',
//       backgroundColor: 'white',
//       position: 'absolute',
//       top: '2px',
//       left: autoPlayEnabled ? '22px' : '2px',
//       transition: 'left 0.2s'
//     },
//     detectionData: {
//       fontSize: '14px',
//       color: isDetectionConnected ? '#1e40af' : '#92400e',
//       lineHeight: '1.5'
//     },
//     uploadSection: {
//       padding: '16px'
//     },
//     uploadButton: {
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       gap: '8px',
//       backgroundColor: '#2563eb',
//       color: 'white',
//       padding: '12px 24px',
//       border: 'none',
//       borderRadius: '8px',
//       fontSize: '16px',
//       fontWeight: '500',
//       cursor: 'pointer',
//       transition: 'background-color 0.2s',
//       width: '100%'
//     },
//     uploadProgress: {
//       margin: '16px',
//       padding: '16px',
//       backgroundColor: '#eff6ff',
//       border: '1px solid #bfdbfe',
//       borderRadius: '8px'
//     },
//     uploadProgressItem: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '12px',
//       marginBottom: '8px'
//     },
//     loadingSpinner: {
//       animation: 'spin 1s linear infinite'
//     },
//     nowPlaying: {
//       margin: '0 16px 16px 16px',
//       backgroundColor: '#eff6ff',
//       border: '1px solid #bfdbfe',
//       borderRadius: '12px',
//       padding: '24px'
//     },
//     nowPlayingTitle: {
//       textAlign: 'center',
//       marginBottom: '16px'
//     },
//     nowPlayingTitleText: {
//       fontSize: '18px',
//       fontWeight: 'bold',
//       color: '#1d4ed8',
//       marginBottom: '8px'
//     },
//     nowPlayingFile: {
//       color: '#374151',
//       fontWeight: '500'
//     },
//     progressContainer: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '12px',
//       marginBottom: '16px'
//     },
//     timeDisplay: {
//       fontSize: '14px',
//       color: '#6b7280',
//       minWidth: '45px'
//     },
//     progressBar: {
//       flex: 1,
//       height: '8px',
//       backgroundColor: '#e5e7eb',
//       borderRadius: '4px',
//       cursor: 'pointer',
//       position: 'relative',
//       overflow: 'hidden'
//     },
//     progressFill: {
//       height: '100%',
//       backgroundColor: '#2563eb',
//       borderRadius: '4px',
//       transition: 'width 0.1s ease'
//     },
//     controls: {
//       display: 'flex',
//       justifyContent: 'center',
//       gap: '16px'
//     },
//     controlButton: {
//       padding: '12px',
//       borderRadius: '50%',
//       border: 'none',
//       cursor: 'pointer',
//       transition: 'background-color 0.2s',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center'
//     },
//     stopButton: {
//       backgroundColor: '#e5e7eb'
//     },
//     playButton: {
//       backgroundColor: '#2563eb',
//       color: 'white'
//     },
//     stopIcon: {
//       width: '24px',
//       height: '24px',
//       backgroundColor: '#374151',
//       borderRadius: '2px'
//     },
//     tabContent: {
//       backgroundColor: 'white',
//       borderRadius: '12px 12px 0 0',
//       boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
//       minHeight: '400px'
//     },
//     emptyState: {
//       display: 'flex',
//       flexDirection: 'column',
//       alignItems: 'center',
//       justifyContent: 'center',
//       height: '256px',
//       color: '#6b7280'
//     },
//     emptyStateIcon: {
//       marginBottom: '16px',
//       color: '#9ca3af'
//     },
//     emptyStateTitle: {
//       fontSize: '18px',
//       fontWeight: '500',
//       marginBottom: '8px'
//     },
//     emptyStateSubtitle: {
//       fontSize: '14px'
//     },
//     fileList: {
//       padding: '16px',
//       display: 'flex',
//       flexDirection: 'column',
//       gap: '8px'
//     },
//     fileItem: {
//       backgroundColor: 'white',
//       borderRadius: '8px',
//       boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
//       padding: '16px',
//       border: '1px solid #e5e7eb',
//       transition: 'box-shadow 0.2s'
//     },
//     fileContent: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '16px'
//     },
//     playButton2: {
//       width: '48px',
//       height: '48px',
//       borderRadius: '50%',
//       border: 'none',
//       cursor: 'pointer',
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       color: 'white',
//       transition: 'opacity 0.2s'
//     },
//     fileInfo: {
//       flex: 1,
//       minWidth: 0
//     },
//     fileName: {
//       fontWeight: '500',
//       margin: 0,
//       overflow: 'hidden',
//       textOverflow: 'ellipsis',
//       whiteSpace: 'nowrap'
//     },
//     fileSubtitle: {
//       fontSize: '12px',
//       color: '#6b7280',
//       margin: '4px 0 0 0'
//     },
//     fileActions: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '8px'
//     },
//     actionButton: {
//       padding: '8px',
//       borderRadius: '50%',
//       border: 'none',
//       cursor: 'pointer',
//       transition: 'background-color 0.2s',
//       backgroundColor: 'transparent'
//     },
//     selectionHeader: {
//       padding: '16px 16px 0 16px',
//       display: 'flex',
//       justifyContent: 'space-between',
//       alignItems: 'center'
//     },
//     selectionHeaderText: {
//       fontSize: '14px',
//       color: '#6b7280'
//     },
//     clearButton: {
//       display: 'flex',
//       alignItems: 'center',
//       gap: '4px',
//       color: '#2563eb',
//       backgroundColor: 'transparent',
//       border: 'none',
//       padding: '4px 12px',
//       borderRadius: '4px',
//       cursor: 'pointer',
//       transition: 'background-color 0.2s'
//     },
//     loadingContainer: {
//       display: 'flex',
//       flexDirection: 'column',
//       alignItems: 'center',
//       justifyContent: 'center',
//       height: '256px',
//       gap: '16px'
//     }
//   };
  
//   // Add spinner animation
//   useEffect(() => {
//     const style = document.createElement('style');
//     style.textContent = `
//       @keyframes spin {
//         0% { transform: rotate(0deg); }
//         100% { transform: rotate(360deg); }
//       }
//     `;
//     document.head.appendChild(style);
//     return () => document.head.removeChild(style);
//   }, []);
  
//   // Render functions
//   const renderLibraryList = () => {
//     if (isLoading) {
//       return (
//         <div style={styles.loadingContainer}>
//           <Loader size={48} style={styles.loadingSpinner} />
//           <p>Loading your audio library...</p>
//         </div>
//       );
//     }
    
//     if (audioFiles.length === 0) {
//       return (
//         <div style={styles.emptyState}>
//           <Music size={64} style={styles.emptyStateIcon} />
//           <h3 style={styles.emptyStateTitle}>No audio files found</h3>
//           <p style={styles.emptyStateSubtitle}>Upload some audio files to get started</p>
//         </div>
//       );
//     }
    
//     return (
//       <div style={styles.fileList}>
//         {audioFiles.map((file, index) => {
//           const isCurrentlyPlaying = currentlyPlayingIndex === index;
//           const isSelected = isInSelection(file);
//           const canAddMore = selectedFiles.length < SELECTION_LIMIT || isSelected;
          
//           return (
//             <div
//               key={file.id}
//               style={{
//                 ...styles.fileItem,
//                 boxShadow: isCurrentlyPlaying ? '0 4px 12px rgba(37, 99, 235, 0.2)' : styles.fileItem.boxShadow
//               }}
//               onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'}
//               onMouseLeave={(e) => e.currentTarget.style.boxShadow = isCurrentlyPlaying ? '0 4px 12px rgba(37, 99, 235, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)'}
//             >
//               <div style={styles.fileContent}>
//                 <button
//                   onClick={() => playAudio(index)}
//                   style={{
//                     ...styles.playButton2,
//                     backgroundColor: isCurrentlyPlaying ? '#2563eb' : '#9ca3af'
//                   }}
//                   onMouseEnter={(e) => e.target.style.opacity = '0.8'}
//                   onMouseLeave={(e) => e.target.style.opacity = '1'}
//                 >
//                   {isCurrentlyPlaying && isPlaying ? (
//                     <Pause size={20} />
//                   ) : (
//                     <Play size={20} />
//                   )}
//                 </button>
                
//                 <div style={styles.fileInfo}>
//                   <h4 style={{
//                     ...styles.fileName,
//                     color: isCurrentlyPlaying ? '#1d4ed8' : '#111827',
//                     fontWeight: isCurrentlyPlaying ? 'bold' : '500'
//                   }}>
//                     {file.name}
//                   </h4>
//                   <p style={styles.fileSubtitle}>
//                     {file.isFirebaseFile 
//                       ? 'Stored in Firebase Cloud' 
//                       : 'Stored locally (session only)'
//                     }
//                   </p>
//                 </div>
                
//                 <div style={styles.fileActions}>
//                   <button
//                     onClick={() => toggleSelection(file)}
//                     disabled={!canAddMore}
//                     style={{
//                       ...styles.actionButton,
//                       color: isSelected ? '#059669' : canAddMore ? '#6b7280' : '#d1d5db',
//                       cursor: canAddMore ? 'pointer' : 'not-allowed'
//                     }}
//                     title={
//                       isSelected
//                         ? 'Remove from selection'
//                         : canAddMore
//                         ? 'Add to selection'
//                         : `Limit reached (${SELECTION_LIMIT})`
//                     }
//                     onMouseEnter={(e) => {
//                       if (canAddMore) e.target.style.backgroundColor = isSelected ? '#ecfdf5' : '#f3f4f6';
//                     }}
//                     onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
//                   >
//                     {isSelected ? (
//                       <CheckCircle size={20} />
//                     ) : (
//                       <PlusCircle size={20} />
//                     )}
//                   </button>
                  
//                   <button
//                     onClick={() => deleteAudioFile(index)}
//                     style={{
//                       ...styles.actionButton,
//                       color: '#ef4444'
//                     }}
//                     title="Delete file"
//                     onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
//                     onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
//                   >
//                     <Trash2 size={20} />
//                   </button>
//                 </div>
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     );
//   };
  
//   const renderSelectionList = () => {
//     return (
//       <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
//         {selectedFiles.length > 0 && (
//           <div style={styles.selectionHeader}>
//             <p style={styles.selectionHeaderText}>Button sequence (1-{selectedFiles.length})</p>
//             <button
//               onClick={clearSelection}
//               style={styles.clearButton}
//               onMouseEnter={(e) => e.target.style.backgroundColor = '#eff6ff'}
//               onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
//             >
//               <X size={16} />
//               <span>Clear</span>
//             </button>
//           </div>
//         )}
        
//         <div style={{ flex: 1, overflow: 'auto' }}>
//           {selectedFiles.length === 0 ? (
//             <div style={styles.emptyState}>
//               <Music size={64} style={styles.emptyStateIcon} />
//               <h3 style={styles.emptyStateTitle}>No files in Selection</h3>
//               <p style={styles.emptyStateSubtitle}>Add files from the Library tab</p>
//             </div>
//           ) : (
//             <div style={styles.fileList}>
//               {selectedFiles.map((file, index) => {
//                 const libIndex = audioFiles.findIndex(f => isSameFile(f, file));
//                 const playingHere = libIndex !== -1 && libIndex === currentlyPlayingIndex;
//                 const buttonNumber = index + 1;
//                 const isCurrentButton = buttonData?.button === buttonNumber;
                
//                 return (
//                   <div
//                     key={`selection-${file.id}`}
//                     style={{
//                       ...styles.fileItem,
//                       boxShadow: playingHere ? '0 4px 12px rgba(37, 99, 235, 0.2)' : styles.fileItem.boxShadow,
//                       border: isCurrentButton ? '2px solid #10b981' : '1px solid #e5e7eb',
//                       backgroundColor: isCurrentButton ? '#f0fdf4' : 'white'
//                     }}
//                     onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'}
//                     onMouseLeave={(e) => e.currentTarget.style.boxShadow = playingHere ? '0 4px 12px rgba(37, 99, 235, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)'}
//                   >
//                     <div style={styles.fileContent}>
//                       <button
//                         onClick={() => playAudioByData(file)}
//                         style={{
//                           ...styles.playButton2,
//                           backgroundColor: playingHere ? '#2563eb' : '#9ca3af'
//                         }}
//                         onMouseEnter={(e) => e.target.style.opacity = '0.8'}
//                         onMouseLeave={(e) => e.target.style.opacity = '1'}
//                       >
//                         {playingHere && isPlaying ? (
//                           <Pause size={20} />
//                         ) : (
//                           <Play size={20} />
//                         )}
//                       </button>
                      
//                       <div style={styles.fileInfo}>
//                         <h4 style={{
//                           ...styles.fileName,
//                           color: playingHere ? '#1d4ed8' : '#111827',
//                           fontWeight: playingHere ? 'bold' : '500'
//                         }}>
//                           {file.name}
//                         </h4>
//                         <p style={styles.fileSubtitle}>
//                           Button {buttonNumber}
//                           {isCurrentButton && ' • CURRENT'}
//                         </p>
//                       </div>
                      
//                       <button
//                         onClick={() => toggleSelection(file)}
//                         style={{
//                           ...styles.actionButton,
//                           color: '#ef4444'
//                         }}
//                         title="Remove from selection"
//                         onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
//                         onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
//                       >
//                         <XCircle size={20} />
//                       </button>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       </div>
//     );
//   };
  
//   return (
//     <div style={styles.container}>
//       <audio ref={audioRef} />
      
//       <header style={styles.header}>
//         <div style={styles.headerContent}>
//           <div style={styles.headerTop}>
//             <h1 style={styles.title}>Audio Player - Button Control</h1>
//             <div style={styles.headerRight}>
//               <div style={styles.detectionStatus}>
//                 {isDetectionConnected ? (
//                   <Wifi size={16} />
//                 ) : (
//                   <WifiOff size={16} />
//                 )}
//                 <span>{isDetectionConnected ? 'Connected' : 'Disconnected'}</span>
//               </div>
//               <div style={styles.selectionCounter}>
//                 Selected: {selectedFiles.length}/{SELECTION_LIMIT}
//               </div>
//             </div>
//           </div>
          
//           <div style={styles.tabs}>
//             <button
//               onClick={() => setActiveTab('library')}
//               style={{
//                 ...styles.tab,
//                 ...(activeTab === 'library' ? styles.tabActive : styles.tabInactive)
//               }}
//             >
//               Library
//             </button>
//             <button
//               onClick={() => setActiveTab('selection')}
//               style={{
//                 ...styles.tab,
//                 ...(activeTab === 'selection' ? styles.tabActive : styles.tabInactive)
//               }}
//             >
//               Selection
//             </button>
//           </div>
//         </div>
//       </header>
      
//       <main style={styles.main}>
//         {isFirebaseConfigured() && (
//           <div style={styles.detectionInfo}>
//             <div style={styles.detectionHeader}>
//               <h3 style={styles.detectionTitle}>
//                 Button System
//                 {isDetectionConnected ? ' 🟢' : ' 🔴'}
//               </h3>
//               <div style={styles.autoPlayToggle}>
//                 <span>Auto-play:</span>
//                 <button
//                   style={styles.toggleSwitch}
//                   onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
//                 >
//                   <div style={styles.toggleKnob}></div>
//                 </button>
//               </div>
//             </div>
//             <div style={styles.detectionData}>
//               {buttonData ? (
//                 <>
//                   <strong>Current Button:</strong> {buttonData.button} | 
//                   <strong> Status:</strong> {autoPlayEnabled ? 'Auto-play enabled' : 'Manual play only'} | 
//                   <strong> Files:</strong> {selectedFiles.length}/{SELECTION_LIMIT}
//                 </>
//               ) : (
//                 isDetectionConnected ? 'Waiting for button press...' : 'Connection failed. Check Firebase rules.'
//               )}
//             </div>
//           </div>
//         )}

//         <div style={styles.uploadSection}>
//           <input
//             type="file"
//             ref={fileInputRef}
//             onChange={handleFileUpload}
//             accept="audio/*"
//             multiple
//             style={{ display: 'none' }}
//           />
//           <button
//             onClick={() => fileInputRef.current?.click()}
//             style={styles.uploadButton}
//             disabled={!user}
//             onMouseEnter={(e) => {
//               if (user) e.target.style.backgroundColor = '#1d4ed8';
//             }}
//             onMouseLeave={(e) => {
//               if (user) e.target.style.backgroundColor = '#2563eb';
//             }}
//           >
//             <Upload size={20} />
//             <span>
//               {!user 
//                 ? 'Initializing...' 
//                 : user.isLocal || !isFirebaseConfigured()
//                   ? 'Upload Audio Files (Local)'
//                   : 'Upload Audio Files (Firebase)'
//               }
//             </span>
//           </button>
//         </div>
        
//         {Object.keys(uploadProgress).length > 0 && (
//           <div style={styles.uploadProgress}>
//             <h3>Uploading files...</h3>
//             {Object.entries(uploadProgress).map(([fileId, data]) => (
//               <div key={fileId} style={styles.uploadProgressItem}>
//                 <Loader size={16} style={styles.loadingSpinner} />
//                 <span>Uploading {data.name}...</span>
//               </div>
//             ))}
//           </div>
//         )}
        
//         {currentFileName && (
//           <div style={styles.nowPlaying}>
//             <div style={styles.nowPlayingTitle}>
//               <h2 style={styles.nowPlayingTitleText}>Now Playing</h2>
//               <p style={styles.nowPlayingFile}>{currentFileName}</p>
//             </div>
            
//             <div style={styles.progressContainer}>
//               <span style={styles.timeDisplay}>
//                 {formatDuration(position)}
//               </span>
//               <div
//                 style={styles.progressBar}
//                 onClick={handleSeek}
//               >
//                 <div
//                   style={{
//                     ...styles.progressFill,
//                     width: duration > 0 ? `${(position / duration) * 100}%` : '0%'
//                   }}
//                 />
//               </div>
//               <span style={styles.timeDisplay}>
//                 {formatDuration(duration)}
//               </span>
//             </div>
            
//             <div style={styles.controls}>
//               <button
//                 onClick={stopAudio}
//                 style={{...styles.controlButton, ...styles.stopButton}}
//               >
//                 <div style={styles.stopIcon} />
//               </button>
//               {currentlyPlayingIndex !== null && (
//                 <button
//                   onClick={() => playAudio(currentlyPlayingIndex)}
//                   style={{...styles.controlButton, ...styles.playButton}}
//                 >
//                   {isPlaying ? <Pause size={24} /> : <Play size={24} />}
//                 </button>
//               )}
//             </div>
//           </div>
//         )}
        
//         <div style={styles.tabContent}>
//           {activeTab === 'library' ? renderLibraryList() : renderSelectionList()}
//         </div>
//       </main>
//     </div>
//   );
// };

// export default AudioPlayerApp;
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, CheckCircle, PlusCircle, XCircle, Trash2, Music, X, Loader, Wifi, WifiOff } from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref as dbRef, onValue, off } from 'firebase/database';

// Firebase configuration
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

const AudioPlayerApp = () => {
  const SELECTION_LIMIT = 7;
  
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
  
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const detectionListenerRef = useRef(null);
  
  // USE REFS TO AVOID STALE CLOSURE
  const selectedFilesRef = useRef(selectedFiles);
  const autoPlayEnabledRef = useRef(autoPlayEnabled);
  const lastDetectionRef = useRef(lastDetection);
  const audioFilesRef = useRef(audioFiles);
  
  // Keep refs in sync with state
  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
    console.log('selectedFilesRef updated:', selectedFiles.length);
  }, [selectedFiles]);
  
  useEffect(() => {
    autoPlayEnabledRef.current = autoPlayEnabled;
    console.log('autoPlayEnabledRef updated:', autoPlayEnabled);
  }, [autoPlayEnabled]);
  
  useEffect(() => {
    lastDetectionRef.current = lastDetection;
  }, [lastDetection]);
  
  useEffect(() => {
    audioFilesRef.current = audioFiles;
  }, [audioFiles]);
  
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
          let message = 'Authentication failed. ';
          
          if (error.code === 'auth/admin-restricted-operation') {
            message += 'Enable Anonymous Authentication in Firebase Console.';
          } else {
            message += 'Using local session.';
          }
          
          showToast(message, '#f59e0b');
          
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

  // Setup Firebase listener for button detection
  const setupDetectionListener = () => {
    if (!database) {
      console.warn('Firebase Realtime Database not available');
      return;
    }

    try {
      const buttonRef = dbRef(database, 'Blind/Buttons');
      detectionListenerRef.current = buttonRef;
      
      console.log('Setting up listener for Blind/Buttons');
      
      onValue(buttonRef, (snapshot) => {
        const buttonValue = snapshot.val();
        console.log('=== FIREBASE DATA RECEIVED ===');
        console.log('Raw value:', buttonValue);
        
        if (buttonValue !== null && buttonValue !== undefined) {
          let buttonNumber;
          
          if (typeof buttonValue === 'string') {
            const cleaned = buttonValue.replace(/['"]/g, '').trim();
            buttonNumber = parseInt(cleaned, 10);
          } else if (typeof buttonValue === 'number') {
            buttonNumber = buttonValue;
          } else {
            console.warn('Unexpected button value type:', typeof buttonValue);
            return;
          }
          
          if (isNaN(buttonNumber)) {
            console.error('Button number is NaN');
            return;
          }
          
          console.log('Button number:', buttonNumber);
          
          setButtonData({ button: buttonNumber });
          setIsDetectionConnected(true);
          
          // Get current values from refs
          const currentSelectedFiles = selectedFilesRef.current;
          const currentAutoPlay = autoPlayEnabledRef.current;
          const currentLastDetection = lastDetectionRef.current;
          
          console.log('=== AUTO-PLAY CHECK ===');
          console.log('Auto-play enabled:', currentAutoPlay);
          console.log('Last detection:', currentLastDetection);
          console.log('Current button:', buttonNumber);
          console.log('Selected files count:', currentSelectedFiles.length);
          console.log('Selected files:', currentSelectedFiles.map(f => f?.name));
          
          const isValidRange = buttonNumber >= 1 && buttonNumber <= SELECTION_LIMIT;
          const hasChanged = buttonNumber !== currentLastDetection;
          const hasFiles = currentSelectedFiles.length > 0;
          
          const shouldAutoPlay = currentAutoPlay && hasChanged && isValidRange && hasFiles;
          
          console.log('Should auto-play:', shouldAutoPlay);
          console.log('Conditions:', { currentAutoPlay, hasChanged, isValidRange, hasFiles });
          
          if (shouldAutoPlay) {
            const fileIndex = buttonNumber - 1; // Convert to 0-based index
            console.log('File index (0-based):', fileIndex);
            console.log('Total selected files:', currentSelectedFiles.length);
            
            if (fileIndex < currentSelectedFiles.length) {
              const fileToPlay = currentSelectedFiles[fileIndex];
              
              console.log('=== PLAYING FILE ===');
              console.log('Button:', buttonNumber);
              console.log('File index:', fileIndex);
              console.log('File name:', fileToPlay?.name);
              console.log('File URL:', fileToPlay?.url);
              
              if (fileToPlay && fileToPlay.url) {
                // Play directly using the selected file
                playSelectedFile(fileIndex, fileToPlay);
                showToast(
                  `Button ${buttonNumber}: ${fileToPlay.name}`,
                  '#10b981'
                );
              } else {
                console.error('File is missing or has no URL:', fileToPlay);
                showToast('File data is invalid', '#ef4444');
              }
            } else {
              console.warn(`Button ${buttonNumber} pressed but only ${currentSelectedFiles.length} files in selection`);
              showToast(
                `Button ${buttonNumber}: No file assigned`,
                '#f59e0b'
              );
            }
          } else {
            console.log('Auto-play NOT triggered because:');
            if (!currentAutoPlay) console.log('- Auto-play is disabled');
            if (!hasChanged) console.log('- Same button as last detection');
            if (!isValidRange) console.log('- Button out of range (1-7)');
            if (!hasFiles) console.log('- No files in selection');
          }
          
          setLastDetection(buttonNumber);
        } else {
          setIsDetectionConnected(false);
          console.log('No button data received');
        }
      }, (error) => {
        console.error('Firebase listener error:', error);
        setIsDetectionConnected(false);
        showToast('Button system error: ' + error.message, '#ef4444');
      });
      
      showToast('Connected to button system', '#10b981');
      
    } catch (error) {
      console.error('Setup error:', error);
      showToast('Setup error: ' + error.message, '#ef4444');
    }
  };

  // NEW: Play file directly from selected files array
  const playSelectedFile = async (selectionIndex, file) => {
    const audio = audioRef.current;
    if (!audio) {
      console.error('Audio element not found');
      return;
    }
    
    if (!file || !file.url) {
      console.error('Invalid file or missing URL:', file);
      showToast('Cannot play: Invalid file', '#ef4444');
      return;
    }
    
    try {
      console.log('Playing audio from URL:', file.url);
      
      // Find the file in the main audioFiles array to get the correct index for state
      const currentFiles = audioFilesRef.current;
      const audioFileIndex = currentFiles.findIndex(audioFile => 
        audioFile && isSameFile(audioFile, file)
      );
      
      console.log('Audio file index in main library:', audioFileIndex);
      
      // Stop current audio if playing
      if (!audio.paused) {
        audio.pause();
      }
      
      // Set new audio source
      audio.src = file.url;
      audio.currentTime = 0;
      
      // Play the audio
      await audio.play();
      
      // Update state
      if (audioFileIndex !== -1) {
        setCurrentlyPlayingIndex(audioFileIndex);
      }
      setCurrentFileName(file.name);
      setCurrentSequentialIndex(selectionIndex);
      
      console.log('Audio started successfully');
    } catch (error) {
      console.error('Error playing audio:', error);
      showToast(`Playback error: ${error.message}`, '#ef4444');
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
        prev.filter(sel => 
          files.some(file => isSameFile(file, sel))
        )
      );
      
    } catch (error) {
      console.error('Error loading files from Firebase:', error);
      
      if (error.code === 'storage/unauthorized') {
        showToast('Storage access denied. Check Firebase Storage rules.', '#ef4444');
      } else if (error.code === 'storage/object-not-found') {
        setAudioFiles([]);
      } else {
        showToast('Firebase storage error. Switching to local mode.', '#f59e0b');
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
      console.error('Error loading local files:', error);
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
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };
    
    const handleTimeUpdate = () => {
      setPosition(audio.currentTime || 0);
    };
    
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
            showToast(
              `Auto-playing next: ${nextFile.name} (${nextIndex + 1}/${selectedFiles.length})`,
              '#10b981'
            );
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
      
      const message = audioOnlyFiles.length === 1 
        ? 'Audio file stored locally!' 
        : `${audioOnlyFiles.length} audio files stored locally!`;
      showToast(message, '#10b981');
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
        
        showToast(`${file.name} uploaded to Firebase!`, '#10b981');
        
      } catch (error) {
        console.error('Error uploading file:', error);
        
        let errorMessage = `Error uploading ${file.name}`;
        if (error.code === 'storage/unauthorized') {
          errorMessage += ': Storage access denied. Check Firebase rules.';
        } else if (error.code === 'storage/quota-exceeded') {
          errorMessage += ': Storage quota exceeded.';
        } else {
          errorMessage += `: ${error.message}`;
        }
        
        showToast(errorMessage, '#ef4444');
        
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }
    }
  };
  
  const playAudio = async (index) => {
    const audio = audioRef.current;
    if (!audio) {
      console.error('Audio ref is null');
      return;
    }
    
    const currentFiles = audioFilesRef.current;
    
    if (index < 0 || index >= currentFiles.length) {
      console.error('Invalid index:', index);
      return;
    }
    
    const audioFile = currentFiles[index];
    
    if (!audioFile || !audioFile.url) {
      console.error('Invalid audio file at index:', index);
      return;
    }
    
    try {
      if (currentlyPlayingIndex === index && !audio.paused) {
        audio.pause();
        return;
      }
      
      if (audio.src !== audioFile.url) {
        audio.src = audioFile.url;
      }
      
      await audio.play();
      setCurrentlyPlayingIndex(index);
      setCurrentFileName(audioFile.name);
    } catch (error) {
      console.error('Error playing audio:', error);
      showToast(`Error: ${error.message}`, '#ef4444');
    }
  };
  
  const playAudioByData = (file) => {
    console.log('playAudioByData called with:', file?.name);
    
    if (!file || !file.url) {
      console.error('Invalid file:', file);
      showToast('Invalid file', '#ef4444');
      return;
    }
    
    const currentFiles = audioFilesRef.current;
    const currentSelected = selectedFilesRef.current;
    
    // Find in selected files first
    const selectedIndex = currentSelected.findIndex(selectedFile => 
      selectedFile && isSameFile(selectedFile, file)
    );
    
    if (selectedIndex !== -1) {
      // Found in selection - use the optimized playSelectedFile function
      playSelectedFile(selectedIndex, file);
    } else {
      // Not in selection - find in main audio files list
      const index = currentFiles.findIndex(audioFile => 
        audioFile && isSameFile(audioFile, file)
      );
      
      if (index !== -1) {
        playAudio(index);
      } else {
        console.error('File not found:', file.name);
        showToast('File not found', '#ef4444');
      }
    }
  };

  const startSequentialPlay = () => {
    if (selectedFiles.length === 0) {
      showToast('Add files to selection first', '#f59e0b');
      return;
    }
    
    setSequentialPlayEnabled(true);
    setCurrentSequentialIndex(0);
    
    const firstFile = selectedFiles[0];
    playAudioByData(firstFile);
    showToast(
      `Started sequential playback: ${firstFile.name} (1/${selectedFiles.length})`,
      '#10b981'
    );
  };

  const stopSequentialPlay = () => {
    setSequentialPlayEnabled(false);
    setCurrentSequentialIndex(0);
    stopAudio();
    showToast('Sequential playback stopped', '#f59e0b');
  };
  
  const stopAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.pause();
    audio.currentTime = 0;
    setCurrentlyPlayingIndex(null);
    setCurrentFileName(null);
    setPosition(0);
    setIsPlaying(false);
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
      stopAudio();
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
      
      showToast('Audio file deleted successfully!', '#f59e0b');
    } catch (error) {
      console.error('Error deleting file:', error);
      showToast(`Error deleting file: ${error.message}`, '#ef4444');
    }
  };
  
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      backgroundColor: '#1d4ed8',
      color: 'white',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    headerContent: {
      maxWidth: '1024px',
      margin: '0 auto',
      padding: '16px'
    },
    headerTop: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      margin: 0
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    detectionStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '500'
    },
    selectionCounter: {
      fontSize: '14px',
      fontWeight: '600'
    },
    tabs: {
      display: 'flex',
      marginTop: '16px',
      borderBottom: '1px solid #3b82f6'
    },
    tab: {
      padding: '8px 24px',
      fontWeight: '500',
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      transition: 'color 0.2s'
    },
    tabActive: {
      borderBottom: '2px solid white',
      color: 'white'
    },
    tabInactive: {
      color: '#bfdbfe'
    },
    main: {
      maxWidth: '1024px',
      margin: '0 auto'
    },
    detectionInfo: {
      margin: '16px',
      padding: '16px',
      backgroundColor: isDetectionConnected ? '#f0f9ff' : '#fef3c7',
      border: `1px solid ${isDetectionConnected ? '#0ea5e9' : '#f59e0b'}`,
      borderRadius: '8px'
    },
    detectionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px'
    },
    detectionTitle: {
      fontWeight: 'bold',
      color: isDetectionConnected ? '#0369a1' : '#92400e'
    },
    autoPlayToggle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#6b7280',
      fontSize: '14px'
    },
    toggleSwitch: {
      width: '40px',
      height: '20px',
      borderRadius: '10px',
      backgroundColor: autoPlayEnabled ? '#10b981' : '#d1d5db',
      border: 'none',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background-color 0.2s'
    },
    toggleKnob: {
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      backgroundColor: 'white',
      position: 'absolute',
      top: '2px',
      left: autoPlayEnabled ? '22px' : '2px',
      transition: 'left 0.2s'
    },
    detectionData: {
      fontSize: '14px',
      color: isDetectionConnected ? '#1e40af' : '#92400e',
      lineHeight: '1.5'
    },
    uploadSection: {
      padding: '16px'
    },
    uploadButton: {
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
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      width: '100%'
    },
    uploadProgress: {
      margin: '16px',
      padding: '16px',
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '8px'
    },
    uploadProgressItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '8px'
    },
    loadingSpinner: {
      animation: 'spin 1s linear infinite'
    },
    nowPlaying: {
      margin: '0 16px 16px 16px',
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '12px',
      padding: '24px'
    },
    nowPlayingTitle: {
      textAlign: 'center',
      marginBottom: '16px'
    },
    nowPlayingTitleText: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1d4ed8',
      marginBottom: '8px'
    },
    nowPlayingFile: {
      color: '#374151',
      fontWeight: '500'
    },
    progressContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '16px'
    },
    timeDisplay: {
      fontSize: '14px',
      color: '#6b7280',
      minWidth: '45px'
    },
    progressBar: {
      flex: 1,
      height: '8px',
      backgroundColor: '#e5e7eb',
      borderRadius: '4px',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#2563eb',
      borderRadius: '4px',
      transition: 'width 0.1s ease'
    },
    controls: {
      display: 'flex',
      justifyContent: 'center',
      gap: '16px'
    },
    controlButton: {
      padding: '12px',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    stopButton: {
      backgroundColor: '#e5e7eb'
    },
    playButton: {
      backgroundColor: '#2563eb',
      color: 'white'
    },
    stopIcon: {
      width: '24px',
      height: '24px',
      backgroundColor: '#374151',
      borderRadius: '2px'
    },
    tabContent: {
      backgroundColor: 'white',
      borderRadius: '12px 12px 0 0',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      minHeight: '400px'
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '256px',
      color: '#6b7280'
    },
    emptyStateIcon: {
      marginBottom: '16px',
      color: '#9ca3af'
    },
    emptyStateTitle: {
      fontSize: '18px',
      fontWeight: '500',
      marginBottom: '8px'
    },
    emptyStateSubtitle: {
      fontSize: '14px'
    },
    fileList: {
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    fileItem: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      padding: '16px',
      border: '1px solid #e5e7eb',
      transition: 'box-shadow 0.2s'
    },
    fileContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    playButton2: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      transition: 'opacity 0.2s'
    },
    fileInfo: {
      flex: 1,
      minWidth: 0
    },
    fileName: {
      fontWeight: '500',
      margin: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    fileSubtitle: {
      fontSize: '12px',
      color: '#6b7280',
      margin: '4px 0 0 0'
    },
    fileActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    actionButton: {
      padding: '8px',
      borderRadius: '50%',
      border: 'none',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      backgroundColor: 'transparent'
    },
    selectionHeader: {
      padding: '16px 16px 0 16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    selectionHeaderText: {
      fontSize: '14px',
      color: '#6b7280'
    },
    clearButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      color: '#2563eb',
      backgroundColor: 'transparent',
      border: 'none',
      padding: '4px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '256px',
      gap: '16px'
    }
  };
  
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  
  const renderLibraryList = () => {
    if (isLoading) {
      return (
        <div style={styles.loadingContainer}>
          <Loader size={48} style={styles.loadingSpinner} />
          <p>Loading your audio library...</p>
        </div>
      );
    }
    
    if (audioFiles.length === 0) {
      return (
        <div style={styles.emptyState}>
          <Music size={64} style={styles.emptyStateIcon} />
          <h3 style={styles.emptyStateTitle}>No audio files found</h3>
          <p style={styles.emptyStateSubtitle}>Upload some audio files to get started</p>
        </div>
      );
    }
    
    return (
      <div style={styles.fileList}>
        {audioFiles.map((file, index) => {
          const isCurrentlyPlaying = currentlyPlayingIndex === index;
          const isSelected = isInSelection(file);
          const canAddMore = selectedFiles.length < SELECTION_LIMIT || isSelected;
          
          return (
            <div
              key={file.id}
              style={{
                ...styles.fileItem,
                boxShadow: isCurrentlyPlaying ? '0 4px 12px rgba(37, 99, 235, 0.2)' : styles.fileItem.boxShadow
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = isCurrentlyPlaying ? '0 4px 12px rgba(37, 99, 235, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)'}
            >
              <div style={styles.fileContent}>
                <button
                  onClick={() => playAudio(index)}
                  style={{
                    ...styles.playButton2,
                    backgroundColor: isCurrentlyPlaying ? '#2563eb' : '#9ca3af'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  {isCurrentlyPlaying && isPlaying ? (
                    <Pause size={20} />
                  ) : (
                    <Play size={20} />
                  )}
                </button>
                
                <div style={styles.fileInfo}>
                  <h4 style={{
                    ...styles.fileName,
                    color: isCurrentlyPlaying ? '#1d4ed8' : '#111827',
                    fontWeight: isCurrentlyPlaying ? 'bold' : '500'
                  }}>
                    {file.name}
                  </h4>
                  <p style={styles.fileSubtitle}>
                    {file.isFirebaseFile 
                      ? 'Stored in Firebase Cloud' 
                      : 'Stored locally (session only)'
                    }
                  </p>
                </div>
                
                <div style={styles.fileActions}>
                  <button
                    onClick={() => toggleSelection(file)}
                    disabled={!canAddMore}
                    style={{
                      ...styles.actionButton,
                      color: isSelected ? '#059669' : canAddMore ? '#6b7280' : '#d1d5db',
                      cursor: canAddMore ? 'pointer' : 'not-allowed'
                    }}
                    title={
                      isSelected
                        ? 'Remove from selection'
                        : canAddMore
                        ? 'Add to selection'
                        : `Limit reached (${SELECTION_LIMIT})`
                    }
                    onMouseEnter={(e) => {
                      if (canAddMore) e.target.style.backgroundColor = isSelected ? '#ecfdf5' : '#f3f4f6';
                    }}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {isSelected ? (
                      <CheckCircle size={20} />
                    ) : (
                      <PlusCircle size={20} />
                    )}
                  </button>
                  
                  <button
                    onClick={() => deleteAudioFile(index)}
                    style={{
                      ...styles.actionButton,
                      color: '#ef4444'
                    }}
                    title="Delete file"
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
  
  const renderSelectionList = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {selectedFiles.length > 0 && (
          <div style={styles.selectionHeader}>
            <p style={styles.selectionHeaderText}>Button sequence (1-{selectedFiles.length})</p>
            <button
              onClick={clearSelection}
              style={styles.clearButton}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#eff6ff'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <X size={16} />
              <span>Clear</span>
            </button>
          </div>
        )}
        
        <div style={{ flex: 1, overflow: 'auto' }}>
          {selectedFiles.length === 0 ? (
            <div style={styles.emptyState}>
              <Music size={64} style={styles.emptyStateIcon} />
              <h3 style={styles.emptyStateTitle}>No files in Selection</h3>
              <p style={styles.emptyStateSubtitle}>Add files from the Library tab</p>
            </div>
          ) : (
            <div style={styles.fileList}>
              {selectedFiles.map((file, index) => {
                const libIndex = audioFiles.findIndex(f => isSameFile(f, file));
                const playingHere = libIndex !== -1 && libIndex === currentlyPlayingIndex;
                const buttonNumber = index + 1;
                const isCurrentButton = buttonData?.button === buttonNumber;
                
                return (
                  <div
                    key={`selection-${file.id}`}
                    style={{
                      ...styles.fileItem,
                      boxShadow: playingHere ? '0 4px 12px rgba(37, 99, 235, 0.2)' : styles.fileItem.boxShadow,
                      border: isCurrentButton ? '2px solid #10b981' : '1px solid #e5e7eb',
                      backgroundColor: isCurrentButton ? '#f0fdf4' : 'white'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = playingHere ? '0 4px 12px rgba(37, 99, 235, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.1)'}
                  >
                    <div style={styles.fileContent}>
                      <button
                        onClick={() => playAudioByData(file)}
                        style={{
                          ...styles.playButton2,
                          backgroundColor: playingHere ? '#2563eb' : '#9ca3af'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                      >
                        {playingHere && isPlaying ? (
                          <Pause size={20} />
                        ) : (
                          <Play size={20} />
                        )}
                      </button>
                      
                      <div style={styles.fileInfo}>
                        <h4 style={{
                          ...styles.fileName,
                          color: playingHere ? '#1d4ed8' : '#111827',
                          fontWeight: playingHere ? 'bold' : '500'
                        }}>
                          {file.name}
                        </h4>
                        <p style={styles.fileSubtitle}>
                          Button {buttonNumber}
                          {isCurrentButton && ' • CURRENT'}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => toggleSelection(file)}
                        style={{
                          ...styles.actionButton,
                          color: '#ef4444'
                        }}
                        title="Remove from selection"
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#fef2f2'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
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
  
  return (
    <div style={styles.container}>
      <audio ref={audioRef} />
      
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerTop}>
            <h1 style={styles.title}>Audio Player - Button Control</h1>
            <div style={styles.headerRight}>
              <div style={styles.detectionStatus}>
                {isDetectionConnected ? (
                  <Wifi size={16} />
                ) : (
                  <WifiOff size={16} />
                )}
                <span>{isDetectionConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div style={styles.selectionCounter}>
                Selected: {selectedFiles.length}/{SELECTION_LIMIT}
              </div>
            </div>
          </div>
          
          <div style={styles.tabs}>
            <button
              onClick={() => setActiveTab('library')}
              style={{
                ...styles.tab,
                ...(activeTab === 'library' ? styles.tabActive : styles.tabInactive)
              }}
            >
              Library
            </button>
            <button
              onClick={() => setActiveTab('selection')}
              style={{
                ...styles.tab,
                ...(activeTab === 'selection' ? styles.tabActive : styles.tabInactive)
              }}
            >
              Selection
            </button>
          </div>
        </div>
      </header>
      
      <main style={styles.main}>
        {isFirebaseConfigured() && (
          <div style={styles.detectionInfo}>
            <div style={styles.detectionHeader}>
              <h3 style={styles.detectionTitle}>
                Button System
                {isDetectionConnected ? ' 🟢' : ' 🔴'}
              </h3>
              <div style={styles.autoPlayToggle}>
                <span>Auto-play:</span>
                <button
                  style={styles.toggleSwitch}
                  onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
                >
                  <div style={styles.toggleKnob}></div>
                </button>
              </div>
            </div>
            <div style={styles.detectionData}>
              {buttonData ? (
                <>
                  <strong>Current Button:</strong> {buttonData.button} | 
                  <strong> Status:</strong> {autoPlayEnabled ? 'Auto-play enabled' : 'Manual play only'} | 
                  <strong> Files:</strong> {selectedFiles.length}/{SELECTION_LIMIT}
                </>
              ) : (
                isDetectionConnected ? 'Waiting for button press...' : 'Connection failed. Check Firebase rules.'
              )}
            </div>
          </div>
        )}

        <div style={styles.uploadSection}>
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
            style={styles.uploadButton}
            disabled={!user}
            onMouseEnter={(e) => {
              if (user) e.target.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              if (user) e.target.style.backgroundColor = '#2563eb';
            }}
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
        
        {Object.keys(uploadProgress).length > 0 && (
          <div style={styles.uploadProgress}>
            <h3>Uploading files...</h3>
            {Object.entries(uploadProgress).map(([fileId, data]) => (
              <div key={fileId} style={styles.uploadProgressItem}>
                <Loader size={16} style={styles.loadingSpinner} />
                <span>Uploading {data.name}...</span>
              </div>
            ))}
          </div>
        )}
        
        {currentFileName && (
          <div style={styles.nowPlaying}>
            <div style={styles.nowPlayingTitle}>
              <h2 style={styles.nowPlayingTitleText}>Now Playing</h2>
              <p style={styles.nowPlayingFile}>{currentFileName}</p>
            </div>
            
            <div style={styles.progressContainer}>
              <span style={styles.timeDisplay}>
                {formatDuration(position)}
              </span>
              <div
                style={styles.progressBar}
                onClick={handleSeek}
              >
                <div
                  style={{
                    ...styles.progressFill,
                    width: duration > 0 ? `${(position / duration) * 100}%` : '0%'
                  }}
                />
              </div>
              <span style={styles.timeDisplay}>
                {formatDuration(duration)}
              </span>
            </div>
            
            <div style={styles.controls}>
              <button
                onClick={stopAudio}
                style={{...styles.controlButton, ...styles.stopButton}}
              >
                <div style={styles.stopIcon} />
              </button>
              {currentlyPlayingIndex !== null && (
                <button
                  onClick={() => playAudio(currentlyPlayingIndex)}
                  style={{...styles.controlButton, ...styles.playButton}}
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
              )}
            </div>
          </div>
        )}
        
        <div style={styles.tabContent}>
          {activeTab === 'library' ? renderLibraryList() : renderSelectionList()}
        </div>
      </main>
    </div>
  );
};

export default AudioPlayerApp;
