FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5001

CMD ["npx", "astro", "dev", "--force", "--host", "0.0.0.0", "--port", "5001"]
