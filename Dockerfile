FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files first to cache the 'npm install' layer
COPY package*.json ./
# This runs once during 'build' and creates the Linux node_modules
RUN npm install

# Copy your code
COPY . .
EXPOSE 8080
CMD ["npm", "run", "start:dev"]