const byte LED_PIN = 13;
const unsigned long PWM_PERIOD_US = 2000;
const unsigned long TIMEOUT_MS = 2000;
byte brightness = 0;
unsigned long lastReceived = 0;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  Serial.begin(115200);
}

void loop() {
  while (Serial.available() > 0) {
    brightness = (byte)Serial.read();
    lastReceived = millis();
  }
  if (millis() - lastReceived > TIMEOUT_MS) brightness = 0;
  unsigned long phase = micros() % PWM_PERIOD_US;
  unsigned long onTime = (unsigned long)brightness * PWM_PERIOD_US / 255;
  digitalWrite(LED_PIN, phase < onTime ? HIGH : LOW);
}
