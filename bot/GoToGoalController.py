import math

class GoToGoalController:
    def __init__(self):
        self.E_d = 0
        self.E_i = 0

        self.Kp = 0.3
        self.Ki = 0.01
        self.Kd = 0.1

    def step(self, x_g, y_g, x, y, theta, dt):
        # dt from your loop is in seconds already → use directly
        u_x = x_g - x
        u_y = y_g - y

        dist = math.sqrt(u_x*u_x + u_y*u_y)
        if dist < 0.05:
            return 0, dist

        theta_g = math.atan2(u_y, u_x)
        e_k = theta_g - theta
        e_k = math.atan2(math.sin(e_k), math.cos(e_k))
        print("E_K: ",math.degrees(e_k))
        

        e_P = e_k
        e_I = self.E_i + e_k * dt
        e_D = (e_k - self.E_d) / dt if dt > 0 else 0

        w = self.Kp * e_P + self.Ki * e_I + self.Kd * e_D

        # update prev errors
        self.E_i = e_I
        self.E_d = e_k

        return w, dist
