npm install
# ./node_modules/.bin/webpack
npm run build
mkdir -p output
curPath=`pwd`
cd ./dist/box/
zip -r box.zip ./*
cd -
mv ./dist/box/box.zip output/
