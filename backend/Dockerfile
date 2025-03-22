FROM node:20-slim

LABEL maintainer="Builder.ai Team" \
      description="Backend service for Builder.ai"

WORKDIR /app

# Copy the entire application first
COPY . .

# Install dependencies with detailed logging
RUN npm install

# Build TypeScript with detailed output
RUN npm run build && echo "TypeScript build completed"

# Expose the port the app will run on
EXPOSE 8000
RUN echo "Exposed port 8000"

# Command to run the application with increased logging
CMD ["sh", "-c", "echo 'Starting application...' && npm start"]