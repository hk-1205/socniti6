FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/event-service/package.json services/event-service/package.json
RUN npm install
COPY . .
EXPOSE 4002
CMD ["npm", "run", "start", "--workspace", "@socniti/event-service"]
