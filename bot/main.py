import serial
import threading
import time
import math
import paho.mqtt.client as mqtt
from SerialReader import SerialReader
from Odometry import Odometry
from MQTTInterface import MQTTInterface
from StateController import StateController


SERIAL_PORT = "/dev/ttyUSB0"
SERIAL_BAUD = 115200
LOOP_HZ = 20

WHEEL_RADIUS = 0.034
TICKS_PER_REV = 1320
WHEEL_BASE = 0.18

MQTT_BROKER = "192.168.1.5"
MQTT_PORT = 1883

class RobotSystem:
    def __init__(self):
        self.serial = SerialReader(SERIAL_PORT, SERIAL_BAUD)
        self.odometry = Odometry(WHEEL_RADIUS, TICKS_PER_REV, WHEEL_BASE)

        self.joy_left = 0.0
        self.joy_right = 0.0

        self.reset_requested = False

        # states
        self.state_controller = StateController(self)

    def start(self):
        self.serial.start()
        self.mqtt = MQTTInterface(self, MQTT_BROKER, MQTT_PORT)
        self.mqtt.start()

    def reset_robot(self):
        print("RESET requested!")
        self.serial.write(b"RESET_ENC\n")

        left, right = self.serial.get_ticks()
        self.odometry.reset(left, right)

    def send_pwm(self):
        L = int(self.joy_left * 200)
        R = int(self.joy_right * 200)
        self.serial.write(f"{L},{R}\n".encode())

    def run(self):
        dt = 1.0 / LOOP_HZ
        print("Robot running (MANUAL ONLY)...")

        try:
            while True:
                t0 = time.time()

                # reset logic
                if self.reset_requested:
                    self.reset_requested = False
                    self.reset_robot()

                # odometry
                L, R = self.serial.get_ticks()
                self.odometry.update(L, R)

                print(f"ENC {L}/{R} | x:{self.odometry.x:.3f} y:{self.odometry.y:.3f} theta:{self.odometry.theta_deg:.1f}")

                # only manual (for now)
                self.state_controller.run(dt)

                # send motors
                self.send_pwm()

                # maintain loop rate
                elapsed = time.time() - t0
                if dt > elapsed:
                    time.sleep(dt - elapsed)

        except KeyboardInterrupt:
            print("Stopping robot.")
            try: self.mqtt.client.loop_stop()
            except: pass
            try: self.serial.ser.close()
            except: pass


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    robot = RobotSystem()
    robot.start()
    robot.run()
