FROM node:10
WORKDIR /usr/src/app/app-ui
COPY package.json ./
COPY yarn.lock ./
RUN yarn install
EXPOSE 4200
CMD ["yarn", "start", "--host", "0.0.0.0", "--disableHostCheck"]
