#!/bin/sh
set -e

echo "Waiting for database..."
until npx prisma db push; do
  echo "Prisma db push failed, retrying in 5 seconds..."
  sleep 5
done

echo "Starting application..."
exec npm start
