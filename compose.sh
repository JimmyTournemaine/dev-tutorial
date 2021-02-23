#!/usr/bin/env bash
set -e

urlencode() {
    local length="${#1}"
    for (( i = 0; i < length; i++ )); do
        local c="${1:i:1}"
        case $c in
            [a-zA-Z0-9.~_-]) printf "$c" ;;
            *) printf '%s' "$c" | xxd -p -c1 |
                   while read c; do printf '%%%s' "$c"; done ;;
        esac
    done
}

openbrowser() {
	local URL=$1
	[[ -x $BROWSER ]] && exec "$BROWSER" "$URL"
	path=$(which xdg-open || which gnome-open) && exec "$path" "$URL"
	if open -Ra "safari" ; then
		open -a safari "$URL"
	else
		echo "No browser found. Please open: $URL"
	fi
}

download() {
	WORKFLOW="Compose bundle"
	BRANCH="$(git branch --show-current)"
	REMOTE_URI="$(git config --get remote.origin.url)"
	REPO_URI="${REMOTE_URI%.*}"
	WORKFLOW_ENCODED=$(urlencode $WORKFLOW)
	BRANCH_ENCODED=$(urlencode $BRANCH)
	GITHUB_URI="$REPO_URI/actions?query=workflow%3A%22$WORKFLOW_ENCODED%22+is%3Asuccess+branch%3A$BRANCH_ENCODED"

	mkdir -p dist

	echo 'Missing executable, please download the latest artifact to the ./dist folder (or install python!)'
  echo 'Please select the last build and download the artifact in the "Artifacts" section at the bottom of the page'
	echo 'Your web browser will open in a few seconds'
	sleep 3
	openbrowser "$GITHUB_URI"

}

if python --version; then
	./compose.py "$@"
elif [ -f dist/compose ]; then
	[[ -x dist/compose ]] || chmod u+x dist/compose
	./dist/compose "$@"
else
  download
fi
