import math


class Odometry:
    def __init__(self, wheel_radius, ticks_per_rev, wheel_base):
        self.meters_per_tick = (2 * math.pi * wheel_radius) / ticks_per_rev
        self.wheel_radius=wheel_radius
        self.wheel_base = wheel_base

        self.x = 0.0
        self.y = 0.0
        self.theta = 0.0      # rad (from MQTT)
        self.theta_deg = 0.0

        self.last_left = 0
        self.last_right = 0

    def update_theta(self, yaw_deg):
        self.theta_deg = yaw_deg
        self.theta = math.radians(yaw_deg)

    def reset(self, left, right):
        self.x = 0.0
        self.y = 0.0
        self.last_left = left
        self.last_right = right
        self.theta = 0.0
        self.theta_deg = 0.0

    def update(self, left_ticks, right_ticks):
        dL = left_ticks - self.last_left
        dR = right_ticks - self.last_right

        self.last_left = left_ticks
        self.last_right = right_ticks

        Dl = dL * self.meters_per_tick
        Dr = dR * self.meters_per_tick
        Dc = (Dl + Dr) / 2.0

        self.x += Dc * math.cos(self.theta)
        self.y += Dc * math.sin(self.theta)

