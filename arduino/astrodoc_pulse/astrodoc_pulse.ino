/*
  Astrodoc pulse sensor: Arduino + MAX30102 -> the Astrodoc dashboard

  Wiring (MAX30102 breakout -> Arduino Uno / Nano):
    VIN -> 5V (or 3.3V)
    GND -> GND
    SDA -> A4
    SCL -> A5

  Library: "SparkFun MAX3010x Pulse and Proximity Sensor Library"
           (Arduino IDE: Tools > Manage Libraries > search "MAX3010x")

  How to use:
    1. Upload this sketch.
    2. Close the Arduino Serial Monitor (only one program can use the port).
    3. Open the Astrodoc dashboard in Chrome or Edge, press "Connect sensor"
       and choose the Arduino's port.
    4. Rest a fingertip on the sensor with light, steady pressure.

  Output: one line per second, for example "HR:72".
  Based on the SparkFun library's HeartRate example (beat detection + average of 4 beats).
*/

#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"

MAX30105 sensor;

const byte RATE_SIZE = 4;      // average over the last 4 beats
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
int beatAvg = 0;
unsigned long lastPrint = 0;

void setup() {
  Serial.begin(115200);         // must match the dashboard (115200)
  if (!sensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("ERR:MAX30102 not found. Check the wiring.");
    while (true) { delay(1000); }
  }
  sensor.setup();                    // default settings
  sensor.setPulseAmplitudeRed(0x0A); // red LED low: shows the sensor is on
  sensor.setPulseAmplitudeGreen(0);  // green LED off
}

void loop() {
  long ir = sensor.getIR();

  if (checkForBeat(ir)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    float bpm = 60 / (delta / 1000.0);
    if (bpm > 30 && bpm < 220) {            // ignore impossible values
      rates[rateSpot++] = (byte)bpm;
      rateSpot %= RATE_SIZE;
      int sum = 0;
      for (byte i = 0; i < RATE_SIZE; i++) sum += rates[i];
      beatAvg = sum / RATE_SIZE;
    }
  }

  // Once a second: send the average, only when a finger is on the sensor
  if (millis() - lastPrint >= 1000) {
    lastPrint = millis();
    if (ir > 50000 && beatAvg > 0) {
      Serial.print("HR:");
      Serial.println(beatAvg);
    } else if (ir <= 50000) {
      beatAvg = 0;
      for (byte i = 0; i < RATE_SIZE; i++) rates[i] = 0;
      Serial.println("NOFINGER");
    }
  }
}
