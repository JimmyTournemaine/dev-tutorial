set -e
declare -A services=( ["test"]="api" ["dev"]="api app" ["cli"]="api cli" )

ENV=$1
OPTS=$2

if [ -f "docker-compose.$ENV.yml" ]; then
  docker-compose -f docker-compose.yml -f docker-compose.$ENV.yml up $services[$ENV]
else
  docker-compose up
fi
