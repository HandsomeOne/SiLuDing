FROM node:4
MAINTAINER handsomeOne <i@handsomeone.com>
EXPOSE 80

WORKDIR /app
COPY . /app
RUN npm install
CMD npm start
