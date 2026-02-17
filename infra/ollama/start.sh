#!/bin/bash

# Start Ollama in the background
/bin/ollama serve &
pid=$!

# Wait for Ollama to start
echo "Waiting for Ollama to start..."
while ! curl -s http://localhost:11434/api/tags > /dev/null; do
    sleep 1
done

# Pull the models
echo "Pulling models..."
ollama pull nomic-embed-text
ollama pull llama3.2

# Stop Ollama
kill $pid
