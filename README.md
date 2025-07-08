Shado Text - Secure Messaging Web Application

Overview

Shado Text is a secure, real-time, web-based messaging platform designed to prioritize user privacy through end-to-end encryption (E2EE). It uses a hybrid encryption model combining AES (256-bit) for message content and RSA (2048-bit) for secure key exchange. The application ensures that only the intended recipient can decrypt and read messages, with the server acting solely as a blind conduit for encrypted data.

This project was developed as part of the requirements for PETV83: Cyber Security Essentials, led by Santanu Raj.

Features





Anonymous User Registration: Users can join with a unique username, tied to the browser session.



End-to-End Encryption: Messages are encrypted on the sender’s device and decrypted only by the recipient, using AES and RSA.



Real-Time Messaging: Built with Socket.IO for seamless, bidirectional communication.



Local Chat History: Decrypted chat history is stored locally for the session and discarded upon disconnection.



User Discovery: Displays a list of active users for initiating secure chat sessions.



Intuitive UI: Responsive interface with a contacts panel and chat window, built using HTML, CSS, and JavaScript.

Technology Stack





Frontend: HTML, CSS, JavaScript, Web Crypto API (or libraries like JSEncrypt and CryptoJS).



Backend: Node.js, Express, Socket.IO.



Communication: Secure WebSocket (WSS) for encrypted transport.



Deployment: Containerized with Docker, deployable on cloud platforms like AWS, Azure, or GCP.



Operating Environment: Compatible with modern browsers (Chrome, Firefox, Safari, Edge) supporting HTML5, CSS3, and ES6+.

Installation and Setup

Prerequisites





Node.js (v16 or higher)



Docker (optional, for containerized deployment)



A modern web browser with Web Crypto API support

Steps





Clone the Repository:

git clone https://github.com/<your-repo>/shado-text.git
cd shado-text



Install Dependencies:

npm install



Run the Application:





For development:

npm start



For production (Docker):

docker build -t shado-text .
docker run -p 3000:3000 shado-text



Access the Application: Open http://localhost:3000 in a modern web browser.

Usage





Register: Enter a unique username on the registration screen and click "Join Chat."



Select a User: View the list of active users in the left panel and select a chat partner.



Send Messages: Type a message in the chat window, click "Send," and the message will be encrypted and sent securely.



View Chat History: Messages are stored locally for the session and cleared upon browser close.



Disconnect: Close the browser tab to end the session and remove your identity from the server.

Security and Privacy





E2EE: Messages are encrypted on the client side, ensuring the server cannot access message content or private keys.



Data Minimization: Only temporary usernames and public keys are handled, deleted upon disconnection.



No PII: The system does not collect IP addresses, browser details, or other personally identifiable information.



Secure Communication: Uses Secure WebSocket (WSS) to protect data in transit.

Future Enhancements





Group chat with E2EE.



Secure file sharing.



Persistent identity with password-protected accounts.



Key verification to prevent man-in-the-middle attacks.

Ethical and Legal Considerations





Privacy First: The E2EE model ensures no one, including system administrators, can access message content.



Transparency: Data handling practices are clearly communicated via the Terms of Service and Privacy Policy.



Lawful Access: The service provider cannot access message content, as outlined in the Terms of Service.

Contributing

Contributions are welcome! Please follow these steps:





Fork the repository.



Create a feature branch (git checkout -b feature/your-feature).



Commit your changes (git commit -m "Add your feature").



Push to the branch (git push origin feature/your-feature).



Open a pull request.

License

This project is licensed under the MIT License. See the LICENSE file for details.

Contact

For questions or feedback, please contact the project lead, Santanu Raj, or open an issue on GitHub.
