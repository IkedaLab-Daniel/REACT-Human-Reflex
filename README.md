# REACT – IoT Reflex Analyzer

## Analyzing Human Reflex and Focus Levels Using an IoT Reaction Time Device

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Arduino](https://img.shields.io/badge/Arduino-00979D?style=for-the-badge&logo=arduino&logoColor=white)

This project, "REACT – IoT Reflex Analyzer", is an innovative system designed to measure and analyze human reaction times. It combines an Arduino-based hardware setup with a Node.js backend and a web-based frontend dashboard for real-time data visualization and interaction. The system aims to provide insights into human reflex and focus levels through engaging reaction time tests.

## Features

*   **Real-time Reaction Time Measurement:** Utilizes an Arduino to accurately measure reaction times.
*   **Interactive Web Dashboard:** A "Game Boy"-inspired user interface for displaying reaction times, historical data, and system status.
*   **Power Control:** Ability to power on/off the Arduino system directly from the web interface.
*   **Real-time Communication:** Uses Socket.IO for seamless, bi-directional communication between the Arduino, Node.js server, and web client.
*   **Historical Data:** Displays a history of recent reaction time tests.
*   **Visual Feedback:** Provides immediate visual cues on the web dashboard based on reaction time performance.

## Technologies Used

*   **Hardware:** Arduino
*   **Firmware:** C++ (Arduino)
*   **Backend:**
    *   Node.js
    *   Express.js (Web Framework)
    *   Socket.IO (Real-time Bidirectional Event-based Communication)
    *   SerialPort (Node.js interface to serial ports)
    *   @serialport/parser-readline (Parser for serial data)
*   **Frontend:**
    *   HTML5
    *   CSS3
    *   JavaScript
    *   Socket.IO (Client-side)

## Getting Started

To set up and run this project, follow these steps:

### Prerequisites

*   Node.js (LTS version recommended)
*   Arduino IDE
*   Physical Arduino board (e.g., Uno, Nano) with appropriate sensors/buttons for reaction time measurement.
*   Required Node.js packages (will be installed in the next step).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/arduino-game-node.git
    cd arduino-game-node
    ```
    *(Note: Replace `your-username/arduino-game-node.git` with the actual repository URL if different.)*

2.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```

3.  **Arduino Setup:**
    *   Open the `arduino.ino/main.ino` (or `simple-button.ino` depending on your specific setup) file in the Arduino IDE.
    *   Ensure you have the `SerialPort` library installed in your Arduino IDE if your sketch uses it explicitly for advanced features, otherwise, standard `Serial` communication is usually sufficient.
    *   Upload the sketch to your Arduino board.
    *   **Important:** Note the serial port your Arduino is connected to (e.g., `/dev/cu.usbserial-1120` on macOS, `COM3` on Windows). You will need to update `server.js` with this path.

### Configuration

1.  **Update Serial Port in `server.js`:**
    Open `server.js` and locate the `SerialPort` configuration:
    ```javascript
    const port = new SerialPort({
      path: "/dev/cu.usbserial-1120", // adjust for your mac
      baudRate: 9600
    });
    ```
    Change the `path` to match the serial port of your Arduino board.

### Running the Application

1.  **Start the Node.js server:**
    ```bash
    node server.js
    ```
    You should see output similar to:
    ```
    Serial port opened
    Enforced POWER_OFF on Arduino
    Dashboard available at http://localhost:3000
    ```

2.  **Access the Dashboard:**
    Open your web browser and navigate to `http://localhost:3000`.

3.  **Interact with the Arduino:**
    Use the "Power" button on the dashboard to turn on/off the Arduino system. The system will then be ready for reaction time tests.

## Project Structure

*   `arduino.ino/`: Contains the Arduino sketches.
*   `public/`: Frontend static files (HTML, CSS, JavaScript for the dashboard).
*   `server.js`: Node.js backend server.
*   `package.json`: Node.js project configuration and dependencies.
*   `README.md`: Project documentation.
*   `.gitignore`: Specifies intentionally untracked files to ignore.

## Contribution

Feel free to fork the repository, make improvements, and submit pull requests.

## License

This project is licensed under the ISC License.