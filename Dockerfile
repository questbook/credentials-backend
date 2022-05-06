FROM node:16

WORKDIR /app

COPY package.json .

RUN yarn install

COPY . .

EXPOSE 3033

CMD yarn start