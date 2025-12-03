import math
from GoToGoalController import GoToGoalController



class ManualState:
    name = "Manual"
    def entry(self, robot): print("[State] Manual entered")
    def run(self, robot, dt): return "Manual"
    def exit(self, robot): pass



class GoToGoalState:
    name = "GoToGoal"

    def __init__(self):
        self.goals = []
        self.current_goal_index = 0

        self.fixed_speed = 0.14;        # forward velocity (m/s)
        self.max_turn_pwm = 1.0
        self.rate_limit_delta = 0.1    # max change per cycle

        self.prev_left = 0.0
        self.prev_right = 0.0

        self.controller = GoToGoalController()
        
        self.ANGLE_THRESHOLD=0.7
        self.TURN_PWM = 0.60
    
    def uni_to_diff(self, v, w, wheel_radius, L):
        vel_r = (2*v + w*L) / (2 * wheel_radius)
        vel_l = (2*v - w*L) / (2 * wheel_radius)
        return vel_l, vel_r

    # Called when entering this state
    def entry(self, robot):
        print("[STATE] Entering GoToGoal")

        # Reset PID internal memory
        self.controller = GoToGoalController()

        self.current_goal_index = 0
        if len(self.goals) == 0:
            print("[GoToGoal] No goals loaded → switching to Manual")
            return "Manual"

    # Called every loop
    def run(self, robot, dt):
        odom = robot.odometry

        # -----------------------------------------
        # Check if goals empty
        # -----------------------------------------
        if len(self.goals) == 0:
            return "Manual"

        # -----------------------------------------
        # Current goal
        # -----------------------------------------
        gx, gy = self.goals[self.current_goal_index]

        # -----------------------------------------
        # PID: compute angular velocity
        # -----------------------------------------
        w, dist= self.controller.step(
            gx, gy,
            odom.x, odom.y,
            odom.theta,
            dt
        )

        # -----------------------------------------
        # If reached goal → move to next
        # -----------------------------------------
        if dist < 0.05:
            print(f"[GoToGoal] Goal reached: {gx}, {gy}")
            self.current_goal_index += 1

            if self.current_goal_index >= len(self.goals):
                print("[GoToGoal] All goals completed → Manual mode")
                robot.joy_left = 0
                robot.joy_right = 0
                return "Manual"

            return "GoToGoal"

        # if abs(e_k) > self.ANGLE_THRESHOLD:
        #     # robot must rotate in place
        #     print("E_K is > Threshold: ",e_k);
        #     if e_k > 0:
        #         # rotate left (CCW)
        #         right_cmd = -self.TURN_PWM
        #         left_cmd = self.TURN_PWM
        #     else:
        #         # rotate right (CW)
        #         right_cmd = self.TURN_PWM
        #         left_cmd = -self.TURN_PWM

        #     # Apply rate limiting
        #     left_cmd = self.rate_limit(left_cmd, self.prev_left)
        #     right_cmd = self.rate_limit(right_cmd, self.prev_right)

        #     self.prev_left = left_cmd
        #     self.prev_right = right_cmd

        #     robot.joy_left = left_cmd
        #     robot.joy_right = right_cmd

        #     print(f"[GoToGoal] ALIGNING | e_k={e_k:.2f} | L/R={left_cmd:.2f}/{right_cmd:.2f}")
        #     return "GoToGoal"

        # -----------------------------------------
        # Convert (v,w) into wheel velocities
        # -----------------------------------------
        v = self.fixed_speed   # always forward, no reverse

        right_vel,left_vel = self.uni_to_diff(
            v, w,
            wheel_radius=odom.wheel_radius,
            L=odom.wheel_base
        )

        # -----------------------------------------
        # Normalize to PWM 0..1
        # -----------------------------------------
        max_val = max(abs(left_vel), abs(right_vel), 1e-6)
        left_cmd = left_vel / max_val
        right_cmd = right_vel / max_val

        # Prevent reverse
        left_cmd = max(left_cmd, 0)
        right_cmd = max(right_cmd, 0)

        # -----------------------------------------
        # Rate limit for smooth movement
        # -----------------------------------------
        left_cmd = self.rate_limit(left_cmd, self.prev_left)
        right_cmd = self.rate_limit(right_cmd, self.prev_right)

        self.prev_left = left_cmd
        self.prev_right = right_cmd

        robot.joy_left = left_cmd
        robot.joy_right = right_cmd

        print(f"[GoToGoal] Target=({gx},{gy})  dist={dist:.2f}  PWM L/R = {left_cmd:.2f}/{right_cmd:.2f}")

        return "GoToGoal"

    # Called when exiting state
    def exit(self, robot):
        print("[STATE] Exiting GoToGoal")
        robot.joy_left = 0
        robot.joy_right = 0

    # -----------------------------------------
    # Helpers
    # -----------------------------------------
    def rate_limit(self, new_value, prev_value):
        if new_value > prev_value + self.rate_limit_delta:
            return prev_value + self.rate_limit_delta
        if new_value < prev_value - self.rate_limit_delta:
            return prev_value - self.rate_limit_delta
        return new_value

    # -----------------------------------------
    # For MQTT / external loading
    # -----------------------------------------
    def load_goals(self, goals_array):
        self.goals = goals_array
        self.current_goal_index = 0



# ============================================================
# STATE MACHINE
# ============================================================
class StateController:
    def __init__(self, robot):
        self.robot = robot
        self.states = {
            "Manual": ManualState(),
            "GoToGoal": GoToGoalState()  # placeholder
        }
        self.current = self.states["Manual"]
        self.current.entry(robot)
    
    def force_state(self, name):
        if name not in self.states:
            return

        self.current.exit(self.robot)
        self.current = self.states[name]
        self.current.entry(self.robot)

    def run(self, dt):
        next_state_name = self.current.run(self.robot, dt)
        if next_state_name != self.current.name:
            self.current.exit(self.robot)
            self.current = self.states[next_state_name]
            self.current.entry(self.robot)
