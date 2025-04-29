FROM node

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

RUN npm run build

CMD ["node", "build/src/twitch-irc.js"]