import paho.mqtt.client as mqtt

class MQTTInterface:
    def __init__(self, robot, host, port):
        self.robot = robot
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.host = host
        self.port = port

    def start(self):
        self.client.connect(self.host, self.port, 60)
        self.client.loop_start()

    def on_connect(self, client, userdata, flags, rc):
        print("MQTT Connected")
        client.subscribe("robot/joy")
        client.subscribe("robot/yaw")
        client.subscribe("robot/reset")
        client.subscribe("robot/autonomy")
        client.subscribe("robot/goals")

    def on_message(self, client, userdata, msg):
        payload = msg.payload.decode().strip()

        if msg.topic == "robot/joy":
            try:
                l, r = payload.split(",")
                self.robot.joy_left = float(l)
                self.robot.joy_right = float(r)
            except:
                pass

        elif msg.topic == "robot/yaw":
            try:
                yaw_deg = float(payload)
                self.robot.odometry.update_theta(yaw_deg)
            except:
                pass

        elif msg.topic == "robot/reset":
            print("RESET Recieved")
            self.robot.reset_requested = True
            
        # =============================
        # AUTONOMY MODE SWITCH
        # =============================
        elif msg.topic == "robot/autonomy":
            try:
                mode = int(payload)
            except:
                mode = 0

            if mode == 1:
                print("[MQTT] Switching to GoToGoal state")
                self.robot.state_controller.force_state("GoToGoal")
            else:
                print("[MQTT] Switching to Manual state")
                self.robot.state_controller.force_state("Manual")

        # =============================
        # GOAL LIST LOADING
        # =============================
        elif msg.topic == "robot/goals":
            try:
                payload = payload.strip()

                # "1,0;2,1;3,1"
                raw_goals = payload.split(";")

                goals = []
                for g in raw_goals:
                    if "," in g:
                        x, y = g.split(",")
                        goals.append([float(x), float(y)])

                print("[MQTT] Parsed goals:", goals)

                goto_state = self.robot.state_controller.states["GoToGoal"]
                goto_state.load_goals(goals)

            except Exception as e:
                print("[MQTT] Failed to parse goals:", e)
                print("Raw payload:", repr(payload))
