int buttonPin = 2;
int lastState = LOW;

void setup() {
  Serial.begin(9600);
  pinMode(buttonPin, INPUT);
}

void loop() {
  int state = digitalRead(buttonPin);

  if (state != lastState) {
    if (state == HIGH) {
      Serial.println("PRESSED");
    } else {
      Serial.println("RELEASED");
    }
    lastState = state;
    delay(50); // simple debounce
  }
}
