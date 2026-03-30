FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--workspace", "@socniti/frontend", "--", "--host", "0.0.0.0"]
