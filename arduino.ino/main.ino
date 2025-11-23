int ledPin = 8;
int buttonPin = 2;

unsigned long startTime;
bool waitingForReaction = false;
unsigned long reactionTime = 0;
bool powered = true; // whether the device is active
String serialBuf = "";

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
  pinMode(buttonPin, INPUT);
  randomSeed(analogRead(A0));
}

void loop() {
  // Process any incoming serial data frequently
  processSerial();

  if (!powered) {
    // Device is powered off — keep LED off and poll for serial
    digitalWrite(ledPin, LOW);
    delay(50);
    return;
  }

  // 1. Random wait before turning on LED (non-blocking)
  if (!waitingForReaction) {
    digitalWrite(ledPin, LOW);
    unsigned long waitMs = random(2000, 5000);
    unsigned long t0 = millis();
    while (millis() - t0 < waitMs) {
      processSerial();
      if (!powered) return; // abort if powered off during wait
      delay(10);
    }

    // LED ON → user must react
    digitalWrite(ledPin, HIGH);
    startTime = millis();
    waitingForReaction = true;
  }

  // 2. Wait for button press
  if (waitingForReaction && digitalRead(buttonPin) == HIGH) {
    reactionTime = millis() - startTime;

    Serial.print("REACTION:");
    Serial.println(reactionTime);

    waitingForReaction = false;
    unsigned long cooldown = 1000;
    unsigned long c0 = millis();
    while (millis() - c0 < cooldown) {
      processSerial();
      if (!powered) return;
      delay(10);
    }
  }
}

// Read serial input and act on complete lines
void processSerial() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      serialBuf.trim();
      if (serialBuf.length() > 0) {
        if (serialBuf == "POWER_OFF") {
          powered = false;
          waitingForReaction = false;
          digitalWrite(ledPin, LOW);
          Serial.println("ACK:POWER_OFF");
        } else if (serialBuf == "POWER_ON") {
          powered = true;
          waitingForReaction = false;
          Serial.println("ACK:POWER_ON");
        } else if (serialBuf == "START") {
          // trigger a test immediately if powered
          if (powered && !waitingForReaction) {
            digitalWrite(ledPin, LOW);
            unsigned long waitMs = random(2000, 5000);
            unsigned long t0 = millis();
            while (millis() - t0 < waitMs) {
              // allow processing serial during this wait
              if (Serial.available() > 0) break; // break to outer loop to process
              delay(10);
            }
            if (powered) {
              digitalWrite(ledPin, HIGH);
              startTime = millis();
              waitingForReaction = true;
            }
          }
        }
      }
      serialBuf = "";
    } else {
      serialBuf += c;
    }
  }
}
