FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY services/api-gateway/package.json services/api-gateway/package.json
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "run", "start", "--workspace", "@socniti/api-gateway"]
