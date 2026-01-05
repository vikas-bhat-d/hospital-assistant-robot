# HMS/backend/Dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=4000

# URL of face-verification Flask service (used in userController.js)
# In code, use process.env.FACE_URL instead of hardcoding "http://localhost:8080"
ENV FACE_URL=http://face-verification:8080

EXPOSE 4000

CMD ["npm", "start"]
