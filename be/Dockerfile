FROM node

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

RUN npm run build:ts

EXPOSE 3000

CMD ["npm", "start"]