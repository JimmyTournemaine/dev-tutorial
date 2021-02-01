# env: bash>=4 or zsh
#
# usage: ./compose CMD [ENV]
#   with CMD is build or up (or build-up)
#   with ENV is test|cli (default is empty, related to servers started on a developement environment)
#
set -e
set -x
declare -A services=( ["test"]="api app" ["cli"]="api cli" )

CMD=$1
ENV=$2

if [ -f "docker-compose.$ENV.yml" ]; then
  docker-compose -f docker-compose.yml -f docker-compose.$ENV.yml config
  if [ "$CMD" = "build" ] || [ "$CMD" = "build-up" ]; then
    docker-compose -f docker-compose.yml -f docker-compose.$ENV.yml build --no-cache
  fi
  if [ "$CMD" = "up" ] || [ "$CMD" = "build-up" ]; then
    docker-compose -f docker-compose.yml -f docker-compose.$ENV.yml up $(echo $services[$ENV] | xargs)
  fi
else
  docker-compose config
  if [ "$CMD" = "build" ] || [ "$CMD" = "build-up" ]; then
    docker-compose build --no-cache
  fi
  if [ "$CMD" = "up" ] || [ "$CMD" = "build-up" ]; then
    docker-compose up
  fi
fi
