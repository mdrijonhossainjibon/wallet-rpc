FROM node:20

WORKDIR /app

COPY . .

RUN yarn install && yarn convert

EXPOSE 3000

CMD ["yarn", "server"]
 