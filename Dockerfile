# Use Node.js 23 image
FROM node:23

# Set working directory
WORKDIR /app

# Copy package.json and optionally package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app source code
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Define the command to run app
CMD ["node", "app.js"]