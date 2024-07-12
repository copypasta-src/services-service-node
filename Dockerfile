# Use an official Node.js runtime as a parent image
FROM node:18

# Set build-time arguments
ARG GITHUB_COPYPASTA_APP_CLIENT_ID
ARG GITHUB_COPYPASTA_APP_CLIENT_SECRET
ARG GH_AUTH_REDIRECT_URL


# Set environment variables using build-time arguments
ENV GITHUB_COPYPASTA_APP_CLIENT_ID=${GITHUB_COPYPASTA_APP_CLIENT_ID}
ENV GITHUB_COPYPASTA_APP_CLIENT_SECRET=${GITHUB_COPYPASTA_APP_CLIENT_SECRET}
ENV GH_AUTH_REDIRECT_URL=${GH_AUTH_REDIRECT_URL}

# Set the working directory in the container
WORKDIR /src

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

