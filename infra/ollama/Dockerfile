FROM ollama/ollama:latest

# Install curl
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy the start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Start Ollama server in the background and pull models
RUN /start.sh

# Expose the port
EXPOSE 11434

# Set the entrypoint
ENTRYPOINT ["/bin/ollama"]
CMD ["serve"]
