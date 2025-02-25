import React, { useState, useRef, useEffect } from "react"; // Import React and necessary hooks

// Declare webkitSpeechRecognition globally
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; // Get speech recognition support

const AudioRecorder = () => {
  // State variables for recording status, audio URL, error messages, and other messages
  const [isRecording, setIsRecording] = useState(false); // Track if recording is happening
  const [audioURL, setAudioURL] = useState(null); // Store the URL of the recorded audio
  const [error, setError] = useState(null); // Store error messages
  const [message, setMessage] = useState(null); // Store other messages (like save confirmation)

  // Refs to access elements directly and store audio chunks during recording
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Reference to the speech recognition object
  const recognitionRef = useRef(null);

  // Setup the speech recognition (only if browser supports it)
  useEffect(() => {
    if (!SpeechRecognition) { // Check if speech recognition is supported
      setError("Speech recognition is not supported by this browser."); // Show error message if not supported
      return;
    }

    recognitionRef.current = new SpeechRecognition(); // Create a new SpeechRecognition object
    recognitionRef.current.continuous = true; // Keep listening for commands until stopped
    recognitionRef.current.interimResults = true; // Get partial results as user speaks

    recognitionRef.current.onresult = (event) => {
      // Process the speech results and convert to lowercase
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      console.log("Voice Command Detected:", transcript); // Log the voice command detected
      handleVoiceCommand(transcript); // Handle the command
    };

    recognitionRef.current.onerror = (event) => {
      console.error("Speech recognition error:", event.error); // Log errors from speech recognition
    };

    recognitionRef.current.onstart = () => {
      console.log("Voice recognition started"); // Log when recognition starts
    };

    recognitionRef.current.onend = () => {
      console.log("Voice recognition ended"); // Log when recognition ends
      recognitionRef.current.start(); // Restart recognition after it ends
    };

    recognitionRef.current.start(); // Start voice recognition initially

    return () => {
      // Cleanup speech recognition when the component is removed
      if (recognitionRef.current) {
        recognitionRef.current.stop(); // Stop recognition
      }
    };
  }, []);

  // Handle voice commands
  const handleVoiceCommand = (command) => {
    if (command.includes("start recording")) { // Start recording if command matches
      startRecording();
    } else if (command.includes("stop recording")) { // Stop recording if command matches
      stopRecording();
    } else if (command.includes("delete")) { // Delete audio if command matches
      deleteAudio();
    } else if (command.includes("save") && audioURL) { // Save audio if command matches and audio exists
      saveAudio();
    }
  };

  // Start recording audio
  const startRecording = async () => {
    audioChunksRef.current = []; // Clear previous audio chunks
    setAudioURL(null); // Reset audio URL

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); // Get access to microphone
      mediaRecorderRef.current = new MediaRecorder(stream); // Create MediaRecorder object to record audio

      mediaRecorderRef.current.ondataavailable = event => {
        audioChunksRef.current.push(event.data); // Store audio data as it becomes available
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' }); // Create audio blob
        const audioUrl = URL.createObjectURL(audioBlob); // Generate a URL for the recorded audio
        setAudioURL(audioUrl); // Set the URL to play the audio
        console.log("Audio URL set:", audioUrl); // Log the URL
      };

      mediaRecorderRef.current.start(); // Start recording
      setIsRecording(true); // Set recording state to true
    } catch (err) {
      setError("Microphone is not available."); // Show error if microphone isn't available
      console.error(err); // Log error
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    mediaRecorderRef.current.stop(); // Stop the recording
    setIsRecording(false); // Set recording state to false
  };

  // Save the recorded audio to the server
  const saveAudio = async () => {
    if (audioURL) { // Ensure audioURL exists before saving
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' }); // Create Blob from audio data
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.wav'); // Append audio file to form data

        const response = await fetch('http://localhost:5000/upload-audio', {
          method: 'POST',
          body: formData // Send the audio data to the server
        });

        const data = await response.json(); // Parse response from server
        setMessage(data.message); // Set the response message
      } catch (error) {
        console.error("Error saving audio:", error); // Log any errors that happen while saving
      }
    } else {
      console.log("No audio available to save"); // Log if there's no audio to save
    }
  };

  // Delete the current audio
  const deleteAudio = () => {
    setAudioURL(null); // Reset the audio URL
    audioChunksRef.current = []; // Clear the audio data
  };

  return (
    <div>
      <h2>Audio Recorder</h2>
      <div>
        {error && <p style={{ color: "red" }}>{error}</p>} {/* Show error message if there's an error */}
        <button onClick={startRecording} disabled={isRecording}>Record</button> {/* Start recording button */}
        <button onClick={stopRecording} disabled={!isRecording}>Stop</button> {/* Stop recording button */}
        <button onClick={saveAudio} disabled={!audioURL}>Save</button> {/* Save audio button */}
        <button onClick={deleteAudio} disabled={!audioURL}>Delete</button> {/* Delete audio button */}
        {message && <p>{message}</p>} {/* Display success or error message */}
      </div>
      {audioURL && (
        <div>
          <audio ref={audioRef} src={audioURL} controls /> {/* Display the audio player if URL is available */}
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
