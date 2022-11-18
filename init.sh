DIR_STORAGE="./storage"
DIR_UPLOADS="./storage/uploads"

./setup-ssh.sh
#npm install
if ! [ -d "$DIR_STORAGE" ]; then
  mkdir storage
  echo "Created Storage"
fi

if ! [ -d "$DIR_UPLOADS" ]; then
  mkdir storage/uploads
  echo "Created Storage/Uploads"
fi

npm install && node bin/autoupdate.js