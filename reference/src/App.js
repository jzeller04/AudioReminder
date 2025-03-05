import React, { useState, useEffect } from 'react'; // Use React to write HTML-like code
import AudioRecorder from './AudioRecorder'; // Get the AudioRecorder from another file
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode"; // Correct import for jwtDecode
import './index.css';

function App() {
   // A container for the content
  // Show the AudioRecorder component
  // State to hold user's first name, email, profile picture URL, and login status
  const [userFirstName, setUserFirstName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPicture, setUserPicture] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if the user is logged in when the component mounts
  useEffect(() => {
    const storedToken = sessionStorage.getItem('authToken');
    if (storedToken) {
      const decoded = jwtDecode(storedToken);
      setUserFirstName(decoded.given_name);
      setUserEmail(decoded.email);
      setUserPicture(decoded.picture);
      setIsLoggedIn(true);
    }
  }, []);

  // Handle successful login
  const handleLoginSuccess = (response) => {
    console.log("Login Success: ", response);

    // Decode the JWT token
    const decoded = jwtDecode(response.credential);
    console.log("Decoded User Info: ", decoded); // Check console for available fields

    // Set the first name, email, and picture to state
    setUserFirstName(decoded.given_name);
    setUserEmail(decoded.email);
    setUserPicture(decoded.picture);  // Set the profile picture
    setIsLoggedIn(true);  // Set login status to true

    // Store the JWT token in localStorage
    sessionStorage.setItem('authToken', response.credential);
  };

  // Handle login failure
  const handleLoginFailure = () => {
    console.log("Login Failed");
  };

  // Logout function to clear stored token and reset state
  const handleLogout = () => {
    sessionStorage.removeItem('authToken');
    setUserFirstName('');
    setUserEmail('');
    setUserPicture('');
    setIsLoggedIn(false);
  };

  return (
    <GoogleOAuthProvider clientId="744648660353-u29ml7up3mlhto5tohh3k1pc7b5sio6s.apps.googleusercontent.com">
      <div className="App">
        {/* Google Login button */}
        {!isLoggedIn && (
          <div className="login-button">
            <GoogleLogin 
              onSuccess={handleLoginSuccess}  // Triggered on successful login
              onError={handleLoginFailure}     // Triggered on login failure
            />
          </div>
        )}

        {/* After login, show the profile info on the button */}
        {isLoggedIn && (
          <div className="user-info-button">
            <img src={userPicture} alt="profile" className="profile-picture" />
            <span>{userEmail}</span>
            <button className="logout-button" onClick={handleLogout}>Logout</button>
          </div>
        )}

        {/* Centered welcome message */}
        <div className="centered-message">
          {isLoggedIn && userFirstName && userEmail && (
            <div className="user-info">
              <p>Welcome, <strong>{userFirstName}</strong>!</p>
            </div>
          )}
        </div>

        {/* Audio Recorder Component */}
        <AudioRecorder />
      </div>
    </GoogleOAuthProvider>
  );
}

export default App; // Make the App available for use in other parts of the app
