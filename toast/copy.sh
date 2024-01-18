set -e
url=$1 # "https://w5.ab.ust.hk/wcq/cgi-bin/2320/"
path="website/$2"
limit=1000000000000
timeout=18000 # interrupt if run for 5 hours
lock_file="$path/hts-paused.lock"

echo "copy $url to $path"

until_file_exists() {
  file=$1
  echo "waiting $file to exist"
  until [ -f $file ]
  do
      sleep 1
  done
  echo "File $file found"
}

on_timeout() {
  echo "time limit reached, stopping"
  touch $path/hts-stop.lock
  until_file_exists $lock_file
  kill -s INT $(ps -C httrack --no-headers -o pid)
  sleep 5
  # check_in
  kill -s INT $(ps -C httrack --no-headers -o pid)
  # exit 0
}

start_copy() {
  if [ -d "$path/index.html" ]; then
    if [ -f $lock_file ]; then
      echo "found $lock_file, continue the interrupted copy"
      rm $lock_file
      httrack $url --path $path --verbose --robots=0 --advanced-progressinfo -#L$limit --continue
    else
      echo "cannot find $lock_file, update the existing copy"
      httrack $url --path $path --verbose --robots=0 --advanced-progressinfo -#L$limit --update
    fi
    else
    echo "cannot find $path, starting a new copy"
    echo "httrack $url --path $path --verbose --robots=0 --advanced-progressinfo -#L$limit"
    httrack $url --path $path --verbose --robots=0 --advanced-progressinfo -#L$limit
  fi
}

if compgen -G "cache-parts*" > /dev/null; then
  echo "detected cache, unzipping cache"
  cat cache-parts* > cache.tar.gz
  tar -xvzf cache.tar.gz -C $path
fi

cp -r toast/website .
(sleep $timeout; on_timeout)&
start_copy
# check_in

mkdir dist

tar -cvvzf dist/cache.tar.gz $path/hts-cache/
split -b 1M dist/cache.tar.gz dist/cache-parts

rm -rf w5.ab.ust.hk
rm -rf classquota/hts-cache