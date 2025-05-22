# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Install Poetry
RUN pip install --upgrade pip && pip install poetry

# Copy only poetry files first for better caching
COPY pyproject.toml poetry.lock* ./

# Install dependencies (no virtualenv, use system)
RUN poetry config virtualenvs.create false && poetry install --no-interaction --no-ansi --no-root

# Copy the rest of the application code into the container, excluding the 'imagens' directory
COPY . .
RUN rm -rf ./imagens

# Set the entrypoint to use Python
ENTRYPOINT ["python", "-m"]

# Command to run the application with gunicorn
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--workers", "4", "--bind", "0.0.0.0:8000", "--log-level", "debug"]
