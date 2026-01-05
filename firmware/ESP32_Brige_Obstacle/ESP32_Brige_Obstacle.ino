/* ESP32 Serial Motor Bridge + Ultrasonic PROX output
   - CSV motor control "<l>,<r>"
   - STOP / REQ_ENC / RESET_ENC supported
   - Output:
       ENC:<encL>,<encR>
       PROX:<left>,<center>,<right>
*/

#include <Arduino.h>

// ----------------- Motor pins -----------------
const int IN1 = 26;
const int IN2 = 25;
const int ENA_PIN = 33;

const int IN3 = 5;
const int IN4 = 4;
const int ENB_PIN = 23;

// ----------------- Encoder pins -----------------
const int ENC1_A = 34;
const int ENC1_B = 35;
const int ENC2_A = 18;
const int ENC2_B = 19;

// ----------------- Ultrasonic pins -----------------
const int TRIG_L = 13, ECHO_L = 12;
const int TRIG_C = 14, ECHO_C = 27;
const int TRIG_R = 32, ECHO_R = 15;

// ----------------- PWM config -----------------
const int pwmFreq = 2500;
const int pwmResolution = 8;

// ----------------- Encoders -----------------
volatile long encoder1Count = 0;
volatile long encoder2Count = 0;

unsigned long lastEncPub = 0;
const unsigned long ENC_PUB_MS = 200;

// ----------------- Encoder ISRs -----------------
void IRAM_ATTR encoder1ISR() {
  int A = digitalRead(ENC1_A);
  int B = digitalRead(ENC1_B);
  encoder1Count += (A == B) ? 1 : -1;
}

void IRAM_ATTR encoder2ISR() {
  int A = digitalRead(ENC2_A);
  int B = digitalRead(ENC2_B);
  encoder2Count += (A == B) ? 1 : -1;
}

// ----------------- Motor helpers -----------------
void applyMotorSignedRaw(int pwmSigned, int INa, int INb, int EN_CH) {
  int pwm = abs(pwmSigned);
  pwm = constrain(pwm, 0, 255);

  if (pwmSigned > 0) {
    digitalWrite(INa, HIGH);
    digitalWrite(INb, LOW);
  } else if (pwmSigned < 0) {
    digitalWrite(INa, LOW);
    digitalWrite(INb, HIGH);
  } else {
    digitalWrite(INa, LOW);
    digitalWrite(INb, LOW);
    pwm = 0;
  }

  ledcWrite(EN_CH, pwm);
}

void applyBothMotors(int leftPWM, int rightPWM) {
  applyMotorSignedRaw(leftPWM,  IN1, IN2, ENA_PIN);
  applyMotorSignedRaw(rightPWM, IN3, IN4, ENB_PIN);
}

void stopAll() { applyBothMotors(0, 0); }

// ----------------- CSV parsing -----------------
bool parsePWMCSV(const char* s, int &leftOut, int &rightOut) {
  if (!s) return false;
  char buf[64];
  strncpy(buf, s, sizeof(buf)-1);
  buf[sizeof(buf)-1] = '\0';

  char *p = buf;
  while (*p) {
    if (*p == '\r' || *p == '\n') *p = '\0';
    p++;
  }

  char *comma = strchr(buf, ',');
  if (!comma) return false;

  *comma = '\0';
  leftOut = atoi(buf);
  rightOut = atoi(comma+1);

  return true;
}

// ----------------- Encoder output -----------------
void sendEncoderReport() {
  noInterrupts();
  long e1 = encoder1Count;
  long e2 = encoder2Count;
  interrupts();

  Serial.print("ENC:");
  Serial.print(e1);
  Serial.print(",");
  Serial.println(e2);
}


float readUltrasonic(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  long duration = pulseIn(echo, HIGH, 35000); // 35ms timeout
  if (duration == 0) return -1;

  return duration * 0.0343 / 2.0;  // convert to cm
}

void resetEncoders() {
  detachInterrupt(digitalPinToInterrupt(ENC1_A));
  detachInterrupt(digitalPinToInterrupt(ENC2_A));

  encoder1Count = 0;
  encoder2Count = 0;

  delay(5);

  attachInterrupt(digitalPinToInterrupt(ENC1_A), encoder1ISR, RISING);
  attachInterrupt(digitalPinToInterrupt(ENC2_A), encoder2ISR, RISING);

  Serial.println("OK");
}

// ----------------- SETUP -----------------
String rxLine = "";

void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  pinMode(ENC1_A, INPUT);
  pinMode(ENC1_B, INPUT);
  pinMode(ENC2_A, INPUT);
  pinMode(ENC2_B, INPUT);

  attachInterrupt(digitalPinToInterrupt(ENC1_A), encoder1ISR, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC2_A), encoder2ISR, CHANGE);

  ledcAttach(ENA_PIN, pwmFreq, pwmResolution);
  ledcAttach(ENB_PIN, pwmFreq, pwmResolution);

  pinMode(TRIG_L, OUTPUT);
  pinMode(ECHO_L, INPUT);

  pinMode(TRIG_C, OUTPUT);
  pinMode(ECHO_C, INPUT);

  pinMode(TRIG_R, OUTPUT);
  pinMode(ECHO_R, INPUT);

  stopAll();
  Serial.println("ESP32 Motor Bridge ready");
}

// ----------------- LOOP -----------------
void loop() {

  // ---------- SERIAL COMMAND PROCESSING ----------
  while (Serial.available()) {
    char c = (char)Serial.read();

    if (c == '\n') {
      String line = rxLine;
      rxLine = "";
      line.trim();

      if (line.equalsIgnoreCase("STOP")) {
        stopAll();
        Serial.println("OK");

      } else if (line.equalsIgnoreCase("REQ_ENC")) {
        sendEncoderReport();
        Serial.println("OK");

      } else if (line.equalsIgnoreCase("RESET_ENC")) {
        resetEncoders();

      } else {
        int l, r;
        if (parsePWMCSV(line.c_str(), l, r)) {
          applyBothMotors(l, r);
          Serial.println("OK");
        } else {
          Serial.println("ERR unable");
        }
      }
    } else {
      if (rxLine.length() < 120) rxLine += c;
    }
  }

  // ---------- PERIODIC ENCODER REPORT ----------
  unsigned long now = millis();
  if (now - lastEncPub >= ENC_PUB_MS) {
    lastEncPub = now;
    sendEncoderReport();
  }

  // ---------- ULTRASONIC READINGS ----------
  float leftDist   = readUltrasonic(TRIG_L, ECHO_L);
  float centerDist = readUltrasonic(TRIG_C, ECHO_C);
  float rightDist  = readUltrasonic(TRIG_R, ECHO_R);

  Serial.print("PROX:");
  Serial.print(leftDist); Serial.print(",");
  Serial.print(centerDist); Serial.print(",");
  Serial.println(rightDist);

  delay(30); // small delay for stability
}
