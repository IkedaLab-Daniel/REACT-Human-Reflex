int ledPin = 8;
int buttonPin = 2;
int powerLedPin = 9; // red LED indicating power state

unsigned long startTime;
bool waitingForReaction = false;
unsigned long reactionTime = 0;
bool powered = false; // whether the device is active (start OFF by default)
String serialBuf = "";

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
  // Use internal pull-up to avoid floating reads. Wire button to GND when pressed.
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(powerLedPin, OUTPUT);
  digitalWrite(powerLedPin, powered ? HIGH : LOW);
  // Explicitly announce initial power-off state
  if (!powered) {
    Serial.println("ACK:POWER_OFF");
  }
  randomSeed(analogRead(A0));
}

void loop() {
  // Check for serial commands (POWER_ON, POWER_OFF, START)
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      serialBuf.trim();
      if (serialBuf.length() > 0) {
        if (serialBuf == "POWER_OFF") {
          powered = false;
          waitingForReaction = false;
          digitalWrite(ledPin, LOW);
          digitalWrite(powerLedPin, LOW);
          Serial.println("ACK:POWER_OFF");
        } else if (serialBuf == "POWER_ON") {
          powered = true;
          waitingForReaction = false;
          digitalWrite(powerLedPin, HIGH);
          Serial.println("ACK:POWER_ON");
        } else if (serialBuf == "START") {
          // trigger a test immediately if powered
          if (powered && !waitingForReaction) {
            digitalWrite(ledPin, LOW);
            delay(random(2000, 5000));
            digitalWrite(ledPin, HIGH);
            startTime = millis();
            waitingForReaction = true;
          }
        }
      }
      serialBuf = "";
    } else {
      serialBuf += c;
    }
  }

  if (!powered) {
    // Device is powered off — keep LED off and poll for serial
    delay(50);
    return;
  }

  // 1. Random wait before turning on LED (normal autonomous behavior)
  if (!waitingForReaction) {
    digitalWrite(ledPin, LOW);
    delay(random(2000, 5000)); // 2-5 seconds wait

    // LED ON → user must react
    digitalWrite(ledPin, HIGH);
    startTime = millis();
    waitingForReaction = true;
  }

  // 2. Wait for button press (button wired to GND with INPUT_PULLUP)
  if (waitingForReaction && digitalRead(buttonPin) == LOW) {
    // simple debounce: require it to remain LOW for ~20ms
    delay(20);
    if (digitalRead(buttonPin) == LOW) {
      reactionTime = millis() - startTime;

      // Avoid spurious 0ms readings: ignore if reactionTime is 0 (too-fast)
      if (reactionTime == 0) reactionTime = 1;

      Serial.print("REACTION:");
      Serial.println(reactionTime);

      waitingForReaction = false;
      // Wait for button release before continuing to avoid immediate retrigger
      while (digitalRead(buttonPin) == LOW) {
        delay(10);
      }
      delay(200); // cooldown
    }
  }
}
