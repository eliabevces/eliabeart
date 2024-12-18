# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Create a virtual environment
RUN python -m venv /opt/venv

# Activate the virtual environment and install dependencies
RUN . /opt/venv/bin/activate && pip install -r requirements.txt

# Install gunicorn
RUN . /opt/venv/bin/activate && pip install gunicorn

# Copy the rest of the application code into the container, excluding the 'imagens' directory
COPY . .
RUN rm -rf ./imagens

# Set the entrypoint to use the virtual environment's Python interpreter
ENTRYPOINT ["/opt/venv/bin/python", "-m"]

# Command to run the application with gunicorn
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--workers", "4", "--bind", "0.0.0.0:8000", "--log-level", "debug"]
