# Use an official Node.js runtime as a parent image
FROM node:18

# Set build-time arguments
ARG GITHUB_COPYPASTA_APP_CLIENT_ID
ARG GITHUB_COPYPASTA_APP_CLIENT_SECRET
ARG GH_AUTH_REDIRECT_URL_BASE


# Set environment variables using build-time arguments
ENV GITHUB_COPYPASTA_APP_CLIENT_ID=${GITHUB_COPYPASTA_APP_CLIENT_ID}
ENV GITHUB_COPYPASTA_APP_CLIENT_SECRET=${GITHUB_COPYPASTA_APP_CLIENT_SECRET}
ENV GH_AUTH_REDIRECT_URL_BASE=${GH_AUTH_REDIRECT_URL_BASE}

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Set the necessary permissions for the working directory
RUN chown -R node:node /usr/src/app
RUN chmod -R 755 /usr/src/app

# Switch to a non-root user for security
USER node

ENV PORT=8080

# Expose the application port (adjust if your app uses a different port)
EXPOSE 8080

# Define the command to run the application
CMD ["npm", "start"]

