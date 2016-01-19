FROM node:4
MAINTAINER handsomeOne <anthony_nju@foxmail.com>
EXPOSE 9527

WORKDIR /app
RUN npm install socket.io && npm install forever -g
COPY . /app

ENTRYPOINT forever start server.js