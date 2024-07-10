# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /src

# Build arguments
ARG GOOGLE_APPLICATION_CREDENTIALS

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . /src

ENV PORT=8080

# Expose the application port (adjust if your app uses a different port)
EXPOSE 8080

# Define the command to run the application
CMD ["npm", "start"]

