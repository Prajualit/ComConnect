#!/bin/sh
# wait-for.sh

set -e

host="$1"
shift
cmd="$@"

until nc -z "$host" 27017; do
  echo "⏳ Waiting for MongoDB to be ready..."
  sleep 1
done

echo "✅ MongoDB is ready! Starting application..."
exec $cmd 