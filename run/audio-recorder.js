(function() {
  // Get speech recognition support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  // DOM elements
  let recordButton, stopButton, saveButton, deleteButton, audioPlayer, transcriptContainer, transcriptContent;
  // Variables for recording state
  let isRecording = false;
  let audioURL = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let recognition = null;
  // Speech-to-text related variables
  let transcriptRecognition = null;
  let transcriptText = '';
  
  // Initialize the app when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
      // Create UI elements
      createUI();
      // Set up speech recognition if supported
      setupSpeechRecognition();
      // Add event listeners to buttons
      addEventListeners();
  });
  
  // Create the UI elements
  function createUI() {
      const container = document.createElement('div');
      container.className = 'audio-recorder';
      
      // Create header
      const header = document.createElement('h2');
      header.textContent = 'Audio Recorder';
      container.appendChild(header);
      
      // Create buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'buttons-container';
      
      // Create record button
      recordButton = document.createElement('button');
      recordButton.textContent = 'Record';
      buttonsContainer.appendChild(recordButton);
      
      // Create stop button
      stopButton = document.createElement('button');
      stopButton.textContent = 'Stop';
      stopButton.disabled = true;
      buttonsContainer.appendChild(stopButton);
      
      // Create save button
      saveButton = document.createElement('button');
      saveButton.textContent = 'Save';
      saveButton.disabled = true;
      buttonsContainer.appendChild(saveButton);
      
      // Create delete button
      deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.disabled = true;
      buttonsContainer.appendChild(deleteButton);
      
      container.appendChild(buttonsContainer);
      
      // Create transcript container - Show it by default
      transcriptContainer = document.createElement('div');
      transcriptContainer.className = 'transcript-container';
      
      const transcriptHeader = document.createElement('h3');
      transcriptHeader.textContent = 'Transcript';
      transcriptContainer.appendChild(transcriptHeader);
      
      transcriptContent = document.createElement('div');
      transcriptContent.id = 'transcript-content';
      transcriptContent.className = 'transcript-content';
      
      transcriptContainer.appendChild(transcriptContent);
      
      container.appendChild(transcriptContainer);
      
      // Create audio player container
      const audioContainer = document.createElement('div');
      audioContainer.className = 'audio-container';
      audioContainer.style.display = 'none';
      
      // Create audio player
      audioPlayer = document.createElement('audio');
      audioPlayer.controls = true;
      audioContainer.appendChild(audioPlayer);
      container.appendChild(audioContainer);
      
      // Add the container to the document
      document.body.appendChild(container);
  }
  
  // Set up speech recognition for voice commands
  function setupSpeechRecognition() {
      
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
          // Process the speech results and convert to lowercase
          const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
          console.log('Voice Command Detected:', transcript);
          handleVoiceCommand(transcript);
      };
      
      recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
      };
      
      recognition.onstart = () => {
          console.log('Voice recognition started');
      };
      
      recognition.onend = () => {
          console.log('Voice recognition ended');
          if (!isRecording) {
              recognition.start(); // Restart recognition after it ends (if not recording)
          }
      };
      
      recognition.start(); // Start voice recognition initially
  }
  
  // Update transcript text directly
  function updateTranscriptText(text) {
      if (transcriptContent) {
          transcriptContent.innerHTML = `<p>${text}</p>`;
      }
  }
  
  // Set up speech-to-text for transcribing recorded audio
  function setupTranscriptRecognition() {
  
      
      // First stop the command recognition
      if (recognition) {
          recognition.stop();
      }
      
      transcriptRecognition = new SpeechRecognition();
      transcriptRecognition.continuous = true;
      transcriptRecognition.interimResults = true;
      
      // Show recording indicator
      const transcriptHeader = document.querySelector('.transcript-container h3');
      const existingIndicator = document.querySelector('.recording-indicator');
      
      if (!existingIndicator && transcriptHeader) {
          const recordingIndicator = document.createElement('span');
          recordingIndicator.className = 'recording-indicator';
          transcriptHeader.appendChild(recordingIndicator);
      }
      
      // Clear the transcript area
      transcriptText = '';
      
      transcriptRecognition.onresult = (event) => {
          console.log('Speech recognition result received');
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                  finalTranscript += transcript + ' ';
              } else {
                  interimTranscript += transcript;
              }
          }
          
          // Update transcript text
          if (finalTranscript) {
              transcriptText += finalTranscript;
          }
          
          // Directly update the transcript display
          if (transcriptContent) {
              transcriptContent.innerHTML = `
                  <p>${transcriptText}</p>
                  <p class="interim">${interimTranscript}</p>
              `;
              console.log('Updated transcript:', transcriptText);
          } else {
              console.error('Transcript content element not found');
          }
      };
      
      transcriptRecognition.onerror = (event) => {
          console.error('Transcript recognition error:', event.error);
      };
      
      transcriptRecognition.onend = () => {
          console.log('Transcript recognition ended');
          // Remove recording indicator when transcription ends
          const recordingIndicator = document.querySelector('.recording-indicator');
          if (recordingIndicator) {
              recordingIndicator.remove();
          }
          
          // Restart command recognition if needed
          if (!isRecording && recognition) {
              recognition.start();
          }
      };
      
      // Start the transcript recognition
      transcriptRecognition.start();
      console.log('Transcript recognition started');
  }
  
  // Add event listeners to buttons
  function addEventListeners() {
      recordButton.addEventListener('click', startRecording);
      stopButton.addEventListener('click', stopRecording);
      saveButton.addEventListener('click', saveAudio);
      deleteButton.addEventListener('click', deleteAudio);
  }
  
  // Handle voice commands
  function handleVoiceCommand(command) {
      if (command.includes('start recording')) {
          startRecording();
      } else if (command.includes('stop recording')) {
          stopRecording();
      } else if (command.includes('delete')) {
          deleteAudio();
      } else if (command.includes('save') && audioPlayer.src) {
          saveAudio();
      }
  }
  
  // Start recording audio
  async function startRecording() {
      audioChunks = []; // Clear previous audio chunks
      
      // Reset audio player
      audioPlayer.src = '';
      audioPlayer.parentElement.style.display = 'none';
      
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorder = new MediaRecorder(stream);
          
          mediaRecorder.ondataavailable = event => {
              audioChunks.push(event.data);
          };
          
          mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
              const url = URL.createObjectURL(audioBlob);
              audioPlayer.src = url;
              audioPlayer.parentElement.style.display = 'block';
              console.log('Recording complete');
          };
          
          mediaRecorder.start();
          isRecording = true;
          
          // Set up and start speech-to-text
          setupTranscriptRecognition();
          
          // Update UI
          recordButton.disabled = true;
          stopButton.disabled = false;
      } catch (err) {
          console.error('Microphone is not available:', err);
          updateTranscriptText(`Error: Could not access microphone. ${err.message}`);
      }
  }
  
  // Stop recording audio
  function stopRecording() {
      if (mediaRecorder && isRecording) {
          mediaRecorder.stop();
          isRecording = false;
          
          // Stop speech-to-text
          if (transcriptRecognition) {
              transcriptRecognition.stop();
          }
          
          // Finalize transcript display
          if (transcriptText) {
              updateTranscriptText(transcriptText);
          } else {
              updateTranscriptText('No speech detected during recording.');
          }
          
          // Update UI
          recordButton.disabled = false;
          stopButton.disabled = true;
          saveButton.disabled = false;
          deleteButton.disabled = false;
      }
  }
  
  // Save the recorded audio and transcript to the server
  async function saveAudio() {
      if (audioPlayer.src) {
          try {
              const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
              const formData = new FormData();
              formData.append('audio', audioBlob, 'audio.wav');
              
              // Add transcript if available
              if (transcriptText) {
                  formData.append('transcript', transcriptText);
              }
              
              const response = await fetch('http://localhost:5000/upload-audio', {
                  method: 'POST',
                  body: formData
              });
              
              const data = await response.json();
              console.log('Audio saved:', data);
              updateTranscriptText('Audio and transcript saved successfully.');
          } catch (err) {
              console.error('Error saving audio:', err);
          }
      }
  }
  
  // Delete the audio and reset UI
  function deleteAudio() {
      audioPlayer.src = '';
      audioPlayer.parentElement.style.display = 'none';
      transcriptText = '';
      updateTranscriptText('Audio deleted. Ready to record again.');
      
      // Reset UI
      saveButton.disabled = true;
      deleteButton.disabled = true;
  }
})();
