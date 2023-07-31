# Specify the base image
FROM node:14-alpine
WORKDIR /
COPY package*.json ./
RUN npm install --quiet
COPY . .
CMD ["node", "index.js"]
