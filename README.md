# REACT – IoT Reflex Analyzer

## Analyzing Human Reflex and Focus Levels Using an IoT Reaction Time Device

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Arduino](https://img.shields.io/badge/Arduino-00979D?style=for-the-badge&logo=arduino&logoColor=white)

This project, "REACT – IoT Reflex Analyzer", is an innovative system designed to measure and analyze human reaction times. It combines an Arduino-based hardware device with a Node.js backend and a web-based frontend dashboard for real-time data visualization, user authentication, and competitive leaderboards.

## Features

*   **Real-time Reaction Time Measurement:** Utilizes an Arduino to accurately measure reaction times with millisecond precision.
*   **User Authentication:** Secure user registration and login system with password hashing.
*   **Persistent Data Storage:** Saves every reaction test to a user's profile using MongoDB.
*   **Interactive Web Dashboard:** A "Game Boy"-inspired user interface for displaying reaction times, historical data, and system status.
*   **Personal & Global Stats:** Tracks personal bests, averages, and a global leaderboard.
*   **Hardware Control:** Ability to power the Arduino on/off directly from the web interface.
*   **Real-time Communication:** Uses Socket.IO for seamless, bi-directional communication between the hardware, server, and web client.

## Architecture

The system is composed of three main parts:

1.  **Hardware (Arduino):** A C++ sketch on an Arduino manages an LED and a button. It runs a game loop, measures reaction time, and communicates with the Node.js server via USB serial.
2.  **Backend (Node.js/Express):** A server that acts as the central hub. It serves the web app, manages user data in MongoDB, provides a REST API for the frontend, and communicates with the Arduino.
3.  **Frontend (Vanilla JS):** A single-page application that provides the UI. It uses Socket.IO for real-time updates and the Fetch API to interact with the backend.

![System Architecture Diagram](./public/graph.svg)

## Technologies Used

*   **Hardware:** Arduino
*   **Firmware:** C++ (Arduino)
*   **Backend:**
    *   Node.js, Express.js
    *   MongoDB with Mongoose
    *   Socket.IO
    *   `bcrypt` for password hashing
    *   `express-session` for user sessions
    *   `serialport` for Arduino communication
*   **Frontend:**
    *   HTML5, CSS3, Vanilla JavaScript
    *   Socket.IO (Client)
    *   Web Audio API

## Getting Started

### Prerequisites

*   Node.js (LTS version)
*   MongoDB (local or cloud instance)
*   Arduino IDE
*   A physical Arduino board (e.g., Uno, Nano) with a button and LED.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/arduino-game-node.git
    cd arduino-game-node
    ```

2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file:**
    Create a file named `.env` in the root of the project and add the following, replacing the placeholder values:
    ```env
    DATABASE_URL=mongodb://localhost:27017/react-game
    SESSION_SECRET=a-secure-secret-key-for-sessions
    ```

4.  **Arduino Setup:**
    *   Open `arduino.ino/main.ino` in the Arduino IDE.
    *   Upload the sketch to your Arduino board.
    *   Note the serial port your Arduino is connected to (e.g., `/dev/cu.usbserial-1120` on macOS, `COM3` on Windows).

### Configuration

1.  **Update Serial Port in `server.js`:**
    Open `server.js` and find the `SerialPort` path. **Update this to your Arduino's serial port.**
    ```javascript
    const port = new SerialPort({
      path: "/dev/cu.usbserial-1120", // <-- CHANGE THIS
      baudRate: 9600
    });
    ```

### Running the Application

1.  **Start the Node.js server:**
    ```bash
    npm start
    ```
    The server will start, connect to the database and serial port, and be ready for connections.

2.  **Access the Dashboard:**
    Open your web browser and navigate to `http://localhost:3000`.

3.  **Play:**
    Register or log in, then use the "Power" button on the dashboard to start the game on the Arduino.

## Project Structure

*   `arduino.ino/`: Contains the Arduino sketches.
*   `public/`: Frontend static files (HTML, CSS, JS, assets).
*   `server.js`: The core Node.js backend application.
*   `.env`: Environment variables for configuration (DB connection, secrets).
*   `package.json`: Project dependencies and scripts.

## Contribution

Feel free to fork the repository, make improvements, and submit pull requests.

## License

This project is licensed under the ISC License.
