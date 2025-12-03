import serial
import threading

class SerialReader(threading.Thread):
    def __init__(self, port, baud):
        super().__init__(daemon=True)
        self.ser = serial.Serial(port, baud, timeout=0)
        self.buffer = ""
        self.left_ticks = 0
        self.right_ticks = 0
        self.lock = threading.Lock()

    def run(self):
        while True:
            try:
                data = self.ser.read(64).decode(errors="ignore")
            except:
                continue

            if not data:
                continue

            self.buffer += data

            while "\n" in self.buffer:
                line, self.buffer = self.buffer.split("\n", 1)
                line = line.strip()

                if line.startswith("ENC:"):
                    try:
                        _, values = line.split(":")
                        L, R = values.split(",")

                        with self.lock:
                            self.left_ticks = int(L)
                            self.right_ticks = int(R)
                    except:
                        pass

    def get_ticks(self):
        with self.lock:
            return self.left_ticks, self.right_ticks

    def write(self, msg):
        try:
            self.ser.write(msg)
        except:
            pass