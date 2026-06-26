# Use official lightweight Node.js 20 image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy all backend source code
COPY . .

# Set default environment variables
# Hugging Face Spaces require the container to listen on port 7860
ENV PORT=7860
ENV NODE_ENV=production

# Expose port 7860
EXPOSE 7860

# Start the Node.js server
CMD ["node", "server.js"]
