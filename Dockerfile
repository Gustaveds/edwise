FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy all source files INCLUDING CSS, Tailwind config, PostCSS config BEFORE build
COPY . .

# Accept VITE_API_URL as a build argument
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN echo "Building with API URL: $VITE_API_URL"
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
